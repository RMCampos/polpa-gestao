import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [salesByRoute, setSalesByRoute] = useState([]);
  const [salesByCustomer, setSalesByCustomer] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const resRoutes = await axios.get('http://localhost:3000/api/dashboard/sales-by-route', config);
        const resCustomers = await axios.get('http://localhost:3000/api/dashboard/sales-by-customer', config);
        
        setSalesByRoute(resRoutes.data);
        setSalesByCustomer(resCustomers.data);
      } catch (err) {
        console.error('Failed to load dashboard', err);
      }
    };
    fetchDashboard();
  }, [token]);

  return (
    <div>
      <h2 className="mb-4 fw-bold">Dashboard</h2>
      
      <div className="row g-4">
        {/* Sales by Route */}
        <div className="col-12 col-md-6">
          <div className="glass-card p-4 h-100">
            <h4 className="mb-3">Sales by Route</h4>
            {salesByRoute.length === 0 ? <p className="text-secondary">No data available.</p> : (
              <ul className="list-group list-group-flush" style={{ background: 'transparent' }}>
                {salesByRoute.map((item: any) => (
                  <li key={item.routeId} className="list-group-item d-flex justify-content-between align-items-center text-white" style={{ background: 'transparent', borderBottomColor: 'var(--glass-border)' }}>
                    {item.routeName}
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
                {salesByCustomer.map((item: any) => (
                  <li key={item.customerId} className="list-group-item d-flex justify-content-between align-items-center text-white" style={{ background: 'transparent', borderBottomColor: 'var(--glass-border)' }}>
                    {item.customerName}
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
