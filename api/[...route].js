/**
 * COGNAPSE API — Catch-All Router
 * Full route table with all 22 handlers.
 *
 * Route map:
 *   System  → /api/health, /api/ops-telemetry
 *   Auth    → /api/check-premium, /api/revoke-session, /api/admin-auth/verify
 *   Admin   → /api/admin-terminate, /api/admin-track, /api/clear-data
 *   Premium → /api/create-order, /api/verify-payment
 *   Research → /api/research, /api/analyze, /api/search
 *   Documents → /api/upload-document, /api/list-documents, /api/confirm-document,
 *               /api/delete-document, /api/store-document-content,
 *               /api/store-document-chunks, /api/query-document-chunks,
 *               /api/rag-answer, /api/extract-document-text
 */
import * as system from './lib/handlers/system.js';
import * as auth from './lib/handlers/auth.js';
import * as admin from './lib/handlers/admin.js';
import * as premium from './lib/handlers/premium.js';
import * as research from './lib/handlers/research.js';
import * as documents from './lib/handlers/documents.js';

const routes = {
  'health':                  system.handleHealth,
  'ops-telemetry':           system.handleOpsTelemetry,
  'check-premium':           auth.handleCheckPremium,
  'revoke-session':          auth.handleRevokeSession,
  'admin-auth':              auth.handleAdminAuth,
  'admin-auth/verify':       auth.handleAdminAuth,
  'admin-terminate':         admin.handleAdminTerminate,
  'admin-track':             admin.handleAdminTrack,
  'clear-data':              admin.handleClearData,
  'create-order':            premium.handleCreateOrder,
  'verify-payment':          premium.handleVerifyPayment,
  'research':                research.handleResearch,
  'analyze':                 research.handleAnalyze,
  'search':                  research.handleSearch,
  'upload-document':         documents.handleUploadDocument,
  'list-documents':          documents.handleListDocuments,
  'confirm-document':        documents.handleConfirmDocument,
  'delete-document':         documents.handleDeleteDocument,
  'store-document-content':  documents.handleStoreDocumentContent,
  'store-document-chunks':   documents.handleStoreDocumentChunks,
  'query-document-chunks':   documents.handleQueryDocumentChunks,
  'rag-answer':              documents.handleRagAnswer,
  'extract-document-text':   documents.handleExtractDocumentText,
};

export default async function handler(req, res) {
  let segments = [];
  const vercelSegments = req.query?.['...route'];
  if (Array.isArray(vercelSegments) && vercelSegments.length > 0) segments = vercelSegments;
  if (segments.length === 0) {
    const routeParam = req.query?.route;
    if (Array.isArray(routeParam) && routeParam.length > 0) segments = routeParam;
  }
  if (segments.length === 0) {
    const urlPath = (req.url || '').split('?')[0];
    const match = urlPath.match(/^\/api\/(.+)$/);
    if (match) segments = match[1].split('/').filter(Boolean);
  }

  const path = segments.join('/');
  const routeHandler = routes[path];

  if (!routeHandler) {
    return res.status(404).json({ error: `Route not found: /api/${path}`, path });
  }

  try {
    await routeHandler(req, res);
  } catch (error) {
    console.error(`[Router] Unhandled error in /api/${path}:`, error?.message || error);
    if (!res.headersSent) {
      return res.status(500).json({ error: `Internal server error in /api/${path}` });
    }
  }
}
