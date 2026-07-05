import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET as string;
const COOKIE_NAME = "mlm_session";

export function signSession(payload: { memberId: string; role: string }) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET missing in .env");
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifySession(token: string) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET missing in .env");
  return jwt.verify(token, JWT_SECRET) as { memberId: string; role: string };
}

export async function getSessionFromCookies() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifySession(token);
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE_NAME;

export async function hashSecret(value: string) {
  return bcrypt.hash(value, 10);
}

export async function compareSecret(value: string, hash: string) {
  return bcrypt.compare(value, hash);
}

export function generateMemberId() {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `NV${num}`;
}

export function generateKey(prefix: string) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${out}`;
}

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
