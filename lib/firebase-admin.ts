import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp: App;

function normalizeFirebasePrivateKey(value: string) {
  let normalized = value.trim();
  normalized = normalized.replace(/^"|"$/g, "");
  normalized = normalized.replace(/\\r\\n/g, "\n");
  normalized = normalized.replace(/\\n/g, "\n");
  normalized = normalized.replace(/\r/g, "");
  return normalized;
}

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (privateKey) {
    privateKey = normalizeFirebasePrivateKey(privateKey);
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin env vars missing. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY."
    );
  }

  adminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return adminApp;
}

export async function verifyFirebaseToken(idToken: string) {
  const app = getAdminApp();
  return getAuth(app).verifyIdToken(idToken);
}

export async function updateFirebaseUserPasswordByEmail(email: string, newPassword: string) {
  const app = getAdminApp();
  const auth = getAuth(app);
  const userRecord = await auth.getUserByEmail(email);
  await auth.updateUser(userRecord.uid, { password: newPassword });
  return true;
}
