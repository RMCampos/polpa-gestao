import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useToast } from '../context/toast';
import { CustomerPosCombobox } from '../components/CustomerPosCombobox';
import type { Customer, Product, Sale, SaleProduct } from '../types';

type ProductCart = {
  productId: string;
  quantity: number;
  price: number;
};

const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;

const formatDateTime = (value: string) => new Date(value).toLocaleString('pt-BR');

const buildSaleCopyText = (sale: Sale) => {
  const customerName = sale.customerPos?.customer?.name || 'Unknown';
  const customerPerson = sale.customerPos?.personName || sale.customerPos?.customer?.personName || 'N/A';
  const customerPhone = sale.customerPos?.customer?.phone || 'N/A';
  const posAddress = sale.customerPos?.address || 'Unknown';
  const saleDate = formatDateTime(sale.createdAt);

  const products = (sale.products || []).map((sp: SaleProduct) => {
    const productName = sp.product?.name || 'Unknown Product';
    const unitPrice = sp.product?.price || 0;
    const lineTotal = unitPrice * sp.quantity;
    return `- ${productName}: ${sp.quantity} x ${formatCurrency(unitPrice)} = ${formatCurrency(lineTotal)}`;
  });

  const total = (sale.products || []).reduce(
    (acc: number, sp: SaleProduct) => acc + (sp.quantity * (sp.product?.price || 0)),
    0,
  );

  const translatePaymentMethod = (method: string) => {
    switch (method) {
      case 'Cash': return 'Dinheiro';
      case 'Credit Card': return 'Cartão de Crédito';
      case 'Debit Card': return 'Cartão de Débito';
      case 'Pix': return 'Pix';
      case 'Boleto': return 'Boleto (Fatura)';
      case 'At the Delivery': return 'Na Entrega';
      case 'Next Visit': return 'Na Próxima Visita';
      default: return method;
    }
  };

  const lines: string[] = [
    'Novo pedido gerado com sucesso! 🚀',
    `Data: ${saleDate}`,
    '*CLIENTE*',
    `- Nome: ${customerName}`,
    `- Responsável: ${customerPerson}`,
    `- Telefone: ${customerPhone}`,
    '*ENTREGA* 📦',
    `- Endereço: ${posAddress}`,
    '*ITENS* 🛒',
    ...(products.length > 0 ? products : ['- Nenhum item']),
    '---',
    `Total 💰: ${formatCurrency(total)}`,
    `Pagamento: ${translatePaymentMethod(sale.paymentMethod)}`,
  ];

  if (sale.comments) {
    lines.push(`Observações: ${sale.comments}`);
  }

  return lines.join('\n');
};

