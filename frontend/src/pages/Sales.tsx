import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [customerPosId, setCustomerPosId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [comments, setComments] = useState('');
  const [cart, setCart] = useState<{productId: string, quantity: number, price: number}[]>([]);

  const token = localStorage.getItem('token');

  const fetchData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [salesRes, custRes, prodRes] = await Promise.all([
        axios.get('http://localhost:3000/api/sales', config),
        axios.get('http://localhost:3000/api/customers', config),
        axios.get('http://localhost:3000/api/products', config)
      ]);
      setSales(salesRes.data);
      setCustomers(custRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      console.error('Failed to load sales data', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

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

  const handleUpdateCartItem = (index: number, field: string, value: any) => {
    const newCart = [...cart];
    (newCart[index] as any)[field] = value;
    
    // Auto populate price based on product selection
    if (field === 'productId') {
      const prod = products.find((p: any) => p.id === value);
      if (prod) {
        newCart[index].price = (prod as any).price;
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

      await axios.post('http://localhost:3000/api/sales', payload, config);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record sale.');
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

      <div className="glass-card p-4">
        <div className="table-responsive">
          <table className="table table-dark table-hover text-white m-0" style={{ background: 'transparent' }}>
            <thead>
              <tr style={{ borderColor: 'var(--glass-border)' }}>
                <th>Date</th>
                <th>Customer Name</th>
                <th>Products</th>
                <th>Total Value</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale: any) => {
                const total = sale.products?.reduce((acc: number, sp: any) => acc + (sp.quantity * sp.product.price), 0) || 0;
                
                return (
                  <tr key={sale.id} style={{ borderColor: 'var(--glass-border)' }}>
                    <td>{new Date(sale.createdAt).toLocaleDateString()}</td>
                    <td>{sale.customerPos?.customer?.name || 'Unknown'}</td>
                    <td>{sale.products?.length || 0} items</td>
                    <td><strong className="text-success">R$ {total.toFixed(2)}</strong></td>
                    <td>
                      <span className={`badge ${sale.paymentDate ? 'bg-success' : 'bg-warning text-dark'}`}>
                        {sale.paymentMethod} {sale.paymentDate ? '- Paid' : '- Pending'}
                      </span>
                      {!sale.paymentDate && sale.paymentDueDate && (
                        <div className="small text-secondary mt-1">Due: {new Date(sale.paymentDueDate).toLocaleDateString()}</div>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-light me-2" onClick={() => { setSelectedSale(sale); setShowDetailsModal(true); }}>Details</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sales.length === 0 && <p className="text-center text-secondary mt-4">No sales recorded.</p>}
        </div>
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
                            {customers.map((c: any) => (
                              c.pos?.length > 0 && (
                                <optgroup key={c.id} label={c.name}>
                                  {c.pos.map((p: any) => (
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
                          <div className="text-center p-4 border border-secondary rounded border-dashed text-secondary">
                            Your cart is empty. Click "+ Add Custom Product Line" to add items.
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table className="table table-dark table-sm align-middle mb-0" style={{ background: 'transparent' }}>
                              <thead>
                                <tr>
                                  <th>Product</th>
                                  <th style={{ width: '120px' }}>Quantity</th>
                                  <th style={{ width: '120px' }}>Unit Price</th>
                                  <th style={{ width: '120px' }}>Total</th>
                                  <th style={{ width: '60px' }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {cart.map((item, idx) => (
                                  <tr key={idx}>
                                    <td>
                                      <select className="form-select form-select-sm" value={item.productId} onChange={(e) => handleUpdateCartItem(idx, 'productId', e.target.value)} required>
                                        <option value="" disabled>Select...</option>
                                        {products.map((p: any) => (
                                          <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                                            {p.name} {p.stock <= 0 ? '(Out of Stock)' : `(${p.stock} in stock)`}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td>
                                      <input type="number" className="form-control form-control-sm" min="1" value={item.quantity} onChange={(e) => handleUpdateCartItem(idx, 'quantity', parseInt(e.target.value) || 1)} required />
                                    </td>
                                    <td>
                                      R$ {item.price.toFixed(2)}
                                    </td>
                                    <td>
                                      <strong>R$ {(item.price * item.quantity).toFixed(2)}</strong>
                                    </td>
                                    <td>
                                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveCartItem(idx)}>X</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
                  <div className="table-responsive bg-dark rounded border border-secondary p-2">
                    <table className="table table-dark table-sm m-0" style={{ background: 'transparent' }}>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th className="text-center">Qty</th>
                          <th className="text-end">Unit Price</th>
                          <th className="text-end">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSale.products?.map((sp: any, idx: number) => (
                          <tr key={idx}>
                            <td>{sp.product?.name || 'Unknown Product'}</td>
                            <td className="text-center">{sp.quantity}</td>
                            <td className="text-end">R$ {sp.product?.price?.toFixed(2) || '0.00'}</td>
                            <td className="text-end"><strong>R$ {((sp.product?.price || 0) * sp.quantity).toFixed(2)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 text-end">
                    <h5 className="mb-0 text-white">
                      <span className="text-secondary me-2 fs-6">Total:</span> 
                      <span className="text-success">
                        R$ {(selectedSale.products?.reduce((acc: number, sp: any) => acc + (sp.quantity * (sp.product?.price || 0)), 0) || 0).toFixed(2)}
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
