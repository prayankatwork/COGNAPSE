import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Lock,
  FileText,
  Upload,
  Database,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Loader2,
  Search,
  X,
  Sparkles,
  MessageSquare,
  BrainCircuit,
} from 'lucide-react';
import { useStore } from '../store';
import DocumentUploadZone from './DocumentUploadZone';
import DocumentLibrary from './DocumentLibrary';
import DocumentQueryPanel from './DocumentQueryPanel';
import {
  uploadDocument,
  listDocuments,
  deleteDocument,
  extractFileText,
  extractDocumentText,
} from '../services/documentService';
import type { DocumentRecord } from '../types';
import { toast } from '../utils/toast';

/** Safely convert an unknown error to a displayable string */
function errMsg(err: unknown, fallback = 'An unknown error occurred.'): string {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    try { return JSON.stringify(err); } catch { return String(err); }
  }
  return fallback;
}

type Tab = 'upload' | 'query';

export default function DocumentIntelligencePanel() {
  const { user } = useStore();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('upload');

  const isPremium = user?.premium === true;
  const isLocalUser = user?.id?.startsWith('local_');

  const indexedCount = documents.filter((d) => d.status === 'indexed').length;

  // Load documents on mount
  useEffect(() => {
    if (isPremium && user && !isLocalUser) {
      loadDocuments();
    }
  }, [isPremium, user?.id]);

  const loadDocuments = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const docs = await listDocuments(user.id);
      setDocuments(docs);
    } catch (err) {
      console.warn('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (!user) {
        toast.error('Sign in required to upload documents.');
        return;
      }

      if (isLocalUser) {
        toast.error('Document Intelligence requires a cloud account. Register with an email to upload documents.');
        return;
      }

      if (!isPremium) {
        toast.error('Premium subscription required for Document Intelligence.');
        return;
      }

      const file = files[0];
      if (!file) return;

      setIsUploading(true);
      setUploadProgress('Initializing upload...');
      setUploadError(null);

      try {
        const doc = await uploadDocument(user.id, file);

        // Extract preview text — txt is client-side, PDF/DOCX/PPTX go server-side
        let text: string;
        if (file.type === 'text/plain') {
          text = await extractFileText(file);
        } else if (file.type.startsWith('image/')) {
          text = await extractFileText(file);
        } else {
          // PDF, DOCX, PPTX — extract server-side
          setUploadProgress('Extracting text from document...');
          try {
            const result = await extractDocumentText(user.id, doc.id);
            text = result.text || '';
            if (!text) {
              text = `[${file.name} — No extractable text found. This file may contain only images.]`;
            }
          } catch (extractErr) {
            // Fallback to client-side placeholder
            text = await extractFileText(file);
          }
        }
        setUploadProgress('Complete.');

        const docWithText = { ...doc, extractedText: text };
        setDocuments((prev) => [docWithText, ...prev]);
        setSelectedDoc(docWithText);

        toast.success(`"${file.name}" uploaded successfully.`);

        // Auto-switch to query tab after upload so user can process
        setActiveTab('query');
      } catch (err) {
        const message = errMsg(err, 'Upload failed');
        setUploadError(message);
        toast.error(message);
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    },
    [user, isPremium, isLocalUser]
  );

  const handleDelete = async (docId: string) => {
    if (!user) return;
    try {
      await deleteDocument(user.id, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedDoc?.id === docId) setSelectedDoc(null);
      toast.success('Document deleted.');
    } catch (err) {
      toast.error(errMsg(err, 'Delete failed'));
    }
  };

  const handleSelectDoc = (doc: DocumentRecord) => {
    setSelectedDoc(doc === selectedDoc ? null : doc);
  };

  const handleRefreshDocuments = () => {
    loadDocuments();
  };

  // Premium locked state
  if (!isPremium) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-my-border pb-3">
          <Shield size={14} className="text-my-muted" />
          <h2 className="text-[11px] font-bold text-my-ink uppercase tracking-wider">
            Document Intelligence
          </h2>
          <span className="ml-auto text-[8px] px-1.5 py-0.5 bg-my-accent/10 text-my-accent border border-my-accent/20 uppercase tracking-widest font-black">
            Premium
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-my-border p-6 text-center space-y-4"
        >
          <div className="mx-auto w-12 h-12 border-2 border-my-border rounded-full flex items-center justify-center text-my-muted">
            <Lock size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-my-ink uppercase tracking-wider">
              Premium Feature Locked
            </p>
            <p className="text-[9px] text-my-muted/90 mt-2 leading-relaxed max-w-xs mx-auto">
              Upload and analyze PDFs, documents, and images with AI-powered intelligence extraction.
              Activate COGNAPSE Premium to unlock enterprise-grade document processing.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-my-accent/5 border border-my-accent/20 text-[9px] text-my-accent font-bold uppercase tracking-wider">
            <Sparkles size={12} />
            Activate Premium to Access
          </div>
          <div className="flex flex-col gap-2 text-left pt-2">
            <div className="flex items-center gap-2 text-[9px] text-my-ink/70">
              <Shield size={10} className="text-my-accent" /> Secure document storage & encryption
            </div>
            <div className="flex items-center gap-2 text-[9px] text-my-ink/70">
              <Search size={10} className="text-my-accent" /> AI-powered semantic search & Q&A
            </div>
            <div className="flex items-center gap-2 text-[9px] text-my-ink/70">
              <FileText size={10} className="text-my-accent" /> Multi-document synthesis with citations
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Local user notice
  if (isLocalUser) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-my-border pb-3">
          <Shield size={14} className="text-my-muted" />
          <h2 className="text-[11px] font-bold text-my-ink uppercase tracking-wider">
            Document Intelligence
          </h2>
        </div>
        <div className="border border-my-border p-6 text-center">
          <div className="mx-auto w-10 h-10 border border-my-border rounded-full flex items-center justify-center text-my-muted mb-3">
            <Database size={16} />
          </div>
          <p className="text-[10px] text-my-muted uppercase tracking-wider">
            Cloud Account Required
          </p>
          <p className="text-[9px] text-my-muted/90 mt-2">
            Document Intelligence requires a cloud-connected account. Sign out and register with an email to enable document uploads.
          </p>
        </div>
      </div>
    );
  }

  // Main panel (premium users)
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-my-border pb-3">
        <Shield size={14} className="text-my-accent" />
        <h2 className="text-[11px] font-bold text-my-ink uppercase tracking-wider">
          Document Intelligence
        </h2>
        <span className="ml-auto text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest font-black flex items-center gap-1">
          <Shield size={8} /> Active
        </span>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-my-border">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-1.5 px-4 py-2 text-[9px] font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'upload'
              ? 'border-my-accent text-my-accent'
              : 'border-transparent text-my-muted hover:text-my-ink hover:border-my-muted/30'
          }`}
        >
          <Upload size={12} />
          Upload & Manage
        </button>
        <button
          onClick={() => setActiveTab('query')}
          className={`flex items-center gap-1.5 px-4 py-2 text-[9px] font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'query'
              ? 'border-my-accent text-my-accent'
              : 'border-transparent text-my-muted hover:text-my-ink hover:border-my-muted/30'
          }`}
        >
          <MessageSquare size={12} />
          Intelligence Query
          {indexedCount > 0 && (
            <span className="ml-1 text-[7px] px-1 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-sm">
              {indexedCount}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            {/* Upload Zone */}
            <DocumentUploadZone
              onFilesSelected={handleFilesSelected}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              error={uploadError}
              onDismissError={() => setUploadError(null)}
            />

            {/* Document library with toggle */}
            <div className="border border-my-border">
              <button
                onClick={() => setIsLibraryOpen(!isLibraryOpen)}
                className="w-full flex items-center gap-2 p-3 bg-my-callout hover:bg-my-callout/80 transition-colors"
              >
                {isLibraryOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span className="text-[10px] font-bold text-my-ink uppercase tracking-wider">
                  Document Vault
                </span>
                <span className="text-[8px] text-my-muted ml-auto">
                  {documents.length} file{documents.length !== 1 ? 's' : ''}
                </span>
              </button>

              <AnimatePresence>
                {isLibraryOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 border-t border-my-border">
                      <DocumentLibrary
                        documents={documents}
                        isLoading={isLoading}
                        onDelete={handleDelete}
                        onSelect={handleSelectDoc}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Selected document preview */}
            <AnimatePresence>
              {selectedDoc && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="border border-my-border p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-my-accent" />
                      <div>
                        <p className="text-[11px] font-bold text-my-ink">{selectedDoc.originalName}</p>
                        <p className="text-[8px] text-my-muted uppercase tracking-wider">
                          {selectedDoc.documentType.toUpperCase()} {'\u00B7'}{' '}
                          {new Date(selectedDoc.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedDoc(null)}
                      className="p-1 text-my-muted hover:text-my-ink transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  {/* Extracted content preview */}
                  {selectedDoc.extractedText && (
                    <div className="bg-my-callout border border-my-border p-3 max-h-40 overflow-y-auto">
                      <p className="text-[10px] text-my-ink/80 leading-relaxed whitespace-pre-wrap font-mono">
                        {selectedDoc.extractedText}
                      </p>
                    </div>
                  )}

                  {/* Metadata + process action */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-3 text-[8px] text-my-muted uppercase tracking-wider">
                      <span>Size: {selectedDoc.size ? `${(selectedDoc.size / 1024).toFixed(1)} KB` : 'Unknown'}</span>
                      <span>Status: {selectedDoc.status}</span>
                      <span>Type: {selectedDoc.documentType}</span>
                    </div>

                    {/* Process button for ready text files */}
                    {selectedDoc.status === 'ready' && selectedDoc.documentType === 'txt' && (
                      <button
                        onClick={() => {
                          setActiveTab('query');
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-[8px] font-bold text-my-accent uppercase tracking-widest border border-my-accent/20 hover:bg-my-accent/10 transition-colors rounded-sm"
                      >
                        <BrainCircuit size={10} />
                        Process for Query
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {activeTab === 'query' && (
          <motion.div
            key="query"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            {documents.length === 0 ? (
              <div className="border border-my-border p-6 text-center space-y-3">
                <div className="mx-auto w-10 h-10 border border-my-border rounded-full flex items-center justify-center text-my-muted">
                  <Upload size={16} />
                </div>
                <p className="text-[10px] text-my-muted uppercase tracking-wider">
                  No documents to query
                </p>
                <p className="text-[8px] text-my-muted/90">
                  Upload documents in the Upload tab first, then process text files to enable intelligence querying.
                </p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[9px] font-bold text-my-accent uppercase tracking-wider border border-my-accent/20 hover:bg-my-accent/10 transition-colors rounded-sm"
                >
                  <Upload size={10} />
                  Go to Upload
                </button>
              </div>
            ) : (
              <DocumentQueryPanel
                documents={documents}
                onRefreshDocuments={handleRefreshDocuments}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
