import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Image, File, Trash2, Search, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import type { DocumentRecord } from '../types';
import { formatFileSize, getDocumentTypeLabel } from '../services/documentService';

interface DocumentLibraryProps {
  documents: DocumentRecord[];
  isLoading: boolean;
  onDelete: (docId: string) => void;
  onSelect: (doc: DocumentRecord) => void;
}

export default function DocumentLibrary({
  documents,
  isLoading,
  onDelete,
  onSelect,
}: DocumentLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = documents.filter((doc) =>
    doc.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDocIcon = (type: string) => {
    if (type === 'pdf') return <FileText size={14} />;
    if (type === 'image') return <Image size={14} />;
    if (type === 'docx' || type === 'pptx') return <FileText size={14} />;
    return <File size={14} />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return (
          <span className="flex items-center gap-1 text-[8px] ds-text-warning uppercase tracking-wider">
            <Loader2 size={8} className="animate-spin" /> Processing
          </span>
        );
      case 'ready':
        return (
          <span className="text-[8px] ds-text-success uppercase tracking-wider">
            Ready
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-[8px] ds-text-danger uppercase tracking-wider">
            <AlertCircle size={8} /> Error
          </span>
        );
      default:
        return null;
    }
  };

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(docId);
    try {
      await onDelete(docId);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={20} className="text-my-accent animate-spin" />
          <p className="text-[10px] text-my-muted uppercase tracking-wider">
            Loading documents...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search bar */}
      {documents.length > 0 && (
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-my-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full bg-my-callout border border-my-border pl-8 pr-3 py-2 text-[10px] text-my-ink outline-none focus:border-my-accent transition-colors rounded-sm placeholder:text-my-muted/50"
          />
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <div className="mx-auto w-10 h-10 border border-my-border rounded-full flex items-center justify-center text-my-muted mb-3">
            <FileText size={16} />
          </div>
          <p className="text-[10px] text-my-muted uppercase tracking-wider">
            {searchQuery ? 'No documents match your search' : 'No documents uploaded yet'}
          </p>
          <p className="text-[8px] text-my-muted/80 mt-1">
            {searchQuery ? 'Try a different search term' : 'Drag & drop files above to begin'}
          </p>
        </div>
      )}

      {/* Document list */}
      <AnimatePresence mode="popLayout">
        {filtered.map((doc) => (
          <motion.div
            key={doc.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10, height: 0 }}
            onClick={() => onSelect(doc)}
            className="flex items-center gap-3 p-3 border border-my-border hover:border-my-accent/30 hover:bg-my-accent/[0.02] transition-all cursor-pointer group rounded-sm"
          >
            {/* Icon */}
            <div className="p-2 bg-my-accent/5 rounded-sm text-my-accent shrink-0">
              {getDocIcon(doc.documentType)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-bold text-my-ink truncate">
                  {doc.originalName}
                </p>
                {getStatusBadge(doc.status)}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[8px] text-my-muted/90 uppercase tracking-wider">
                  {getDocumentTypeLabel(doc.documentType)}
                </span>
                <span className="text-[8px] text-my-muted/90">
                  {formatFileSize(doc.size)}
                </span>
                <span className="flex items-center gap-1 text-[8px] text-my-muted/70">
                  <Calendar size={8} />
                  {new Date(doc.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => handleDelete(doc.id, e)}
                disabled={deletingId === doc.id}
                className="p-1.5 text-my-muted hover:ds-text-danger hover:bg-red-500/10 dark:hover:bg-red-400/10 transition-colors rounded-sm"
                title="Delete document"
              >
                {deletingId === doc.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
