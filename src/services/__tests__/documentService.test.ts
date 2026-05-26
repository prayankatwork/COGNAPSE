// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiClient before importing the module under test
vi.mock('../apiClient', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../apiClient';
import {
  requestUploadIntent,
  uploadFileContent,
  uploadDocument,
  confirmDocument,
  listDocuments,
  deleteDocument,
  formatFileSize,
  getDocumentTypeLabel,
  extractFileText,
} from '../documentService';

/* ─── Mock helpers ─── */

function mockOkResponse(data: unknown) {
  return {
    ok: true,
    json: () => Promise.resolve(data),
    status: 200,
  } as Response;
}

function mockErrorResponse(status: number, body: Record<string, unknown>) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function createMockFile(name: string, type: string, size: number): File {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
}

/* ─── Tests ─── */

describe('requestUploadIntent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns upload intent on success', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      mockOkResponse({
        documentId: 'doc_123',
        uploadUrl: 'https://storage.example.com/upload',
        storageMethod: 'storage',
        uploadToken: null,
      })
    );

    const result = await requestUploadIntent('user1', 'doc.pdf', 'application/pdf', 1024);

    expect(result.documentId).toBe('doc_123');
    expect(result.uploadUrl).toBe('https://storage.example.com/upload');
    expect(result.storageMethod).toBe('storage');
    expect(apiFetch).toHaveBeenCalledWith('/api/upload-document', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"userId":"user1"'),
    }));
  });

  it('throws on API error', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      mockErrorResponse(403, { error: 'Premium required', premiumRequired: true })
    );

    await expect(
      requestUploadIntent('user1', 'doc.pdf', 'application/pdf', 1024)
    ).rejects.toThrow('Premium required');
  });

  it('throws with generic message when response body cannot be parsed', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Invalid JSON')),
    } as Response);

    await expect(
      requestUploadIntent('user1', 'doc.pdf', 'application/pdf', 1024)
    ).rejects.toThrow('Upload failed');
  });
});

describe('uploadFileContent', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('uploads via signed URL when storage method is storage', async () => {
    const file = createMockFile('doc.pdf', 'application/pdf', 128);
    const intent = {
      documentId: 'doc_123',
      uploadUrl: 'https://storage.example.com/upload',
      storageMethod: 'storage',
      uploadToken: null,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

    await uploadFileContent(intent, file);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://storage.example.com/upload',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: file,
      })
    );
  });

  it('throws when signed URL upload fails', async () => {
    const file = createMockFile('doc.pdf', 'application/pdf', 128);
    const intent = {
      documentId: 'doc_123',
      uploadUrl: 'https://storage.example.com/upload',
      storageMethod: 'storage',
      uploadToken: null,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 } as Response);

    await expect(uploadFileContent(intent, file)).rejects.toThrow('File upload failed (403)');
  });

  it('falls back to Firestore API when no signed URL', async () => {
    const file = createMockFile('doc.pdf', 'application/pdf', 128);
    const intent = {
      documentId: 'doc_123',
      uploadUrl: null,
      storageMethod: 'firestore',
      uploadToken: 'token-abc',
    };

    vi.mocked(apiFetch).mockResolvedValue(mockOkResponse({ success: true }));

    await uploadFileContent(intent, file);

    expect(apiFetch).toHaveBeenCalledWith('/api/store-document-content', expect.any(Object));
  });
});

describe('uploadDocument (integration flow)', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('performs full upload pipeline: intent → upload → confirm', async () => {
    const file = createMockFile('report.pdf', 'application/pdf', 256);
    const mockDocumentRecord = {
      id: 'doc_123',
      userId: 'user1',
      originalName: 'report.pdf',
      mimeType: 'application/pdf',
      documentType: 'pdf',
      size: 256,
      status: 'ready',
      storagePath: 'documents/user1/report.pdf',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Intent step
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(
        mockOkResponse({
          documentId: 'doc_123',
          uploadUrl: 'https://storage.example.com/upload',
          storageMethod: 'storage',
          uploadToken: null,
        })
      );

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

    // Confirm step
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(
        mockOkResponse({ success: true, document: mockDocumentRecord })
      );

    const result = await uploadDocument('user1', file);

    expect(result.id).toBe('doc_123');
    expect(result.originalName).toBe('report.pdf');
    expect(result.status).toBe('ready');
    // 2 apiFetch calls: intent + confirm
    expect(vi.mocked(apiFetch)).toHaveBeenCalledTimes(2);
  });

  it('throws when confirmation fails', async () => {
    const file = createMockFile('report.pdf', 'application/pdf', 256);

    vi.mocked(apiFetch)
      .mockResolvedValueOnce(mockOkResponse({
        documentId: 'doc_123',
        uploadUrl: null,
        storageMethod: 'firestore',
        uploadToken: 'token-abc',
      }));

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

    vi.mocked(apiFetch)
      .mockResolvedValueOnce(mockErrorResponse(500, { error: 'Confirmation failed' }));

    await expect(uploadDocument('user1', file)).rejects.toThrow('Confirmation failed');
  });
});

