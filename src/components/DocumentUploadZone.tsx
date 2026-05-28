import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X, Image, File } from 'lucide-react';
import { formatFileSize } from '../services/documentService';

interface DocumentUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploading: boolean;
  uploadProgress: string | null;
  error: string | null;
  onDismissError: () => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = '.pdf,.docx,.doc,.pptx,.ppt,.png,.jpg,.jpeg,.gif,.webp,.txt';

export default function DocumentUploadZone({
  onFilesSelected,
  isUploading,
  uploadProgress,
  error,
  onDismissError,
  disabled = false,
}: DocumentUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ name: string; type: string; size: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        ACCEPTED_TYPES.split(',').some((ext) => f.name.toLowerCase().endsWith(ext.replace('.', '')))
      );
      if (files.length > 0) {
        setPreviewFile({ name: files[0].name, type: files[0].type, size: files[0].size });
        onFilesSelected(files);
      }
    },
    [disabled, onFilesSelected]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        setPreviewFile({ name: files[0].name, type: files[0].type, size: files[0].size });
        onFilesSelected(files);
      }
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    },
    [onFilesSelected]
  );

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText size={20} />;
    if (type.includes('image')) return <Image size={20} />;
    return <File size={20} />;
  };

  return (
    <div className="space-y-3">
      {/* Drag-and-drop zone */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={{
          borderColor: isDragging
            ? 'rgb(242, 125, 38)'
            : disabled
              ? 'rgba(100, 116, 139, 0.2)'
              : 'rgba(100, 116, 139, 0.3)',
          backgroundColor: isDragging
            ? 'rgba(242, 125, 38, 0.05)'
            : 'transparent',
        }}
        className={`relative border-2 border-dashed rounded-sm p-8 text-center transition-colors cursor-pointer group ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-my-accent/50'
        } ${isDragging ? 'border-my-accent bg-my-accent/5' : ''}`}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="relative">
                <Loader2 size={32} className="text-my-accent animate-spin" />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-my-accent/30"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div>
                <p className="text-[11px] font-bold text-my-ink uppercase tracking-wider">
                  Intelligence Parsing
                </p>
                <p className="text-[9px] text-my-muted mt-1">
                  {uploadProgress || 'Encrypting and indexing document...'}
                </p>
              </div>
            </motion.div>
          ) : previewFile ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="p-2 bg-my-accent/10 rounded-full text-my-accent">
                {getFileIcon(previewFile.type)}
              </div>
              <div>
                <p className="text-[11px] font-bold text-my-ink">{previewFile.name}</p>
                <p className="text-[9px] text-my-muted">{formatFileSize(previewFile.size)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewFile(null);
                }}
                className="text-[9px] text-my-muted hover:text-red-500 transition-colors flex items-center gap-1"
              >
                <X size={10} /> Clear
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="p-3 border border-my-border rounded-full text-my-muted group-hover:text-my-accent group-hover:border-my-accent/50 transition-colors">
                <Upload size={24} className="group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-my-ink uppercase tracking-wider">
                  Drop Intelligence Documents
                </p>
                <p className="text-[9px] text-my-muted mt-1">
                  or click to browse — PDF, DOCX, PPTX, images
                </p>
              </div>
              <span className="text-[8px] text-my-muted/80 uppercase tracking-widest border border-my-border px-2 py-0.5">
                Premium Feature
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Glow effect on drag */}
        {isDragging && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 border-2 border-my-accent/20 animate-pulse" />
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-my-accent to-transparent" />
            <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-my-accent to-transparent" />
          </motion.div>
        )}
      </motion.div>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-sm"
          >
            <AlertCircle size={12} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-500 flex-1 leading-relaxed">{error ? String(error) : ''}</p>
            <button onClick={onDismissError} className="text-red-500/50 hover:text-red-500">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
