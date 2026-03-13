import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  onLogout: () => void;
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const location = useLocation();
  const userName = JSON.parse(localStorage.getItem('user') || '{}').name;

  return (
    <div className="sidebar d-flex flex-column">
      <div className="mb-3 px-2 d-flex align-items-center justify-content-between">
        <div>
          <h3 className="fw-bold m-0" style={{ color: 'var(--primary-color)' }}>Polpa Gestão</h3>
          <small className="text-secondary d-none d-md-block">Welcome, {userName}</small>
        </div>
        <button className="btn btn-outline-danger btn-sm d-md-none" onClick={onLogout}>
          <i className="bi bi-box-arrow-right"></i>
        </button>
      </div>

      <nav className="nav flex-row flex-md-column w-100 mb-auto mt-2 mt-md-0 pb-2 pb-md-0" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        <Link 
          to="/dashboard" 
          className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
        >
          <i className="bi bi-speedometer2 me-2"></i> Dashboard
        </Link>
        <Link 
          to="/users" 
          className={`nav-link ${location.pathname === '/users' ? 'active' : ''}`}
        >
          <i className="bi bi-people me-2"></i> Users
        </Link>
        <Link 
          to="/customers" 
          className={`nav-link ${location.pathname === '/customers' ? 'active' : ''}`}
        >
          <i className="bi bi-shop me-2"></i> Customers
        </Link>
        <Link 
          to="/products" 
          className={`nav-link ${location.pathname === '/products' ? 'active' : ''}`}
        >
          <i className="bi bi-box-seam me-2"></i> Products
        </Link>
        <Link 
          to="/routes" 
          className={`nav-link ${location.pathname === '/routes' ? 'active' : ''}`}
        >
          <i className="bi bi-map me-2"></i> Routes
        </Link>
        <Link 
          to="/sales" 
          className={`nav-link ${location.pathname === '/sales' ? 'active' : ''}`}
        >
          <i className="bi bi-cart-check me-2"></i> Sales
        </Link>
      </nav>

      <div className="mt-auto d-none d-md-block">
        <button className="btn btn-outline-danger w-100" onClick={onLogout}>
          <i className="bi bi-box-arrow-right me-2"></i> Logout
        </button>
      </div>
    </div>
  );
}
