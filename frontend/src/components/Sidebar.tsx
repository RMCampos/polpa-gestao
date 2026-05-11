import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

interface SidebarProps {
  onLogout: () => void;
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const location = useLocation();
  const userName = JSON.parse(localStorage.getItem('user') || '{}').name;
  const buildNumber = import.meta.env.VITE_BUILD_NUMBER || 'dev';
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-topbar d-flex d-md-none">
        <h3 className="fw-bold m-0" style={{ color: 'var(--primary-color)' }}>Polpa Gestão</h3>
        <button
          className="btn btn-link p-0"
          style={{ color: 'var(--text-primary)', fontSize: '1.5rem', lineHeight: 1 }}
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
        >
          <i className="bi bi-list"></i>
        </button>
      </div>

      {/* Backdrop */}
      {isOpen && <div className="sidebar-overlay" onClick={closeMenu} />}

      <div className={`sidebar d-flex flex-column${isOpen ? ' open' : ''}`}>
      <div className="mb-3 px-2 d-flex align-items-center justify-content-between">
        <div>
          <h3 className="fw-bold m-0" style={{ color: 'var(--primary-color)' }}>Polpa Gestão</h3>
          <small className="text-secondary">Welcome, {userName}</small>
        </div>
        <button className="btn btn-link p-0 d-md-none" style={{ color: 'var(--text-secondary)', fontSize: '1.25rem' }} onClick={closeMenu} aria-label="Close menu">
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      <nav className="nav flex-column w-100 mb-auto">
        <Link
          to="/dashboard"
          className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          <i className="bi bi-speedometer2 me-2"></i> Dashboard
        </Link>
        <Link
          to="/users"
          className={`nav-link ${location.pathname === '/users' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          <i className="bi bi-people me-2"></i> Users
        </Link>
        <Link
          to="/customers"
          className={`nav-link ${location.pathname === '/customers' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          <i className="bi bi-shop me-2"></i> Customers
        </Link>
        <Link
          to="/products"
          className={`nav-link ${location.pathname === '/products' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          <i className="bi bi-box-seam me-2"></i> Products
        </Link>
        <Link
          to="/routes"
          className={`nav-link ${location.pathname === '/routes' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          <i className="bi bi-map me-2"></i> Routes
        </Link>
        <Link
          to="/sales"
          className={`nav-link ${location.pathname === '/sales' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          <i className="bi bi-cart-check me-2"></i> Sales
        </Link>
        <Link
          to="/visits"
          className={`nav-link ${location.pathname === '/visits' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          <i className="bi bi-calendar-event me-2"></i> Visits
        </Link>
      </nav>

      <div className="mt-auto">
        <div className="text-muted small text-center mb-2">Build {buildNumber}</div>
        <button className="btn btn-outline-danger w-100" onClick={onLogout}>
          <i className="bi bi-box-arrow-right me-2"></i> Logout
        </button>
      </div>
    </div>
    </>
  );
}
