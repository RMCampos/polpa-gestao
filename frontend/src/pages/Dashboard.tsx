import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import type { FridgePosSummary, IndustriesSummary, SalesByCustomer, SalesByProduct, SalesSummary } from '../types';

export default function Dashboard() {
  const [range, setRange] = useState('last-30-days');
  const [salesByProduct, setSalesByProduct] = useState<SalesByProduct[]>([]);
  const [salesByCustomer, setSalesByCustomer] = useState<SalesByCustomer[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [industriesSummary, setIndustriesSummary] = useState<IndustriesSummary[]>([]);
  const [fridgePoses, setFridgePoses] = useState<FridgePosSummary[]>([]);
  const [showFridgesModal, setShowFridgesModal] = useState(false);
  const [loadingFridgePoses, setLoadingFridgePoses] = useState(false);
  const token = localStorage.getItem('token');
  const apiBase = import.meta.env.VITE_BACKEND_SERVER || '/api';

  const ranges = [
    { label: 'This Week', value: 'this-week' },
    { label: 'This Month', value: 'this-month' },
    { label: 'This Year', value: 'this-year' },
    { label: 'Past Week', value: 'past-week' },
    { label: 'Past Month', value: 'past-month' },
    { label: 'Past Year', value: 'past-year' },
    { label: 'Last 7 Days', value: 'last-7-days' },
    { label: 'Last 14 Days', value: 'last-14-days' },
    { label: 'Last 30 Days', value: 'last-30-days' },
    { label: 'Last 90 Days', value: 'last-90-days' },
  ];

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const config = { 
          headers: { Authorization: `Bearer ${token}` },
          params: { range }
        };
        const resProducts = await axios.get(`${apiBase}/api/dashboard/sales-by-product`, config);
        const resCustomers = await axios.get(`${apiBase}/api/dashboard/sales-by-customer`, config);
        const resSummary = await axios.get(`${apiBase}/api/dashboard/sales-summary`, config);
        const resIndustries = await axios.get(`${apiBase}/api/dashboard/industries-summary`, config);
        
        setSalesByProduct(resProducts.data);
        setSalesByCustomer(resCustomers.data);
        setSalesSummary(resSummary.data);
        setIndustriesSummary(resIndustries.data);
      } catch (err) {
        console.error('Failed to load dashboard', err);
      }
    };
    fetchDashboard();
  }, [token, apiBase, range]);

  const top3Products = [...salesByProduct]
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 3);

  const top3Customers = [...salesByCustomer]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 3);

  const { totalCustomers, totalFridges } = salesSummary ?? { totalCustomers: 0, totalFridges: 0 };

  const openFridgesModal = async () => {
    setShowFridgesModal(true);
    setLoadingFridgePoses(true);
    try {
      const config = { headers: { Authorization: 'Bearer ' + token } };
      const response = await axios.get(`${apiBase}/api/dashboard/fridges`, config);
      setFridgePoses(response.data);
    } catch (err) {
      console.error('Failed to load fridge POS details', err);
      setFridgePoses([]);
    } finally {
      setLoadingFridgePoses(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="m-0 fw-bold">Dashboard</h2>
        <div style={{ width: '200px' }}>
          <select 
            className="form-select bg-dark text-white border-secondary"
            aria-label="Date range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            {ranges.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-4 mb-4">
        {/* Total Sales Value */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="glass-card p-4 h-100">
            <h6 className="text-secondary mb-2">Total Sales Value</h6>
            <h3 className="fw-bold text-success mb-0">
              R$ {salesSummary ? salesSummary.totalAmount.toFixed(2) : '—'}
            </h3>
            <small className="text-secondary">
              {salesSummary ? `${salesSummary.totalSales} sale(s)` : ''}
            </small>
          </div>
        </div>

        {/* Average Sale Value */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="glass-card p-4 h-100">
            <h6 className="text-secondary mb-2">Average Sale Value</h6>
            <h3 className="fw-bold text-primary mb-0">
              R$ {salesSummary ? salesSummary.averageAmount.toFixed(2) : '—'}
            </h3>
            <small className="text-secondary">per sale</small>
          </div>
        </div>

        {/* Total Customers */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="glass-card p-4 h-100">
            <h6 className="text-secondary mb-2">Total Customers</h6>
            <h3 className="fw-bold text-info mb-0">{salesSummary ? totalCustomers : '—'}</h3>
            <small className="text-secondary">active customers</small>
          </div>
        </div>

        {/* Total Fridges */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="glass-card p-4 h-100"
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer' }}
            onClick={openFridgesModal}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openFridgesModal();
              }
            }}
          >
            <h6 className="text-secondary mb-2">Total Fridges</h6>
            <h3 className="fw-bold text-warning mb-0">{salesSummary ? totalFridges : '—'}</h3>
            <small className="text-secondary">active POS total</small>
          </div>
        </div>

        {/* Top 3 Products */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="glass-card p-4 h-100">
            <h6 className="text-secondary mb-2">Top 3 Products</h6>
            {top3Products.length === 0 ? (
              <p className="text-secondary mb-0 small">No data available.</p>
            ) : (
              <ol className="mb-0 ps-3">
                {top3Products.map((item) => (
                  <li key={item.productId} className="text-white mb-1">
                    <span>{item.productName}</span>
                    <br />
                    <small className="text-secondary">{item.totalQuantity} items sold</small>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Top 3 Customers */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="glass-card p-4 h-100">
            <h6 className="text-secondary mb-2">Top 3 Customers</h6>
            {top3Customers.length === 0 ? (
              <p className="text-secondary mb-0 small">No data available.</p>
            ) : (
              <ol className="mb-0 ps-3">
                {top3Customers.map((item) => (
                  <li key={item.customerId} className="text-white mb-1">
                    <span>{item.customerName}</span>
                    <br />
                    <small className="text-secondary">R$ {item.totalAmount.toFixed(2)}</small>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* POS by Industry */}
        <div className="col-12 col-sm-6 col-lg-6">
          <div className="glass-card p-4 h-100">
            <h6 className="text-secondary mb-2">POS by Industry</h6>
            {industriesSummary.length === 0 ? (
              <p className="text-secondary mb-0 small">No data available.</p>
            ) : (
              <ul className="list-group list-group-flush" style={{ background: 'transparent' }}>
                {industriesSummary.map((item) => (
                  <li key={item.industry} className="list-group-item d-flex justify-content-between align-items-center text-white px-0" style={{ background: 'transparent', borderBottomColor: 'var(--glass-border)' }}>
                    <span>{item.industry}</span>
                    <span className="badge bg-secondary rounded-pill">{item.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      
      <div className="row g-4">
        {/* Sales by Product */}
        <div className="col-12 col-md-6">
          <div className="glass-card p-4 h-100">
            <h4 className="mb-3">Sales by Product</h4>
            {salesByProduct.length === 0 ? <p className="text-secondary">No data available.</p> : (
              <ul className="list-group list-group-flush" style={{ background: 'transparent' }}>
                {salesByProduct.map((item: SalesByProduct) => (
                  <li key={item.productId} className="list-group-item d-flex justify-content-between align-items-center text-white" style={{ background: 'transparent', borderBottomColor: 'var(--glass-border)' }}>
                    <div>
                      <div>{item.productName}</div>
                      <small className="text-secondary">{item.totalQuantity} items sold</small>
                    </div>
                    <span className="badge bg-primary rounded-pill">R$ {item.totalAmount.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sales by Customer */}
        <div className="col-12 col-md-6">
          <div className="glass-card p-4 h-100">
            <h4 className="mb-3">Sales by Customer</h4>
            {salesByCustomer.length === 0 ? <p className="text-secondary">No data available.</p> : (
              <ul className="list-group list-group-flush" style={{ background: 'transparent' }}>
                {salesByCustomer.map((item: SalesByCustomer) => (
                  <li key={item.customerId} className="list-group-item d-flex justify-content-between align-items-center text-white" style={{ background: 'transparent', borderBottomColor: 'var(--glass-border)' }}>
                    <div>
                      <div>{item.customerName}</div>
                      <small className="text-secondary">{item.totalSales} purchases</small>
                    </div>
                    <span className="badge bg-success rounded-pill">R$ {item.totalAmount.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {showFridgesModal && createPortal(
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fridges-modal-title"
            style={{ zIndex: 1050 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content glass-card">
                <div className="modal-header border-bottom-0" style={{ borderColor: 'var(--glass-border)' }}>
                  <h5 id="fridges-modal-title" className="modal-title text-white">POS with Fridges</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowFridgesModal(false)}></button>
                </div>
                <div className="modal-body">
                  {loadingFridgePoses ? (
                    <p className="text-secondary mb-0">Loading...</p>
                  ) : fridgePoses.length === 0 ? (
                    <p className="text-secondary mb-0">No active POS with fridges found.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-dark table-hover align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Customer</th>
                            <th>Address</th>
                            <th className="text-end">Fridge Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fridgePoses.map((pos) => (
                            <tr key={pos.id}>
                              <td>{pos.customer.name}</td>
                              <td>{pos.address}</td>
                              <td className="text-end">{pos.fridgeCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="modal-footer border-top-0" style={{ borderColor: 'var(--glass-border)' }}>
                  <button type="button" className="btn btn-outline-light" onClick={() => setShowFridgesModal(false)}>Close</button>
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
