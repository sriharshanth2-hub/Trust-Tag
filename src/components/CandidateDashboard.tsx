import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateFileHash, generateUniqueId } from '../lib/utils';
import type { Document, Company } from '../types/database';
import { Upload, FileText, CheckCircle, XCircle, Clock, Download, LogOut } from 'lucide-react';

export function CandidateDashboard() {
  const { profile, signOut } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<'offer_letter' | 'experience_letter'>('offer_letter');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;

    try {
      const [docsResponse, companiesResponse] = await Promise.all([
        supabase
          .from('documents')
          .select('*')
          .eq('candidate_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('companies')
          .select('*')
          .eq('is_verified_business', true)
      ]);

      if (docsResponse.data) setDocuments(docsResponse.data);
      if (companiesResponse.data) setCompanies(companiesResponse.data);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !profile) return;

    setError('');
    setUploading(true);

    try {
      const fileHash = await generateFileHash(selectedFile);
      const qrCodeId = generateUniqueId();
      const fileName = `${profile.id}/${qrCodeId}-${selectedFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          candidate_id: profile.id,
          company_id: selectedCompanyId,
          document_type: documentType,
          file_url: publicUrl,
          file_hash: fileHash,
          file_name: selectedFile.name,
          qr_code_id: qrCodeId,
          status: 'pending',
        });

      if (insertError) throw insertError;

      setSelectedFile(null);
      setShowUploadForm(false);
      await loadData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
            <CheckCircle className="w-4 h-4" /> Verified
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
            <XCircle className="w-4 h-4" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
            <Clock className="w-4 h-4" /> Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">TrustTag</h1>
            <p className="text-sm text-slate-600">Welcome, {profile?.full_name}</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">My Documents</h2>
          <button
            onClick={() => setShowUploadForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>

        {showUploadForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Upload New Document</h3>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as 'offer_letter' | 'experience_letter')}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="offer_letter">Offer Letter</option>
                  <option value="experience_letter">Experience Letter</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tag Company (for verification)
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a verified company...</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload PDF
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg transition disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload & Tag'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid gap-4">
          {documents.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No documents uploaded yet</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 capitalize">
                      {doc.document_type.replace('_', ' ')}
                    </h3>
                    <p className="text-sm text-slate-600">{doc.file_name}</p>
                  </div>
                  {getStatusBadge(doc.status)}
                </div>

                {doc.status === 'verified' && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <a
                      href={`/verify/${doc.qr_code_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      <Download className="w-4 h-4" />
                      View Verification Page
                    </a>
                  </div>
                )}

                {doc.status === 'rejected' && doc.rejection_reason && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-sm text-red-600">
                      <strong>Reason:</strong> {doc.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
