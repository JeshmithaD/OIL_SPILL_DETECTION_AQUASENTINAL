import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CinematicLoader from './components/CinematicLoader';
import AudioSystem from './components/AudioSystem';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Analysis from './pages/Analysis';
import Compare from './pages/Compare';
import ReportsDashboard from './pages/ReportsDashboard';
import ReportsList from './pages/ReportsList';
import AnalysisHistory from './pages/AnalysisHistory';
import ReportDetail from './pages/ReportDetail';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('aquasentinel_token');
  return token ? children : <Navigate to="/login" />;
}

// Layout wrapper
function LayoutWrapper({ children }) {
  const location = useLocation();
  const hideLayout = ['/login', '/register'].includes(location.pathname);

  if (hideLayout) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function App() {
  const [appLoaded, setAppLoaded] = useState(false);

  return (
    <>
      {!appLoaded && <CinematicLoader onComplete={() => setAppLoaded(true)} />}
      
      {appLoaded && (
        <Router>
          <AudioSystem />
          <LayoutWrapper>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/map" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
              <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/analysis" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
              <Route path="/compare" element={<ProtectedRoute><Compare /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><ReportsDashboard /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><AnalysisHistory /></ProtectedRoute>} />
              <Route path="/reports/list" element={<ProtectedRoute><ReportsList /></ProtectedRoute>} />
              <Route path="/reports/:id" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />
            </Routes>
          </LayoutWrapper>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--brand-primary)',
                color: '#e2e8f0',
                border: '1px solid rgba(50,145,255,0.3)',
                borderRadius: '12px',
              },
            }}
          />
        </Router>
      )}
    </>
  );
}

export default App;
