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
  listUserDocuments: vi.fn(),
}));

vi.mock('../lib/errors.js', () => ({
  sendSafeError: vi.fn((res, status, message) => {
    res.status(status).json({ error: message });
  }),
}));

/* ─── Imports ─── */

import { requireUser, assertUserIdMatches } from '../lib/auth.js';
import { getPremiumStatus } from '../lib/premium.js';
import { listUserDocuments } from '../lib/storage.js';
import handler from '../list-documents.js';

/* ─── Helpers ─── */

function createReq(query = {}, overrides = {}) {
  return {
    method: 'GET',
    query,
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

describe('GET /api/list-documents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks that get overridden in specific tests
    assertUserIdMatches.mockReturnValue(true);
  });

  it('returns 405 for non-GET methods', async () => {
    const req = { method: 'POST' };
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 400 when userId is missing', async () => {
    requireUser.mockResolvedValue({ uid: 'user1' });
    const req = createReq({});
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.status().json).toHaveBeenCalledWith({ error: 'Missing userId parameter' });
  });

  it('returns 403 when userId does not match auth', async () => {
    requireUser.mockResolvedValue({ uid: 'other-user' });
    assertUserIdMatches.mockReturnValue(false);
    const req = createReq({ userId: 'user1' });
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 when user is not premium', async () => {
    requireUser.mockResolvedValue({ uid: 'user1' });
    getPremiumStatus.mockResolvedValue({ premium: false });
    const req = createReq({ userId: 'user1' });
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.status().json).toHaveBeenCalledWith(
      expect.objectContaining({ premiumRequired: true, documents: [] })
    );
  });

  it('returns 503 when premium DB is not configured', async () => {
    requireUser.mockResolvedValue({ uid: 'user1' });
    getPremiumStatus.mockRejectedValue(new Error('SERVER_DATABASE_NOT_CONFIGURED'));
    const req = createReq({ userId: 'user1' });
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.status().json).toHaveBeenCalledWith(
      expect.objectContaining({ documents: [] })
    );
  });

  it('returns document list on success', async () => {
    requireUser.mockResolvedValue({ uid: 'user1' });
    getPremiumStatus.mockResolvedValue({ premium: true });
    const mockDocs = [
      { id: 'doc_1', originalName: 'a.pdf', size: 100, status: 'ready' },
      { id: 'doc_2', originalName: 'b.pdf', size: 200, status: 'ready' },
    ];
    listUserDocuments.mockResolvedValue(mockDocs);

    const req = createReq({ userId: 'user1', limit: '10' });
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.status().json).toHaveBeenCalledWith({
      success: true,
      documents: mockDocs,
    });
    expect(listUserDocuments).toHaveBeenCalledWith('user1', 10);
  });

  it('caps limit at 100', async () => {
    requireUser.mockResolvedValue({ uid: 'user1' });
    getPremiumStatus.mockResolvedValue({ premium: true });
    listUserDocuments.mockResolvedValue([]);

    const req = createReq({ userId: 'user1', limit: '999' });
    const res = createRes();

    await handler(req, res);

    expect(listUserDocuments).toHaveBeenCalledWith('user1', 100);
  });
});