describe('confirmDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns document record on success', async () => {
    const doc = {
      id: 'doc_123',
      userId: 'user1',
      originalName: 'doc.pdf',
      documentType: 'pdf',
      size: 1024,
      status: 'ready',
      storagePath: 'documents/user1/doc.pdf',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;

    vi.mocked(apiFetch).mockResolvedValue(mockOkResponse({ success: true, document: doc }));

    const result = await confirmDocument('user1', 'doc_123');
    expect(result.id).toBe('doc_123');
    expect(result.status).toBe('ready');
  });

  it('throws on failure', async () => {
    vi.mocked(apiFetch).mockResolvedValue(mockErrorResponse(404, { error: 'Not found' }));
    await expect(confirmDocument('user1', 'doc_123')).rejects.toThrow('Not found');
  });
});

describe('listDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns document list on success', async () => {
    const docs = [
      { id: 'doc_1', originalName: 'a.pdf' },
      { id: 'doc_2', originalName: 'b.pdf' },
    ];
    vi.mocked(apiFetch).mockResolvedValue(mockOkResponse({ success: true, documents: docs }));

    const result = await listDocuments('user1');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('doc_1');
  });

  it('returns empty array when premiumRequired is true', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      mockErrorResponse(403, { premiumRequired: true, documents: [] })
    );

    const result = await listDocuments('user1');
    expect(result).toEqual([]);
  });

  it('throws on non-premium errors', async () => {
    vi.mocked(apiFetch).mockResolvedValue(mockErrorResponse(500, { error: 'Server error' }));
    await expect(listDocuments('user1')).rejects.toThrow('Server error');
  });
});

describe('deleteDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('succeeds on 200', async () => {
    vi.mocked(apiFetch).mockResolvedValue(mockOkResponse({ success: true }));
    await expect(deleteDocument('user1', 'doc_123')).resolves.toBeUndefined();
  });

  it('throws on failure', async () => {
    vi.mocked(apiFetch).mockResolvedValue(mockErrorResponse(404, { error: 'Not found' }));
    await expect(deleteDocument('user1', 'doc_123')).rejects.toThrow('Not found');
  });
});

describe('extractFileText', () => {
  it('extracts text from .txt files', async () => {
    const file = new File(['Hello World'], 'readme.txt', { type: 'text/plain' });
    const text = await extractFileText(file);
    expect(text).toBe('Hello World');
  });

  it('returns placeholder for image files', async () => {
    const file = new File([''], 'photo.png', { type: 'image/png' });
    // Mock size: 50 KB
    Object.defineProperty(file, 'size', { value: 50 * 1024 });
    const text = await extractFileText(file);
    expect(text).toContain('[Image file: photo.png');
    expect(text).toContain('50.0 KB');
  });

  it('returns placeholder for other document types', async () => {
    const file = new File([''], 'report.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 });
    const text = await extractFileText(file);
    expect(text).toContain('[Document: report.pdf');
    expect(text).toContain('1.0 KB');
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => expect(formatFileSize(500)).toBe('500 B'));
  it('formats KB', () => expect(formatFileSize(2048)).toBe('2.0 KB'));
  it('formats MB', () => expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB'));
});

describe('getDocumentTypeLabel', () => {
  it('returns correct labels for known types', () => {
    expect(getDocumentTypeLabel('pdf')).toBe('PDF Document');
    expect(getDocumentTypeLabel('docx')).toBe('Word Document');
    expect(getDocumentTypeLabel('pptx')).toBe('Presentation');
    expect(getDocumentTypeLabel('image')).toBe('Image');
    expect(getDocumentTypeLabel('txt')).toBe('Text File');
  });

  it('falls back to "Document" for unknown types', () => {
    expect(getDocumentTypeLabel('unknown')).toBe('Document');
  });
});
