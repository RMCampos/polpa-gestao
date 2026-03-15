import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import type { Customer, CustomerPOS, Route } from '../types';

type RouteStopApiItem = {
  customerPosId?: string;
  customerPos?: CustomerPOS;
};

type RouteApiResponse = Omit<Route, 'customerPos'> & {
  customerPos?: Array<CustomerPOS | RouteStopApiItem>;
};

const toErrorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string } | undefined;
    return data?.message || data?.error || fallback;
  }
  return fallback;
};

const isRouteStopWrapper = (item: CustomerPOS | RouteStopApiItem): item is RouteStopApiItem => {
  return 'customerPos' in item;
};

const normalizeRoute = (route: RouteApiResponse | Route): Route => {
  const normalizedStops = (route.customerPos || [])
    .map((item) => {
      if (isRouteStopWrapper(item)) {
        if (!item.customerPos) {
          return null;
        }
        return {
          ...item.customerPos,
          id: item.customerPos.id || item.customerPosId,
        } satisfies CustomerPOS;
      }
      return item;
    })
    .filter((stop): stop is CustomerPOS => stop !== null);

  return {
    ...route,
    customerPos: normalizedStops,
  };
};

export default function RoutesPage() {
  const [routesData, setRoutesData] = useState<Route[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showStopsModal, setShowStopsModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedPosIdToAdd, setSelectedPosIdToAdd] = useState('');
  const [newRoute, setNewRoute] = useState<Route>({ name: '', completed: false, dayOfWeek: 0, customerPos: [] });
  const [editingRoute, setEditingRoute] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');
  const apiBase = import.meta.env.VITE_BACKEND_SERVER || 'http://localhost:3000';

  const fetchRoutes = useCallback(async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get<RouteApiResponse[]>(`${apiBase}/api/routes`, config);
      setRoutesData(res.data.map(normalizeRoute));
    } catch (err) {
      console.error('Failed to load routes', err);
    }
  }, [token, apiBase]);

  const fetchCustomers = useCallback(async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get<Customer[]>(`${apiBase}/api/customers`, config);
      setCustomers(res.data);
    } catch (err) {
      console.error('Failed to load customers', err);
    }
  }, [token, apiBase]);

  useEffect(() => {
    fetchRoutes();
    fetchCustomers();
  }, [fetchRoutes, fetchCustomers]);

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editingRoute) {
        const updatePayload = {
          name: newRoute.name,
          dayOfWeek: newRoute.dayOfWeek,
          completed: newRoute.completed,
        };
        await axios.put(`${apiBase}/api/routes/${editingRoute}`, updatePayload, config);
      } else {
        const createPayload = {
          name: newRoute.name,
          dayOfWeek: newRoute.dayOfWeek,
          customerPosIds: (newRoute.customerPos || [])
            .map((cp: CustomerPOS) => cp.id)
            .filter((id): id is string => Boolean(id)),
        };
        await axios.post(`${apiBase}/api/routes`, createPayload, config);
      }
      setShowModal(false);
      setNewRoute({ name: '', completed: false, dayOfWeek: 0, customerPos: [] });
      setEditingRoute(null);
      fetchRoutes();
    } catch (err) {
      alert(`Failed to save route: ${toErrorMessage(err, 'Unknown error')}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleRouteCompleted = async (route: Route) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${apiBase}/api/routes/${route.id}`, { completed: !route.completed }, config);
      fetchRoutes();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        alert(`Failed to toggle route status: ${err.response.data.message || 'Unknown error'}`);
      } else {
        alert('Failed to toggle route status due to network error.');
      }
    }
  };

  const openNewModal = () => {
    setEditingRoute(null);
    setNewRoute({ name: '', completed: false, dayOfWeek: 0, customerPos: [] });
    setShowModal(true);
  };

  const openEditModal = (route: Route) => {
    if (!route.id) {
      alert('Invalid route data.');
      return;
    }
    setEditingRoute(route.id);
    setNewRoute({ name: route.name, completed: route.completed, dayOfWeek: route.dayOfWeek, customerPos: route.customerPos || [] });
    setShowModal(true);
  };

  const openStopsModal = (route: Route) => {
    setSelectedRoute(normalizeRoute(route));
    setSelectedPosIdToAdd('');
    fetchCustomers();
    setShowStopsModal(true);
  };

  const handleAddStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute || !selectedPosIdToAdd) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const existingPosIds = (selectedRoute.customerPos || [])
        .map((cp: CustomerPOS) => cp.id)
        .filter((id): id is string => Boolean(id));
      if (existingPosIds.includes(selectedPosIdToAdd)) {
        alert('This POS is already a stop on this route.');
        setLoading(false);
        return;
      }
      
      const newPosIds = [...existingPosIds, selectedPosIdToAdd];
      await axios.put(`${apiBase}/api/routes/${selectedRoute.id}`, { customerPosIds: newPosIds }, config);
      
      setSelectedPosIdToAdd('');
      fetchRoutes();
      const res = await axios.get<RouteApiResponse>(`${apiBase}/api/routes/${selectedRoute.id}`, config);
      setSelectedRoute(normalizeRoute(res.data));
    } catch (err) {
      alert(`Failed to add stop: ${toErrorMessage(err, 'Unknown error')}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStop = async (posIdToRemove: string | undefined) => {
    if (!selectedRoute || !posIdToRemove) return;
    if (!confirm('Are you sure you want to remove this stop from the route?')) return;
    
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (!selectedRoute.customerPos || selectedRoute.customerPos.length === 0) {
        alert('No stops to remove.');
        setLoading(false);
        return;
      }
      const existingPosIds: string[] = [];
      for (const cp of selectedRoute.customerPos) {
        if (cp.id) existingPosIds.push(cp.id);
      }
      if (!existingPosIds.includes(posIdToRemove)) {
        alert('This POS is not currently a stop on this route.');
        setLoading(false);
        return;
      }
      const newPosIds: string[] = existingPosIds.filter((id: string) => id !== posIdToRemove);
      
      await axios.put(`${apiBase}/api/routes/${selectedRoute.id}`, { customerPosIds: newPosIds }, config);
      
      fetchRoutes();
      const res = await axios.get<RouteApiResponse>(`${apiBase}/api/routes/${selectedRoute.id}`, config);
      setSelectedRoute(normalizeRoute(res.data));
    } catch (err) {
      alert(`Failed to remove stop: ${toErrorMessage(err, 'Unknown error')}`);
    } finally {
      setLoading(false);
    }
  };

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0">Delivery Routes</h2>
        <button className="btn btn-primary" onClick={openNewModal}>+ New Route</button>
      </div>

      <div className="row g-4">
        {routesData.map((route: Route) => (
          <div key={route.id} className="col-12 col-xl-6">
            <div className="glass-card p-4 h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="fw-bold text-white m-0" style={{ cursor: 'pointer' }} onClick={() => toggleRouteCompleted(route)}>{route.name}</h4>
                <div className="d-flex align-items-center gap-2">
                  <span className={`badge ${route.completed ? 'bg-success' : 'bg-warning text-dark'}`} style={{ cursor: 'pointer' }} onClick={() => toggleRouteCompleted(route)}>
                    {route.completed ? 'Completed' : 'Pending'}
                  </span>
                  <span className="badge bg-primary">{daysOfWeek[route.dayOfWeek]}</span>
                </div>
              </div>

              <div className="mt-4">
                <h6 className="text-secondary mb-2">Delivery Stops ({route.customerPos?.length || 0})</h6>
                <ul className="list-group list-group-flush border border-secondary rounded overflow-hidden" style={{ background: 'transparent' }}>
                  {route.customerPos?.map((cp: CustomerPOS, idx: number) => (
                    <li key={`${route.id}-${cp.id}`} className="list-group-item d-flex justify-content-between align-items-center text-white" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'var(--glass-border)' }}>
                      <div>
                        <strong>{idx + 1}. {cp.customer?.name || 'Unknown'}</strong>
                        <div className="text-secondary small">{cp.address}</div>
                        {/* Add url to search on google maps with the address */}
                        {cp.address && (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cp.address)}`} target="_blank" rel="noopener noreferrer" className="text-secondary small">View on Google Maps</a>
                        )}
                      </div>
                    </li>
                  ))}
                  {(!route.customerPos || route.customerPos.length === 0) && (
                    <li className="list-group-item text-secondary" style={{ background: 'rgba(255,255,255,0.05)' }}>No stops added.</li>
                  )}
                </ul>
              </div>
              
              <div className="mt-4 d-flex gap-2">
                <button className="btn btn-outline-light flex-grow-1" onClick={() => openEditModal(route)}>Edit</button>
                <button className="btn btn-outline-primary flex-grow-1" onClick={() => openStopsModal(route)}>Manage Stops</button>
              </div>
            </div>
          </div>
        ))}
        {routesData.length === 0 && (
          <div className="col-12 text-center text-secondary mt-4">
            <p>No routes configured.</p>
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
                  <h5 className="modal-title text-white">{editingRoute ? 'Edit Route' : 'New Route'}</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                </div>
                <form onSubmit={handleSaveRoute}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label text-secondary">Route Name</label>
                      <input type="text" className="form-control" value={newRoute.name} onChange={e => setNewRoute({...newRoute, name: e.target.value})} required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-secondary">Day of Week</label>
                      <select className="form-select" value={newRoute.dayOfWeek} onChange={e => setNewRoute({...newRoute, dayOfWeek: parseInt(e.target.value)})} required>
                        {daysOfWeek.map((day, idx) => (
                          <option key={idx} value={idx}>{day}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3 form-check">
                      <input type="checkbox" className="form-check-input" id="completedCheck" checked={newRoute.completed} onChange={e => setNewRoute({...newRoute, completed: e.target.checked})} />
                      <label className="form-check-label text-secondary" htmlFor="completedCheck">Completed</label>
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-secondary">Stops (POS IDs)</label>
                      <p className="text-secondary small">Stops management is handleable from the details view. <br/> Leave assigned POS intact to prevent overriding them during edits.</p>
                    </div>
                  </div>
                  <div className="modal-footer border-top-0" style={{ borderColor: 'var(--glass-border)' }}>
                    <button type="button" className="btn btn-outline-light" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Route'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {showStopsModal && selectedRoute && createPortal(
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content glass-card">
                <div className="modal-header border-bottom-0" style={{ borderColor: 'var(--glass-border)' }}>
                  <h5 className="modal-title text-white">Manage Stops - {selectedRoute.name}</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowStopsModal(false)}></button>
                </div>
                <div className="modal-body">
                  
                  <h6 className="text-secondary mb-3">Current Stops in Route ({selectedRoute.customerPos?.length || 0})</h6>
                  <ul className="list-group mb-4" style={{ borderRadius: '8px' }}>
                    {selectedRoute.customerPos?.map((cp: CustomerPOS, idx: number) => (
                      <li key={`${selectedRoute.id}-${cp.id}`} className="list-group-item d-flex justify-content-between align-items-center bg-dark text-white border-secondary">
                        <div>
                          <strong>{idx + 1}. {cp.customer?.name || 'Unknown'}</strong>
                          <div className="text-secondary small">{cp.address}</div>
                        </div>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveStop(cp.id)} disabled={loading}>Remove</button>
                      </li>
                    ))}
                    {(!selectedRoute.customerPos || selectedRoute.customerPos.length === 0) && (
                      <li className="list-group-item bg-dark text-secondary border-secondary">No stops added yet.</li>
                    )}
                  </ul>

                  <div className="card bg-transparent border-secondary">
                    <div className="card-header border-secondary text-white fw-bold bg-dark bg-opacity-50">
                      Add a new Stop
                    </div>
                    <div className="card-body">
                      <form onSubmit={handleAddStop}>
                        <div className="row g-3">
                          <div className="col-md-9">
                            <select className="form-select form-select-sm" value={selectedPosIdToAdd} onChange={e => setSelectedPosIdToAdd(e.target.value)} required>
                              <option value="" disabled>Select a Customer POS...</option>
                              {customers.map((c: Customer) => (
                                c.pos && c.pos.length > 0 && (
                                  <optgroup key={c.id} label={c.name}>
                                    {c.pos
                                      .filter((p: CustomerPOS) => Boolean(p.id))
                                      .map((p: CustomerPOS) => (
                                        <option key={p.id} value={p.id}>{p.address} {p.phone ? `(${p.phone})` : ''}</option>
                                      ))}
                                  </optgroup>
                                )
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3">
                            <button type="submit" className="btn btn-sm btn-success w-100" disabled={loading || !selectedPosIdToAdd}>{loading ? '...' : 'Add Stop'}</button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>

                </div>
                <div className="modal-footer border-top-0" style={{ borderColor: 'var(--glass-border)' }}>
                  <button type="button" className="btn btn-outline-light" onClick={() => setShowStopsModal(false)}>Close</button>
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
