import { useEffect, useState } from 'react';
import axios from 'axios';
import type { SalesByCustomer, SalesByProduct } from '../types';

export default function Dashboard() {
  const [range, setRange] = useState('last-30-days');
  const [salesByProduct, setSalesByProduct] = useState<SalesByProduct[]>([]);
  const [salesByCustomer, setSalesByCustomer] = useState<SalesByCustomer[]>([]);
  const token = localStorage.getItem('token');
  const apiBase = import.meta.env.VITE_BACKEND_SERVER || 'http://localhost:3000';

  const ranges = [
    { label: 'This Week', value: 'this-week' },
    { label: 'This Month', value: 'this-month' },
    { label: 'This Year', value: 'this-year' },
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
        
        setSalesByProduct(resProducts.data);
        setSalesByCustomer(resCustomers.data);
      } catch (err) {
        console.error('Failed to load dashboard', err);
      }
    };
    fetchDashboard();
  }, [token, apiBase, range]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="m-0 fw-bold">Dashboard</h2>
        <div style={{ width: '200px' }}>
          <select 
            className="form-select bg-dark text-white border-secondary"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            {ranges.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
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
    </div>
  );
}