export default function Sales() {
  const toast = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);
  const [togglingSaleId, setTogglingSaleId] = useState<string | null>(null);
  const [togglingDeliverySaleId, setTogglingDeliverySaleId] = useState<string | null>(null);
  const apiBase = import.meta.env.VITE_BACKEND_SERVER || '/api';

  const [customerPosId, setCustomerPosId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [comments, setComments] = useState('');
  const [cart, setCart] = useState<ProductCart[]>([]);
  const [showDelivered, setShowDelivered] = useState(false);
  const [filterText, setFilterText] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [editingMode, setEditingMode] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);

  const token = localStorage.getItem('token');

  const fetchData = useCallback(async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [salesRes, custRes, prodRes] = await Promise.all([
        axios.get(`${apiBase}/api/sales?showDelivered=${showDelivered}`, config),
        axios.get(`${apiBase}/api/customers`, config),
        axios.get(`${apiBase}/api/products`, config)
      ]);
      setSales(salesRes.data);
      setCustomers(custRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      console.error('Failed to load sales data', err);
    }
  }, [token, apiBase, showDelivered]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredSales = useMemo(() => {
    if (!filterText.trim()) return sales;
    const lower = filterText.toLowerCase();
    return sales.filter((sale: Sale) =>
      (sale.customerPos?.customer?.name || '').toLowerCase().includes(lower) ||
      (sale.customerPos?.personName || '').toLowerCase().includes(lower) ||
      (sale.customerPos?.customer?.personName || '').toLowerCase().includes(lower) ||
      (sale.customerPos?.address || '').toLowerCase().includes(lower)
    );
  }, [sales, filterText]);

  const handleOpenModal = () => {
    setEditingMode(false);
    setEditingSaleId(null);
    setCustomerFilter('');
    setCustomerPosId('');
    setPaymentMethod('Cash');
    setPaymentDueDate('');
    setPaymentDate('');
    setComments('');
    setCart([]);
    setShowModal(true);
  };

  const handleOpenEditModal = (sale: Sale) => {
    if (!sale.id) {
      toast.showToast('Invalid sale data.', 'error');
      return;
    }
    setEditingMode(true);
    setEditingSaleId(sale.id || null);
    setCustomerFilter(`${sale.customerPos?.customer?.name || ''} - ${sale.customerPos?.address || ''}`.trim().replace(/^\s*-\s*/, ''));
    setCustomerPosId(sale.customerPosId);
    setPaymentMethod(sale.paymentMethod);
    let paymentDueDateValue = '';
    if (sale.paymentDueDate) {
      const dueDate = new Date(sale.paymentDueDate);
      paymentDueDateValue = dueDate.toISOString().slice(0, 10); // Format as YYYY-MM-DD for input value (UTC, timezone-stable)
    }
    setPaymentDueDate(paymentDueDateValue);
    let paymentDateValue = '';
    if (sale.paymentDate) {
      const payDate = new Date(sale.paymentDate);
      paymentDateValue = payDate.toISOString().slice(0, 10); // Format as YYYY-MM-DD for input value (UTC, timezone-stable)
    }
    setPaymentDate(paymentDateValue);
    setComments(sale.comments || '');
    setCart((sale.products || []).map((sp: SaleProduct) => ({
      productId: sp.productId,
      quantity: sp.quantity,
      price: sp.product?.price || 0,
    })));
    setShowDetailsModal(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setCustomerFilter('');
    setShowModal(false);
  };

  const handleAddCartItem = () => {
    setCart([...cart, { productId: '', quantity: 1, price: 0 }]);
  };

  const handleUpdateCartItem = (index: number, field: keyof ProductCart, value: string | number) => {
    const newCart = [...cart];
    newCart[index] = { ...newCart[index], [field]: value } as ProductCart;

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
      toast.showToast('Please fill out all required fields and add at least one valid product.', 'warning');
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

      if (editingMode && editingSaleId) {
        await axios.put(`${apiBase}/api/sales/${editingSaleId}`, payload, config);
        handleCloseModal();
        fetchData();
        toast.showToast('Sale updated successfully.', 'success');
      } else {
        await axios.post(`${apiBase}/api/sales`, payload, config);
        handleCloseModal();
        fetchData();
        toast.showToast('Sale recorded successfully.', 'success');
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('Error response:', err.response);
        toast.showToast(err.response?.data?.error || (editingMode ? 'Failed to update sale.' : 'Failed to record sale.'), 'error');
      } else {
        console.error('Unexpected error:', err);
        toast.showToast('An unexpected error occurred.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const copyTextToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    // Fallback for browsers where Clipboard API is unavailable.
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (!successful) {
      throw new Error('Copy command failed');
    }
  };

  const handleCopySale = async (sale: Sale) => {
    try {
      const text = buildSaleCopyText(sale);
      await copyTextToClipboard(text);
      toast.showToast('Sale text copied to clipboard.', 'success');
    } catch (err) {
      console.error('Failed to copy sale text', err);
      toast.showToast('Could not copy sale text. Please check clipboard permissions.', 'error');
    }
  };

  const handleCloneSale = async (sale: Sale) => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        customerPosId: sale.customerPosId,
        paymentMethod: sale.paymentMethod,
        paymentDueDate: sale.paymentDueDate || null,
        paymentDate: sale.paymentDate || null,
        comments: sale.comments || '',
        products: (sale.products || []).map((sp: SaleProduct) => ({
          productId: sp.productId,
          quantity: sp.quantity,
        })),
      };
      await axios.post(`${apiBase}/api/sales`, payload, config);
      fetchData();
      toast.showToast('Sale cloned successfully.', 'success');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.showToast(err.response?.data?.error || 'Failed to clone sale.', 'error');
      } else {
        toast.showToast('Failed to clone sale.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSale = async (sale: Sale) => {
    if (!sale.id) {
      toast.showToast('Invalid sale data.', 'error');
      return;
    }
    const confirmed = await toast.confirm({
      title: 'Delete Sale',
      message: 'Are you sure you want to delete this sale? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDangerous: true,
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${apiBase}/api/sales/${sale.id}`, config);
      setShowDetailsModal(false);
      fetchData();
      toast.showToast('Sale deleted successfully.', 'success');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.showToast(err.response?.data?.error || 'Failed to delete sale.', 'error');
      } else {
        toast.showToast('Failed to delete sale.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePaymentStatus = async (sale: Sale) => {
    if (!sale.id) {
      toast.showToast('Invalid sale data.', 'error');
      return;
    }

    if (togglingSaleId === sale.id) {
      return;
    }

    setTogglingSaleId(sale.id);

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const nextPaymentDate = sale.paymentDate ? null : new Date().toISOString();
      const response = await axios.put(`${apiBase}/api/sales/${sale.id}`, { paymentDate: nextPaymentDate }, config);
      const updatedSale = response.data as Sale;

      setSales((currentSales) => currentSales.map((currentSale) => (
        currentSale.id === updatedSale.id ? updatedSale : currentSale
      )));

      if (selectedSale?.id === updatedSale.id) {
        setSelectedSale(updatedSale);
      }

      toast.showToast(nextPaymentDate ? 'Sale marked as paid.' : 'Sale marked as pending.', 'success');
      await fetchData();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.showToast(err.response?.data?.error || 'Failed to update sale status.', 'error');
      } else {
        toast.showToast('An unexpected error occurred while updating the sale status.', 'error');
      }
    } finally {
      setTogglingSaleId(null);
    }
  };

  const handleToggleDeliveredStatus = async (sale: Sale) => {
    if (!sale.id) {
      toast.showToast('Invalid sale data.', 'error');
      return;
    }

    if (togglingDeliverySaleId === sale.id) {
      return;
    }

    setTogglingDeliverySaleId(sale.id);

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.put(`${apiBase}/api/sales/${sale.id}`, { delivered: !sale.delivered }, config);
      const updatedSale = response.data as Sale;

      setSales((currentSales) => currentSales.map((currentSale) => (
        currentSale.id === updatedSale.id ? updatedSale : currentSale
      )));

      if (selectedSale?.id === updatedSale.id) {
        setSelectedSale(updatedSale);
      }

      toast.showToast(updatedSale.delivered ? 'Sale marked as delivered.' : 'Sale marked as undelivered.', 'success');
      await fetchData();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.showToast(err.response?.data?.error || 'Failed to update sale delivery status.', 'error');
      } else {
        toast.showToast('An unexpected error occurred while updating the sale delivery status.', 'error');
      }
    } finally {
      setTogglingDeliverySaleId(null);
    }
  };

  const renderPaymentStatusBadge = (sale: Sale) => {
    const isUpdating = sale.id !== undefined && togglingSaleId === sale.id;
    const isPaid = Boolean(sale.paymentDate);

    return (
      <button
        type="button"
        className={`badge border-0 ${isPaid ? 'bg-success' : 'bg-warning text-dark'}`}
        style={{ cursor: isUpdating ? 'wait' : 'pointer' }}
        onClick={() => handleTogglePaymentStatus(sale)}
        disabled={isUpdating}
        title={isPaid ? 'Click to mark as pending' : 'Click to mark as paid'}
      >
        {isUpdating ? 'Updating...' : isPaid ? 'Paid' : 'Pending'}
      </button>
    );
  };

  const renderDeliveredStatusBadge = (sale: Sale) => {
    const isUpdating = sale.id !== undefined && togglingDeliverySaleId === sale.id;
    const isDelivered = Boolean(sale.delivered);

    return (
      <button
        type="button"
        className={`badge border-0 ${isDelivered ? 'bg-info text-dark' : 'bg-secondary'}`}
        style={{ cursor: isUpdating ? 'wait' : 'pointer' }}
        onClick={() => handleToggleDeliveredStatus(sale)}
        disabled={isUpdating}
        title={isDelivered ? 'Click to mark as undelivered' : 'Click to mark as delivered'}
      >
        {isUpdating ? 'Updating...' : isDelivered ? 'Delivered' : 'Undelivered'}
      </button>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0">Sales Register</h2>
        <div className="d-flex align-items-center gap-3">
          <div className="form-check form-switch m-0">
            <input
              id="show-disabled-products"
              className="form-check-input"
              type="checkbox"
              checked={showDelivered}
              onChange={(e) => setShowDelivered(e.target.checked)}
            />
            <label className="form-check-label text-secondary" htmlFor="show-disabled-products">
              Delivered
            </label>
          </div>
          <button className="btn btn-primary" onClick={handleOpenModal}>+ Record Sale</button>
        </div>
      </div>

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Filter by customer name, person, or address..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>

      <div className="row g-3">
        {filteredSales.map((sale: Sale) => {
          const total = sale.products?.reduce((acc: number, sp: SaleProduct) => acc + (sp.quantity * (sp.product?.price ?? 0)), 0) || 0;
          return (
            <div key={sale.id} className="col-12 col-md-6">
              <div className="glass-card p-3 h-100 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h6 className="fw-bold text-white m-0">{sale.customerPos?.customer?.name || 'Unknown'}</h6>
                    <div className="text-secondary small">{new Date(sale.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="d-flex gap-2 flex-wrap justify-content-end">
                    {renderPaymentStatusBadge(sale)}
                    {renderDeliveredStatusBadge(sale)}
                  </div>
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
                    <strong className="text-success fs-5">{formatCurrency(total)}</strong>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleCopySale(sale)}
                      >
                        <i className="bi bi-share me-1"></i>
                        Share
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleCloneSale(sale)}
                        disabled={loading}
                      >
                        <i className="bi bi-copy me-1"></i>
                        Copy
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-warning"
                        onClick={() => handleOpenEditModal(sale)}
                      >
                        <i className="bi bi-pencil me-1"></i>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-light"
                        onClick={() => {
                          setSelectedSale(sale);
                          setShowDetailsModal(true);
                        }}
                      >
                        Details
                      </button>
                    </div>
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
                  <h5 className="modal-title text-white">{editingMode ? 'Edit Sale' : 'Record New Sale'}</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={handleCloseModal}></button>
                </div>
                <form onSubmit={handleSaveSale}>
                  <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    <div className="row g-4">
                      <div className="col-lg-4 border-end border-secondary">
                        <h6 className="text-secondary fw-bold mb-3">Customer & Payment</h6>
                        <div className="mb-3">
                          <label className="form-label text-secondary small">Customer Point of Sale</label>
                          <CustomerPosCombobox
                            customers={customers}
                            selectedPosId={customerPosId}
                            filterText={customerFilter}
                            onFilterTextChange={(value) => {
                              setCustomerFilter(value);
                              if (customerPosId) {
                                setCustomerPosId('');
                              }
                            }}
                            onSelectPos={(posId, displayText) => {
                              setCustomerPosId(posId);
                              setCustomerFilter(displayText);
                            }}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label text-secondary small">Payment Method</label>
                          <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} required>
                            <option value="Cash">Cash</option>
                            <option value="Credit Card">Credit Card</option>
                            <option value="Debit Card">Debit Card</option>
                            <option value="Pix">Pix</option>
                            <option value="Boleto">Boleto (Invoice)</option>
                            <option value="At the Delivery">At the Delivery</option>
                            <option value="Next Visit">Next Visit</option>
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
                                      <option key={p.id} value={p.id} disabled={p.stock <= 0 && p.id !== item.productId}>
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
                    <button type="button" className="btn btn-outline-light" onClick={handleCloseModal}>Cancel</button>
                    <button type="submit" className="btn btn-primary btn-lg px-4" disabled={loading || cart.length === 0}>{loading ? 'Processing...' : editingMode ? 'Save Changes' : 'Complete Sale'}</button>
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
                      <p className="mb-1"><strong>Person:</strong> {selectedSale.customerPos?.personName || selectedSale.customerPos?.customer?.personName || 'N/A'}</p>
                      <p className="mb-1"><strong>POS Address:</strong> {selectedSale.customerPos?.address || 'Unknown'}</p>
                      <p className="mb-0"><strong>POS Phone:</strong> {selectedSale.customerPos?.phone || 'N/A'}</p>
                    </div>
                    <div className="col-md-6">
                      <h6 className="text-secondary fw-bold mb-2">Payment Info</h6>
                      <p className="mb-1"><strong>Method:</strong> {selectedSale.paymentMethod}</p>
                      <p className="mb-1">
                        <strong>Status:</strong>{' '}
                        <span className="d-inline-flex gap-2 flex-wrap align-items-center">
                          {renderPaymentStatusBadge(selectedSale)}
                          {renderDeliveredStatusBadge(selectedSale)}
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
                  <button
                    type="button"
                    className="btn btn-outline-danger me-auto"
                    onClick={() => handleDeleteSale(selectedSale)}
                    disabled={loading}
                  >
                    <i className="bi bi-trash me-1"></i>
                    Delete
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => handleCloneSale(selectedSale)}
                    disabled={loading}
                  >
                    <i className="bi bi-copy me-1"></i>
                    Copy
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-warning"
                    onClick={() => handleOpenEditModal(selectedSale)}
                  >
                    <i className="bi bi-pencil me-1"></i>
                    Edit
                  </button>
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
