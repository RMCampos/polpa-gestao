import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import type { User } from '../types';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDisabled, setShowDisabled] = useState<boolean>(false);
  const token = localStorage.getItem('token');
  const apiBase = import.meta.env.VITE_BACKEND_SERVER || 'http://localhost:3000';

  const fetchUsers = useCallback( async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${apiBase}/api/users?showDisabled=${showDisabled}`, config);
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  }, [token, apiBase, showDisabled]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload: User = { ...newUser };
      if (editingUser && !payload.password) {
        delete payload.password;
      }
      
      if (editingUser) {
        await axios.put(`${apiBase}/api/users/${editingUser}`, payload, config);
      } else {
        await axios.post(`${apiBase}/api/users`, payload, config);
      }
      setShowModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('Error response:', err.response);
        alert(err.response?.data?.error || 'Failed to save user. Email may already exist.');
      } else {
        console.error('Unexpected error:', err);
        alert('An unexpected error occurred while saving the user.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingUser(null);
    setNewUser({ name: '', email: '', password: '', role: 'user' });
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    if (!user.id) {
      alert('User ID is missing. Cannot edit this user.');
      return;
    }
    setEditingUser(user.id);
    setNewUser({ name: user.name, email: user.email, password: '', role: user.role });
    setShowModal(true);
  };

  const handleDisableUser = async () => {
    if (!editingUser) return;
    if (!confirm('Are you sure you want to disable this user?')) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${apiBase}/api/users/${editingUser}`, { ...config });
      setShowModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('API error:', err.response?.data || err.message);
        alert('Failed to disable user: ' + (err.response?.data?.error || err.message));
      } else {
        console.error('Unexpected error:', err);
        alert('Failed to disable user: ' + (err || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0">Users</h2>
        <div className="d-flex align-items-center gap-3">
          <div className="form-check form-switch m-0">
            <input
              id="show-disabled-users"
              className="form-check-input"
              type="checkbox"
              checked={showDisabled}
              onChange={(e) => setShowDisabled(e.target.checked)}
            />
            <label className="form-check-label text-secondary" htmlFor="show-disabled-users">
              Disabled
            </label>
          </div>
          <button className="btn btn-primary" onClick={openNewModal}>+ New User</button>
        </div>
      </div>

      <div className="row g-3">
        {users.map((user: User) => (
          <div key={user.id} className="col-12 col-md-6 col-lg-4">
            <div className="glass-card p-3 h-100 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h5 className={`fw-bold m-0 ${user.disabledAt ? 'text-secondary' : 'text-white'}`}>{user.name}</h5>
                  <div className="text-secondary small mt-1">{user.email}</div>
                </div>
                <span className="badge bg-secondary">{user.role}</span>
              </div>
              <div className="mt-auto d-flex gap-2 pt-3">
                <button className="btn btn-sm btn-outline-light flex-grow-1" onClick={() => openEditModal(user)}>Edit</button>
              </div>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="col-12 text-center text-secondary mt-4">
            <p>No users found.</p>
          </div>
        )}
      </div>

      {showModal && createPortal(
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content glass-card">
                <div className="modal-header border-bottom-0" style={{ borderColor: 'var(--glass-border)' }}>
                  <h5 className="modal-title text-white">{editingUser ? 'Edit User' : 'New User'}</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                </div>
                <form onSubmit={handleSaveUser}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label text-secondary">Name</label>
                      <input type="text" className="form-control" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-secondary">Email</label>
                      <input type="email" className="form-control" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-secondary">Password {editingUser && '(Leave blank to keep)'}</label>
                      <input type="password" className="form-control" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required={!editingUser} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-secondary">Role</label>
                      <select className="form-select" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer border-top-0" style={{ borderColor: 'var(--glass-border)' }}>
                    <button type="button" className="btn btn-outline-light" onClick={() => setShowModal(false)}>Cancel</button>
                    {editingUser && (
                      <button type="button" className="btn btn-outline-danger" onClick={handleDisableUser}>Disable</button>
                    )}
                    <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save User'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
