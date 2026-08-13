import admin from 'firebase-admin';
import env from './env.js';

// Used to verify Firebase ID tokens sent by the storefront (mobile OTP +
// Google sign-in) — see middleware/verifyFirebaseToken.js. The customer
// app never talks to Firebase Admin directly; only this backend does.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.firebase.projectId,
      clientEmail: env.firebase.clientEmail,
      privateKey: env.firebase.privateKey,
    }),
  });
}

export const firebaseAuth = admin.auth();
export default admin;
