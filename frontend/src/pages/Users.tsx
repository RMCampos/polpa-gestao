import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  const fetchUsers = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get('http://localhost:3000/api/users', config);
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload: any = { ...newUser };
      if (editingUser && !payload.password) {
        delete payload.password;
      }
      
      if (editingUser) {
        await axios.put(`http://localhost:3000/api/users/${editingUser}`, payload, config);
      } else {
        await axios.post('http://localhost:3000/api/users', payload, config);
      }
      setShowModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      setEditingUser(null);
      fetchUsers(); // Refresh the list
    } catch (err) {
      alert('Failed to save user. Email may already exist.');
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingUser(null);
    setNewUser({ name: '', email: '', password: '', role: 'user' });
    setShowModal(true);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user.id);
    setNewUser({ name: user.name, email: user.email, password: '', role: user.role });
    setShowModal(true);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0">Users</h2>
        <button className="btn btn-primary" onClick={openNewModal}>+ New User</button>
      </div>

      <div className="glass-card p-4">
        <div className="table-responsive">
          <table className="table table-dark table-hover text-white m-0" style={{ background: 'transparent' }}>
            <thead>
              <tr style={{ borderColor: 'var(--glass-border)' }}>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id} style={{ borderColor: 'var(--glass-border)' }}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td><span className="badge bg-secondary">{user.role}</span></td>
                  <td>
                    <button className="btn btn-sm btn-outline-light me-2" onClick={() => openEditModal(user)}>Edit</button>
                    <button className="btn btn-sm btn-outline-danger">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="text-center text-secondary mt-4">No users found.</p>}
        </div>
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
