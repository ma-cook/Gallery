import React, { useState, useEffect } from 'react';
import { fetchUserRequests, createRequest, checkUserHasRequests, updateRequestStatus, deleteRequest, getStripeProducts, markRequestAsPaid, getFullResDownloadUrl } from '../firebaseFunctions';
import { handleSignIn } from '../utils/authFunctions';
import AuthModal from './AuthModal';
import PaymentModal from './PaymentModal';
import ConfirmDialog from './ConfirmDialog';
import AlertDialog from './AlertDialog';

const CommissionModal = ({ isOpen, onClose, user }) => {
  const [requests, setRequests] = useState([]);
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fullImageView, setFullImageView] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: user?.email || '',
    description: '',
    selectedPriceId: '',
  });
  const [exampleImage, setExampleImage] = useState(null);
  const [exampleImagePreview, setExampleImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState(null);
  const [alertDialog, setAlertDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
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
    if (isOpen && user?.uid) {
      loadRequests();
      loadProducts();
    } else if (isOpen && !user?.uid) {
      // If not logged in, don't show form - show auth prompt instead
      setShowForm(false);
      setLoading(false);
    }
  }, [isOpen, user?.uid]);

  // Update email when user changes
  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const productsData = await getStripeProducts();
      setProducts(productsData);
      if (productsData.length === 0) {
        setAlertDialog({
          isOpen: true,
          title: 'No Products Available',
          message: 'No Stripe products are currently available. Please contact support or try again later.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Error Loading Products',
        message: 'Failed to load products. Make sure the Cloud Functions are deployed. Error: ' + error.message,
        type: 'error'
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const requestsData = await fetchUserRequests(user.uid);
      setRequests(requestsData);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (requestId) => {
    setExpandedRequestId(expandedRequestId === requestId ? null : requestId);
  };

  const handleCancelRequest = async (requestId) => {
    setRequestToCancel(requestId);
    setConfirmDialogOpen(true);
  };

  const confirmCancelRequest = async () => {
    if (!requestToCancel) return;
    
    try {
      await updateRequestStatus(user.uid, requestToCancel, 'cancelled');
      // Update local state
      setRequests(requests.map(req => 
        req.id === requestToCancel ? { ...req, status: 'cancelled' } : req
      ));
      setRequestToCancel(null);
    } catch (error) {
      console.error('Error cancelling request:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to cancel request. Please try again.',
        type: 'error'
      });
    }
  };

  const handleDeleteRequest = async (requestId) => {
    try {
      await deleteRequest(user.uid, requestId);
      // Remove from local state
      setRequests(requests.filter(req => req.id !== requestId));
      // If the expanded request is deleted, collapse it
      if (expandedRequestId === requestId) {
        setExpandedRequestId(null);
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to delete request. Please try again.',
        type: 'error'
      });
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleExampleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setExampleImage(file);
      const previewUrl = URL.createObjectURL(file);
      setExampleImagePreview(previewUrl);
    }
  };

  const handleRemoveExampleImage = () => {
    setExampleImage(null);
    setExampleImagePreview(null);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Validate product selection
      if (!formData.selectedPriceId) {
        setAlertDialog({
          isOpen: true,
          title: 'Error',
          message: 'Please select a product before submitting your request.',
          type: 'error'
        });
        setIsSubmitting(false);
        return;
      }

      // Find selected product info if a price was selected
      let productInfo = {};
      if (formData.selectedPriceId) {
        const selectedProduct = products.find(p => 
          p.prices.some(price => price.id === formData.selectedPriceId)
        );
        if (selectedProduct) {
          const selectedPrice = selectedProduct.prices.find(p => p.id === formData.selectedPriceId);
          productInfo = {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            priceId: selectedPrice.id,
            priceAmount: selectedPrice.unit_amount / 100, // Convert from cents
            priceCurrency: selectedPrice.currency.toUpperCase(),
          };
        }
      }

      await createRequest({
        name: formData.name,
        email: formData.email,
        description: formData.description,
        userId: user?.uid || null,
        ...productInfo,
      }, exampleImage);
      // Reset form
      setFormData({
        name: '',
        email: user?.email || '',
        description: '',
        selectedPriceId: '',
      });
      setExampleImage(null);
      setExampleImagePreview(null);
      setAlertDialog({
        isOpen: true,
        title: 'Success',
        message: 'Request submitted successfully!',
        type: 'success'
      });
      setShowForm(false);
      // Reload requests if user is logged in
      if (user?.uid) {
        await loadRequests();
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to submit request. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
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
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: '1px solid #eee' }}>
        <h2
          style={{
            margin: 0,
            color: '#111',
            fontSize: isMobile ? '14px' : '15px',
            fontWeight: 700,
            letterSpacing: '-0.2px',
          }}
        >
          {showForm ? 'New Commission' : !user?.uid ? 'Commissions' : 'My Commissions'}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {!showForm && user?.uid && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: '#111',
                border: 'none',
                fontSize: isMobile ? '13px' : '14px',
                cursor: 'pointer',
                color: '#fff',
                lineHeight: 1,
                padding: isMobile ? '8px 14px' : '6px 12px',
                borderRadius: '6px',
                fontWeight: 600,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#333';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#111';
              }}
              title="Create new request"
            >
              + New
            </button>
          )}
          <button
            onClick={() => {
              setShowForm(false);
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: isMobile ? '24px' : '20px',
              cursor: 'pointer',
              color: '#999',
              lineHeight: 1,
              padding: '4px',
              borderRadius: '4px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#111';
              e.currentTarget.style.background = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#999';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 16px' : '16px 20px' }}>
        {showForm ? (
          /* Commission Form */
          <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#444', letterSpacing: '0.01em' }}>
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  background: '#fafafa',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  outline: 'none',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#111'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.06)'; e.target.style.background = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = '#ddd'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafafa'; }}
                placeholder="Your name"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#444', letterSpacing: '0.01em' }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  background: '#fafafa',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  outline: 'none',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#111'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.06)'; e.target.style.background = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = '#ddd'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafafa'; }}
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: '#444', letterSpacing: '0.01em' }}>
                Select Product
              </label>
              {loadingProducts ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', background: '#fafafa', borderRadius: '8px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>No products available.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: '8px', border: '1px solid #eee', overflow: 'hidden' }}>
                  {products.map(product => 
                    product.prices.map(price => {
                      const isSelected = formData.selectedPriceId === price.id;
                      const hasSelection = formData.selectedPriceId !== '';
                      
                      if (hasSelection && !isSelected) return null;
                      
                      return (
                        <div
                          key={price.id}
                          onClick={() => setFormData(prev => ({ ...prev, selectedPriceId: isSelected ? '' : price.id }))}
                          style={{
                            padding: '10px 12px',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center',
                            borderBottom: hasSelection ? 'none' : '1px solid #f0f0f0',
                            cursor: 'pointer',
                            background: isSelected ? '#f0f7ff' : '#fff',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#fafafa'; }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = '#fff'; }}
                        >
                          {/* Radio indicator */}
                          <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: isSelected ? '5px solid #111' : '2px solid #ccc',
                            flexShrink: 0,
                            transition: 'all 0.15s',
                            boxSizing: 'border-box',
                          }} />

                          {product.images && product.images.length > 0 && (
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}>
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>
                              {product.name}
                            </div>
                            {product.description && (
                              <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.3', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {product.description}
                              </div>
                            )}
                          </div>

                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', flexShrink: 0 }}>
                            ${(price.unit_amount / 100).toFixed(2)}
                            <span style={{ fontSize: '10px', color: '#999', marginLeft: '3px', fontWeight: 500 }}>
                              {price.currency.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#444', letterSpacing: '0.01em' }}>
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                required
                rows={4}
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
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  outline: 'none',
                  lineHeight: '1.5',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#111'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.06)'; e.target.style.background = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = '#ddd'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafafa'; }}
                placeholder="Describe your artwork request in detail..."
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#444', letterSpacing: '0.01em' }}>
                Example Image <span style={{ fontWeight: 400, color: '#999' }}>(optional)</span>
              </label>
              <input
                type="file"
                accept="image/*"
                id="example-image-upload"
                style={{ display: 'none' }}
                onChange={handleExampleImageSelect}
              />
              {exampleImagePreview ? (
                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '80px',
                      height: '80px',
                      border: '1px solid #eee',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                    onClick={() => setFullImageView({ url: exampleImagePreview, isPaid: true })}
                  >
                    <img
                      src={exampleImagePreview}
                      alt="Example preview"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveExampleImage}
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#999',
                      background: 'transparent',
                      border: '1px solid #e0e0e0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#c00';
                      e.currentTarget.style.borderColor = '#c00';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#999';
                      e.currentTarget.style.borderColor = '#e0e0e0';
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById('example-image-upload').click()}
                  style={{
                    marginTop: '4px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#555',
                    background: '#fafafa',
                    border: '1px dashed #ccc',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    width: '100%',
                    textAlign: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f5f5f5';
                    e.currentTarget.style.borderColor = '#999';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fafafa';
                    e.currentTarget.style.borderColor = '#ccc';
                  }}
                >
                  + Upload Reference Image
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#fff',
                  background: isSubmitting ? '#999' : '#111',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) e.currentTarget.style.background = '#333';
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) e.currentTarget.style.background = '#111';
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
              {user?.uid && requests.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#666',
                    background: '#f5f5f5',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#eee';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f5f5f5';
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : !user?.uid ? (
          /* Auth Prompt for non-logged-in users */
          <div style={{ padding: '8px 0' }}>
            <p style={{
              textAlign: 'center',
              color: '#555',
              fontSize: '13px',
              fontWeight: 500,
              margin: '0 0 16px 0',
              lineHeight: '1.5',
            }}>
              Sign in to create a commission request.
            </p>
            <AuthModal
              isOpen={true}
              onSignIn={(email, password) => handleSignIn(email, password, () => {})}
              mode="signin"
              embedded={true}
            />
          </div>
        ) : (
          /* Requests List */
          <>
            {loading ? (
              <p style={{ textAlign: 'center', color: '#999', fontSize: '13px', padding: '24px' }}>Loading your requests...</p>
            ) : requests.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', fontSize: '13px', padding: '32px 20px' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 500, color: '#555' }}>No commission requests yet</p>
                <p style={{ margin: 0, fontSize: '12px' }}>Tap "+ New" above to get started</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {requests.map((request) => (
                  <div
                    key={request.id}
                    style={{
                      background: expandedRequestId === request.id ? '#fafafa' : '#fff',
                      border: '1px solid #eee',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onClick={() => toggleExpand(request.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#ddd';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#eee';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#111' }}>
                          {request.name}
                        </h3>
                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#999' }}>
                          {request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            background: 
                              request.status === 'open' ? '#e8f4fd' :
                              request.status === 'in progress' ? '#fff8e1' :
                              request.status === 'completed' ? '#e8f5e9' :
                              request.status === 'cancelled' ? '#fce4ec' :
                              request.status === 'closed' ? '#f5f5f5' :
                              '#f5f5f5',
                            color: 
                              request.status === 'open' ? '#1565c0' :
                              request.status === 'in progress' ? '#e65100' :
                              request.status === 'completed' ? '#2e7d32' :
                              request.status === 'cancelled' ? '#c62828' :
                              request.status === 'closed' ? '#777' :
                              '#777',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {request.status}
                        </span>
                        {(request.status === 'closed' || request.status === 'cancelled' || request.status === 'completed') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRequest(request.id);
                            }}
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
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#c62828';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#999';
                            }}
                            title="Delete request"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                              <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                            </svg>
                          </button>
                        )}
                        <span style={{ fontSize: '12px', color: '#bbb', transition: 'transform 0.2s ease', transform: expandedRequestId === request.id ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>
                          ▶
                        </span>
                      </div>
                    </div>

                    {expandedRequestId === request.id && (
                      <div
                        style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#999', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Description
                          </label>
                          <p style={{ margin: 0, fontSize: '13px', color: '#333', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                            {request.description}
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#999', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Email
                            </label>
                            <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>
                              {request.email}
                            </p>
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#999', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Submitted
                            </label>
                            <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>
                              {request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>

                        {request.productName && (
                          <div style={{ marginBottom: '10px', padding: '8px 10px', background: '#f8f8f8', borderRadius: '8px' }}>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#999', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Product
                            </label>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '13px', color: '#111', fontWeight: 600 }}>
                                {request.productName}
                              </span>
                              <span style={{ fontSize: '13px', color: '#111', fontWeight: 700 }}>
                                ${request.priceAmount?.toFixed(2)} <span style={{ fontSize: '10px', color: '#999', fontWeight: 500 }}>{request.priceCurrency?.toUpperCase()}</span>
                              </span>
                            </div>
                          </div>
                        )}

                        {request.exampleImageUrl && (
                          <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Reference Image
                            </label>
                            <div
                              style={{
                                position: 'relative',
                                width: '80px',
                                height: '80px',
                                border: '1px solid #eee',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                              }}
                              onClick={() => setFullImageView({ url: request.exampleImageUrl, isPaid: true })}
                            >
                              <img
                                src={request.exampleImageUrl}
                                alt="Example image"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {request.status === 'open' && (
                          <div style={{ marginTop: '4px' }}>
                            <button
                              onClick={() => handleCancelRequest(request.id)}
                              style={{
                                padding: '7px 14px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#c62828',
                                background: 'transparent',
                                border: '1px solid #e0e0e0',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fce4ec';
                                e.currentTarget.style.borderColor = '#c62828';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = '#e0e0e0';
                              }}
                            >
                              Cancel Request
                            </button>
                          </div>
                        )}

                        {(request.completedPreviewUrl || request.completedImageUrl) && (
                          <div style={{ marginTop: '10px', padding: '12px', background: '#f8faf8', borderRadius: '10px', border: '1px solid #e8f0e8' }}>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#2e7d32', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Completed Artwork
                            </label>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                              <div
                                style={{
                                  position: 'relative',
                                  width: '80px',
                                  height: '80px',
                                  border: '1px solid #e0e0e0',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                }}
                                onClick={() => setFullImageView({ url: request.completedPreviewUrl || request.completedImageUrl, isPaid: request.paymentStatus === 'paid' })}
                              >
                                <img
                                  src={request.completedPreviewUrl || request.completedImageUrl}
                                  alt="Completed artwork preview"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                />
                                {request.paymentStatus !== 'paid' && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      inset: 0,
                                      background: 'rgba(0, 0, 0, 0.35)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <p style={{ margin: 0, fontSize: '12px', color: '#555', lineHeight: '1.4' }}>
                                  {request.paymentStatus === 'paid'
                                    ? 'Full resolution artwork ready for download.'
                                    : 'Your artwork is complete. Pay to unlock full resolution.'}
                                </p>
                                
                                {!request.paymentStatus || request.paymentStatus === 'pending' ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedRequest(request);
                                      setPaymentModalOpen(true);
                                    }}
                                    style={{
                                      padding: '8px 14px',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      color: '#fff',
                                      background: '#111',
                                      border: 'none',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      transition: 'background 0.15s',
                                      alignSelf: 'flex-start',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#333';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = '#111';
                                    }}
                                  >
                                    Pay ${request.priceAmount} &amp; Download
                                  </button>
                                ) : (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        const downloadUrl = await getFullResDownloadUrl(request.id);
                                        const response = await fetch(downloadUrl);
                                        const blob = await response.blob();
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${request.name || 'artwork'}-full-resolution.${blob.type.split('/')[1] || 'png'}`;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(url);
                                      } catch (err) {
                                        console.error('Download failed:', err);
                                        alert('Failed to download. Please try again.');
                                      }
                                    }}
                                    style={{
                                      padding: '8px 14px',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      color: '#fff',
                                      background: '#2e7d32',
                                      border: 'none',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      transition: 'background 0.15s',
                                      alignSelf: 'flex-start',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#1b5e20';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = '#2e7d32';
                                    }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                      <polyline points="7 10 12 15 17 10"/>
                                      <line x1="12" y1="15" x2="12" y2="3"/>
                                    </svg>
                                    Download Full Res
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Full Image Modal */}
      {fullImageView && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.92)',
            zIndex: 1002,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
          onClick={() => setFullImageView(null)}
        >
          <img
            src={fullImageView.url}
            alt="Full view"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '4px',
            }}
          />
          {!fullImageView.isPaid && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(0, 0, 0, 0.85)',
                color: '#fff',
                padding: '16px 24px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                pointerEvents: 'none',
                textAlign: 'center',
                backdropFilter: 'blur(4px)',
              }}
            >
              Preview Only<br />
              <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.8, marginTop: '4px', display: 'inline-block' }}>
                Pay to unlock full resolution
              </span>
            </div>
          )}
          <button
            onClick={() => setFullImageView(null)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#fff',
              lineHeight: 1,
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          >
            ×
          </button>
        </div>
      )}

    </div>

      {/* Payment Modal - outside transformed parent to prevent position:fixed clipping */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedRequest(null);
        }}
        onPaymentComplete={async (requestId) => {
          // Update local state immediately - mark as paid
          setRequests(prev => prev.map(req =>
            req.id === requestId ? { ...req, paymentStatus: 'paid' } : req
          ));
          // Also persist to Firestore so it survives modal close/reopen
          try {
            if (user?.uid) {
              await markRequestAsPaid(user.uid, requestId);
            }
          } catch (err) {
            console.error('Error persisting payment status:', err);
          }
        }}
        request={selectedRequest}
        userId={user?.uid}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false);
          setRequestToCancel(null);
        }}
        onConfirm={confirmCancelRequest}
        title="Cancel Request"
        message="Are you sure you want to cancel this request?"
      />

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
    </>
  );
};

export default CommissionModal;
