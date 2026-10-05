import React, { useState, useEffect } from 'react';
import {
  Upload,
  BookOpen,
  FileText,
  Layers,
  Search,
  Sliders,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Database,
  FileCheck2
} from 'lucide-react';
import { DocumentRecord, DocumentChunk, RetrievedContextItem } from '../types';
import { api } from '../api';

export const KnowledgeBaseView: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Inspector State
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  // Hybrid Search Sandbox
  const [sandboxQuery, setSandboxQuery] = useState('gradient descent learning rate optimization neural network');
  const [denseWeight, setDenseWeight] = useState(0.6);
  const [bm25Weight, setBm25Weight] = useState(0.4);
  const [searchResults, setSearchResults] = useState<RetrievedContextItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadDocuments();
    executeSandboxSearch();
  }, []);

  const loadDocuments = async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data);
      if (data.length > 0 && !selectedDoc) {
        inspectDocument(data[0]);
      }
    } catch (e) {
      console.error('Failed to load documents:', e);
    }
  };

  const inspectDocument = async (doc: DocumentRecord) => {
    setSelectedDoc(doc);
    setLoadingChunks(true);
    try {
      const data = await api.getDocumentChunks(doc.id);
      setChunks(data);
    } catch (e) {
      console.error('Failed to load chunks:', e);
    } finally {
      setLoadingChunks(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    setStatusMsg('Running Semantic Chunking and Late Chunking indexing...');

    try {
      await api.uploadDocument(selectedFile);
      setStatusMsg('Document indexed successfully in Qdrant & BM25!');
      setSelectedFile(null);
      await loadDocuments();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm('Are you sure you want to remove this curriculum document?')) return;
    try {
      await api.deleteDocument(docId);
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
        setChunks([]);
      }
      await loadDocuments();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const executeSandboxSearch = async () => {
    if (!sandboxQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.testHybridSearch(sandboxQuery, 4, denseWeight, bm25Weight);
      setSearchResults(res.results);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Curriculum Knowledge Base &amp; RAG Indexing
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Educational PDFs and documents parsed with Semantic Chunking, Late Chunking, and Qdrant + BM25 Hybrid Retrieval
        </p>
      </div>

      {/* Row 1: Ingestion Card & Document List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <div className="lg:col-span-1 saas-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
              <Upload className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Upload Curriculum Document
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Upload textbook chapters or lesson worksheets (PDF, TXT, MD). Text is split into
              semantic boundaries and enriched with document context envelopes.
            </p>

            <form onSubmit={handleUpload} className="space-y-3.5">
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-5 text-center bg-slate-50/50 transition-colors">
                <input
                  type="file"
                  id="curriculum-file"
                  accept=".pdf,.txt,.md"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="curriculum-file"
                  className="cursor-pointer flex flex-col items-center justify-center text-xs"
                >
                  <FileText className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="font-semibold text-slate-800">
                    {selectedFile ? selectedFile.name : 'Select curriculum file'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono mt-1">
                    PDF, TXT, MD &bull; Up to 50MB
                  </span>
                </label>
              </div>

              {statusMsg && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-mono">
                  {statusMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Layers className="w-4 h-4" />
                <span>{uploading ? 'Processing...' : 'Index in Qdrant & BM25'}</span>
              </button>
            </form>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
            Chunking Engine: Semantic Chunking + Late Chunking
          </div>
        </div>

        {/* Documents Table */}
        <div className="lg:col-span-2 saas-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Indexed Documents ({documents.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                Embedded in Qdrant Local Collection
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left saas-table">
                <thead>
                  <tr>
                    <th>Title &amp; Filename</th>
                    <th>Pages</th>
                    <th>Chunks</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.length > 0 ? (
                    documents.map((doc) => (
                      <tr
                        key={doc.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          selectedDoc?.id === doc.id ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <td>
                          <div className="font-semibold text-slate-900">{doc.title}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{doc.filename}</div>
                        </td>
                        <td className="text-slate-600 font-mono">{doc.total_pages}</td>
                        <td className="text-blue-700 font-bold font-mono">{doc.chunk_count}</td>
                        <td className="text-slate-500 font-mono text-[11px]">
                          {(doc.file_size_bytes / 1024).toFixed(1)} KB
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        </td>
                        <td className="text-right space-x-1.5">
                          <button
                            onClick={() => inspectDocument(doc)}
                            className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 border border-slate-200"
                            title="Inspect Chunks"
                          >
                            <Eye className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600 border border-slate-200"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No documents indexed yet. Upload a curriculum file on the left.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between text-[11px] text-slate-500 font-mono">
            <span>Cosine Vector Embeddings: 384 Dim</span>
            <span>BM25 Lexical Index: Active</span>
          </div>
        </div>
      </div>

      {/* Row 2: Semantic Chunking & Late Chunking Inspector */}
      {selectedDoc && (
        <div className="saas-card p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                Chunk Inspector: {selectedDoc.title}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Displays semantic chunk splits and Late Chunking contextual envelopes
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-purple-700">
              {chunks.length} Total Chunks
            </span>
          </div>

          {loadingChunks ? (
            <div className="p-6 text-center text-slate-400 text-xs font-mono">
              Loading chunk representations...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto p-1">
              {chunks.map((ch) => (
                <div
                  key={ch.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between text-xs space-y-2"
                >
                  <div>
                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 pb-1.5 border-b border-slate-200">
                      <span className="font-bold text-blue-700">Chunk #{ch.chunk_index}</span>
                      <span>Page {ch.page_number}</span>
                      <span>{ch.token_count} words</span>
                    </div>
                    <p className="text-slate-800 line-clamp-3 leading-relaxed mt-2">
                      "{ch.content}"
                    </p>
                  </div>

                  {ch.late_chunk_context && (
                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-[10px] font-mono font-semibold text-purple-700 flex items-center gap-1 mb-0.5">
                        <FileCheck2 className="w-3 h-3" /> Late Chunk Context Envelope:
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono line-clamp-2 italic">
                        {ch.late_chunk_context}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Row 3: Hybrid Search Sandbox */}
      <div className="saas-card p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              Hybrid Retrieval Sandbox (Qdrant Dense + BM25 Lexical)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Test Reciprocal Rank Fusion (RRF) scoring across the curriculum knowledge base
            </p>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Test Query Prompt
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sandboxQuery}
                onChange={(e) => setSandboxQuery(e.target.value)}
                placeholder="Enter educational query..."
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-hidden focus:border-blue-500 font-medium"
              />
              <button
                onClick={executeSandboxSearch}
                disabled={isSearching}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-600 mb-0.5">
                <span>Dense Vector Weight (Qdrant):</span>
                <span className="text-blue-700 font-bold">{Math.round(denseWeight * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={denseWeight}
                onChange={(e) => setDenseWeight(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-600 mb-0.5">
                <span>Sparse Lexical Weight (BM25):</span>
                <span className="text-emerald-700 font-bold">
                  {Math.round(bm25Weight * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={bm25Weight}
                onChange={(e) => setBm25Weight(parseFloat(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Fused Candidates Results */}
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono mb-2">
            RRF Fused Retrieved Candidates ({searchResults.length})
          </div>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map((hit, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="font-bold text-slate-900">
                      {hit.document_title} (Page {hit.page_number})
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      RRF: {hit.score}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200 italic">
                    "{hit.content}"
                  </p>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Method: {hit.retrieval_method}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs">
              No matching curriculum candidates retrieved.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
