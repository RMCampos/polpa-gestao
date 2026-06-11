import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useToast } from '../context/toast';
import type { Product } from '../types';

export default function Products() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Product>({ id: '', name: '', price: 0, stock: 0, cost: 0 });
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDisabled, setShowDisabled] = useState<boolean>(false);
  const apiBase = import.meta.env.VITE_BACKEND_SERVER || '/api';

  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBase}/api/products?showDisabled=${showDisabled}`);
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to load products', err);
    }
  }, [apiBase, showDisabled]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingProduct) {
        await axios.put(`${apiBase}/api/products/${editingProduct}`, newProduct);
      } else {
        await axios.post(`${apiBase}/api/products`, newProduct);
      }
      setShowModal(false);
      setNewProduct({ id: '', name: '', price: 0, stock: 0, cost: 0 });
      setEditingProduct(null);
      fetchProducts();
      toast.showToast(editingProduct ? 'Product updated successfully.' : 'Product created successfully.', 'success');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('API error:', err.response?.data || err.message);
        toast.showToast('Failed to save product: ' + (err.response?.data?.error || err.message), 'error');
      } else {
        console.error('Unexpected error:', err);
        toast.showToast('Failed to save product: ' + (err || 'Unknown error'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingProduct(null);
    setNewProduct({ id: '', name: '', price: 0, stock: 0, cost: 0 });
    setShowModal(true);
  };

  const openEditModal = (p: Product) => {
    if (!p.id) {
      toast.showToast('Product ID is missing. Cannot edit this product.', 'error');
      return;
    }
    setEditingProduct(p.id);
    setNewProduct({ id: p.id, name: p.name, price: p.price, stock: p.stock, cost: p.cost, disabledAt: p.disabledAt });
    setShowModal(true);
  };

  const handleDisableProduct = async () => {
    if (!editingProduct) return;
    const confirmed = await toast.confirm({
      title: 'Disable Product',
      message: 'Are you sure you want to disable this product?',
      confirmText: 'Disable',
      cancelText: 'Cancel',
      isDangerous: true
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const disabledProduct: Product = { ...newProduct, disabledAt: new Date().toISOString() };
      await axios.put(`${apiBase}/api/products/${editingProduct}`, disabledProduct);
      setShowModal(false);
      setNewProduct({ id: '', name: '', price: 0, stock: 0, cost: 0 });
      setEditingProduct(null);
      fetchProducts();
      toast.showToast('Product disabled successfully.', 'success');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('API error:', err.response?.data || err.message);
        toast.showToast('Failed to disable product: ' + (err.response?.data?.error || err.message), 'error');
      } else {
        console.error('Unexpected error:', err);
        toast.showToast('Failed to disable product: ' + (err || 'Unknown error'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0">Products Inventory</h2>
        <div className="d-flex align-items-center gap-3">
          <div className="form-check form-switch m-0">
            <input
              id="show-disabled-products"
              className="form-check-input"
              type="checkbox"
              checked={showDisabled}
              onChange={(e) => setShowDisabled(e.target.checked)}
            />
            <label className="form-check-label text-secondary" htmlFor="show-disabled-products">
              Disabled
            </label>
          </div>
          <button className="btn btn-primary" onClick={openNewModal}>+ New Product</button>
        </div>
      </div>

      <div className="row g-4">
        {products.map((p: Product) => (
          <div key={p.id} className="col-12 col-md-6 col-lg-4">
            <div className="glass-card p-4 h-100 d-flex flex-column">
              <h4 className={`fw-bold mb-2 ${p.disabledAt ? 'text-secondary' : 'text-white'}`}>{p.name}</h4>
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
                      <input type="text" className="form-control" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-secondary">Price (R$)</label>
                      <input type="number" step="0.01" className="form-control" value={newProduct.price > 0 ? newProduct.price : ''} onChange={e => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })} placeholder="0.00" required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-secondary">Cost (R$)</label>
                      <input type="number" step="0.01" className="form-control" value={newProduct.cost > 0 ? newProduct.cost : ''} onChange={e => setNewProduct({ ...newProduct, cost: parseFloat(e.target.value) })} placeholder="0.00" required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-secondary">In Stock</label>
                      <input type="number" className="form-control" value={newProduct.stock > 0 ? newProduct.stock : ''} onChange={e => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) })} placeholder="0" required />
                    </div>
                  </div>
                  <div className="modal-footer border-top-0" style={{ borderColor: 'var(--glass-border)' }}>
                    <button type="button" className="btn btn-outline-light" onClick={() => setShowModal(false)}>Cancel</button>
                    {editingProduct && (
                      <button type="button" className="btn btn-outline-danger" onClick={handleDisableProduct}>Disable</button>
                    )}
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
