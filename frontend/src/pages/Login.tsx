import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  setToken: (token: string) => void;
}

export default function Login({ setToken }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_BACKEND_SERVER || '/api';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${apiBase}/api/users/login`, {
        email,
        password
      });
      
      const { user } = response.data;
      localStorage.setItem('user', JSON.stringify(user));
      setToken(user.id);
      navigate('/dashboard');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('Login error:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to login');
      } else {
        console.error('Unexpected error:', err);
        setError('Failed to login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', width: '100vw', padding: '1rem' }}>
      <div className="glass-card p-5 animate-fade-in" style={{ width: '100%', maxWidth: '450px' }}>
        <div className="text-center mb-4">
          <h2 className="fw-bold" style={{ color: 'var(--primary-color)' }}>Polpa Gestão</h2>
          <p className="text-secondary">Sign in to your account</p>
        </div>

        {error && <div className="alert alert-danger" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger-color)', color: '#fff' }}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label text-secondary">Email address</label>
            <input 
              type="email" 
              className="form-control" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              placeholder="admin@example.com"
            />
          </div>
          <div className="mb-4">
            <label className="form-label text-secondary">Password</label>
            <input 
              type="password" 
              className="form-control" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
