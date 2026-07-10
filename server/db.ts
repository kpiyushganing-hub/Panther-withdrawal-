import admin from 'firebase-admin';

try {
  admin.initializeApp();
  console.log('Firebase Admin initialized.');
} catch (error: any) {
  if (!/already exists/.test(error.message)) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export const db = admin.firestore();
export const connectDB = async () => {}; // No-op for backwards compatibility with server.ts
