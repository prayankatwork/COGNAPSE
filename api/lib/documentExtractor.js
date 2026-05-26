/**
 * COGNAPSE Document Intelligence — Server-Side Text Extractor
 *
 * Extracts raw text from PDF, DOCX, and PPTX files using pure JavaScript.
 * Zero API costs — all parsing is local. Works in Vercel serverless (128MB limit).
 *
 * Libraries used:
 *   - pdfjs-dist (Apache-2.0) → Mozilla's PDF.js (pure JS, zero native deps)
 *   - mammoth     (MIT)       → DOCX → text conversion
 *   - jszip       (MIT)       → PPTX unzip + XML slide parsing (already in deps)
 */

import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';
import JSZip from 'jszip';

// Disable PDF.js worker — we run synchronously in Node.js serverless
pdfjs.GlobalWorkerOptions.workerSrc = '';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_PDF_PAGES = 100;

/* ─── PDF.js Text Extractor ────────────────────────────────────────────── */

/**
 * Extract text from a PDF buffer using Mozilla's PDF.js (pure JS).
 * Handles compressed content streams, fonts, encodings, and layouts.
 *
 * @param {Buffer} buffer
 * @returns {Promise<{ text: string, pageCount: number }>}
 */
async function extractFromPDF(buffer) {
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const doc = await loadingTask.promise;

  try {
    const pageCount = Math.min(doc.numPages, MAX_PDF_PAGES);
    const texts = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      try {
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .trim();
        if (pageText) texts.push(pageText);
      } finally {
        page.cleanup();
      }
    }

    return {
      text: texts.join('\n\n'),
      pageCount,
    };
  } finally {
    // Free memory — critical in serverless
    await doc.destroy().catch(() => {});
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
