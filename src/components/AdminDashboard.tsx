import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Company } from '../types/database';
import { Shield, CheckCircle, XCircle, Building2, LogOut } from 'lucide-react';

export function AdminDashboard() {
  const { signOut } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setCompanies(data);
    } catch (err) {
      console.error('Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCompany = async (companyId: string, verify: boolean) => {
    setProcessing(companyId);

    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_verified_business: verify })
        .eq('id', companyId);

      if (error) throw error;

      await loadCompanies();
    } catch (err) {
      console.error('Error updating company:', err);
      alert('Failed to update company verification status');
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

  const pendingCompanies = companies.filter(c => !c.is_verified_business);
  const verifiedCompanies = companies.filter(c => c.is_verified_business);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">TrustTag Admin</h1>
                <p className="text-sm text-slate-600">Company Verification Dashboard</p>
              </div>
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
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Pending Verification</h2>
          <p className="text-slate-600">Review and verify company registrations</p>
        </div>

        {pendingCompanies.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center mb-8">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No companies pending verification</p>
          </div>
        ) : (
          <div className="grid gap-4 mb-8">
            {pendingCompanies.map((company) => (
              <div key={company.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {company.company_name}
                    </h3>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-600">
                        <strong>Business Email:</strong> {company.business_email}
                      </p>
                      <p className="text-sm text-slate-600">
                        <strong>Business ID:</strong> {company.business_id}
                      </p>
                      <p className="text-sm text-slate-500">
                        Registered: {new Date(company.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                    Pending
                  </span>
                </div>

                <div className="flex gap-3 mt-4 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => handleVerifyCompany(company.id, true)}
                    disabled={processing === company.id}
                    className="flex items-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Verify as Legitimate
                  </button>
                  <button
                    onClick={() => handleVerifyCompany(company.id, false)}
                    disabled={processing === company.id}
                    className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Verified Companies</h2>
        </div>

        <div className="grid gap-4">
          {verifiedCompanies.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No verified companies yet</p>
            </div>
          ) : (
            verifiedCompanies.map((company) => (
              <div key={company.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {company.company_name}
                    </h3>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-600">
                        <strong>Business ID:</strong> {company.business_id}
                      </p>
                      <p className="text-sm text-slate-500">
                        Verified: {new Date(company.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" /> Verified
                    </span>
                    <button
                      onClick={() => handleVerifyCompany(company.id, false)}
                      disabled={processing === company.id}
                      className="flex items-center gap-2 px-3 py-1 text-red-600 hover:text-red-700 text-sm transition disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
