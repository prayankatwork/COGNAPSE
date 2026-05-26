/**
 * COGNAPSE Document Intelligence — Server-Side Text Extractor
 *
 * Extracts raw text from PDF, DOCX, and PPTX files using pure JavaScript.
 * Zero API costs — all parsing is local. Works in Vercel serverless (128MB limit).
 *
 * Libraries used:
 *   - pdf-parse (MIT)    → PDF text extraction via Mozilla's PDF.js
 *   - mammoth    (MIT)    → DOCX → text conversion
 *   - jszip      (MIT)    → PPTX unzip + XML slide parsing (already in deps)
 */

import mammoth from 'mammoth';
import JSZip from 'jszip';

/**
 * Lazily loads pdf-parse using createRequire.
 * pdf-parse v2.x uses @napi-rs/canvas which fails on Vercel's serverless runtime.
 * By lazy-loading, the crash is isolated to only the PDF extraction endpoint
 * instead of bringing down the entire API.
 */
let _pdfParse = null;
let _pdfParseError = null;

async function getPdfParse() {
  if (_pdfParse) return _pdfParse;
  if (_pdfParseError) throw _pdfParseError;

  try {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    _pdfParse = require('pdf-parse');
    return _pdfParse;
  } catch (err) {
    _pdfParseError = new Error(
      `PDF parsing library unavailable: ${err.message}. ` +
      'The pdf-parse v2.x native addon (@napi-rs/canvas) is not available in this ' +
      'server environment. Consider using pdf-parse v1.x (pure JS, no native deps).'
    );
    throw _pdfParseError;
  }
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_PDF_PAGES = 50;               // Limit to first 50 pages to avoid timeout

/**
 * Extract text from a PDF buffer.
 * @param {Buffer} buffer
 * @returns {Promise<{ text: string, pageCount: number }>}
 */
async function extractFromPDF(buffer) {
  const pdfParse = await getPdfParse();
  const { PDFParse } = pdfParse;
  const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 });

  try {
    await parser.load();

    // Get page count first — this is metadata and could fail on damaged PDFs,
    // so we catch gracefully to avoid losing the text extraction result below.
    let pageCount = 0;
    try {
      const infoResult = await parser.getInfo();
      pageCount = infoResult?.total || 0;
    } catch {
      // Non-critical — page count is cosmetic, extraction can proceed without it
    }
    pageCount = Math.min(pageCount, MAX_PDF_PAGES);

    // Note: getText() extracts all pages. The page cap above limits only the
    // reported count, not the extraction work. The 50MB file size limit
    // (enforced in extractDocumentText) provides the actual guardrail against
    // large documents causing serverless timeouts.
    const textResult = await parser.getText();

    return {
      text: (textResult?.text || '').trim(),
      pageCount,
    };
  } finally {
    // Clean up to prevent memory leaks in serverless environment
    await parser.destroy().catch(() => {});
  }
}

/**
 * Extract text from a DOCX buffer using mammoth.
 * @param {Buffer} buffer
 * @returns {Promise<{ text: string }>}
 */
async function extractFromDOCX(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: (result.value || '').trim(),
  };
}

/**
 * Extract text from a PPTX buffer.
 * PPTX is a ZIP archive containing XML files. We unzip, find slide XMLs,
 * and extract text from <a:t> (text) elements.
 *
 * @param {Buffer} buffer
 * @returns {Promise<{ text: string, slideCount: number }>}
 */
async function extractFromPPTX(buffer) {
  const zip = await JSZip.loadAsync(buffer);

  // Collect all slide XML files (ppt/slides/slide1.xml, slide2.xml, ...)
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort(); // natural sort works because of leading zeros in filenames

  const slideTexts = [];

  for (const slidePath of slideFiles) {
    const file = zip.files[slidePath];
    if (!file || file.dir) continue;

    const xmlStr = await file.async('string');

    // Extract text from <a:t> elements (common PowerPoint text tag)
    const textMatches = xmlStr.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
    const texts = textMatches.map((m) => {
      const inner = m.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '');
      return inner.trim();
    });

    const slideText = texts.filter(Boolean).join('\n');
    if (slideText) {
      slideTexts.push(slideText);
    }
  }

  return {
    text: slideTexts.join('\n\n---\n\n'),
    slideCount: slideTexts.length,
  };
}

/**
 * Main dispatcher — extract text from a file buffer based on MIME type.
 *
 * @param {Buffer} buffer - Raw file bytes
 * @param {string} mimeType - MIME type of the file
 * @param {string} fileName - Original file name (used for fallback detection)
 * @returns {Promise<{ text: string, format: string, pageCount?: number, slideCount?: number }>}
 */
export async function extractDocumentText(buffer, mimeType, fileName) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Empty or invalid file buffer.');
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024} MB.`);
  }

  const ext = fileName?.split('.').pop()?.toLowerCase();

  // PDF
  if (mimeType.includes('pdf') || ext === 'pdf') {
    const result = await extractFromPDF(buffer);
    return {
      text: result.text,
      format: 'pdf',
      pageCount: result.pageCount,
    };
  }

  // DOCX / DOC
  if (mimeType.includes('word') || ext === 'docx' || ext === 'doc') {
    const result = await extractFromDOCX(buffer);
    return {
      text: result.text,
      format: 'docx',
    };
  }

  // PPTX / PPT
  if (mimeType.includes('powerpoint') || ext === 'pptx' || ext === 'ppt') {
    const result = await extractFromPPTX(buffer);
    return {
      text: result.text,
      format: 'pptx',
      slideCount: result.slideCount,
    };
  }

  // Fallback: try reading as UTF-8 text
  try {
    const text = buffer.toString('utf-8').trim();
    if (text.length > 0) {
      return { text, format: ext || 'text' };
    }
  } catch {
    // ignore
  }

  throw new Error(`Unsupported file format: ${mimeType || ext || 'unknown'}. Supported: PDF, DOCX, PPTX.`);
}

/**
 * Estimate whether a file is likely extractable (has text content, not image-only).
 * pdf-parse returns empty text for scanned/image-only PDFs.
 */
export function isExtractable(mimeType, fileName) {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (mimeType.includes('pdf') || ext === 'pdf') return true;
  if (mimeType.includes('word') || ext === 'docx' || ext === 'doc') return true;
  if (mimeType.includes('powerpoint') || ext === 'pptx' || ext === 'ppt') return true;
  return false;
}
