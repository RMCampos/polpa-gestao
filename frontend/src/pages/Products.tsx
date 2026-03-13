import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState<any>({ name: '', price: '', stock: '', cost: '' });
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  const fetchProducts = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get('http://localhost:3000/api/products', config);
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to load products', err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editingProduct) {
        await axios.put(`http://localhost:3000/api/products/${editingProduct}`, newProduct, config);
      } else {
        await axios.post('http://localhost:3000/api/products', newProduct, config);
      }
      setShowModal(false);
      setNewProduct({ name: '', price: '', stock: '', cost: '' });
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      alert('Failed to save product.');
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingProduct(null);
    setNewProduct({ name: '', price: '', stock: '', cost: '' });
    setShowModal(true);
  };

  const openEditModal = (p: any) => {
    setEditingProduct(p.id);
    setNewProduct({ name: p.name, price: p.price, stock: p.stock, cost: p.cost });
    setShowModal(true);
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0">Products Inventory</h2>
        <button className="btn btn-primary" onClick={openNewModal}>+ New Product</button>
      </div>

      <div className="row g-4">
        {products.map((p: any) => (
          <div key={p.id} className="col-12 col-md-6 col-lg-4">
            <div className="glass-card p-4 h-100 d-flex flex-column">
              <h4 className="fw-bold text-white mb-2">{p.name}</h4>
              <div className="d-flex justify-content-between mb-3 text-secondary">
                <span>Stock: <strong className={p.stock < 10 ? 'text-danger' : 'text-success'}>{p.stock}</strong> units</span>
                <span>Price: <strong>R$ {p.price.toFixed(2)}</strong></span>
              </div>
              
              <div className="mt-auto d-flex gap-2">
                <button className="btn btn-outline-light flex-grow-1" onClick={() => openEditModal(p)}>Edit</button>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="col-12 text-center text-secondary mt-4">
            <p>No products found in inventory.</p>
          </div>
        )}
      </div>

      {showModal && createPortal(
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content glass-card">
                <div className="modal-header border-bottom-0" style={{ borderColor: 'var(--glass-border)' }}>
                  <h5 className="modal-title text-white">{editingProduct ? 'Edit Product' : 'New Product'}</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                </div>
                <form onSubmit={handleSaveProduct}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label text-secondary">Name</label>
                      <input type="text" className="form-control" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-secondary">Price (R$)</label>
                      <input type="number" step="0.01" className="form-control" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} placeholder="0.00" required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-secondary">Cost (R$)</label>
                      <input type="number" step="0.01" className="form-control" value={newProduct.cost} onChange={e => setNewProduct({...newProduct, cost: e.target.value})} placeholder="0.00" required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-secondary">In Stock</label>
                      <input type="number" className="form-control" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} placeholder="0" required />
                    </div>
                  </div>
                  <div className="modal-footer border-top-0" style={{ borderColor: 'var(--glass-border)' }}>
                    <button type="button" className="btn btn-outline-light" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Product'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
