import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';
import { requireUser } from './lib/auth.js';
import { getPremiumStatus } from './lib/premium.js';
import { getDocumentMetadata, getDocumentFile } from './lib/storage.js';
import { extractDocumentText } from './lib/documentExtractor.js';

/**
 * POST /api/extract-document-text
 *
 * Premium-gated server-side text extraction for PDF, DOCX, and PPTX files.
 *
 * Flow:
 * 1. Receives a documentId of an uploaded file
 * 2. Fetches the file bytes from Firebase Storage (or Firestore fallback)
 * 3. Runs the appropriate parser (pdf-parse / mammoth / jszip)
 * 4. Returns the extracted text so the frontend can store it and enable Processing
 *
 * Zero-cost operation — all parsing is local pure JS.
 * No external API calls, no per-file fees.
 */
export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const { userId, documentId } = req.body || {};

  if (!userId || !documentId) {
    return res.status(400).json({
      error: 'Missing required fields: userId, documentId',
    });
  }

  const uid = decoded?.uid || userId;

  // Premium gate
  try {
    const premium = await getPremiumStatus(uid);
    if (!premium.premium) {
      return res.status(403).json({
        error: 'Premium subscription required.',
        premiumRequired: true,
      });
    }
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to verify premium status.', error);
  }

  try {
    // Step 1: Fetch document metadata
    const doc = await getDocumentMetadata(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    if (doc.userId !== uid) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    // Check if already extracted
    if (doc.extractedText) {
      return res.status(200).json({
        success: true,
        text: doc.extractedText,
        format: doc.documentType,
        pageCount: doc.pageCount || undefined,
        cached: true,
      });
    }

    // Step 2: Fetch file bytes
    let buffer;
    try {
      buffer = await getDocumentFile(doc);
    } catch (err) {
      return res.status(400).json({
        error: `Could not retrieve file content: ${err.message}`,
      });
    }

    // Step 3: Extract text
    const result = await extractDocumentText(buffer, doc.mimeType, doc.originalName);

    if (!result.text || result.text.length === 0) {
      return res.status(200).json({
        success: true,
        text: '',
        format: result.format,
        warning: 'No extractable text found. This file may contain only images (scanned document).',
      });
    }

    return res.status(200).json({
      success: true,
      text: result.text,
      format: result.format,
      pageCount: result.pageCount,
      slideCount: result.slideCount,
      cached: false,
    });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to extract document text.', error);
  }
}
