import fs from 'fs';
import path from 'path';

// Generate a minimal valid PDF with text content
function generatePDF(text) {
  const esc = (s) => s.replace(/[\\()]/g, '\\$&');
  const content = `BT /F1 12 Tf 50 700 Td (${esc(text)}) Tj ET`;
  const streamLen = Buffer.byteLength(content);
  const font = 'Helvetica';

  const doc = [];
  let n = 0;
  const next = () => ++n;

  const c = next();
  const p = next();
  const pg = next();
  const s = next();
  const f = next();

  doc.push('%PDF-1.4');
  doc.push(`${c} 0 obj<< /Type /Catalog /Pages ${p} 0 R >>endobj`);
  doc.push(`${p} 0 obj<< /Type /Pages /Kids [${pg} 0 R] /Count 1 >>endobj`);
  doc.push(`${pg} 0 obj<< /Type /Page /Parent ${p} 0 R /MediaBox [0 0 612 792] /Contents ${s} 0 R /Resources << /Font << /F1 ${f} 0 R >> >> >>endobj`);
  doc.push(`${s} 0 obj<< /Length ${streamLen} >>stream\n${content}\nendstream\nendobj`);
  doc.push(`${f} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /${font} >>endobj`);
  doc.push('xref');
  const offsets = [];
  let offset = doc[0].length + 1;
  for (let i = 1; i < doc.length; i++) {
    offsets.push(offset);
    offset += Buffer.byteLength(doc[i]) + 1;
  }
  doc.push(`0 ${n + 1}`);
  doc.push('0000000000 65535 f');
  for (const off of offsets) {
    doc.push(String(off).padStart(10, '0') + ' 00000 n');
  }
  doc.push('trailer<< /Size ' + (n + 1) + ' /Root ' + c + ' 0 R >>');
  doc.push('startxref');
  doc.push(offset);
  doc.push('%%EOF');

  return doc.join('\n');
}

// Generate test PDF with substantial text content (~2KB) to exercise chunking
const testText = [
  'COGNAPSE Document Intelligence Test',
  '====================================',
  '',
  'This is a test document for verifying the Document Intelligence pipeline.',
  '',
  'Artificial Intelligence Overview',
  '',
  'Artificial intelligence (AI) is the simulation of human intelligence processes by computer systems. These processes include learning, reasoning, and self-correction. AI applications include expert systems, natural language processing, speech recognition, and machine vision.',
  '',
  'Machine Learning Fundamentals',
  '',
  'Machine learning is a subset of AI that enables systems to learn and improve from experience without being explicitly programmed. Key types include supervised learning, unsupervised learning, and reinforcement learning. Common algorithms include decision trees, neural networks, and support vector machines.',
  '',
  'Neural Networks and Deep Learning',
  '',
  'Neural networks are computing systems inspired by biological neural networks. Deep learning uses多层 neural networks to progressively extract higher-level features from raw input. Applications include image recognition, natural language processing, and autonomous vehicles.',
  '',
  'Natural Language Processing',
  '',
  'NLP is a branch of AI that helps computers understand, interpret, and manipulate human language. Key tasks include text classification, sentiment analysis, machine translation, and question answering. Modern NLP relies on transformer architectures like BERT and GPT.',
  '',
  'Data Science and Analytics',
  '',
  'Data science combines statistics, computer science, and domain expertise to extract insights from data. The data science lifecycle includes data collection, cleaning, exploration, modeling, and deployment. Python and R are the most commonly used programming languages.',
  '',
  'COGNAPSE Capabilities',
  '',
  'COGNAPSE is an intelligence analysis platform that provides deep research capabilities, document analysis, and real-time intelligence monitoring. It supports PDF, DOCX, and PPTX document processing with semantic search and question-answering features.',
  '',
  'Test Document Metadata',
  'Created: 2026-05-26',
  'Purpose: End-to-end pipeline verification',
  'Expected behavior: Upload -> Process -> Index -> Query -> Answer',
  '',
  'Sample Query: What is machine learning and how does it relate to AI?',
].join('\n');

const pdf = generatePDF(testText);
const outPath = path.resolve('test-document.pdf');
fs.writeFileSync(outPath, pdf);
console.log('Test PDF generated at:', outPath);
console.log('Size:', fs.statSync(outPath).size, 'bytes');
console.log('Text length:', testText.length, 'chars');
console.log('\nFirst 200 chars of text:', testText.slice(0, 200));
