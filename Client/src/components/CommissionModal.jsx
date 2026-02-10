import React, { useState, useEffect } from 'react';
import { fetchUserRequests, createRequest, checkUserHasRequests, updateRequestStatus, deleteRequest, getStripeProducts } from '../firebaseFunctions';
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

  useEffect(() => {
    if (isOpen && user?.uid) {
      loadRequests();
      loadProducts();
    } else if (isOpen && !user?.uid) {
      // If not logged in, show form immediately
      setShowForm(true);
      setLoading(false);
      loadProducts();
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
      // If no requests, show form by default
      if (requestsData.length === 0) {
        setShowForm(true);
      }
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
          {showForm ? 'Request Artwork' : 'My Commissions'}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {!showForm && user?.uid && (
            <button
              onClick={() => setShowForm(true)}
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
              title="Create new request"
            >
              +
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
        {showForm ? (
          /* Commission Form */
          <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '12px', fontWeight: 600, color: '#555' }}>
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                required
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  fontSize: '13px',
                  border: '1px solid rgba(0, 0, 0, 0.2)',
                  borderRadius: '3px',
                  background: '#fff',
                  boxSizing: 'border-box',
                }}
                placeholder="Your name"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '12px', fontWeight: 600, color: '#555' }}>
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                required
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  fontSize: '13px',
                  border: '1px solid rgba(0, 0, 0, 0.2)',
                  borderRadius: '3px',
                  background: '#fff',
                  boxSizing: 'border-box',
                }}
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '12px', fontWeight: 600, color: '#555' }}>
                Select Product *
              </label>
              {loadingProducts ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', background: '#f5f5f5', borderRadius: '3px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>No products available. Please try again later.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem', border: '1px solid rgba(0, 0, 0, 0.15)', borderRadius: '3px' }}>
                  {products.map(product => 
                    product.prices.map(price => {
                      const isSelected = formData.selectedPriceId === price.id;
                      const hasSelection = formData.selectedPriceId !== '';
                      
                      // If there's a selection and this isn't it, don't render
                      if (hasSelection && !isSelected) return null;
                      
                      return (
                        <div
                          key={price.id}
                          style={{
                            padding: '1rem 0.5rem',
                            display: 'flex',
                            gap: '1rem',
                            alignItems: 'start',
                            borderBottom: hasSelection ? 'none' : '1px solid rgba(0, 0, 0, 0.08)',
                          }}
                        >
                          {/* Product Image (if available) */}
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

                          {/* Product Details */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                              {/* Radio Button */}
                              <input
                                type="radio"
                                name="productSelection"
                                checked={isSelected}
                                onChange={() => setFormData(prev => ({ ...prev, selectedPriceId: price.id }))}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                  margin: 0,
                                }}
                              />
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', flex: 1 }}>
                                {product.name}
                              </span>
                              {/* Clear Selection Button */}
                              {isSelected && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setFormData(prev => ({ ...prev, selectedPriceId: '' }));
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
                                    fontSize: '18px',
                                    lineHeight: 1,
                                    transition: 'color 0.2s',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#000';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = '#999';
                                  }}
                                  title="Clear selection"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                            {product.description && (
                              <div style={{ marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
                                  {product.description}
                                </span>
                              </div>
                            )}
                            <div>
                              <span style={{ fontSize: '15px', fontWeight: 700, color: '#000' }}>
                                ${(price.unit_amount / 100).toFixed(2)}
                              </span>
                              <span style={{ fontSize: '11px', color: '#999', marginLeft: '0.5rem', textTransform: 'uppercase' }}>
                                {price.currency}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '12px', fontWeight: 600, color: '#555' }}>
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                required
                rows={6}
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
                placeholder="Describe your artwork request in detail..."
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '12px', fontWeight: 600, color: '#555' }}>
                Example Image (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                id="example-image-upload"
                style={{ display: 'none' }}
                onChange={handleExampleImageSelect}
              />
              {exampleImagePreview ? (
                <div style={{ marginTop: '0.5rem' }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '120px',
                      height: '120px',
                      border: '1px solid rgba(0, 0, 0, 0.2)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                    onClick={() => setFullImageView(exampleImagePreview)}
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
                      marginTop: '0.5rem',
                      padding: '0.4rem 0.8rem',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#666',
                      background: 'transparent',
                      border: '1px solid rgba(0, 0, 0, 0.2)',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    Remove Image
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById('example-image-upload').click()}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#1a1a1a',
                    background: '#fff',
                    border: '1px solid rgba(0, 0, 0, 0.2)',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8f8f8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff';
                  }}
                >
                  Choose Image
                </button>
              )}
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '11px', color: '#666', fontStyle: 'italic' }}>
                Upload a reference image to help illustrate your request (optional).
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '0.6rem 1.25rem',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#fff',
                  background: isSubmitting ? '#999' : '#000',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) e.currentTarget.style.background = '#333';
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) e.currentTarget.style.background = '#000';
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
              {user?.uid && requests.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    padding: '0.6rem 1.25rem',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#666',
                    background: '#f5f5f5',
                    border: '1px solid rgba(0, 0, 0, 0.2)',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e0e0e0';
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
        ) : (
          /* Requests List */
          <>
            {loading ? (
              <p style={{ textAlign: 'center', color: '#666', fontSize: '13px', padding: '1.5rem' }}>Loading your requests...</p>
            ) : requests.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#666', fontSize: '13px', padding: '3rem 1.5rem' }}>
                <p style={{ margin: '0 0 1rem 0', fontSize: '14px' }}>You have no current commission requests.</p>
                <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>Press the + button above to create a request</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {requests.map((request) => (
                  <div
                    key={request.id}
                    style={{
                      background: '#fff',
                      border: '1px solid rgba(0, 0, 0, 0.12)',
                      borderRadius: '3px',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: expandedRequestId === request.id ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
                    }}
                    onClick={() => toggleExpand(request.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.2)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.12)';
                      if (expandedRequestId !== request.id) {
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.2px' }}>
                          Request from {request.name}
                        </h3>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: '#666' }}>
                          {request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '3px',
                            background: 
                              request.status === 'open' ? '#e3f2fd' :
                              request.status === 'in progress' ? '#fff3e0' :
                              request.status === 'completed' ? '#e8f5e9' :
                              request.status === 'cancelled' ? '#ffebee' :
                              request.status === 'closed' ? '#f5f5f5' :
                              '#f5f5f5',
                            color: 
                              request.status === 'open' ? '#1976d2' :
                              request.status === 'in progress' ? '#f57c00' :
                              request.status === 'completed' ? '#388e3c' :
                              request.status === 'cancelled' ? '#c62828' :
                              request.status === 'closed' ? '#666' :
                              '#666',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
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
                        <span style={{ fontSize: '14px', color: '#999', transition: 'transform 0.2s ease', transform: expandedRequestId === request.id ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                          ▶
                        </span>
                      </div>
                    </div>

                    {expandedRequestId === request.id && (
                      <div
                        style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(0, 0, 0, 0.1)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Description
                          </label>
                          <p style={{ margin: 0, fontSize: '13px', color: '#1a1a1a', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                            {request.description}
                          </p>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Email
                          </label>
                          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                            {request.email}
                          </p>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Submitted
                          </label>
                          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                            {request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleString() : 'N/A'}
                          </p>
                        </div>

                        {request.productName && (
                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Selected Product
                            </label>
                            <p style={{ margin: 0, fontSize: '13px', color: '#1a1a1a', fontWeight: 600 }}>
                              {request.productName}
                            </p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: '#666' }}>
                              ${request.priceAmount?.toFixed(2)} {request.priceCurrency}
                            </p>
                          </div>
                        )}

                        {request.exampleImageUrl && (
                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Example Image
                            </label>
                            <div
                              style={{
                                position: 'relative',
                                width: '120px',
                                height: '120px',
                                border: '1px solid rgba(0, 0, 0, 0.2)',
                                borderRadius: '3px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                              }}
                              onClick={() => setFullImageView(request.exampleImageUrl)}
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
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '11px', color: '#666', fontStyle: 'italic' }}>
                              Click to view full image.
                            </p>
                          </div>
                        )}

                        {request.status === 'open' && (
                          <div style={{ marginBottom: '1rem' }}>
                            <button
                              onClick={() => handleCancelRequest(request.id)}
                              style={{
                                padding: '0.5rem 1rem',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#c62828',
                                background: '#fff',
                                border: '1px solid #c62828',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#ffebee';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#fff';
                              }}
                            >
                              Cancel Request
                            </button>
                          </div>
                        )}

                        {request.completedImageUrl && (
                          <div style={{ marginTop: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Completed Artwork Preview
                            </label>
                            <div
                              style={{
                                position: 'relative',
                                width: '120px',
                                height: '120px',
                                border: '1px solid rgba(0, 0, 0, 0.2)',
                                borderRadius: '3px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                              }}
                              onClick={() => setFullImageView(request.completedImageUrl)}
                            >
                              <img
                                src={request.completedImageUrl}
                                alt="Completed artwork preview"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  filter: 'blur(8px)',
                                }}
                              />
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  background: 'rgba(0, 0, 0, 0.7)',
                                  color: '#fff',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: '3px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  pointerEvents: 'none',
                                }}
                              >
                                Click to view
                              </div>
                            </div>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '11px', color: '#666', fontStyle: 'italic' }}>
                              Your artwork is ready! Click to preview.
                            </p>
                            
                            {!request.paymentStatus || request.paymentStatus === 'pending' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRequest(request);
                                  setPaymentModalOpen(true);
                                }}
                                style={{
                                  marginTop: '0.75rem',
                                  padding: '0.6rem 1.25rem',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: '#fff',
                                  background: '#000',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#333';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#000';
                                }}
                              >
                                Pay ${request.price || 50} to Download Full Resolution
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(request.completedImageUrl, '_blank');
                                }}
                                style={{
                                  marginTop: '0.75rem',
                                  padding: '0.6rem 1.25rem',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: '#fff',
                                  background: '#388e3c',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#2e7d32';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#388e3c';
                                }}
                              >
                                Download Full Resolution
                              </button>
                            )}
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
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 1002,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
          onClick={() => setFullImageView(null)}
        >
          <img
            src={fullImageView}
            alt="Full view"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              filter: 'blur(10px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              padding: '1.5rem 2rem',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 600,
              pointerEvents: 'none',
              textAlign: 'center',
            }}
          >
            Preview Only<br />
            <span style={{ fontSize: '12px', fontWeight: 400, opacity: 0.9 }}>
              Full resolution available on request
            </span>
          </div>
          <button
            onClick={() => setFullImageView(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              fontSize: '32px',
              cursor: 'pointer',
              color: '#000',
              lineHeight: 1,
              padding: '0.5rem 0.75rem',
              borderRadius: '3px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedRequest(null);
          if (user?.uid) {
            loadRequests(); // Reload requests to update payment status
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
    </div>
  );
};

export default CommissionModal;
