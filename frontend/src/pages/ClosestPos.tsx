import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

type ClosestPos = {
  id: string;
  address: string;
  distanceKm: number;
  lastBuyingDate: string | null;
};

const formatDistance = (distanceKm: number): string => {
  const distanceMeters = Math.round(distanceKm * 1000);
  if (distanceMeters < 1000) return `${distanceMeters} m away`;
  return `${distanceKm.toFixed(2)} km away`;
};

export default function ClosestPos() {
  const [items, setItems] = useState<ClosestPos[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const apiBase = import.meta.env.VITE_BACKEND_SERVER || '/api';
  const locale = navigator.language || 'en-US';

  const fetchClosestPos = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setLoading(true);
    setError('');
    setItems([]);

    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const response = await axios.get<ClosestPos[]>(
          `${apiBase}/api/public/pos/closest`,
          { params: { lat: coords.latitude, lng: coords.longitude } }
        );
        setItems(response.data);
      } catch {
        setError('Failed to load closest points of sale.');
      } finally {
        setLoading(false);
      }
    }, () => {
      setError('Location access is required to find closest points of sale.');
      setLoading(false);
    }, {
      enableHighAccuracy: true,
      timeout: 10000
    });
  }, [apiBase]);

  useEffect(() => {
    fetchClosestPos();
  }, [fetchClosestPos]);

  return (
    <div className="container py-4 py-md-5 animate-fade-in d-flex flex-column" style={{ minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0">Closest Points of Sale</h2>
          <p className="text-secondary m-0">Using your current GPS location</p>
        </div>
        <button type="button" className="btn btn-outline-light" onClick={fetchClosestPos} disabled={loading}>
          {loading ? 'Locating...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger-color)', color: '#fff' }}>
          {error}
        </div>
      )}

      <div className="d-flex flex-column gap-3">
        {items.map((pos) => (
          <div key={pos.id} className="w-100">
            <div className="glass-card p-4 d-flex flex-column" style={{ minHeight: '140px' }}>
              <strong className="text-white">{pos.address}</strong>
              <div className="text-secondary small mt-2">{formatDistance(pos.distanceKm)}</div>
              <div className="text-secondary small mt-auto pt-3">
                Last buying date: {pos.lastBuyingDate
                  ? new Date(pos.lastBuyingDate).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
                  : 'No sales yet'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && !error && items.length === 0 && (
        <div className="text-secondary mt-4">No points of sale with coordinates were found.</div>
      )}

      <footer className="text-center text-secondary small mt-auto pt-4">© 2026 Polpa Gestão</footer>
    </div>
  );
}
