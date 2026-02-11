import React, { useState, useEffect } from 'react';
import { getStripeProducts, createStripeProduct, deleteStripeProduct } from '../firebaseFunctions';
import AlertDialog from './AlertDialog';
import ConfirmDialog from './ConfirmDialog';

const ProductsManagementModal = ({ isOpen, onClose }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [alertDialog, setAlertDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, productId: null, productName: '' });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'NZD',
    imageUrl: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const productsData = await getStripeProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to load products: ' + error.message,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createStripeProduct({
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        currency: formData.currency,
        imageUrl: formData.imageUrl || null,
      });

      setFormData({
        name: '',
        description: '',
        price: '',
        currency: 'NZD',
        imageUrl: '',
      });
      setShowAddForm(false);
      setAlertDialog({
        isOpen: true,
        title: 'Success',
        message: 'Product created successfully!',
        type: 'success'
      });
      await loadProducts();
    } catch (error) {
      console.error('Error creating product:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to create product: ' + error.message,
        type: 'error'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    setConfirmDialog({ isOpen: true, productId, productName });
  };

  const confirmDelete = async () => {
    const { productId } = confirmDialog;
    try {
      await deleteStripeProduct(productId);
      setAlertDialog({
        isOpen: true,
        title: 'Success',
        message: 'Product deleted successfully!',
        type: 'success'
      });
      await loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to delete product: ' + error.message,
        type: 'error'
      });
    } finally {
      setConfirmDialog({ isOpen: false, productId: null, productName: '' });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '42rem',
        maxWidth: '90vw',
        maxHeight: '85vh',
        background: 'rgba(255, 255, 255, 0.97)',
        border: '1px solid rgba(0, 0, 0, 0.15)',
        borderRadius: '4px',
        padding: '1.5rem',
        zIndex: 1001,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2
          style={{
            margin: 0,
            color: '#1a1a1a',
            fontSize: '18px',
            fontWeight: 600,
            letterSpacing: '-0.3px',
          }}
        >
          Manage Stripe Products
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              background: '#000',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#fff',
              lineHeight: 1,
              padding: '0.3rem 0.6rem',
              borderRadius: '3px',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#333';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#000';
            }}
            title="Add new product"
          >
            +
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              lineHeight: 1,
              padding: '0 4px',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#666';
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#666', fontSize: '13px', padding: '1.5rem' }}>Loading products...</p>
        ) : products.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', fontSize: '13px', padding: '1.5rem' }}>No products found. Click + to add one.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {products.map((product) => (
              <div
                key={product.id}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                  borderRadius: '3px',
                  padding: '1rem',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'start',
                }}
              >
                {product.images && product.images.length > 0 && (
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    flexShrink: 0,
                  }}>
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                )}
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.2px', marginBottom: '0.25rem' }}>
                    {product.name}
                  </h3>
                  {product.description && (
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
                      {product.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {product.prices.map((price) => (
                      <span
                        key={price.id}
                        style={{
                          fontSize: '13px',
                          padding: '0.25rem 0.5rem',
                          background: '#f5f5f5',
                          borderRadius: '3px',
                          color: '#1a1a1a',
                          fontWeight: 600,
                        }}
                      >
                        ${(price.unit_amount / 100).toFixed(2)} {price.currency.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteProduct(product.id, product.name)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#999',
                    transition: 'color 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#c62828';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#999';
                  }}
                  title="Delete product"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Product Form Modal - appears on top */}
      {showAddForm && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => {
              setShowAddForm(false);
              setFormData({ name: '', description: '', price: '', currency: 'NZD', imageUrl: '' });
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.4)',
              zIndex: 1002,
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Form Modal */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '32rem',
              maxWidth: '90vw',
              maxHeight: '85vh',
              background: '#fff',
              border: '1px solid rgba(0, 0, 0, 0.15)',
              borderRadius: '4px',
              padding: '1.5rem',
              zIndex: 1003,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3
                style={{
                  margin: 0,
                  color: '#1a1a1a',
                  fontSize: '16px',
                  fontWeight: 600,
                  letterSpacing: '-0.3px',
                }}
              >
                Add New Product
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ name: '', description: '', price: '', currency: 'NZD', imageUrl: '' });
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  lineHeight: 1,
                  padding: '0 4px',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#666';
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '12px', fontWeight: 600, color: '#555' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    fontSize: '13px',
                    border: '1px solid rgba(0, 0, 0, 0.2)',
                    borderRadius: '3px',
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                  placeholder="e.g., Digital Portrait"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '12px', fontWeight: 600, color: '#555' }}>
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    fontSize: '13px',
                    border: '1px solid rgba(0, 0, 0, 0.2)',
                    borderRadius: '3px',
                    background: '#fff',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                  placeholder="Optional description..."
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '12px', fontWeight: 600, color: '#555' }}>
                    Price *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleFormChange}
                    required
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      fontSize: '13px',
                      border: '1px solid rgba(0, 0, 0, 0.2)',
                      borderRadius: '3px',
                      background: '#fff',
                      boxSizing: 'border-box',
                    }}
                    placeholder="50.00"
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '12px', fontWeight: 600, color: '#555' }}>
                    Currency *
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleFormChange}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      fontSize: '13px',
                      border: '1px solid rgba(0, 0, 0, 0.2)',
                      borderRadius: '3px',
                      background: '#fff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="NZD">NZD</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '12px', fontWeight: 600, color: '#555' }}>
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleFormChange}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    fontSize: '13px',
                    border: '1px solid rgba(0, 0, 0, 0.2)',
                    borderRadius: '3px',
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    flex: 1,
                    padding: '0.6rem 1.25rem',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#fff',
                    background: creating ? '#999' : '#000',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!creating) e.currentTarget.style.background = '#333';
                  }}
                  onMouseLeave={(e) => {
                    if (!creating) e.currentTarget.style.background = '#000';
                  }}
                >
                  {creating ? 'Creating...' : 'Create Product'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ name: '', description: '', price: '', currency: 'NZD', imageUrl: '' });
                  }}
                  disabled={creating}
                  style={{
                    padding: '0.6rem 1.25rem',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#666',
                    background: '#f5f5f5',
                    border: '1px solid rgba(0, 0, 0, 0.2)',
                    borderRadius: '3px',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!creating) e.currentTarget.style.background = '#e0e0e0';
                  }}
                  onMouseLeave={(e) => {
                    if (!creating) e.currentTarget.style.background = '#f5f5f5';
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, productId: null, productName: '' })}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${confirmDialog.productName}"? This will archive it in Stripe.`}
      />
    </div>
  );
};

export default ProductsManagementModal;
