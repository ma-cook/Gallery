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
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile/tablet screen sizes
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    <>
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: isMobile ? '95vw' : '480px',
        maxWidth: '95vw',
        maxHeight: isMobile ? '90vh' : '85vh',
        background: '#fff',
        borderRadius: isMobile ? '10px' : '12px',
        padding: 0,
        zIndex: 1001,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: isMobile ? '14px 16px' : '16px 20px',
        borderBottom: '1px solid #eee',
        flexShrink: 0,
      }}>
        <h2
          style={{
            margin: 0,
            color: '#111',
            fontSize: isMobile ? '14px' : '15px',
            fontWeight: 700,
          }}
        >
          Manage Stripe Products
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              background: '#111',
              border: 'none',
              fontSize: isMobile ? '11px' : '12px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#fff',
              lineHeight: 1,
              padding: isMobile ? '8px 14px' : '6px 12px',
              borderRadius: '6px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#333';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#111';
            }}
            title="Add new product"
          >
            + New
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: isMobile ? '24px' : '20px',
              cursor: 'pointer',
              color: '#999',
              lineHeight: 1,
              padding: '4px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#111';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#999';
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 16px' : '16px 20px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#999', fontSize: '13px', padding: '24px' }}>Loading products...</p>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', fontSize: '13px', padding: '32px 20px' }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 500, color: '#555' }}>No products yet</p>
            <p style={{ margin: 0, fontSize: '12px' }}>Click "+ New" to create one</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {products.map((product) => (
              <div
                key={product.id}
                style={{
                  background: '#fff',
                  border: '1px solid #eee',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ddd'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#eee'; }}
              >
                {product.images && product.images.length > 0 && (
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #eee',
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
                  <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#111', marginBottom: '2px' }}>
                    {product.name}
                  </h3>
                  {product.description && (
                    <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#888', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {product.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {product.prices.map((price) => (
                      <span
                        key={price.id}
                        style={{
                          fontSize: '12px',
                          padding: '2px 6px',
                          background: '#f5f5f5',
                          borderRadius: '4px',
                          color: '#111',
                          fontWeight: 700,
                        }}
                      >
                        ${(price.unit_amount / 100).toFixed(2)} <span style={{ fontSize: '9px', color: '#999', fontWeight: 500 }}>{price.currency.toUpperCase()}</span>
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
                    color: '#bbb',
                    transition: 'color 0.15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#c62828';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#bbb';
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

      {/* Add Product Form Modal - rendered outside transformed parent to prevent position:fixed clipping */}
      {showAddForm && (
        <>
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
              width: '400px',
              maxWidth: '90vw',
              maxHeight: '85vh',
              background: '#fff',
              borderRadius: '12px',
              padding: 0,
              zIndex: 1003,
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
              overflow: 'hidden',
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '16px 20px',
              borderBottom: '1px solid #eee',
            }}>
              <h3
                style={{
                  margin: 0,
                  color: '#111',
                  fontSize: '15px',
                  fontWeight: 700,
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
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#999',
                  lineHeight: 1,
                  padding: '4px',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#111';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#999';
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#444', letterSpacing: '0.01em' }}>
                  Product Name
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
                    padding: '9px 12px',
                    fontSize: '13px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    background: '#fafafa',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
                    outline: 'none',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#111'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.06)'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#ddd'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafafa'; }}
                  placeholder="e.g., Digital Portrait"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#444', letterSpacing: '0.01em' }}>
                  Description <span style={{ fontWeight: 400, color: '#999' }}>(optional)</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontSize: '13px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    background: '#fafafa',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
                    outline: 'none',
                    lineHeight: '1.5',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#111'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.06)'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#ddd'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafafa'; }}
                  placeholder="Describe the product..."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#444', letterSpacing: '0.01em' }}>
                    Price
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
                      padding: '9px 12px',
                      fontSize: '13px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      background: '#fafafa',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
                      outline: 'none',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#111'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.06)'; e.target.style.background = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#ddd'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafafa'; }}
                    placeholder="50.00"
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#444', letterSpacing: '0.01em' }}>
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleFormChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      fontSize: '13px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      background: '#fafafa',
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
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#444', letterSpacing: '0.01em' }}>
                  Image URL <span style={{ fontWeight: 400, color: '#999' }}>(optional)</span>
                </label>
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleFormChange}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontSize: '13px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    background: '#fafafa',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
                    outline: 'none',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#111'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.06)'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#ddd'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafafa'; }}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#fff',
                    background: creating ? '#999' : '#111',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s',
                    letterSpacing: '0.01em',
                  }}
                  onMouseEnter={(e) => {
                    if (!creating) e.currentTarget.style.background = '#333';
                  }}
                  onMouseLeave={(e) => {
                    if (!creating) e.currentTarget.style.background = '#111';
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
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#666',
                    background: '#f5f5f5',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!creating) e.currentTarget.style.background = '#eee';
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
    </>
  );
};

export default ProductsManagementModal;
