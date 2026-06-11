import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Customers from './pages/Customers';
import Products from './pages/Products';
import RoutesPage from './pages/Routes';
import Sales from './pages/Sales';
import Visits from './pages/Visits';
import ClosestPos from './pages/ClosestPos';
import Sidebar from './components/Sidebar';
import { Toast } from './components/Toast';
import { ConfirmDialog } from './components/ConfirmDialog';

import axios from 'axios';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_BACKEND_SERVER || '/api';

  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await axios.get(`${apiBase}/api/users/me`);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setToken(response.data.user?.id ?? null);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [apiBase]);

  useEffect(() => {
    if (!loading && !token) {
      const isPublicPath = window.location.pathname === '/login' || window.location.pathname === '/closest';
      if (!isPublicPath) {
        navigate('/login');
      }
    }
  }, [token, loading, navigate]);

  const handleLogout = async () => {
    try {
      await axios.post(`${apiBase}/api/users/logout`);
    } catch (err) {
      console.error('Logout failed:', err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', width: '100vw', backgroundColor: '#0f172a', color: '#fff' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="m-0 text-white-50">Loading Polpa Gestão...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <>
        <Routes>
          <Route path="/closest" element={<ClosestPos />} />
          <Route path="/login" element={<Login setToken={setToken} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toast />
        <ConfirmDialog />
      </>
    );
  }


  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';
  const defaultRoute = isAdmin ? "/dashboard" : "/routes";

  return (
    <>
      <div className="app-container">
        <Sidebar onLogout={handleLogout} />
        <main className="main-content animate-fade-in">
          <Routes>
            <Route path="/" element={<Navigate to={defaultRoute} replace />} />
            <Route path="/dashboard" element={isAdmin ? <Dashboard /> : <Navigate to="/routes" replace />} />
            <Route path="/users" element={isAdmin ? <Users /> : <Navigate to="/routes" replace />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/products" element={<Products />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/visits" element={<Visits />} />
            <Route path="/closest" element={<ClosestPos />} />
            <Route path="*" element={<Navigate to={defaultRoute} replace />} />
          </Routes>
        </main>
      </div>
      <Toast />
      <ConfirmDialog />
    </>
  );
}
