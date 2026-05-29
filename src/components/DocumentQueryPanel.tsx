import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Send,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  BookOpen,
  MessageSquare,
  Sparkles,
  X,
  Clock,
  BrainCircuit,
} from 'lucide-react';
import type { DocumentRecord, RagAnswer } from '../types';
import { getRagAnswer, processDocument } from '../services/documentRagService';
import { extractDocumentText } from '../services/documentService';
import { useStore } from '../store';

/** Safely convert an unknown error to a displayable string */
function errMsg(err: unknown, fallback = 'An unknown error occurred.'): string {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    try { return JSON.stringify(err); } catch { return String(err); }
  }
  return fallback;
}

interface DocumentQueryPanelProps {
  documents: DocumentRecord[];
  onRefreshDocuments: () => void;
}

interface ChatEntry {
  id: string;
  type: 'query' | 'answer' | 'error';
  query?: string;
  answer?: RagAnswer;
  error?: string;
  timestamp: number;
}

export default function DocumentQueryPanel({
  documents,
  onRefreshDocuments,
}: DocumentQueryPanelProps) {
  const { user } = useStore();
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const userId = user?.id || '';

  const indexedDocs = documents.filter((d) => d.status === 'indexed');
  const processableDocs = documents.filter(
    (d) => d.status === 'ready'
  );

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const selectAllIndexed = () => {
    setSelectedDocIds(new Set(indexedDocs.map((d) => d.id)));
  };

  const clearSelection = () => {
    setSelectedDocIds(new Set());
  };

  const handleProcessDocument = async (doc: DocumentRecord) => {
    if (!userId) return;
    setProcessingDocId(doc.id);
    setIsProcessing(true);

    try {
      // Get text: prefer local extractedText, otherwise fetch from server
      let fileText = doc.extractedText;
      if (!fileText || fileText.startsWith('[Document:') || fileText.startsWith('[Image file:')) {
        const result = await extractDocumentText(userId, doc.id);
        fileText = result.text || '';
      }

      if (!fileText || fileText.startsWith('[Document:') || fileText.startsWith('[Image file:')) {
        throw new Error(
          'Unable to extract text from this document. Only text-based files (PDF with text layer, TXT) can be processed for intelligence querying.'
        );
      }

      const result = await processDocument(userId, doc.id, fileText);
      onRefreshDocuments();

      // Auto-select the processed document so the user can query it immediately
      setSelectedDocIds((prev) => new Set(prev).add(doc.id));

      setChatHistory((prev) => [
        ...prev,
        {
          id: `process-${Date.now()}`,
          type: 'answer',
          query: `Processed: ${doc.originalName}`,
          answer: {
            answer: `Document processed successfully. Created **${result.chunkCount} semantic chunks** for intelligence search (${result.latencyMs}ms).`,
            citations: [],
            chunksUsed: result.chunkCount,
            latencyMs: result.latencyMs,
          },
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          type: 'error',
          query: `Process: ${doc.originalName}`,
          error: errMsg(err, 'Processing failed'),
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setProcessingDocId(null);
      setIsProcessing(false);
    }
  };

  const handleSubmitQuery = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || selectedDocIds.size === 0 || isAnswering) return;

    setIsAnswering(true);
    const queryId = `q-${Date.now()}`;

    setChatHistory((prev) => [
      ...prev,
      {
        id: queryId,
        type: 'query',
        query: trimmed,
        timestamp: Date.now(),
      },
    ]);
    setQuery('');

    try {
      const result = await getRagAnswer(
        userId,
        trimmed,
        Array.from(selectedDocIds)
      );

      setChatHistory((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          type: 'answer',
          query: trimmed,
          answer: result,
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          type: 'error',
          query: trimmed,
          error: errMsg(err, 'Failed to generate answer'),
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsAnswering(false);
    }
  }, [query, selectedDocIds, isAnswering, userId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitQuery();
    }
  };

  const clearChat = () => setChatHistory([]);

  return (
    <div className="border border-my-border">
      {/* Document selector header */}
      <div className="p-3 bg-my-callout border-b border-my-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BookOpen size={12} className="text-my-accent" />
            <span className="text-[10px] font-bold text-my-ink uppercase tracking-wider">
              Intelligence Sources
            </span>
          </div>
          <div className="flex items-center gap-2">
            {indexedDocs.length > 0 && (
              <>
                <button
                  onClick={selectAllIndexed}
                  className="text-[8px] text-my-accent hover:text-my-accent/80 uppercase tracking-wider font-bold transition-colors"
                >
                  Select All
                </button>
                <span className="text-my-muted/60">|</span>
                <button
                  onClick={clearSelection}
                  className="text-[8px] text-my-muted hover:text-my-ink uppercase tracking-wider transition-colors"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Document list with checkboxes */}
        <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
          {documents.length === 0 && (
            <p className="text-[9px] text-my-muted/80 py-2 text-center">
              Upload documents first to enable intelligence querying.
            </p>
          )}
          {documents.map((doc) => {
            const isIndexed = doc.status === 'indexed';
            const isSelected = selectedDocIds.has(doc.id);
            const isProcessingThis = processingDocId === doc.id;
            const canProcess = doc.status === 'ready';

            return (
              <div
                key={doc.id}
                className={`flex items-center gap-2 p-1.5 rounded-sm transition-colors ${
                  isIndexed
                    ? 'hover:bg-my-accent/5 cursor-pointer'
                    : 'opacity-60'
                } ${isSelected ? 'bg-my-accent/10' : ''}`}
              >
                {/* Checkbox for indexed docs */}
                <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={!isIndexed}
                    onChange={() => toggleDocSelection(doc.id)}
                    className="accent-my-accent w-3 h-3"
                  />
                  <span className={`text-[10px] truncate ${isSelected ? 'text-my-ink font-bold' : 'text-my-muted'}`}>
                    {doc.originalName}
                  </span>
                </label>

                {/* Status badge + action */}
                <div className="flex items-center gap-1 shrink-0">
                  {isIndexed ? (
                    <span className="flex items-center gap-1 text-[7px] text-emerald-500 uppercase tracking-widest">
                      <CheckCircle2 size={8} /> Indexed
                    </span>
                  ) : doc.status === 'processing' ? (
                    <span className="flex items-center gap-1 text-[7px] text-yellow-500 uppercase tracking-widest">
                      <Loader2 size={8} className="animate-spin" /> Processing
                    </span>
                  ) : doc.status === 'error' ? (
                    <span className="text-[7px] text-red-500 uppercase tracking-widest">Error</span>
                  ) : canProcess ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProcessDocument(doc);
                      }}
                      disabled={isProcessingThis}
                      className="flex items-center gap-1 px-1.5 py-0.5 text-[7px] font-bold text-my-accent uppercase tracking-widest border border-my-accent/20 hover:bg-my-accent/10 transition-colors rounded-sm"
                    >
                      {isProcessingThis ? (
                        <Loader2 size={7} className="animate-spin" />
                      ) : (
                        <BrainCircuit size={7} />
                      )}
                      Process
                    </button>
                  ) : (
                    <span className="text-[7px] text-my-muted/70 uppercase tracking-widest">
                      {doc.documentType.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-col h-[400px]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
          {chatHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <div className="p-3 border border-my-border rounded-full text-my-muted">
                <MessageSquare size={24} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-my-ink uppercase tracking-wider">
                  Document Intelligence Query
                </p>
                <p className="text-[9px] text-my-muted mt-1 max-w-xs mx-auto leading-relaxed">
                  Select indexed documents above, then ask questions about their content.
                  Answers are grounded in the actual document text.
                </p>
              </div>
              {indexedDocs.length > 0 && (
                <div className="flex items-center gap-2 text-[8px] text-my-accent uppercase tracking-wider">
                  <CheckCircle2 size={10} />
                  {indexedDocs.length} document{indexedDocs.length > 1 ? 's' : ''} indexed
                  <span className="text-my-muted">&middot;</span>
                  <button onClick={selectAllIndexed} className="underline hover:no-underline">
                    Select all
                  </button>
                </div>
              )}
              {indexedDocs.length === 0 && processableDocs.length > 0 && (
                <p className="text-[8px] text-my-muted/90">
                  Click <span className="text-my-accent font-bold">Process</span> on your documents to index them for search.
                </p>
              )}
            </div>
          )}

          <AnimatePresence initial={false}>
            {chatHistory.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {entry.type === 'query' && (
                  <div className="flex items-start gap-2 justify-end">
                    <div className="bg-my-accent/10 border border-my-accent/20 px-3 py-2 rounded-sm max-w-[85%]">
                      <p className="text-[10px] text-my-ink leading-relaxed">{entry.query}</p>
                    </div>
                    <div className="p-1.5 bg-my-accent/20 rounded-full text-my-accent shrink-0 mt-0.5">
                      <Search size={10} />
                    </div>
                  </div>
                )}

                {entry.type === 'answer' && entry.answer && (
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-emerald-500/20 rounded-full text-emerald-500 shrink-0 mt-1">
                      <Sparkles size={10} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-my-callout border border-my-border px-3 py-2 rounded-sm">
                        <p className="text-[10px] text-my-ink leading-relaxed whitespace-pre-wrap">
                          {entry.answer.answer}
                        </p>

                        {/* Citations */}
                        {entry.answer.citations.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-my-border space-y-1">
                            <p className="text-[7px] text-my-muted uppercase tracking-widest font-bold">
                              Sources Cited
                            </p>
                            {entry.answer.citations.map((citation, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-1.5 p-1.5 bg-my-accent/[0.03] rounded-sm"
                              >
                                <FileText size={8} className="text-my-accent shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <p className="text-[8px] text-my-muted leading-relaxed line-clamp-2">
                                    "{citation.excerpt.slice(0, 150)}..."
                                  </p>
                                  <p className="text-[7px] text-my-accent mt-0.5">
                                    Relevance: {(citation.score * 100).toFixed(0)}% match
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center gap-2 mt-2 text-[7px] text-my-muted/80 uppercase tracking-widest">
                          <Clock size={7} />
                          {entry.answer.latencyMs}ms
                          <span className="text-my-muted/60">|</span>
                          {entry.answer.chunksUsed} chunks
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {entry.type === 'error' && (
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-red-500/20 rounded-full text-red-500 shrink-0 mt-0.5">
                      <AlertCircle size={10} />
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 px-3 py-2 rounded-sm flex-1">
                      <p className="text-[9px] text-red-500 leading-relaxed">
                        {entry.error || 'An error occurred.'}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {isAnswering && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2"
            >
              <div className="p-1.5 bg-my-accent/20 rounded-full text-my-accent shrink-0 mt-1">
                <Loader2 size={10} className="animate-spin" />
              </div>
              <div className="bg-my-callout border border-my-border px-3 py-2 rounded-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-my-accent/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-my-accent/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-my-accent/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[9px] text-my-muted">Searching documents for relevant content...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-my-border p-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedDocIds.size > 0
                    ? `Ask about ${selectedDocIds.size} document${selectedDocIds.size > 1 ? 's' : ''}...`
                    : 'Select documents above to query...'
                }
                disabled={selectedDocIds.size === 0 || isAnswering}
                className="w-full bg-my-callout border border-my-border pl-3 pr-8 py-2 text-[10px] text-my-ink outline-none focus:border-my-accent transition-colors rounded-sm placeholder:text-my-muted/50 disabled:opacity-40"
              />
              {query.length > 0 && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-my-muted hover:text-my-ink transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              onClick={handleSubmitQuery}
              disabled={!query.trim() || selectedDocIds.size === 0 || isAnswering}
              className="p-2 bg-my-accent text-white dark:text-black rounded-sm hover:bg-my-accent/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isAnswering ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
            </button>
          </div>

          {/* Bottom metadata */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[7px] text-my-muted/70 uppercase tracking-widest">
              {indexedDocs.length} indexed &middot; {selectedDocIds.size} selected
            </span>
            {chatHistory.length > 0 && (
              <button
                onClick={clearChat}
                className="text-[7px] text-my-muted hover:text-my-ink uppercase tracking-widest transition-colors"
              >
                Clear chat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
