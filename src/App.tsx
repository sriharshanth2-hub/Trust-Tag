import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Router } from './components/Router';
import { Auth } from './components/Auth';
import { CompanySetup } from './components/CompanySetup';
import { CandidateDashboard } from './components/CandidateDashboard';
import { CompanyDashboard } from './components/CompanyDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { VerificationPage } from './components/VerificationPage';

function AppContent() {
  const { user, profile, company, loading } = useAuth();
  const isVerificationPage = window.location.pathname.startsWith('/verify/');

  if (isVerificationPage) {
    return <VerificationPage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Auth />;
  }

  if (profile.role === 'admin') {
    return <AdminDashboard />;
  }

  if (profile.role === 'company') {
    if (!company) {
      return <CompanySetup />;
    }
    return <CompanyDashboard />;
  }

  return <CandidateDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
