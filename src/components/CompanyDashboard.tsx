import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Document } from '../types/database';
import { CheckCircle, XCircle, Clock, FileText, LogOut, AlertCircle, ExternalLink } from 'lucide-react';

interface DocumentWithCandidate extends Document {
  candidate_name?: string;
  candidate_email?: string;
}

export function CompanyDashboard() {
  const { profile, company, signOut } = useAuth();
  const [documents, setDocuments] = useState<DocumentWithCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [company]);

  const loadDocuments = async () => {
    if (!company) return;

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const docsWithCandidates = await Promise.all(
          data.map(async (doc) => {
            const { data: candidateData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', doc.candidate_id)
              .maybeSingle();

            return {
              ...doc,
              candidate_name: candidateData?.full_name,
              candidate_email: candidateData?.email,
            };
          })
        );

        setDocuments(docsWithCandidates);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (docId: string) => {
    if (!profile) return;
    setProcessing(docId);

    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: profile.id,
        })
        .eq('id', docId);

      if (error) throw error;

      await loadDocuments();
    } catch (err) {
      console.error('Error verifying document:', err);
      alert('Failed to verify document');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (docId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setProcessing(docId);

    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', docId);

      if (error) throw error;

      await loadDocuments();
    } catch (err) {
      console.error('Error rejecting document:', err);
      alert('Failed to reject document');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!company?.is_verified_business) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="bg-amber-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Verification Pending</h2>
          <p className="text-slate-600 mb-6">
            Your company is awaiting admin verification. This helps prevent ghost company fraud
            and ensures document authenticity.
          </p>
          <div className="bg-slate-50 rounded-lg p-4 text-left">
            <p className="text-sm text-slate-700 mb-2">
              <strong>Company:</strong> {company.company_name}
            </p>
            <p className="text-sm text-slate-700 mb-2">
              <strong>Business ID:</strong> {company.business_id}
            </p>
            <p className="text-sm text-slate-700">
              <strong>Email:</strong> {company.business_email}
            </p>
          </div>
          <button
            onClick={signOut}
            className="mt-6 px-4 py-2 text-slate-600 hover:text-slate-900 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const pendingDocs = documents.filter(d => d.status === 'pending');
  const processedDocs = documents.filter(d => d.status !== 'pending');

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">TrustTag</h1>
              <p className="text-sm text-slate-600">{company.company_name}</p>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Pending Verification Requests</h2>
          <p className="text-slate-600">Review and verify documents tagged to your company</p>
        </div>

        {pendingDocs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center mb-8">
            <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No pending verification requests</p>
          </div>
        ) : (
          <div className="grid gap-4 mb-8">
            {pendingDocs.map((doc) => (
              <div key={doc.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 capitalize">
                      {doc.document_type.replace('_', ' ')}
                    </h3>
                    <p className="text-sm text-slate-600">{doc.file_name}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Candidate: {doc.candidate_name} ({doc.candidate_email})
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                    <Clock className="w-4 h-4" /> Pending
                  </span>
                </div>

                <div className="flex gap-3 mt-4">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Document
                  </a>
                  <button
                    onClick={() => handleVerify(doc.id)}
                    disabled={processing === doc.id}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Verify
                  </button>
                  <button
                    onClick={() => handleReject(doc.id)}
                    disabled={processing === doc.id}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Processed Documents</h2>
        </div>

        <div className="grid gap-4">
          {processedDocs.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No processed documents</p>
            </div>
          ) : (
            processedDocs.map((doc) => (
              <div key={doc.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 capitalize">
                      {doc.document_type.replace('_', ' ')}
                    </h3>
                    <p className="text-sm text-slate-600">{doc.file_name}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Candidate: {doc.candidate_name}
                    </p>
                  </div>
                  {doc.status === 'verified' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                      <XCircle className="w-4 h-4" /> Rejected
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
