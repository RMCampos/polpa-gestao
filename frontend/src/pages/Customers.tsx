import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', document: '', phone: '' });
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [showPosModal, setShowPosModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [newPos, setNewPos] = useState({ address: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [docValidation, setDocValidation] = useState<{valid: boolean | null, loading: boolean}>({ valid: null, loading: false });
  const [selectedPhone, setSelectedPhone] = useState<{ number: string, name: string } | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const token = localStorage.getItem('token');

  const fetchCustomers = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get('http://localhost:3000/api/customers', config);
      setCustomers(res.data);
    } catch (err) {
      console.error('Failed to load customers', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [token]);

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editingCustomer) {
        await axios.put(`http://localhost:3000/api/customers/${editingCustomer}`, newCustomer, config);
      } else {
        await axios.post('http://localhost:3000/api/customers', newCustomer, config);
      }
      setShowModal(false);
      setNewCustomer({ name: '', document: '', phone: '' });
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err) {
      alert('Failed to save customer. Document (CNPJ/CPF) may already exist.');
    } finally {
      setLoading(false);
    }
  };

  const validateDocument = async (doc: string) => {
    if (!doc || doc.length < 11) {
      setDocValidation({ valid: null, loading: false });
      return;
    }
    setDocValidation({ valid: null, loading: true });
    try {
      const res = await axios.get(`https://api.invertexto.com/v1/validator?token=25058|f1okwGPRg82oH3LVabZ79Uimt8OhQtlp&value=${doc}`);
      setNewCustomer(prev => ({ ...prev, document: res.data.formatted }));
      setDocValidation({ valid: res.data.valid, loading: false });
    } catch (err) {
      setDocValidation({ valid: null, loading: false });
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, ''); // keep only numbers for typing ease
    setNewCustomer({ ...newCustomer, document: rawVal });
    if (rawVal.length >= 11) {
      validateDocument(rawVal);
    } else {
      setDocValidation({ valid: null, loading: false });
    }
  };

  const formatPhone = (val: string) => {
    let r = val.replace(/\D/g,"");
    r = r.replace(/^0/,"");
    if (r.length > 10) {
      // 11 digits: (XX) XXXXX-XXXX
      r = r.replace(/^(\d\d)(\d{5})(\d{4}).*/,"($1) $2-$3");
    } else if (r.length > 5) {
      // 10 digits: (XX) XXXX-XXXX
      r = r.replace(/^(\d\d)(\d{4})(\d{0,4}).*/,"($1) $2-$3");
    } else if (r.length > 2) {
      // (XX) XXX
      r = r.replace(/^(\d\d)(\d{0,5})/,"($1) $2");
    } else {
      r = r.replace(/^(\d*)/, "($1");
    }
    return r;
  };

  const openNewModal = () => {
    setEditingCustomer(null);
    setNewCustomer({ name: '', document: '', phone: '' });
    setDocValidation({ valid: null, loading: false });
    setShowModal(true);
  };

  const handlePhoneClick = (phone: string, name: string) => {
    // Only strip non-digits for the actual href action links inside the modal
    setSelectedPhone({ number: phone, name });
    setShowPhoneModal(true);
  };

  const openEditModal = (c: any) => {
    setEditingCustomer(c.id);
    setNewCustomer({ name: c.name, document: c.document, phone: c.phone || '' });
    setDocValidation({ valid: null, loading: false });
    setShowModal(true);
  };

  const openPosModal = (c: any) => {
    setSelectedCustomer(c);
    setNewPos({ address: '', phone: '' });
    setShowPosModal(true);
  };

  const handleAddPos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`http://localhost:3000/api/customers/${selectedCustomer.id}/pos`, newPos, config);
      setNewPos({ address: '', phone: '' });
      fetchCustomers();
      
      // Update local state to show immediately
      const res = await axios.get(`http://localhost:3000/api/customers/${selectedCustomer.id}`, config);
      setSelectedCustomer(res.data);
    } catch (err) {
      alert('Failed to add POS');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePos = async (posId: string) => {
    if (!confirm('Are you sure you want to delete this POS?')) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`http://localhost:3000/api/customers/pos/${posId}`, config);
      fetchCustomers();
      
      // Update local state to show immediately
      const res = await axios.get(`http://localhost:3000/api/customers/${selectedCustomer.id}`, config);
      setSelectedCustomer(res.data);
    } catch (err) {
      alert('Failed to delete POS');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0">Customers & Point of Sales</h2>
        <button className="btn btn-primary" onClick={openNewModal}>+ New Customer</button>
      </div>

      <div className="glass-card p-4">
        <div className="table-responsive">
          <table className="table table-dark table-hover text-white m-0" style={{ background: 'transparent' }}>
            <thead>
              <tr style={{ borderColor: 'var(--glass-border)' }}>
                <th>Name</th>
                <th>Document (CNPJ/CPF)</th>
                <th>Phone</th>
                <th>Points of Sale</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c: any) => (
                <tr key={c.id} style={{ borderColor: 'var(--glass-border)' }}>
                  <td>{c.name}</td>
                  <td>{c.document}</td>
                  <td>
                    {c.phone ? (
                      <button 
                        className="btn btn-link text-decoration-none p-0 text-info fw-bold" 
                        onClick={() => handlePhoneClick(c.phone, c.name)}
                      >
                        {formatPhone(c.phone)}
                      </button>
                    ) : 'N/A'}
                  </td>
                  <td>{c.pos?.length || 0} locations</td>
                  <td>
                    <button className="btn btn-sm btn-outline-light me-2" onClick={() => openEditModal(c)}>Edit</button>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openPosModal(c)}>Manage POS</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && <p className="text-center text-secondary mt-4">No customers found.</p>}
        </div>
      </div>

      {showModal && createPortal(
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content glass-card">
                <div className="modal-header border-bottom-0" style={{ borderColor: 'var(--glass-border)' }}>
                  <h5 className="modal-title text-white">{editingCustomer ? 'Edit Customer' : 'New Customer'}</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                </div>
                <form onSubmit={handleSaveCustomer}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label text-secondary">Name</label>
                      <input type="text" className="form-control" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-secondary">Document (CNPJ/CPF)</label>
                      <div className="input-group">
                        <input type="text" className="form-control" value={newCustomer.document} onChange={handleDocumentChange} placeholder="Type numbers only..." required />
                        {docValidation.loading && <span className="input-group-text bg-secondary text-white border-secondary">...</span>}
                        {!docValidation.loading && docValidation.valid === true && <span className="input-group-text bg-success text-white border-success">Valid</span>}
                        {!docValidation.loading && docValidation.valid === false && <span className="input-group-text bg-danger text-white border-danger">Invalid</span>}
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-secondary">Phone (Optional)</label>
                      <input type="text" className="form-control" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: formatPhone(e.target.value)})} placeholder="(11) 99999-9999" maxLength={15} />
                    </div>
                  </div>
                  <div className="modal-footer border-top-0" style={{ borderColor: 'var(--glass-border)' }}>
                    <button type="button" className="btn btn-outline-light" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Customer'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {showPosModal && selectedCustomer && createPortal(
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content glass-card">
                <div className="modal-header border-bottom-0" style={{ borderColor: 'var(--glass-border)' }}>
                  <h5 className="modal-title text-white">Manage POS - {selectedCustomer.name}</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowPosModal(false)}></button>
                </div>
                <div className="modal-body">
                  
                  {/* List Existing POS */}
                  <h6 className="text-secondary mb-3">Existing Points of Sale</h6>
                  <ul className="list-group mb-4" style={{ borderRadius: '8px' }}>
                    {selectedCustomer.pos?.map((p: any) => (
                      <li key={p.id} className="list-group-item d-flex justify-content-between align-items-center bg-dark text-white border-secondary">
                        <div>
                          <strong>{p.address}</strong>
                          <div className="text-secondary small">
                            Phone: {p.phone ? (
                              <button 
                                className="btn btn-link text-decoration-none p-0 text-info align-baseline" 
                                onClick={() => handlePhoneClick(p.phone, `${selectedCustomer.name} (POS)`)}
                              >
                                {formatPhone(p.phone)}
                              </button>
                            ) : 'N/A'}
                          </div>
                        </div>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeletePos(p.id)}>Remove</button>
                      </li>
                    ))}
                    {(!selectedCustomer.pos || selectedCustomer.pos.length === 0) && (
                      <li className="list-group-item bg-dark text-secondary border-secondary">No Points of Sale configured yet.</li>
                    )}
                  </ul>

                  {/* Add New POS Form */}
                  <div className="card bg-transparent border-secondary">
                    <div className="card-header border-secondary text-white fw-bold bg-dark bg-opacity-50">
                      Add New POS
                    </div>
                    <div className="card-body">
                      <form onSubmit={handleAddPos}>
                        <div className="row g-3">
                          <div className="col-md-7">
                            <label className="form-label text-secondary small">Address</label>
                            <input type="text" className="form-control form-control-sm" value={newPos.address} onChange={e => setNewPos({...newPos, address: e.target.value})} required placeholder="123 Main St..." />
                          </div>
                          <div className="col-md-5">
                            <label className="form-label text-secondary small">Phone (Optional)</label>
                            <div className="d-flex gap-2">
                              <input type="text" className="form-control form-control-sm" value={newPos.phone} onChange={e => setNewPos({...newPos, phone: formatPhone(e.target.value)})} placeholder="(11) 99999-9999" maxLength={15} />
                              <button type="submit" className="btn btn-sm btn-success" disabled={loading}>{loading ? '...' : 'Add'}</button>
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>

                </div>
                <div className="modal-footer border-top-0" style={{ borderColor: 'var(--glass-border)' }}>
                  <button type="button" className="btn btn-outline-light" onClick={() => setShowPosModal(false)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {showPhoneModal && selectedPhone && createPortal(
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1060 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1070 }}>
            <div className="modal-dialog modal-dialog-centered modal-sm">
              <div className="modal-content glass-card border-secondary">
                <div className="modal-header border-bottom-0">
                  <h6 className="modal-title fw-bold">Contact {selectedPhone.name}</h6>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowPhoneModal(false)}></button>
                </div>
                <div className="modal-body text-center pb-4">
                  <p className="fs-5 mb-4">{formatPhone(selectedPhone.number)}</p>
                  <div className="d-flex flex-column gap-3">
                    <a 
                      href={`https://wa.me/55${selectedPhone.number.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-success fw-bold d-flex justify-content-center align-items-center"
                    >
                      <i className="bi bi-whatsapp me-2 fs-5"></i>
                      WhatsApp
                    </a>
                    <a 
                      href={`tel:+55${selectedPhone.number.replace(/\D/g, '')}`} 
                      className="btn btn-outline-light fw-bold d-flex justify-content-center align-items-center"
                    >
                      <i className="bi bi-telephone-outbound me-2 fs-5"></i>
                      Call
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
