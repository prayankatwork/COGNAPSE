// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ─── Mock dependencies ─── */

vi.mock('../lib/cors.js', () => ({
  applyCors: vi.fn(),
  handleOptions: vi.fn(() => false),
}));

vi.mock('../lib/auth.js', () => ({
  requireUser: vi.fn(),
}));

vi.mock('../lib/premium.js', () => ({
  getPremiumStatus: vi.fn(),
}));

vi.mock('../lib/storage.js', () => ({
  getDocumentMetadata: vi.fn(),
  deleteDocumentMetadata: vi.fn(),
}));

vi.mock('../lib/firebaseAdmin.js', () => ({
  getFirebaseAdmin: vi.fn(() => null),
}));

vi.mock('../lib/errors.js', () => ({
  sendSafeError: vi.fn((res, status, message) => {
    res.status(status).json({ error: message });
  }),
}));

/* ─── Imports ─── */

import { requireUser } from '../lib/auth.js';
import { getPremiumStatus } from '../lib/premium.js';
import { getDocumentMetadata, deleteDocumentMetadata } from '../lib/storage.js';
import handler from '../delete-document.js';

/* ─── Helpers ─── */

function createReq(body = {}, overrides = {}) {
  return {
    method: 'POST',
    body,
    headers: { origin: 'http://localhost:3000' },
    ...overrides,
  };
}

function createRes() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json, setHeader: vi.fn(), end: vi.fn() };
}

/* ─── Tests ─── */

describe('POST /api/delete-document', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 405 for non-POST methods', async () => {
    const req = { method: 'GET' };
    const res = createRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 400 when required fields are missing', async () => {
    requireUser.mockResolvedValue({ uid: 'user1' });
    const req = createReq({ userId: 'user1' }); // missing documentId
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.status().json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Missing required fields') })
    );
  });

  it('returns 403 when user is not premium', async () => {
    requireUser.mockResolvedValue({ uid: 'user1' });
    getPremiumStatus.mockResolvedValue({ premium: false });
    const req = createReq({ userId: 'user1', documentId: 'doc_123' });
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.status().json).toHaveBeenCalledWith(
      expect.objectContaining({ premiumRequired: true })
    );
  });

  it('returns 404 when document is not found', async () => {
    requireUser.mockResolvedValue({ uid: 'user1' });
    getPremiumStatus.mockResolvedValue({ premium: true });
    getDocumentMetadata.mockResolvedValue(null);
    const req = createReq({ userId: 'user1', documentId: 'doc_123' });
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.status().json).toHaveBeenCalledWith({ error: 'Document not found.' });
  });

  it('returns 403 when document belongs to another user', async () => {
    requireUser.mockResolvedValue({ uid: 'user1' });
    getPremiumStatus.mockResolvedValue({ premium: true });
    getDocumentMetadata.mockResolvedValue({ id: 'doc_123', userId: 'user2', storagePath: 'documents/user2/doc.pdf' });
    const req = createReq({ userId: 'user1', documentId: 'doc_123' });
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.status().json).toHaveBeenCalledWith(
      { error: 'You do not have permission to delete this document.' }
    );
  });

  it('deletes metadata and returns success on valid request', async () => {
    requireUser.mockResolvedValue({ uid: 'user1' });
    getPremiumStatus.mockResolvedValue({ premium: true });
    getDocumentMetadata.mockResolvedValue({
      id: 'doc_123',
      userId: 'user1',
      storagePath: 'documents/user1/doc.pdf',
    });
    const req = createReq({ userId: 'user1', documentId: 'doc_123' });
    const res = createRes();

    await handler(req, res);

    expect(deleteDocumentMetadata).toHaveBeenCalledWith('doc_123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.status().json).toHaveBeenCalledWith({
      success: true,
      message: 'Document deleted successfully.',
    });
  });

  it('cleans up Firebase Storage when available', async () => {
    const mockDeleteFile = vi.fn().mockResolvedValue(undefined);
    const mockBucket = { file: vi.fn(() => ({ delete: mockDeleteFile })) };
    const mockAdmin = { storage: () => ({ bucket: () => mockBucket }) };

    const { getFirebaseAdmin } = await import('../lib/firebaseAdmin.js');
    getFirebaseAdmin.mockReturnValue(mockAdmin);

    requireUser.mockResolvedValue({ uid: 'user1' });
    getPremiumStatus.mockResolvedValue({ premium: true });
    getDocumentMetadata.mockResolvedValue({
      id: 'doc_123',
      userId: 'user1',
      storagePath: 'documents/user1/doc.pdf',
    });
    const req = createReq({ userId: 'user1', documentId: 'doc_123' });
    const res = createRes();

    await handler(req, res);

    expect(mockBucket.file).toHaveBeenCalledWith('documents/user1/doc.pdf');
    expect(mockDeleteFile).toHaveBeenCalled();
    expect(deleteDocumentMetadata).toHaveBeenCalled();
  });
});
