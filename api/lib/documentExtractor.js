/**
 * COGNAPSE Document Intelligence — Server-Side Text Extractor
 *
 * Extracts raw text from PDF, DOCX, and PPTX files using pure JavaScript.
 * Zero API costs — all parsing is local. Works in Vercel serverless (128MB limit).
 *
 * PDF extraction uses Node.js built-in zlib (no external deps).
 * DOCX uses mammoth (MIT). PPTX uses jszip (MIT) — both already in package.json.
 */
import zlib from 'zlib';
import mammoth from 'mammoth';
import JSZip from 'jszip';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_PDF_PAGES = 100;

/* ─── Pure-JS PDF Text Extractor (zero native deps) ──────────────────── */

/**
 * Extract text from a PDF buffer using pure JavaScript + Node.js built-in zlib.
 *
 * Handles both compressed (FlateDecode) and uncompressed content streams.
 * Parses PDF text-showing operators: Tj, TJ, ', "
 * No native dependencies — works on any Node.js runtime.
 */
function extractFromPDF(buffer) {
  const raw = buffer.toString('latin1');
  const pageCount = (raw.match(/\/Type\s*\/Page[^s]/g) || []).length || 1;
  const maxPages = Math.min(pageCount, MAX_PDF_PAGES);

  // Find all stream objects and try to extract text from them
  const texts = [];
  const streamRegex = /stream\s(.+?)\n?endstream/gs;
  const objRegex = /(\d+)\s+(\d+)\s+obj[\s\S]*?endobj/gs;

  let match;
  while ((match = streamRegex.exec(raw)) !== null) {
    try {
      // Capture raw stream content — don't trim yet (could corrupt binary compressed data)
      let data = match[1];

      // Check if stream uses FlateDecode (compressed) by looking back in the object
      const streamPos = match.index;
      let isCompressed = false;

      objRegex.lastIndex = 0;
      let objMatch;
      while ((objMatch = objRegex.exec(raw)) !== null) {
        if (objMatch.index <= streamPos && objRegex.lastIndex >= streamPos) {
          const objBody = objMatch[0];
          // Check if the object's stream dictionary uses FlateDecode compression.
          // Handles all syntax variants:
          //   /Filter /FlateDecode         (simple name)
          //   /Filter [/FlateDecode]       (single-element array)
          //   /Filter [/FlateDecode /LZW]  (multi-element array)
          if (/\/Filter[^>]*FlateDecode/i.test(objBody)) {
            isCompressed = true;
          }
          break;
        }
      }

      if (isCompressed) {
        try {
          // Strip leading/trailing newlines that may have been captured by regex
          // boundaries (especially with \r\n line endings). Safe because valid
          // zlib headers start with 0x78, never \r/\n.
          data = data.replace(/^[\r\n]+|[\r\n]+$/g, '');
          const compressed = Buffer.from(data, 'binary');
          const decompressed = zlib.inflateSync(compressed);
          data = decompressed.toString('latin1');
        } catch {
          continue; // skip if decompression fails
        }
      } else {
        data = data.trim();
      }

      // Extract text from PDF operators:
      // Tj operator: (text) Tj
      // TJ operator: [(text) num (text)] TJ
      // ' operator: (text) '
      // " operator: (text) num num "
      let text = '';

      // Match Tj operator: (content between parens) followed by Tj
      const tjRegex = /\(([^)]*)\)\s*Tj/gs;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(data)) !== null) {
        text += parsePDFString(tjMatch[1]) + ' ';
      }

      // Match ' operator (move to next line and show text)
      const quoteRegex = /\(([^)]*)\)\s*'/gs;
      let qMatch;
      while ((qMatch = quoteRegex.exec(data)) !== null) {
        text += parsePDFString(qMatch[1]) + ' ';
      }

      // Match TJ operator with array of strings
      const tjArrayRegex = /\[([^\]]*)\]\s*TJ/gs;
      let tjArrayMatch;
      while ((tjArrayMatch = tjArrayRegex.exec(data)) !== null) {
        const arrayContent = tjArrayMatch[1];
        const strRegex = /\(([^)]*)\)/g;
        let strMatch;
        while ((strMatch = strRegex.exec(arrayContent)) !== null) {
          text += parsePDFString(strMatch[1]);
        }
        text += ' ';
      }

      const cleaned = text.replace(/\s+/g, ' ').trim();
      if (cleaned) texts.push(cleaned);
    } catch {
      // skip problematic streams
    }
  }

  return {
    text: texts.join('\n\n'),
    pageCount: maxPages,
  };
}

/**
 * Parse a PDF string literal, handling escape sequences.
 * PDF uses \n, \r, \t, \\, \(, \), and octal escapes.
 */
function parsePDFString(str) {
  return str
    .replace(/\\([nrt])/g, (_, c) => c === 'n' ? '\n' : c === 'r' ? '\r' : '\t')
    .replace(/\\([\\()])/g, '$1')
    .replace(/\\(\d{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/\\(.)/g, '$1');
}

/* ─── DOCX Extractor (mammoth) ─────────────────────────────────────────── */

/**
 * Extract text from a DOCX buffer using mammoth.
 */
async function extractFromDOCX(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: (result.value || '').trim(),
  };
}

/* ─── PPTX Extractor (JSZip) ───────────────────────────────────────────── */

/**
 * Extract text from a PPTX buffer.
 * PPTX is a ZIP archive containing XML files. We unzip, find slide XMLs,
 * and extract text from <a:t> (text) elements.
 */
async function extractFromPPTX(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort();

  const slideTexts = [];
  for (const slidePath of slideFiles) {
    const file = zip.files[slidePath];
    if (!file || file.dir) continue;
    const xmlStr = await file.async('string');
    const textMatches = xmlStr.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
    const texts = textMatches.map((m) => {
      const inner = m.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '');
      return inner.trim();
    });
    const slideText = texts.filter(Boolean).join('\n');
    if (slideText) slideTexts.push(slideText);
  }

  return {
    text: slideTexts.join('\n\n---\n\n'),
    slideCount: slideTexts.length,
  };
}

/* ─── Main Dispatcher ──────────────────────────────────────────────────── */

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
    const result = extractFromPDF(buffer);
    return {
      text: result.text,
      format: 'pdf',
      pageCount: result.pageCount,
    };
  }

  // DOCX / DOC
  if (mimeType.includes('word') || ext === 'docx' || ext === 'doc') {
    const result = await extractFromDOCX(buffer);
    return { text: result.text, format: 'docx' };
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
    if (text.length > 0) return { text, format: ext || 'text' };
  } catch { /* ignore */ }

  throw new Error(`Unsupported file format: ${mimeType || ext || 'unknown'}. Supported: PDF, DOCX, PPTX.`);
}

/**
 * Estimate whether a file is likely extractable (has text content, not image-only).
 */
export function isExtractable(mimeType, fileName) {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (mimeType.includes('pdf') || ext === 'pdf') return true;
  if (mimeType.includes('word') || ext === 'docx' || ext === 'doc') return true;
  if (mimeType.includes('powerpoint') || ext === 'pptx' || ext === 'ppt') return true;
  return false;
}
