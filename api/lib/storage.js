import crypto from 'crypto';
import { getFirestoreAdmin, getFirebaseAdmin } from './firebaseAdmin.js';

/**
 * Check if Firebase Storage is available (requires storage bucket config).
 * Falls back to Firestore-only storage if Storage is not configured.
 */
function hasStorageBucket() {
  return !!(process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET);
}

/**
 * Store document metadata in Firestore under user's document collection.
 */
export async function saveDocumentMetadata(record) {
  const db = getFirestoreAdmin();
  if (!db) throw new Error('SERVER_DATABASE_NOT_CONFIGURED');
  await db.collection('user_documents').doc(record.id).set(record);
}

/**
 * Get a single document record by ID.
 */
export async function getDocumentMetadata(documentId) {
  const db = getFirestoreAdmin();
  if (!db) throw new Error('SERVER_DATABASE_NOT_CONFIGURED');
  const snap = await db.collection('user_documents').doc(documentId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * List all documents for a given user, ordered by creation date descending.
 */
export async function listUserDocuments(userId, limit = 50) {
  const db = getFirestoreAdmin();
  if (!db) throw new Error('SERVER_DATABASE_NOT_CONFIGURED');
  const q = db
    .collection('user_documents')
    .where('userId', '==', userId);
  const snap = await q.get();
  const docs = snap.docs.map((d) => {
    const { content, ...rest } = d.data();
    return { id: d.id, ...rest };
  });
  // Sort by createdAt descending (in-memory to avoid needing a composite Firestore index)
  docs.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
  return docs.slice(0, limit);
}

/**
 * Delete document metadata from Firestore.
 */
export async function deleteDocumentMetadata(documentId) {
  const db = getFirestoreAdmin();
  if (!db) throw new Error('SERVER_DATABASE_NOT_CONFIGURED');
  await db.collection('user_documents').doc(documentId).delete();
}

/**
 * Fetch a document's file content as a Buffer.
 * Supports both Firebase Storage (via storagePath) and Firestore fallback (base64 content).
 *
 * @param {object} doc - Document metadata record from getDocumentMetadata()
 * @returns {Promise<Buffer>} File content buffer
 */
export async function getDocumentFile(doc) {
  if (!doc) throw new Error('Document metadata not found.');

  // Firestore fallback — doc.content holds base64-encoded data
  if (doc.content) {
    return Buffer.from(doc.content, 'base64');
  }

  // Firebase Storage — download via Admin SDK
  if (doc.storagePath && !doc.storagePath.startsWith('firestore/')) {
    const admin = getFirebaseAdmin();
    if (!admin) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
    const bucket = admin.storage().bucket();
    const file = bucket.file(doc.storagePath);
    const [buffer] = await file.download();
    return buffer;
  }

  throw new Error('Document file not found. The file may have been stored via a method that is no longer available.');
}

/**
 * Generate a signed upload URL for Firebase Storage.
 * Falls back to generating an upload token for Firestore-based storage.
 */
export async function generateUploadUrl(userId, fileName, mimeType) {
  // Try Firebase Storage signed URL first
  if (hasStorageBucket()) {
    try {
      const admin = getFirebaseAdmin();
      if (!admin) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
      const bucket = admin.storage().bucket();
      const filePath = `documents/${userId}/${Date.now()}_${fileName}`;
      const file = bucket.file(filePath);

      const [url] = await file.getSignedUrl({
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000,
        contentType: mimeType,
      });

      return {
        uploadUrl: url,
        storagePath: filePath,
        method: 'storage',
      };
    } catch (storageErr) {
      console.warn('[Storage] getSignedUrl failed, falling back to Firestore:', storageErr?.message || storageErr);
      // fall through to Firestore fallback below
    }
  }

  // Fallback: return a token for Firestore-based upload
  return {
    uploadUrl: null,
    storagePath: `firestore/${userId}/${Date.now()}_${fileName}`,
    method: 'firestore',
    uploadToken: crypto.randomUUID(),
  };
}

/**
 * Determine document type from MIME type.
 */
export function classifyDocumentType(mimeType, fileName) {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (mimeType.includes('pdf') || ext === 'pdf') return 'pdf';
  if (mimeType.includes('word') || ext === 'docx' || ext === 'doc') return 'docx';
  if (mimeType.includes('powerpoint') || ext === 'pptx' || ext === 'ppt') return 'pptx';
  if (mimeType.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  if (mimeType.includes('text') || ext === 'txt') return 'txt';
  return 'other';
}

/**
 * Validate file size and type for premium document upload.
 */
export function validateDocumentUpload(fileSize, mimeType) {
  const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'text/plain',
  ];

  if (fileSize > MAX_SIZE) {
    return { valid: false, error: 'File size exceeds 50 MB limit.' };
  }

  const isAllowed = ALLOWED_TYPES.some(
    (t) => mimeType.includes(t) || mimeType === t
  );

  if (!isAllowed) {
    return {
      valid: false,
      error: 'Unsupported file type. Allowed: PDF, DOCX, PPTX, images, and text files.',
    };
  }

  return { valid: true, error: null };
}
