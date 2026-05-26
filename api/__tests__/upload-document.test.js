// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ─── Mock dependencies ─── */

vi.mock('../lib/cors.js', () => ({
  applyCors: vi.fn(),
  handleOptions: vi.fn(() => false),
}));

vi.mock('../lib/auth.js', () => ({
  requireUser: vi.fn(),
  assertUserIdMatches: vi.fn(() => true),
}));

vi.mock('../lib/premium.js', () => ({
  getPremiumStatus: vi.fn(),
}));

vi.mock('../lib/storage.js', () => ({
  generateUploadUrl: vi.fn(),
  saveDocumentMetadata: vi.fn(),
  classifyDocumentType: vi.fn(() => 'pdf'),
  validateDocumentUpload: vi.fn(() => ({ valid: true, error: null })),
}));

vi.mock('../lib/errors.js', () => ({
  sendSafeError: vi.fn((res, status, message) => {
    res.status(status).json({ error: message });
  }),
}));

/* ─── Imports ─── */

import { applyCors, handleOptions } from '../lib/cors.js';
import { requireUser, assertUserIdMatches } from '../lib/auth.js';
import { getPremiumStatus } from '../lib/premium.js';
import { generateUploadUrl, saveDocumentMetadata, classifyDocumentType, validateDocumentUpload } from '../lib/storage.js';
import handler from '../upload-document.js';

/* ─── Helpers ─── */

function createReq(method = 'POST', body = {}, overrides = {}) {
  return {
    method,
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

describe('POST /api/upload-document', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks that get overridden in specific tests
    // to prevent state leaking between tests
    assertUserIdMatches.mockReturnValue(true);
    validateDocumentUpload.mockReturnValue({ valid: true, error: null });
  });

  it('returns 405 for non-POST methods', async () => {
    const req = createReq('GET');
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.status().json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 401 when user is not authenticated', async () => {
    requireUser.mockResolvedValue(false);
    const req = createReq('POST', { userId: 'user1', fileName: 'doc.pdf', mimeType: 'application/pdf' });
    const res = createRes();

    await handler(req, res);

    // requireUser returned false, so endpoint should have bailed
    expect(saveDocumentMetadata).not.toHaveBeenCalled();
  });

  it('returns 400 when required fields are missing', async () => {
    requireUser.mockResolvedValue({ uid: 'user1' });
    const req = createReq('POST', { userId: 'user1' }); // missing fileName and mimeType
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.status().json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Missing required fields') })
    );
  });

  it('returns 403 when userId does not match auth', async () => {
    requireUser.mockResolvedValue({ uid: 'other-user' });
    assertUserIdMatches.mockReturnValue(false);
    const req = createReq('POST', { userId: 'user1', fileName: 'doc.pdf', mimeType: 'application/pdf' });
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 for local user accounts', async () => {
    requireUser.mockResolvedValue({ uid: 'local_abc123' });
    const req = createReq('POST', { userId: 'local_abc123', fileName: 'doc.pdf', mimeType: 'application/pdf' });
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.status().json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('cloud account') })
    );
  });

  it('returns 403 when user is not premium', async () => {
    requireUser.mockResolvedValue({ uid: 'user1' });
    getPremiumStatus.mockResolvedValue({ premium: false });
    const req = createReq('POST', { userId: 'user1', fileName: 'doc.pdf', mimeType: 'application/pdf' });
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.status().json).toHaveBeenCalledWith(
      expect.objectContaining({ premiumRequired: true })
    );
  });

  it('returns 503 when premium DB is not configured', async () => {
    requireUser.mockResolvedValue({ uid: 'user1' });
    getPremiumStatus.mockRejectedValue(new Error('SERVER_DATABASE_NOT_CONFIGURED'));
    const req = createReq('POST', { userId: 'user1', fileName: 'doc.pdf', mimeType: 'application/pdf' });
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('returns 400 when file validation fails', async () => {
    requireUser.mockResolvedValue({ uid: 'user1' });
    getPremiumStatus.mockResolvedValue({ premium: true });
    validateDocumentUpload.mockReturnValue({ valid: false, error: 'File too large.' });
    const req = createReq('POST', { userId: 'user1', fileName: 'huge.pdf', mimeType: 'application/pdf', fileSize: 999999999 });
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.status().json).toHaveBeenCalledWith({ error: 'File too large.' });
  });

  it('returns 200 with upload URL on success', async () => {
    requireUser.mockResolvedValue({ uid: 'user1' });
    getPremiumStatus.mockResolvedValue({ premium: true });
    validateDocumentUpload.mockReturnValue({ valid: true, error: null });
    generateUploadUrl.mockResolvedValue({
      uploadUrl: 'https://storage.example.com/upload',
      storagePath: 'documents/user1/doc.pdf',
      method: 'storage',
    });

    const req = createReq('POST', {
      userId: 'user1',
      fileName: 'doc.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
    });
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.status().json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        documentId: expect.stringContaining('doc_'),
        uploadUrl: 'https://storage.example.com/upload',
        storageMethod: 'storage',
      })
    );
    expect(saveDocumentMetadata).toHaveBeenCalledOnce();
  });

  it('returns 500 when storage generation fails', async () => {
    requireUser.mockResolvedValue({ uid: 'user1' });
    getPremiumStatus.mockResolvedValue({ premium: true });
    generateUploadUrl.mockRejectedValue(new Error('Storage unavailable'));
    const req = createReq('POST', { userId: 'user1', fileName: 'doc.pdf', mimeType: 'application/pdf' });
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
