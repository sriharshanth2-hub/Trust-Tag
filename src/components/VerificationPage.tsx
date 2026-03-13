import { useState, useEffect } from 'react';
import { useParams } from './Router';
import { supabase } from '../lib/supabase';
import { generateFileHash, generateQRCode } from '../lib/utils';
import type { Document, Company } from '../types/database';
import { Shield, Building2, Calendar, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react';

interface VerificationData extends Document {
  company_data?: Company;
  candidate_name?: string;
}

export function VerificationPage() {
  const { qrCodeId } = useParams();
  const [document, setDocument] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isTampered, setIsTampered] = useState(false);
  const [checkingTamper, setCheckingTamper] = useState(false);

  useEffect(() => {
    loadVerificationData();
  }, [qrCodeId]);

  const loadVerificationData = async () => {
    if (!qrCodeId) return;

    try {
      const { data: docData, error } = await supabase
        .from('documents')
        .select('*')
        .eq('qr_code_id', qrCodeId)
        .eq('status', 'verified')
        .maybeSingle();

      if (error || !docData) {
        setDocument(null);
        setLoading(false);
        return;
      }

      const [companyResponse, candidateResponse] = await Promise.all([
        supabase
          .from('companies')
          .select('*')
          .eq('id', docData.company_id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', docData.candidate_id)
          .maybeSingle()
      ]);

      const verificationUrl = `${window.location.origin}/verify/${qrCodeId}`;
      const qrCode = await generateQRCode(verificationUrl);
      setQrCodeUrl(qrCode);

      setDocument({
        ...docData,
        company_data: companyResponse.data || undefined,
        candidate_name: candidateResponse.data?.full_name,
      });
    } catch (err) {
      console.error('Error loading verification data:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkDocumentIntegrity = async () => {
    if (!document) return;

    setCheckingTamper(true);
    try {
      const response = await fetch(document.file_url);
      const blob = await response.blob();
      const file = new File([blob], document.file_name, { type: 'application/pdf' });
      const currentHash = await generateFileHash(file);

      setIsTampered(currentHash !== document.file_hash);
    } catch (err) {
      console.error('Error checking document integrity:', err);
    } finally {
      setCheckingTamper(false);
    }
  };

  useEffect(() => {
    if (document) {
      checkDocumentIntegrity();
    }
  }, [document]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading verification data...</div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="bg-red-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Invalid Verification Code</h2>
          <p className="text-slate-600">
            This document could not be found or has not been verified.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white p-2 rounded-lg">
                <Shield className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">TrustTag</h1>
                <p className="text-emerald-100">Document Verification</p>
              </div>
            </div>
          </div>

          {isTampered && (
            <div className="bg-red-500 text-white px-8 py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6" />
                <div>
                  <h3 className="font-bold text-lg">DOCUMENT TAMPERED</h3>
                  <p className="text-sm">The document has been modified after verification</p>
                </div>
              </div>
            </div>
          )}

          <div className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Document Verified</h2>
                <p className="text-slate-600">This document has been authenticated</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-slate-500 uppercase mb-2">Document Type</h3>
                  <p className="text-lg font-semibold text-slate-900 capitalize">
                    {document.document_type.replace('_', ' ')}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-slate-500 uppercase mb-2">Candidate</h3>
                  <p className="text-lg font-semibold text-slate-900">{document.candidate_name}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-slate-500 uppercase mb-2">File Name</h3>
                  <p className="text-slate-900">{document.file_name}</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-slate-500 uppercase mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Verified By
                  </h3>
                  <p className="text-lg font-bold text-slate-900 mb-1">
                    {document.company_data?.company_name}
                  </p>
                  <p className="text-sm text-slate-600">
                    Business ID: {document.company_data?.business_id}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Verified Business
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-slate-500 uppercase mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Verification Date
                  </h3>
                  <p className="text-slate-900">
                    {document.verified_at
                      ? new Date(document.verified_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="bg-white p-4 rounded-xl border-2 border-slate-200 mb-4">
                  {qrCodeUrl && (
                    <img src={qrCodeUrl} alt="Verification QR Code" className="w-64 h-64" />
                  )}
                </div>
                <p className="text-sm text-slate-600 text-center">
                  Scan to verify this document
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Document Integrity</h3>
              <div className="flex items-start gap-3 mb-4">
                {checkingTamper ? (
                  <div className="text-slate-600">Checking document integrity...</div>
                ) : isTampered ? (
                  <>
                    <AlertTriangle className="w-6 h-6 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-700">Document has been tampered</p>
                      <p className="text-sm text-red-600">
                        The current file hash does not match the verified hash
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Shield className="w-6 h-6 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-700">Document is authentic</p>
                      <p className="text-sm text-green-600">
                        Hash verification passed - document has not been modified
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="bg-slate-50 rounded-lg p-4 font-mono text-xs break-all">
                <p className="text-slate-500 mb-1">SHA-256 Hash:</p>
                <p className="text-slate-900">{document.file_hash}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <a
                href={document.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition"
              >
                <Download className="w-5 h-5" />
                View Original Document
              </a>
            </div>
          </div>

          <div className="bg-slate-50 px-8 py-4 border-t border-slate-200">
            <p className="text-sm text-slate-600 text-center">
              Powered by TrustTag - Verifying professional history without the wait
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
