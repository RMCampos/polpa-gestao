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
import Sidebar from './components/Sidebar';
import { Toast } from './components/Toast';
import { ConfirmDialog } from './components/ConfirmDialog';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      if (window.location.pathname !== '/login') {
        navigate('/login');
      }
    }
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
  };

  if (!token) {
    return (
      <>
        <Routes>
          <Route path="/login" element={<Login setToken={setToken} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toast />
        <ConfirmDialog />
      </>
    );
  }

  return (
    <>
      <div className="app-container">
        <Sidebar onLogout={handleLogout} />
        <main className="main-content animate-fade-in">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/products" element={<Products />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/visits" element={<Visits />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
      <Toast />
      <ConfirmDialog />
    </>
  );
}
