import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useToast } from '../context/toast';
import type { Sale } from '../types';

const formatDate = (value: string | null) => {
  if (value) {
    const valueDate = new Date(value);
    const formatted = valueDate.toLocaleDateString('pt-BR');
    switch (valueDate.getDay()) {
      case 0: return `${formatted} - Sunday`;
      case 1: return `${formatted} - Monday`;
      case 2: return `${formatted} - Tuesday`;
      case 3: return `${formatted} - Wednesday`;
      case 4: return `${formatted} - Thursday`;
      case 5: return `${formatted} - Friday`;
      case 6: return `${formatted} - Saturday`;
    }
  }
  return 'N/A';
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR');

export default function Visits() {
  const toast = useToast();
  const [visits, setVisits] = useState<Sale[]>([]);
  const [showVisited, setShowVisited] = useState(false);
  const [togglingVisitId, setTogglingVisitId] = useState<string | null>(null);
  const apiBase = import.meta.env.VITE_BACKEND_SERVER || '/api';

  const fetchVisits = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBase}/api/visits?showVisited=${showVisited}`);
      setVisits(res.data);
    } catch (err) {
      console.error('Failed to load visits', err);
      toast.showToast('Failed to load visits.', 'error');
    }
  }, [apiBase, showVisited, toast]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const handleMarkVisited = async (visit: Sale) => {
    if (!visit.id || togglingVisitId === visit.id) return;

    setTogglingVisitId(visit.id);
    try {
      const nextVisitedAt = visit.visitedAt ? null : new Date().toISOString();
      await axios.put(`${apiBase}/api/sales/${visit.id}`, { visitedAt: nextVisitedAt });
      toast.showToast(nextVisitedAt ? 'Visit marked as completed.' : 'Visit marked as pending.', 'success');
      await fetchVisits();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.showToast(err.response?.data?.error || 'Failed to update visit status.', 'error');
      } else {
        toast.showToast('An unexpected error occurred.', 'error');
      }
    } finally {
      setTogglingVisitId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0">Visits</h2>
        <div className="form-check form-switch m-0">
          <input
            id="show-visited"
            className="form-check-input"
            type="checkbox"
            checked={showVisited}
            onChange={(e) => setShowVisited(e.target.checked)}
          />
          <label className="form-check-label text-secondary" htmlFor="show-visited">
            Visited
          </label>
        </div>
      </div>

      <div className="row g-3">
        {visits.map((visit: Sale) => {
          const isUpdating = togglingVisitId === visit.id;
          const isVisited = Boolean(visit.visitedAt);
          const customerName = visit.customerPos?.customer?.name || 'Unknown';
          const posPersonName = visit.customerPos?.personName || visit.customerPos?.customer?.personName || 'N/A';
          const posAddress = visit.customerPos?.address || 'Unknown';

          return (
            <div key={visit.id} className="col-12 col-md-6 col-lg-4">
              <div className="glass-card p-3 h-100 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h6 className="fw-bold text-white m-0">{customerName}</h6>
                    <div className="text-secondary small">{posPersonName}</div>
                  </div>
                  <button
                    type="button"
                    className={`badge border-0 ${isVisited ? 'bg-success' : 'bg-warning text-dark'}`}
                    style={{ cursor: isUpdating ? 'wait' : 'pointer' }}
                    onClick={() => handleMarkVisited(visit)}
                    disabled={isUpdating}
                    title={isVisited ? 'Click to mark as pending' : 'Click to mark as visited'}
                  >
                    {isUpdating ? 'Updating...' : isVisited ? 'Visited' : 'Pending'}
                  </button>
                </div>

                <div className="text-secondary small mb-1">
                  <i className="bi bi-geo-alt me-1"></i>{posAddress}
                </div>
                <div className="text-secondary small mb-1">
                  <i className="bi bi-calendar-plus me-1"></i>Sale: {formatDateTime(visit.createdAt)}
                </div>
                <div className="text-secondary small mb-1">
                  <i className="bi bi-calendar-event me-1"></i>Next Visit: {formatDate(visit.nextVisitDate)}
                </div>
                {isVisited && visit.visitedAt && (
                  <div className="text-success small mt-auto pt-2">
                    <i className="bi bi-check-circle me-1"></i>Visited: {formatDateTime(visit.visitedAt)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {visits.length === 0 && (
          <div className="col-12 text-center text-secondary mt-4">
            <p>{showVisited ? 'No completed visits found.' : 'No pending visits.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
