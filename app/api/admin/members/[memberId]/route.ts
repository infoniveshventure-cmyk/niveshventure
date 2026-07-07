import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AdminWalletTransaction from "@/models/AdminWalletTransaction";
import Transaction from "@/models/Transaction";
import Deposit from "@/models/Deposit";
import Withdrawal from "@/models/Withdrawal";
import AuditLog from "@/models/AuditLog";
import { requireAdmin } from "@/lib/require-admin";
import { updateFirebaseUserPasswordByEmail, deleteFirebaseUser } from "@/lib/firebase-admin";
import { notifyMember } from "@/lib/notification";
import crypto from "crypto";
import { processActivationIncomes } from "@/lib/binaryMatching";

export async function GET(req: NextRequest, { params }: { params: { memberId: string } }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { memberId } = params;
  if (!memberId) {
    return NextResponse.json({ error: "memberId parameter is required" }, { status: 400 });
  }

  await connectDB();

  const user = await User.findOne({ memberId });
  if (!user) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Fetch recent activity
  const recentTransactions = await Transaction.find({ memberId }).sort({ createdAt: -1 }).limit(10);
  const recentWithdrawals = await Withdrawal.find({ memberId }).sort({ createdAt: -1 }).limit(10);
  const recentDeposits = await Deposit.find({ memberId }).sort({ createdAt: -1 }).limit(10);
  const walletHistory = await AdminWalletTransaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10);

  // Direct count
  const directMembersCount = await User.countDocuments({ sponsorId: memberId });

  return NextResponse.json({
    member: user,
    directMembersCount,
    recentTransactions,
    recentWithdrawals,
    recentDeposits,
    walletHistory
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { memberId: string } }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { memberId } = params;
  if (!memberId) {
    return NextResponse.json({ error: "memberId parameter is required" }, { status: 400 });
  }

  const body = await req.json();
  const { 
    action, 
    fullName,
    email, 
    mobile, 
    usdtWalletAddress, 
    password,
    walletType,
    amount,
    adminRemarks
  } = body;

  await connectDB();
  const user = await User.findOne({ memberId });
  if (!user) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (action === "update_profile") {
    if (fullName && fullName.trim()) user.fullName = fullName.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (mobile) user.mobile = mobile;
    if (usdtWalletAddress !== undefined) user.usdtWalletAddress = usdtWalletAddress;
    if (body.withdrawalsEnabled !== undefined) user.withdrawalsEnabled = body.withdrawalsEnabled;
    await user.save();
    return NextResponse.json({ success: true, message: "Profile updated successfully", member: user });
  }

  if (action === "toggle_status") {
    const { statusType } = body; // "active", "suspended"
    if (statusType === "active") {
      user.isActive = !user.isActive;
      if (user.isActive) {
        // If activating, run the full automated flows
        await processActivationIncomes(user.memberId);
      } else {
        await user.save();
      }
    }
    return NextResponse.json({ success: true, message: "Status toggled successfully", member: user });

    // Notify user of status change
    notifyMember(
      user.memberId,
      user.isActive ? "Account Activated ✅" : "Account Suspended ⚠️",
      user.isActive
        ? "Your account has been activated by the administrator. You can now access all features."
        : "Your account has been suspended by the administrator. Please contact support for assistance.",
      "account_status"
    ).catch(() => {});
  }

  // Block / Unblock user — prevents login entirely
  if (action === "block_toggle") {
    const wasBlocked = user.isBlocked;
    user.isBlocked = !wasBlocked;
    await user.save();

    // Write audit log
    await AuditLog.create({
      actorId: guard.session!.memberId,
      actorRole: "admin",
      actionType: wasBlocked ? "user_unblocked" : "user_blocked",
      resourceType: "User",
      resourceId: user.memberId,
      targetMemberId: user.memberId,
      severity: "warning",
      metadata: {
        adminId: guard.session!.memberId,
        reason: body.reason || "Admin action",
        previousState: wasBlocked ? "blocked" : "active",
        newState: wasBlocked ? "active" : "blocked",
      },
    });

    // Notify user
    notifyMember(
      user.memberId,
      wasBlocked ? "Account Unblocked ✅" : "Account Blocked 🔒",
      wasBlocked
        ? "Your account has been unblocked by the administrator. You can now log in."
        : "Your account has been blocked by the administrator. Please contact support.",
      "account_status"
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Member ${wasBlocked ? "unblocked" : "blocked"} successfully`,
      isBlocked: user.isBlocked,
      member: user,
    });
  }

  if (action === "reset_password") {
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    try {
      // Update in Firebase Auth
      await updateFirebaseUserPasswordByEmail(user.email, password);
      const hash = crypto.createHash("sha256").update(password).digest("hex");
      user.loginKeyHash = hash;
      user.accessKeyHash = hash;
      await user.save();

      // Notify user of password reset by admin
      notifyMember(
        user.memberId,
        "Password Reset by Admin 🔑",
        "An administrator has reset your account password. If you did not request this, please contact support immediately.",
        "password_changed"
      ).catch(() => {});

      return NextResponse.json({ success: true, message: "Password updated successfully" });
    } catch (err: any) {
      console.error("Firebase password update failed:", err);
      return NextResponse.json({ error: err.message || "Failed to reset password" }, { status: 500 });
    }
  }

  if (action === "wallet_adjust") {
    if (!walletType || !amount || amount <= 0 || !adminRemarks) {
      return NextResponse.json({ error: "Invalid wallet adjust parameters" }, { status: 400 });
    }

    const direction = body.direction; // "credit" or "debit"
    if (direction !== "credit" && direction !== "debit") {
      return NextResponse.json({ error: "Direction must be credit or debit" }, { status: 400 });
    }

    // Identify balance field
    let balanceField = "walletBalance";
    if (walletType === "booster") balanceField = "boosterWalletBalance";
    if (walletType === "nivesh") balanceField = "nivshWalletBalance";
    if (walletType === "usdt") balanceField = "usdtWalletBalance";

    const currentBalance = (user as any)[balanceField] || 0;
    let newBalance = currentBalance;

    if (direction === "credit") {
      newBalance += amount;
    } else {
      if (currentBalance < amount) {
        return NextResponse.json({ error: "Insufficient wallet balance for debit" }, { status: 400 });
      }
      newBalance -= amount;
    }

    const txId = "TX-" + Math.random().toString(36).substring(2, 11).toUpperCase();

    // Create AdminWalletTransaction record
    const adminTx = new AdminWalletTransaction({
      transactionId: txId,
      userId: user._id,
      type: direction,
      amount,
      walletType,
      adminRemarks,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
    });

    await adminTx.save();

    // Create a regular Transaction record for the member's history
    await Transaction.create({
      memberId: user.memberId,
      type: "wallet_transfer",
      direction,
      amount,
      currency: "USDT",
      status: "completed",
      note: adminRemarks,
      description: `${direction === "credit" ? "Admin Credit" : "Admin Debit"} - ${adminRemarks}`,
      walletType,
      referenceId: adminTx._id.toString(),
    });

    // Update user balance
    (user as any)[balanceField] = newBalance;
    await user.save();

    const walletLabel = walletType === "booster" ? "Booster Wallet" : walletType === "nivesh" ? "Nivesh Wallet" : walletType === "usdt" ? "USDT Wallet" : "Main Wallet";

    // Notify user of wallet adjustment
    notifyMember(
      user.memberId,
      direction === "credit" ? `Wallet Credited 💰` : `Wallet Debited 📤`,
      direction === "credit"
        ? `$${amount} has been credited to your ${walletLabel} by the admin. Remarks: ${adminRemarks}`
        : `$${amount} has been debited from your ${walletLabel} by the admin. Remarks: ${adminRemarks}`,
      direction === "credit" ? "wallet_credit" : "wallet_debit"
    ).catch(() => {});

    return NextResponse.json({ 
      success: true, 
      message: `Wallet successfully ${direction}ed`, 
      member: user 
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// DELETE — permanently remove a member account
export async function DELETE(req: NextRequest, { params }: { params: { memberId: string } }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { memberId } = params;
  if (!memberId) {
    return NextResponse.json({ error: "memberId parameter is required" }, { status: 400 });
  }

  await connectDB();

  const user = await User.findOne({ memberId });
  if (!user) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Prevent deleting admin accounts
  if (user.role === "admin") {
    return NextResponse.json({ error: "Admin accounts cannot be deleted" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = body.reason || "Deleted by admin";

  // Write immutable audit log BEFORE deletion
  await AuditLog.create({
    actorId: guard.session!.memberId,
    actorRole: "admin",
    actionType: "user_deleted",
    resourceType: "User",
    resourceId: user.memberId,
    targetMemberId: user.memberId,
    severity: "critical",
    metadata: {
      adminId: guard.session!.memberId,
      reason,
      deletedEmail: user.email,
      deletedFullName: user.fullName,
      deletedMemberId: user.memberId,
      sponsorId: user.sponsorId,
      walletBalance: user.walletBalance,
    },
  });

  // Delete Firebase user (best-effort)
  if (user.firebaseUid) {
    await deleteFirebaseUser(user.firebaseUid);
  }

  // Delete MongoDB user document
  await User.deleteOne({ memberId });

  return NextResponse.json({
    success: true,
    message: `Member ${memberId} has been permanently deleted`,
  });
}
