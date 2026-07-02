import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp: App;

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (privateKey) {
    // Trim surrounding quotes if present (some env providers paste with quotes)
    privateKey = privateKey.replace(/^\"|\"$/g, "");
    // Replace escaped newlines with real newlines
    privateKey = privateKey.replace(/\\n/g, "\n");
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
