import { apiFetch } from './apiClient';
import type { DocumentRecord, DocumentType } from '../types';

interface UploadIntent {
  documentId: string;
  uploadUrl: string | null;
  storageMethod: string;
  uploadToken: string | null;
}

/**
 * Initialize a document upload — creates the metadata record and returns
 * upload credentials (signed URL or fallback token).
 */
export async function requestUploadIntent(
  userId: string,
  fileName: string,
  mimeType: string,
  fileSize: number
): Promise<UploadIntent> {
  const response = await apiFetch('/api/upload-document', {
    method: 'POST',
    body: JSON.stringify({ userId, fileName, mimeType, fileSize }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || `Upload failed (${response.status})`);
  }

  const data = await response.json();
  return {
    documentId: data.documentId,
    uploadUrl: data.uploadUrl,
    storageMethod: data.storageMethod,
    uploadToken: data.uploadToken,
  };
}

/**
 * Upload file content to the signed URL (or fallback to Firestore via API).
 */
export async function uploadFileContent(
  uploadIntent: UploadIntent,
  file: File
): Promise<void> {
  if (uploadIntent.uploadUrl && uploadIntent.storageMethod === 'storage') {
    // Direct upload to Firebase Storage via signed URL
    const response = await fetch(uploadIntent.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`File upload failed (${response.status})`);
    }
  } else {
    // Fallback: upload via API — base64 encode small files
    const base64 = await fileToBase64(file);
    const response = await apiFetch('/api/store-document-content', {
      method: 'POST',
      body: JSON.stringify({
        documentId: uploadIntent.documentId,
        content: base64,
        mimeType: file.type,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Storage failed' }));
      throw new Error(err.error || 'Failed to store document content');
    }
  }
}

/**
 * Upload a complete document: request intent, upload content, confirm.
 */
export async function uploadDocument(
  userId: string,
  file: File
): Promise<DocumentRecord> {
  const intent = await requestUploadIntent(
    userId,
    file.name,
    file.type,
    file.size
  );
  await uploadFileContent(intent, file);

  // Confirm upload and mark as ready
  const confirmResponse = await apiFetch('/api/confirm-document', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      documentId: intent.documentId,
    }),
  });

  if (!confirmResponse.ok) {
    const err = await confirmResponse.json().catch(() => ({ error: 'Confirmation failed' }));
    throw new Error(err.error || 'Failed to confirm document upload');
  }

  const data = await confirmResponse.json();
  return data.document as DocumentRecord;
}

/**
 * Confirm document upload and mark as ready (called after successful upload).
 */
export async function confirmDocument(
  userId: string,
  documentId: string
): Promise<DocumentRecord> {
  const response = await apiFetch('/api/confirm-document', {
    method: 'POST',
    body: JSON.stringify({ userId, documentId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Confirmation failed' }));
    throw new Error(err.error || 'Failed to confirm document');
  }

  const data = await response.json();
  return data.document as DocumentRecord;
}

/**
 * List all documents for the current user.
 */
export async function listDocuments(
  userId: string,
  limit = 50
): Promise<DocumentRecord[]> {
  const response = await apiFetch(
    `/api/list-documents?userId=${encodeURIComponent(userId)}&limit=${limit}`
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'List failed' }));
    if (err.premiumRequired) return [];
    throw new Error(err.error || 'Failed to list documents');
  }

  const data = await response.json();
  return data.documents || [];
}

/**
 * Delete a document by ID.
 */
export async function deleteDocument(
  userId: string,
  documentId: string
): Promise<void> {
  const response = await apiFetch('/api/delete-document', {
    method: 'POST',
    body: JSON.stringify({ userId, documentId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Delete failed' }));
    throw new Error(err.error || 'Failed to delete document');
  }
}

/**
 * Extract text content from a File client-side for preview/processing.
 */
export function extractFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    } else if (file.type.startsWith('image/')) {
      // For images, return a placeholder — OCR would be server-side
      resolve(`[Image file: ${file.name}, ${(file.size / 1024).toFixed(1)} KB]`);
    } else {
      // PDF, DOCX, PPTX — extract via API later
      resolve(`[Document: ${file.name}, ${(file.size / 1024).toFixed(1)} KB — processing available after upload]`);
    }
  });
}

/**
 * Server-side text extraction for PDF, DOCX, and PPTX files.
 * Calls /api/extract-document-text which downloads the file from Storage,
 * parses it with pdf-parse / mammoth / jszip, and returns the raw text.
 */
export async function extractDocumentText(
  userId: string,
  documentId: string
): Promise<{ text: string; format: string; pageCount?: number; slideCount?: number }> {
  const response = await apiFetch('/api/extract-document-text', {
    method: 'POST',
    body: JSON.stringify({ userId, documentId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Text extraction failed' }));
    throw new Error(err.error || 'Failed to extract document text');
  }

  const data = await response.json();
  return {
    text: data.text || '',
    format: data.format || 'unknown',
    pageCount: data.pageCount,
    slideCount: data.slideCount,
  };
}

/**
 * Convert a File to base64 data URL.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:...;base64 prefix to get raw base64
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get display name for document type.
 */
export function getDocumentTypeLabel(type: DocumentType | string): string {
  const labels: Record<string, string> = {
    pdf: 'PDF Document',
    docx: 'Word Document',
    pptx: 'Presentation',
    image: 'Image',
    txt: 'Text File',
    other: 'Document',
  };
  return labels[type] || 'Document';
}

