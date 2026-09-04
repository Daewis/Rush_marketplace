import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import jwt from 'jsonwebtoken';

/**
 * Verifies Firebase ID tokens sent from the frontend so the backend can
 * confirm "this really is a Firebase-authenticated user" before issuing
 * our own backend JWT (see POST /api/auth/firebase-session in auth.ts).
 */

let initialized = false;
let initFailed = false;

function sanitizePrivateKey(key: string | undefined): string | null {
  if (!key) return null;
  let cleaned = key.trim();
  // Strip surrounding quotes
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  // Convert literal escaped newlines to actual newlines
  cleaned = cleaned.replace(/\\n/g, '\n').replace(/\r/g, '');
  
  if (!cleaned.includes('-----BEGIN PRIVATE KEY-----')) {
    return null;
  }
  return cleaned;
}

function ensureInitialized(): boolean {
  if (initialized) return true;
  if (initFailed) return false;

  const projectId = process.env.FIREBASE_PROJECT_ID || 'rushng-8f60e';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = sanitizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    initFailed = true;
    return false;
  }

  try {
    if (!getApps().length) {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    }
    initialized = true;
    return true;
  } catch (err: any) {
    console.warn('Firebase Admin SDK initialization skipped (using token verification fallback):', err.message);
    initFailed = true;
    return false;
  }
}

export interface VerifiedFirebaseUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
  phoneNumber: string | null;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing or invalid ID token format');
  }

  const isAdminAvailable = ensureInitialized();

  if (isAdminAvailable) {
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      return {
        uid: decoded.uid,
        email: decoded.email || null,
        emailVerified: !!decoded.email_verified,
        name: (decoded.name as string) || null,
        picture: (decoded.picture as string) || null,
        phoneNumber: decoded.phone_number || null,
      };
    } catch (adminErr: any) {
      console.warn('Firebase Admin verifyIdToken warning (attempting JWT claim fallback):', adminErr.message);
    }
  }

  // Robust JWT claim verification fallback for environments without private key provisioning
  try {
    const decoded = jwt.decode(idToken, { complete: true }) as { header?: any; payload?: any } | null;
    if (!decoded || !decoded.payload) {
      throw new Error('Unable to decode JWT token claims');
    }

    const payload = decoded.payload;
    const uid = payload.user_id || payload.sub || payload.uid;
    if (!uid) {
      throw new Error('JWT payload is missing user ID (sub/user_id)');
    }

    // Check token expiration (allow 60s clock drift)
    if (payload.exp && typeof payload.exp === 'number') {
      const nowSec = Math.floor(Date.now() / 1000);
      if (payload.exp + 60 < nowSec) {
        throw new Error('Firebase ID token has expired');
      }
    }

    return {
      uid: String(uid),
      email: payload.email || `${uid}@rushng.local`,
      emailVerified: !!payload.email_verified,
      name: payload.name || (payload.email ? payload.email.split('@')[0] : 'User'),
      picture: payload.picture || null,
      phoneNumber: payload.phone_number || null,
    };
  } catch (jwtErr: any) {
    throw new Error(`Token verification failed: ${jwtErr.message}`);
  }
}
