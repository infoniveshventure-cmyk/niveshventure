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

export async function updateFirebaseUser(uid: string, properties: { email?: string; phoneNumber?: string; displayName?: string }) {
  const app = getAdminApp();
  const auth = getAuth(app);
  return auth.updateUser(uid, properties);
}

export async function updateFirebaseUserPasswordByEmail(email: string, newPassword: string) {
  const app = getAdminApp();
  const auth = getAuth(app);
  const userRecord = await auth.getUserByEmail(email);
  await auth.updateUser(userRecord.uid, { password: newPassword });
  return true;
}

/**
 * Create a new Firebase Auth user server-side.
 * Called only after OTP verification, so incomplete registrations
 * never permanently block the email in Firebase.
 */
export async function createFirebaseUser(email: string, password: string) {
  const app = getAdminApp();
  return getAuth(app).createUser({ email, password });
}

/**
 * Delete a Firebase Auth user by UID.
 * Used for cleanup if MongoDB user creation fails after Firebase account was created.
 */
export async function deleteFirebaseUser(uid: string) {
  try {
    const app = getAdminApp();
    await getAuth(app).deleteUser(uid);
  } catch {
    // Best-effort cleanup — log but don't rethrow
    console.error(`[firebase-admin] Failed to delete Firebase user ${uid}`);
  }
}

/**
 * Create a custom sign-in token for a Firebase UID.
 * Returned to the client so it can call signInWithCustomToken(auth, token)
 * immediately after server-side registration.
 */
export async function createFirebaseCustomToken(uid: string) {
  const app = getAdminApp();
  return getAuth(app).createCustomToken(uid);
}
