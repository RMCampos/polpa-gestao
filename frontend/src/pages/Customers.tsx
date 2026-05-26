import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useToast } from '../context/toast';
import type { Customer, CustomerPOS } from '../types';

const toErrorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string } | undefined;
    return data?.message || data?.error || fallback;
  }
  return fallback;
};

export default function Customers() {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Customer>({ name: '', document: '', phone: '', personName: '' });
  const emptyPos: CustomerPOS = { address: '', phone: '', personName: '', fridgeCount: 0, banner: false, indiBanner: false, lat: null, lng: null };
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [showPosModal, setShowPosModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newPos, setNewPos] = useState<CustomerPOS>(emptyPos);
  const [editingPos, setEditingPos] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [docValidation, setDocValidation] = useState<{ valid: boolean | null, loading: boolean }>({ valid: null, loading: false });
  const [selectedPhone, setSelectedPhone] = useState<{ number: string, name: string } | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showDisabled, setShowDisabled] = useState<boolean>(false);
  const [filterText, setFilterText] = useState<string>('');
  const token = localStorage.getItem('token');
  const apiBase = import.meta.env.VITE_BACKEND_SERVER || '/api';
  const cpfCnpjApiToken = import.meta.env.VITE_CPF_CNPJ_API_TOKEN || '';
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const fetchCustomers = useCallback(async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${apiBase}/api/customers?showDisabled=${showDisabled}`, config);
      setCustomers(res.data);
    } catch (err) {
      console.error('Failed to load customers', err);
    }
  }, [token, apiBase, showDisabled]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!filterText.trim()) return customers;
    const lower = filterText.toLowerCase();
    const digits = filterText.replace(/\D/g, '');
    return customers.filter((c: Customer) =>
      c.name.toLowerCase().includes(lower) ||
      (c.personName && c.personName.toLowerCase().includes(lower)) ||
      (digits && c.phone && c.phone.replace(/\D/g, '').includes(digits))
    );
  }, [customers, filterText]);

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editingCustomer) {
        await axios.put(`${apiBase}/api/customers/${editingCustomer}`, newCustomer, config);
      } else {
        await axios.post(`${apiBase}/api/customers`, newCustomer, config);
      }
      setShowModal(false);
      setNewCustomer({ name: '', document: '', phone: '', personName: '' });
      setEditingCustomer(null);
      fetchCustomers();
      toast.showToast(editingCustomer ? 'Customer updated successfully.' : 'Customer created successfully.', 'success');
    } catch (err) {
      toast.showToast(`Failed to save customer: ${toErrorMessage(err, 'Unknown error')}`, 'error');
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
      const res = await axios.get(`https://api.invertexto.com/v1/validator?token=${cpfCnpjApiToken}&value=${doc}`);
      setNewCustomer(prev => ({ ...prev, document: res.data.formatted }));
      setDocValidation({ valid: res.data.valid, loading: false });
    } catch (err) {
      setDocValidation({ valid: false, loading: false });
      console.error('Document validation failed', err);
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    setNewCustomer({ ...newCustomer, document: rawVal });
    if (rawVal.length >= 11) {
      validateDocument(rawVal);
    } else {
      setDocValidation({ valid: null, loading: false });
    }
  };

  const formatPhone = (val: string) => {
    let r = val.replace(/\D/g, '');
    r = r.replace(/^0/, '');
    if (r.length > 10) {
      r = r.replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (r.length > 5) {
      r = r.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (r.length > 2) {
      r = r.replace(/^(\d\d)(\d{0,5})/, '($1) $2');
    } else {
      r = r.replace(/^(\d*)/, '($1');
    }
    return r;
  };

  const openNewModal = () => {
    setEditingCustomer(null);
    setNewCustomer({ name: '', document: '', phone: '', personName: '' });
    setDocValidation({ valid: null, loading: false });
    setShowModal(true);
  };

  const handlePhoneClick = (phone: string, name: string) => {
    setSelectedPhone({ number: phone, name });
    setShowPhoneModal(true);
  };

  const openEditModal = (c: Customer) => {
    if (!c.id) {
      toast.showToast('Customer ID is missing. Cannot edit this customer.', 'error');
      return;
    }
    setEditingCustomer(c.id);
    setNewCustomer({ name: c.name, document: c.document || '', phone: c.phone || '', personName: c.personName || '' });
    setDocValidation({ valid: null, loading: false });
    setShowModal(true);
  };

  const openPosModal = (c: Customer) => {
    setSelectedCustomer(c);
    setNewPos(emptyPos);
    setEditingPos(null);
    setShowPosModal(true);
  };

  const closePosModal = () => {
    setShowPosModal(false);
    setEditingPos(null);
    setNewPos(emptyPos);
  };

  const openEditPos = (p: CustomerPOS) => {
    if (!p.id) {
      toast.showToast('POS ID is missing. Cannot edit this point of sale.', 'error');
      return;
    }
    setEditingPos(p.id);
    setNewPos({
      address: p.address,
      phone: p.phone,
      personName: p.personName || '',
      fridgeCount: p.fridgeCount ?? 0,
      banner: p.banner ?? false,
      indiBanner: p.indiBanner ?? false,
      lat: p.lat ?? null,
      lng: p.lng ?? null
    });
  };

  const cancelEditPos = () => {
    setEditingPos(null);
    setNewPos(emptyPos);
  };

  const handleSavePos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editingPos) {
        await axios.put(`${apiBase}/api/customers/pos/${editingPos}`, newPos, config);
        toast.showToast('Point of sale updated successfully.', 'success');
      } else {
        await axios.post(`${apiBase}/api/customers/${selectedCustomer.id}/pos`, newPos, config);
        toast.showToast('Point of sale added successfully.', 'success');
      }
      setNewPos(emptyPos);
      setEditingPos(null);
      fetchCustomers();

      const res = await axios.get(`${apiBase}/api/customers/${selectedCustomer.id}`, config);
      setSelectedCustomer(res.data);
    } catch (err) {
      toast.showToast(`Failed to save POS: ${toErrorMessage(err, 'Unknown error')}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGeocodePos = async () => {
    if (!newPos.address?.trim()) {
      toast.showToast('Enter an address before geocoding.', 'error');
      return;
    }

    if (!googleMapsApiKey) {
      toast.showToast('Geocoding is currently unavailable. Please contact support.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: newPos.address.trim(),
          key: googleMapsApiKey
        }
      });

      const location = response.data?.results?.[0]?.geometry?.location;
      if (response.data?.status !== 'OK' || typeof location?.lat !== 'number' || typeof location?.lng !== 'number') {
        toast.showToast('Address not found for geocoding.', 'error');
        return;
      }

      setNewPos((prev) => ({ ...prev, lat: location.lat, lng: location.lng }));
      toast.showToast('Geocode set successfully.', 'success');
    } catch (err) {
      toast.showToast(`Failed to geocode address: ${toErrorMessage(err, 'Unknown error')}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePos = async (posId: string | undefined) => {
    if (!posId) return;
    const confirmed = await toast.confirm({
      title: 'Delete POS',
      message: 'Are you sure you want to delete this POS?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDangerous: true
    });
    if (!confirmed) return;

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${apiBase}/api/customers/pos/${posId}`, config);
      fetchCustomers();

      if (selectedCustomer && selectedCustomer.id) {
        const res = await axios.get(`${apiBase}/api/customers/${selectedCustomer.id}`, config);
        setSelectedCustomer(res.data);
      }
      toast.showToast('Point of sale deleted successfully.', 'success');
    } catch (err) {
      toast.showToast(`Failed to delete POS: ${toErrorMessage(err, 'Unknown error')}`, 'error');
    }
  };

  const handleDisableCustomer = async () => {
    if (!editingCustomer) return;
    const confirmed = await toast.confirm({
      title: 'Disable Customer',
      message: 'Are you sure you want to disable this customer?',
      confirmText: 'Disable',
      cancelText: 'Cancel',
      isDangerous: true
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${apiBase}/api/customers/${editingCustomer}`, config);
      setShowModal(false);
      setNewCustomer({ name: '', document: '', phone: '', personName: '' });
      setEditingCustomer(null);
      fetchCustomers();
      toast.showToast('Customer disabled successfully.', 'success');
    } catch (err) {
      toast.showToast(`Failed to disable customer: ${toErrorMessage(err, 'Unknown error')}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDocument = (doc: string) => {
    const cleaned = doc.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0">Customers & Point of Sales</h2>
        <div className="d-flex align-items-center gap-3">
          <div className="form-check form-switch m-0">
            <input
              id="show-disabled-customers"
              className="form-check-input"
              type="checkbox"
              checked={showDisabled}
              onChange={(e) => setShowDisabled(e.target.checked)}
            />
            <label className="form-check-label text-secondary" htmlFor="show-disabled-customers">
              Disabled
            </label>
          </div>
          <button className="btn btn-primary" onClick={openNewModal}>+ New Customer</button>
        </div>
      </div>

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Filter by name, person, or phone..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>

      <div className="row g-3">
        {filteredCustomers.map((c: Customer) => {
          const customerPersonName = c.personName?.trim();

          return (
            <div key={c.id} className="col-12 col-md-6 col-lg-4">
              <div className="glass-card p-3 h-100 d-flex flex-column">
                <div className="mb-2">
                  <h5 className={`fw-bold m-0 ${c.disabledAt ? 'text-secondary' : 'text-white'}`}>{c.name}</h5>
                  {customerPersonName && (
                    <div className="text-secondary small mt-1">
                      <i className="bi bi-person me-1"></i>{customerPersonName}
                    </div>
                  )}
                  <div className="text-secondary small mt-1">
                    <i className="bi bi-file-earmark-text me-1"></i>{c.document ? formatDocument(c.document) : 'N/A'}
                  </div>
                </div>
                <div className="d-flex flex-column gap-1 text-secondary small mb-3">
                  <div>
                    <i className="bi bi-telephone me-1"></i>
                    {c.phone ? (
                      <button className="btn btn-link p-0 text-info fw-bold text-decoration-none align-baseline small" onClick={() => handlePhoneClick(c.phone, c.name)}>
                        {formatPhone(c.phone)}
                      </button>
                    ) : 'N/A'}
                  </div>
                  <div>
                    <i className="bi bi-geo-alt me-1"></i>
                    {c.pos?.length || 0} point{c.pos?.length !== 1 ? 's' : ''} of sale
                  </div>
                </div>
                <div className="mt-auto d-flex gap-2">
                  <button className="btn btn-sm btn-outline-light flex-grow-1" onClick={() => openEditModal(c)}>Edit</button>
                  <button className="btn btn-sm btn-outline-primary flex-grow-1" onClick={() => openPosModal(c)}>Manage POS</button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredCustomers.length === 0 && (
          <div className="col-12 text-center text-secondary mt-4">
            <p>No customers found.</p>
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
                  <h5 className="modal-title text-white">{editingCustomer ? 'Edit Customer' : 'New Customer'}</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                </div>
                <form onSubmit={handleSaveCustomer}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label text-secondary">Name</label>
                      <input type="text" className="form-control" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-secondary">Person Name (Optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCustomer.personName || ''}
                        onChange={e => setNewCustomer({ ...newCustomer, personName: e.target.value })}
                        placeholder="Responsible person name..."
                        maxLength={30}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-secondary">Document (CNPJ/CPF) (Optional)</label>
                      <div className="input-group">
                        <input type="text" className="form-control" value={newCustomer.document || ''} onChange={handleDocumentChange} placeholder="Type numbers only..." />
                        {docValidation.loading && <span className="input-group-text bg-secondary text-white border-secondary">...</span>}
                        {!docValidation.loading && docValidation.valid === true && <span className="input-group-text bg-success text-white border-success">Valid</span>}
                        {!docValidation.loading && docValidation.valid === false && <span className="input-group-text bg-danger text-white border-danger">Invalid</span>}
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-secondary">Phone (Optional)</label>
                      <input type="text" className="form-control" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: formatPhone(e.target.value) })} placeholder="(11) 99999-9999" maxLength={15} />
                    </div>
                  </div>
                  <div className="modal-footer border-top-0" style={{ borderColor: 'var(--glass-border)' }}>
                    <button type="button" className="btn btn-outline-light" onClick={() => setShowModal(false)}>Cancel</button>
                    {editingCustomer && (
                      <button type="button" className="btn btn-outline-danger" onClick={handleDisableCustomer}>Disable</button>
                    )}
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
                  <button type="button" className="btn-close btn-close-white" onClick={closePosModal}></button>
                </div>
                <div className="modal-body">

                  <h6 className="text-secondary mb-3">Existing Points of Sale</h6>
                  <ul className="list-group mb-4" style={{ borderRadius: '8px' }}>
                    {selectedCustomer.pos?.map((p: CustomerPOS) => (
                      <li key={p.id} className="list-group-item d-flex justify-content-between align-items-center bg-dark text-white border-secondary">
                        <div>
                          <strong>{p.address}</strong>
                          {p.personName && (
                            <div className="text-secondary small">
                              Contact: {p.personName}
                            </div>
                          )}
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
                          <div className="text-secondary small">
                            Fridges: {p.fridgeCount ?? 0}
                          </div>
                          <div className="text-secondary small">
                            Banner: {p.banner ? 'Yes' : 'No'} | Indi Banner: {p.indiBanner ? 'Yes' : 'No'}
                          </div>
                          <div className="text-secondary small">
                            Geocode: {p.lat != null && p.lng != null ? 'Set' : 'Missing'}
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => openEditPos(p)}>Edit</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeletePos(p.id)}>Remove</button>
                        </div>
                      </li>
                    ))}
                    {(!selectedCustomer.pos || selectedCustomer.pos.length === 0) && (
                      <li className="list-group-item bg-dark text-secondary border-secondary">No Points of Sale configured yet.</li>
                    )}
                  </ul>

                  <div className="card bg-transparent border-secondary">
                    <div className="card-header border-secondary text-white fw-bold bg-dark bg-opacity-50">
                      {editingPos ? 'Edit POS' : 'Add New POS'}
                    </div>
                    <div className="card-body">
                      <form onSubmit={handleSavePos}>
                        <div className="row g-3">
                          <div className="col-md-7">
                            <label className="form-label text-secondary small">Address</label>
                            <input type="text" className="form-control form-control-sm" value={newPos.address} onChange={e => setNewPos({ ...newPos, address: e.target.value })} required placeholder="123 Main St..." />
                          </div>
                          <div className="col-md-5">
                            <label className="form-label text-secondary small">Phone (Optional)</label>
                            <input type="text" className="form-control form-control-sm" value={newPos.phone} onChange={e => setNewPos({ ...newPos, phone: formatPhone(e.target.value) })} placeholder="(11) 99999-9999" maxLength={15} />
                          </div>
                          <div className="col-md-7">
                            <label className="form-label text-secondary small">Person Name (Optional)</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={newPos.personName || ''}
                              onChange={e =>
                                setNewPos({
                                  ...newPos,
                                  personName: e.target.value.slice(0, 30),
                                })
                              }
                              placeholder="Contact person name..."
                              maxLength={30}
                            />
                          </div>
                          <div className="col-md-5">
                            <label className="form-label text-secondary small">Fridges</label>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={newPos.fridgeCount ?? 0}
                              onChange={e =>
                                setNewPos({
                                  ...newPos,
                                  fridgeCount: Math.max(0, Number.parseInt(e.target.value || '0', 10) || 0),
                                })
                              }
                              min={0}
                            />
                          </div>
                          <div className="col-md-7">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="pos-banner"
                                checked={newPos.banner}
                                onChange={e =>
                                  setNewPos({
                                    ...newPos,
                                    banner: e.target.checked,
                                  })
                                }
                              />
                              <label className="form-check-label text-secondary small" htmlFor="pos-banner">
                                Banner
                              </label>
                            </div>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="pos-indi-banner"
                                checked={newPos.indiBanner}
                                onChange={e =>
                                  setNewPos({
                                    ...newPos,
                                    indiBanner: e.target.checked,
                                  })
                                }
                              />
                              <label className="form-check-label text-secondary small" htmlFor="pos-indi-banner">
                                Wind Banner
                              </label>
                            </div>
                          </div>
                          <div className="col-md-5 d-flex align-items-end gap-2">
                            {editingPos && (
                              <button type="button" className="btn btn-sm btn-outline-secondary w-100" onClick={cancelEditPos}>Cancel</button>
                            )}
                            <button type="button" className="btn btn-sm btn-outline-info w-100" onClick={handleGeocodePos} disabled={loading}>Geocode</button>
                            <button type="submit" className="btn btn-sm btn-success w-100" disabled={loading}>{loading ? '...' : editingPos ? 'Save' : 'Add'}</button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>

                </div>
                <div className="modal-footer border-top-0" style={{ borderColor: 'var(--glass-border)' }}>
                  <button type="button" className="btn btn-outline-light" onClick={closePosModal}>Close</button>
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
