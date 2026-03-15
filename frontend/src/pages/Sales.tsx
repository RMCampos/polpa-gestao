import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import type { Customer, CustomerPOS, Product, Sale, SaleProduct } from '../types';

type ProductCart = {
  productId: string;
  quantity: number;
  price: number;
}

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);
  const apiBase = import.meta.env.VITE_BACKEND_SERVER || 'http://localhost:3000';

  // Form State
  const [customerPosId, setCustomerPosId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [comments, setComments] = useState('');
  const [cart, setCart] = useState<ProductCart[]>([]);

  const token = localStorage.getItem('token');

  const fetchData = useCallback( async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [salesRes, custRes, prodRes] = await Promise.all([
        axios.get(`${apiBase}/api/sales`, config),
        axios.get(`${apiBase}/api/customers`, config),
        axios.get(`${apiBase}/api/products`, config)
      ]);
      setSales(salesRes.data);
      setCustomers(custRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      console.error('Failed to load sales data', err);
    }
  }, [token, apiBase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = () => {
    setCustomerPosId('');
    setPaymentMethod('Cash');
    setPaymentDueDate('');
    setPaymentDate('');
    setComments('');
    setCart([]);
    setShowModal(true);
  };

  const handleAddCartItem = () => {
    setCart([...cart, { productId: '', quantity: 1, price: 0 }]);
  };

  const handleUpdateCartItem = (index: number, field: keyof ProductCart, value: string | number) => {
    const newCart = [...cart];
    newCart[index] = { ...newCart[index], [field]: value } as ProductCart;
    
    // Auto populate price based on product selection
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      if (prod) {
        newCart[index].price = prod.price;
      }
    }
    
    setCart(newCart);
  };

  const handleRemoveCartItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPosId || cart.length === 0 || cart.some(item => !item.productId || item.quantity <= 0)) {
      alert('Please fill out all required fields and add at least one valid product.');
      return;
    }

    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        customerPosId,
        paymentMethod,
        paymentDueDate: paymentDueDate ? new Date(paymentDueDate).toISOString() : null,
        paymentDate: paymentDate ? new Date(paymentDate).toISOString() : null,
        comments,
        products: cart.map(item => ({ productId: item.productId, quantity: item.quantity }))
      };

      await axios.post(`${apiBase}/api/sales`, payload, config);
      setShowModal(false);
      fetchData();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('Error response:', err.response);
        alert(err.response?.data?.error || 'Failed to record sale.');
      } else {
        console.error('Unexpected error:', err);
        alert('An unexpected error occurred while recording the sale.');
      }
    } finally {
      setLoading(false);
    }
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0">Sales Register</h2>
        <button className="btn btn-primary" onClick={handleOpenModal}>+ Record Sale</button>
      </div>

      <div className="row g-3">
        {sales.map((sale: Sale) => {
          const total = sale.products?.reduce((acc: number, sp: SaleProduct) => acc + (sp.quantity * (sp.product?.price ?? 0)), 0) || 0;
          return (
            <div key={sale.id} className="col-12 col-md-6">
              <div className="glass-card p-3 h-100 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h6 className="fw-bold text-white m-0">{sale.customerPos?.customer?.name || 'Unknown'}</h6>
                    <div className="text-secondary small">{new Date(sale.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span className={`badge ${sale.paymentDate ? 'bg-success' : 'bg-warning text-dark'}`}>
                    {sale.paymentDate ? 'Paid' : 'Pending'}
                  </span>
                </div>
                <div className="d-flex justify-content-between text-secondary small mb-2">
                  <span><i className="bi bi-box-seam me-1"></i>{sale.products?.length || 0} items</span>
                  <span>{sale.paymentMethod}</span>
                </div>
                {!sale.paymentDate && sale.paymentDueDate && (
                  <div className="text-secondary small mb-2">
                    <i className="bi bi-calendar-event me-1"></i>Due: {new Date(sale.paymentDueDate).toLocaleDateString()}
                  </div>
                )}
                <div className="mt-auto d-flex justify-content-between align-items-center pt-2">
                  <strong className="text-success fs-5">R$ {total.toFixed(2)}</strong>
                  <button className="btn btn-sm btn-outline-light" onClick={() => { setSelectedSale(sale); setShowDetailsModal(true); }}>Details</button>
                </div>
              </div>
            </div>
          );
        })}
        {sales.length === 0 && (
          <div className="col-12 text-center text-secondary mt-4">
            <p>No sales recorded.</p>
          </div>
        )}
      </div>

      {showModal && createPortal(
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-xl scrollable-modal">
              <div className="modal-content glass-card">
                <div className="modal-header border-bottom-0" style={{ borderColor: 'var(--glass-border)' }}>
                  <h5 className="modal-title text-white">Record New Sale</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                </div>
                <form onSubmit={handleSaveSale}>
                  <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    <div className="row g-4">
                      {/* Left Column: Customer & Payment Info */}
                      <div className="col-lg-4 border-end border-secondary">
                        <h6 className="text-secondary fw-bold mb-3">Customer & Payment</h6>
                        <div className="mb-3">
                          <label className="form-label text-secondary small">Customer Point of Sale</label>
                          <select className="form-select" value={customerPosId} onChange={e => setCustomerPosId(e.target.value)} required>
                            <option value="" disabled>Select POS...</option>
                            {customers.map((c: Customer) => (
                              c.pos && c.pos.length > 0 && (
                                <optgroup key={c.id} label={c.name}>
                                  {c.pos.map((p: CustomerPOS) => (
                                    <option key={p.id} value={p.id}>{p.address}</option>
                                  ))}
                                </optgroup>
                              )
                            ))}
                          </select>
                        </div>
                        <div className="mb-3">
                          <label className="form-label text-secondary small">Payment Method</label>
                          <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} required>
                            <option value="Cash">Cash</option>
                            <option value="Credit Card">Credit Card</option>
                            <option value="Debit Card">Debit Card</option>
                            <option value="Pix">Pix</option>
                            <option value="Boleto">Boleto (Invoice)</option>
                          </select>
                        </div>
                        <div className="mb-3">
                          <label className="form-label text-secondary small">Payment Due Date (Optional)</label>
                          <input type="date" className="form-control" value={paymentDueDate} onChange={e => setPaymentDueDate(e.target.value)} />
                        </div>
                        <div className="mb-3">
                          <label className="form-label text-secondary small">Payment Received Date (If already paid)</label>
                          <input type="date" className="form-control" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                        </div>
                        <div className="mb-3">
                          <label className="form-label text-secondary small">Comments / Notes</label>
                          <textarea className="form-control" rows={3} value={comments} onChange={e => setComments(e.target.value)} placeholder="Any specific requirements..."></textarea>
                        </div>
                      </div>

                      {/* Right Column: Products Cart */}
                      <div className="col-lg-8">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="text-secondary fw-bold m-0">Products Added</h6>
                          <button type="button" className="btn btn-sm btn-outline-success" onClick={handleAddCartItem}>+ Add Custom Product Line</button>
                        </div>

                        {cart.length === 0 ? (
                          <div className="text-center p-4 border border-secondary rounded text-secondary">
                            Your cart is empty. Click "+ Add Custom Product Line" to add items.
                          </div>
                        ) : (
                          <div className="d-flex flex-column gap-2">
                            {cart.map((item, idx) => (
                              <div key={idx} className="glass-card p-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <span className="text-secondary small fw-bold">Item {idx + 1}</span>
                                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveCartItem(idx)}>
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </div>
                                <div className="mb-2">
                                  <select className="form-select form-select-sm" value={item.productId} onChange={(e) => handleUpdateCartItem(idx, 'productId', e.target.value)} required>
                                    <option value="" disabled>Select product...</option>
                                    {products.map((p: Product) => (
                                      <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                                        {p.name} {p.stock <= 0 ? '(Out of Stock)' : `(${p.stock} in stock)`}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="d-flex gap-2 align-items-end">
                                  <div style={{ width: '90px' }}>
                                    <label className="form-label text-secondary small mb-1">Qty</label>
                                    <input type="number" className="form-control form-control-sm" min="1" value={item.quantity} onChange={(e) => handleUpdateCartItem(idx, 'quantity', parseInt(e.target.value) || 1)} required />
                                  </div>
                                  <div className="text-end ms-auto">
                                    <div className="text-secondary small">Unit: R$ {item.price.toFixed(2)}</div>
                                    <strong className="text-success">R$ {(item.price * item.quantity).toFixed(2)}</strong>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 p-3 rounded glass-card text-end border border-secondary">
                          <span className="text-secondary me-3">Grand Total:</span>
                          <span className="fs-4 fw-bold text-success">R$ {cartTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-top-0" style={{ borderColor: 'var(--glass-border)' }}>
                    <button type="button" className="btn btn-outline-light" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary btn-lg px-4" disabled={loading || cart.length === 0}>{loading ? 'Processing...' : 'Complete Sale'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {showDetailsModal && selectedSale && createPortal(
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content glass-card">
                <div className="modal-header border-bottom-0" style={{ borderColor: 'var(--glass-border)' }}>
                  <h5 className="modal-title text-white">Sale Details</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowDetailsModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <h6 className="text-secondary fw-bold mb-2">Customer Info</h6>
                      <p className="mb-1"><strong>Name:</strong> {selectedSale.customerPos?.customer?.name || 'Unknown'}</p>
                      <p className="mb-1"><strong>Document:</strong> {selectedSale.customerPos?.customer?.document || 'N/A'}</p>
                      <p className="mb-1"><strong>POS Address:</strong> {selectedSale.customerPos?.address || 'Unknown'}</p>
                      <p className="mb-0"><strong>POS Phone:</strong> {selectedSale.customerPos?.phone || 'N/A'}</p>
                    </div>
                    <div className="col-md-6">
                      <h6 className="text-secondary fw-bold mb-2">Payment Info</h6>
                      <p className="mb-1"><strong>Method:</strong> {selectedSale.paymentMethod}</p>
                      <p className="mb-1">
                        <strong>Status:</strong>{' '}
                        <span className={`badge ${selectedSale.paymentDate ? 'bg-success' : 'bg-warning text-dark'}`}>
                          {selectedSale.paymentDate ? 'Paid' : 'Pending'}
                        </span>
                      </p>
                      <p className="mb-1"><strong>Date:</strong> {new Date(selectedSale.createdAt).toLocaleString()}</p>
                      {!selectedSale.paymentDate && selectedSale.paymentDueDate && (
                        <p className="mb-1"><strong>Due Date:</strong> {new Date(selectedSale.paymentDueDate).toLocaleDateString()}</p>
                      )}
                      {selectedSale.comments && <p className="mb-0 text-muted small"><strong>Notes:</strong> {selectedSale.comments}</p>}
                    </div>
                  </div>

                  <h6 className="text-secondary fw-bold mb-3">Products Purchased ({selectedSale.products?.length || 0})</h6>
                  <div className="d-flex flex-column gap-2">
                    {selectedSale.products?.map((sp: SaleProduct, idx: number) => (
                      <div key={idx} className="glass-card p-3 d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-bold text-white">{sp.product?.name || 'Unknown Product'}</div>
                          <div className="text-secondary small">
                            {sp.quantity} × R$ {sp.product?.price?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                        <strong className="text-success">R$ {((sp.product?.price || 0) * sp.quantity).toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 text-end">
                    <h5 className="mb-0 text-white">
                      <span className="text-secondary me-2 fs-6">Total:</span> 
                      <span className="text-success">
                        R$ {(selectedSale.products?.reduce((acc: number, sp: SaleProduct) => acc + (sp.quantity * (sp.product?.price || 0)), 0) || 0).toFixed(2)}
                      </span>
                    </h5>
                  </div>

                </div>
                <div className="modal-footer border-top-0" style={{ borderColor: 'var(--glass-border)' }}>
                  <button type="button" className="btn btn-outline-light" onClick={() => setShowDetailsModal(false)}>Close</button>
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
