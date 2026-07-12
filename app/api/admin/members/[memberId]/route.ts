import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AdminWalletTransaction from "@/models/AdminWalletTransaction";
import Transaction from "@/models/Transaction";
import Deposit from "@/models/Deposit";
import Withdrawal from "@/models/Withdrawal";
import AuditLog from "@/models/AuditLog";
import { requireAdmin } from "@/lib/require-admin";
import { updateFirebaseUserPasswordByEmail, deleteFirebaseUser, updateFirebaseUser } from "@/lib/firebase-admin";
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
    const originalEmail = user.email;
    const originalMobile = user.mobile;
    const originalFullName = user.fullName;

    const targetEmail = email ? email.toLowerCase().trim() : originalEmail;
    const targetMobile = mobile ? mobile.trim() : originalMobile;
    const targetFullName = fullName && fullName.trim() ? fullName.trim() : originalFullName;

    // Check duplicate email
    if (targetEmail !== originalEmail) {
      const duplicateEmail = await User.findOne({ email: targetEmail, memberId: { $ne: memberId } });
      if (duplicateEmail) {
        return NextResponse.json({ error: "Email is already in use by another account" }, { status: 400 });
      }
    }

    // Check duplicate phone
    if (targetMobile !== originalMobile) {
      const duplicateMobile = await User.findOne({ mobile: targetMobile, memberId: { $ne: memberId } });
      if (duplicateMobile) {
        return NextResponse.json({ error: "Phone number is already in use by another account" }, { status: 400 });
      }
    }

    // Sync with Firebase
    const firebaseUpdates: any = {};
    if (targetFullName !== originalFullName) firebaseUpdates.displayName = targetFullName;
    if (targetEmail !== originalEmail) firebaseUpdates.email = targetEmail;
    if (targetMobile !== originalMobile && targetMobile.startsWith("+")) {
      firebaseUpdates.phoneNumber = targetMobile;
    }

    let firebaseSuccess = false;
    try {
      if (Object.keys(firebaseUpdates).length > 0 && user.firebaseUid) {
        await updateFirebaseUser(user.firebaseUid, firebaseUpdates);
        firebaseSuccess = true;
      }
    } catch (fbError: any) {
      console.error("Admin user sync to Firebase failed:", fbError);
      return NextResponse.json({
        error: `Authentication server sync failed: ${fbError.message || "Invalid update properties"}`
      }, { status: 400 });
    }

    try {
      user.fullName = targetFullName;
      user.email = targetEmail;
      user.mobile = targetMobile;
      if (usdtWalletAddress !== undefined) user.usdtWalletAddress = usdtWalletAddress;
      if (body.withdrawalsEnabled !== undefined) user.withdrawalsEnabled = body.withdrawalsEnabled;

      await user.save();
    } catch (mongoError: any) {
      console.error("Admin save user details to MongoDB failed, rolling back Firebase:", mongoError);

      if (firebaseSuccess && user.firebaseUid) {
        const rollbackProps: any = {};
        if (targetFullName !== originalFullName) rollbackProps.displayName = originalFullName;
        if (targetEmail !== originalEmail) rollbackProps.email = originalEmail;
        if (targetMobile !== originalMobile && originalMobile.startsWith("+")) {
          rollbackProps.phoneNumber = originalMobile;
        }
        try {
          await updateFirebaseUser(user.firebaseUid, rollbackProps);
        } catch (rollError) {
          console.error("Critical admin Firebase rollback failed:", rollError);
        }
      }

      return NextResponse.json({ error: "Failed to save profile changes to database. Action rolled back." }, { status: 500 });
    }

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
      // Update in Firebase Auth using UID (more robust than email lookup)
      await updateFirebaseUser(user.firebaseUid, { password });
      // Do NOT overwrite user.loginKeyHash or user.accessKeyHash to avoid access key corruption!

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
    let isMainWalletLinked = false;

    if (walletType === "booster") {
      balanceField = "boosterWalletBalance";
    } else if (walletType === "nivesh") {
      balanceField = "nivshWalletBalance";
    } else if (walletType === "usdt") {
      balanceField = "usdtWalletBalance";
    } else if (walletType === "returns") {
      balanceField = "returnsWalletBalance";
    } else if (walletType === "daily_returns") {
      balanceField = "dailyReturnsWallet";
    } else if (walletType === "withdrawal_returns") {
      balanceField = "withdrawalReturnsWallet";
    } else if (walletType === "referral") {
      balanceField = "totalReferralIncome";
      isMainWalletLinked = true;
    } else if (walletType === "matching") {
      balanceField = "totalMatchingIncome";
      isMainWalletLinked = true;
    } else if (walletType === "rewards") {
      balanceField = "totalRewardIncome";
      isMainWalletLinked = true;
    } else if (walletType === "main") {
      balanceField = "walletBalance";
    } else if (walletType === "earnings") {
      balanceField = "earningsWalletBalance";
    } else if (walletType === "total_investment_return") {
      balanceField = "totalInvestmentReturn";
    } else if (walletType === "investment") {
      balanceField = "totalInvestment";
    } else if (walletType === "daily_pending") {
      balanceField = "dailyReturnPending";
    } else if (walletType === "level") {
      balanceField = "totalLevelIncome";
      isMainWalletLinked = true;
    } else if (walletType === "level_pending") {
      balanceField = "pendingReturnsLevelIncome";
    } else if (walletType === "level_earned") {
      balanceField = "totalReturnsLevelIncomeEarned";
    }

    const currentBalance = (user as any)[balanceField] || 0;
    let newBalance = currentBalance;

    if (direction === "credit") {
      newBalance += amount;
    } else {
      newBalance = Math.max(0, currentBalance - amount);
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
    if (isMainWalletLinked) {
      user.walletBalance = Math.max(0, (user.walletBalance || 0) + (direction === "credit" ? amount : -amount));
    }
    
    // Dynamically update investmentCompleted status if totalInvestment is adjusted
    if (walletType === "investment") {
      const WebsiteSettings = (await import("@/models/WebsiteSettings")).default;
      const settings = await WebsiteSettings.findOne({ key: "singleton" });
      const minInvestment = settings?.minimumInvestment ?? settings?.pricing?.minInvestment ?? 100;
      user.investmentCompleted = newBalance >= minInvestment;
    }

    await user.save();

    const walletLabel = 
      walletType === "booster" ? "Booster Wallet" : 
      walletType === "nivesh" ? "Nivesh Wallet" : 
      walletType === "usdt" ? "USDT Wallet" : 
      walletType === "returns" ? "Returns Wallet" : 
      walletType === "referral" ? "Referral Wallet" : 
      walletType === "matching" ? "Matching Wallet" : 
      walletType === "rewards" ? "Rewards Wallet" : 
      walletType === "investment" ? "Active Investment" :
      walletType === "total_investment_return" ? "Total Investment Return" :
      walletType === "daily_pending" ? "Pending Daily Return" :
      walletType === "level" ? "Level Income Wallet" :
      walletType === "level_pending" ? "Pending Level Income" :
      walletType === "level_earned" ? "Lifetime Level Income Earned" :
      "Main Wallet";

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
