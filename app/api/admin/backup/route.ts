import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import MonthlyClosing from "@/models/MonthlyClosing";
import { requireAdmin } from "@/lib/require-admin";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const files = fs.readdirSync(backupDir);
  const backups = files
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const filePath = path.join(backupDir, f);
      const stat = fs.statSync(filePath);
      return {
        filename: f,
        size: stat.size,
        createdAt: stat.birthtime,
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return NextResponse.json({ backups });
}

export async function POST() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectDB();

  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  // Backup key databases
  const users = await User.find({}).lean();
  const transactions = await Transaction.find({}).lean();
  const closing = await MonthlyClosing.find({}).lean();

  const backupData = {
    timestamp: new Date().toISOString(),
    users,
    transactions,
    closing,
  };

  const filename = `backup-${Date.now()}.json`;
  const filePath = path.join(backupDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

  return NextResponse.json({
    success: true,
    filename,
    size: fs.statSync(filePath).size,
  });
}
