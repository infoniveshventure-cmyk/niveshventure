import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import User from "@/models/User";
import { getSessionFromCookies } from "@/lib/auth-server";
import { notifyMember, notifyUser } from "@/lib/notification";

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  let memberId = session?.memberId;
  if (!memberId) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer temp_support_")) {
      memberId = authHeader.replace("Bearer ", "");
    }
  }
  if (!memberId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  const tickets = await SupportTicket.find({ memberId }).sort({ createdAt: -1 });
  return NextResponse.json({ tickets });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    let memberId = session?.memberId;

    const body = await req.json();
    const { category, subject, message, token } = body;

    if (!memberId) {
      const authHeader = req.headers.get("Authorization") || token;
      if (authHeader && (authHeader.startsWith("Bearer temp_support_") || authHeader.startsWith("temp_support_"))) {
        memberId = authHeader.replace("Bearer ", "").trim();
      }
    }

    if (!memberId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    }

    await connectDB();

    const titleSubject = category ? `[${category}] ${subject}` : subject;

    const ticket = await SupportTicket.create({
      memberId,
      subject: titleSubject,
      message,
      status: "pending",
    });

    // Notify Admin (we can create a notification for all admin users)
    const admins = await User.find({ role: "admin" }).select("_id");
    for (const admin of admins) {
      try {
        await notifyUser(
          admin._id,
          "New Support Ticket Created",
          `User ${memberId} raised a support ticket: "${subject}"`,
          "support_ticket",
          ticket._id
        );
      } catch (e) {
        console.error("Admin notification failed:", e);
      }
    }

    // Notify user themselves
    notifyMember(
      memberId,
      "Support Ticket Submitted 🎫",
      `Your support ticket "${titleSubject}" has been submitted. Our team will respond soon.`,
      "support_ticket_created",
      ticket._id
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      ticket
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Failed to submit request" }, { status: 500 });
  }
}

// User replying to ticket or deleting reply
export async function PATCH(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { ticketId, message, action, replyId } = body;

  if (!ticketId) {
    return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
  }

  await connectDB();
  const ticket = await SupportTicket.findOne({ _id: ticketId, memberId: session.memberId });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  if (action === "delete_reply") {
    if (!replyId) {
      return NextResponse.json({ error: "Reply ID is required to delete" }, { status: 400 });
    }
    ticket.replies = ticket.replies.filter((r: any) => r._id.toString() !== replyId);
    await ticket.save();
    return NextResponse.json({ success: true, ticket });
  }

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  ticket.replies.push({
    from: "member",
    message,
    createdAt: new Date(),
  });

  // Re-open ticket state to pending when user replies
  ticket.status = "pending";
  await ticket.save();

  // Notify Admins about new reply
  const admins = await User.find({ role: "admin" }).select("_id");
  for (const admin of admins) {
    try {
      await notifyUser(
        admin._id,
        "New Reply on Support Ticket",
        `User ${session.memberId} replied to ticket: "${ticket.subject}"`,
        "support_ticket",
        ticket._id
      );
    } catch (e) {
      console.error(e);
    }
  }

  return NextResponse.json({ success: true, ticket });
}
