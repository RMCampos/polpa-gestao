import { useToast } from '../context/toast';
import './ConfirmDialog.css';

export const ConfirmDialog = () => {
  const { confirmState, respondToConfirm } = useToast();

  const handleConfirm = () => {
    respondToConfirm(true);
  };

  const handleCancel = () => {
    respondToConfirm(false);
  };

  if (!confirmState) return null;

  return (
    <div className="confirm-dialog-overlay">
      <div className="confirm-dialog">
        <div className="confirm-dialog-header">
          <h5 className="confirm-dialog-title">{confirmState.title}</h5>
          <button
            type="button"
            className="confirm-dialog-close"
            onClick={handleCancel}
            aria-label="Close"
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
        <div className="confirm-dialog-body">
          <p>{confirmState.message}</p>
        </div>
        <div className="confirm-dialog-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCancel}
          >
            {confirmState.cancelText || 'Cancel'}
          </button>
          <button
            type="button"
            className={`btn ${confirmState.isDangerous ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
          >
            {confirmState.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
