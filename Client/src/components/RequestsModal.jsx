import React, { useState, useEffect } from 'react';
import { fetchRequests, updateRequestStatus, uploadCompletedRequestImage, deleteRequest } from '../firebaseFunctions';
import AlertDialog from './AlertDialog';

const RequestsModal = ({ isOpen, onClose }) => {
  const [requests, setRequests] = useState([]);
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadedImages, setUploadedImages] = useState({});
  const [fullImageView, setFullImageView] = useState(null);
  const [uploading, setUploading] = useState({});
  const [alertDialog, setAlertDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' });
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
      loadRequests();
    }
  }, [isOpen]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const requestsData = await fetchRequests();
      setRequests(requestsData);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId, requestId, newStatus) => {
    try {
      await updateRequestStatus(userId, requestId, newStatus);
      // Update local state
      setRequests(requests.map(req => 
        req.id === requestId ? { ...req, status: newStatus } : req
      ));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const toggleExpand = (requestId) => {
    setExpandedRequestId(expandedRequestId === requestId ? null : requestId);
  };

  const handleImageSelect = (requestId, event) => {
    const file = event.target.files[0];
    if (file) {
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setUploadedImages(prev => ({
        ...prev,
        [requestId]: { file, previewUrl }
      }));
    }
  };

  const handleMarkCompleted = async (userId, requestId, request) => {
    const imageData = uploadedImages[requestId];
    if (!imageData || !imageData.file) return;

    setUploading(prev => ({ ...prev, [requestId]: true }));
    try {
      const result = await uploadCompletedRequestImage(userId, requestId, imageData.file, request);
      // Update local state - use the local preview URL so the image shows immediately
      const localPreviewUrl = imageData.previewUrl;
      setRequests(requests.map(req => 
        req.id === requestId ? { ...req, status: 'completed', completedPreviewUrl: localPreviewUrl } : req
      ));
      // Clear uploaded image from state
      setUploadedImages(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
    } catch (error) {
      console.error('Error marking as completed:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to upload image and mark as completed. Please try again.',
        type: 'error'
      });
    } finally {
      setUploading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleDeleteRequest = async (userId, requestId) => {
    try {
      await deleteRequest(userId, requestId);
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

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: isMobile ? '95vw' : '520px',
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
          Artwork Requests
        </h2>
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

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 16px' : '16px 20px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#999', fontSize: '13px', padding: '24px' }}>Loading requests...</p>
        ) : requests.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', fontSize: '13px', padding: '24px' }}>No requests yet.</p>
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
                      {request.email}
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
                          handleDeleteRequest(request.userId, request.id);
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

                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#999', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Submitted
                      </label>
                      <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>
                        {request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleString() : 'N/A'}
                      </p>
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
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Update Status
                      </label>
                      <select
                        value={request.status}
                        onChange={(e) => handleStatusChange(request.userId, request.id, e.target.value)}
                        style={{
                          padding: '8px 12px',
                          fontSize: '12px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          background: '#fafafa',
                          cursor: 'pointer',
                          minWidth: '140px',
                          fontWeight: 500,
                        }}
                      >
                        <option value="open">Open</option>
                        <option value="in progress">In Progress</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    {request.completedPreviewUrl && (
                      <div style={{ marginTop: '10px', padding: '10px', background: '#f8faf8', borderRadius: '10px', border: '1px solid #e8f0e8' }}>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#2e7d32', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Completed Artwork
                        </label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <div
                            style={{
                              position: 'relative',
                              width: '60px',
                              height: '60px',
                              border: '1px solid #e0e0e0',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                            }}
                            onClick={() => setFullImageView(request.completedPreviewUrl)}
                          >
                            <img
                              src={request.completedPreviewUrl}
                              alt="Completed artwork"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '11px', color: request.paymentStatus === 'paid' ? '#2e7d32' : '#999' }}>
                            {request.paymentStatus === 'paid' ? '✓ Payment received' : 'Awaiting payment'}
                          </span>
                        </div>
                      </div>
                    )}

                    {!request.completedPreviewUrl && request.status !== 'completed' && (
                    <>
                    <div style={{ marginTop: '10px' }}>
                      <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Upload Completed Artwork
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        id={`file-${request.id}`}
                        style={{ display: 'none' }}
                        onChange={(e) => handleImageSelect(request.id, e)}
                      />
                      {uploadedImages[request.id] ? (
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
                            onClick={() => setFullImageView(uploadedImages[request.id].previewUrl)}
                          >
                            <img
                              src={uploadedImages[request.id].previewUrl}
                              alt="Preview"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          </div>
                          <button
                            onClick={() => {
                              setUploadedImages(prev => {
                                const newState = { ...prev };
                                delete newState[request.id];
                                return newState;
                              });
                            }}
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
                          onClick={() => document.getElementById(`file-${request.id}`).click()}
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
                          + Upload Image
                        </button>
                      )}
                    </div>

                    <div style={{ marginTop: '10px' }}>
                      <button
                        onClick={() => handleMarkCompleted(request.userId, request.id, request)}
                        disabled={!uploadedImages[request.id] || uploading[request.id]}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: uploadedImages[request.id] && !uploading[request.id] ? '#fff' : '#aaa',
                          background: uploadedImages[request.id] && !uploading[request.id] ? '#2e7d32' : '#eee',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: uploadedImages[request.id] && !uploading[request.id] ? 'pointer' : 'not-allowed',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          if (uploadedImages[request.id] && !uploading[request.id]) {
                            e.currentTarget.style.background = '#1b5e20';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (uploadedImages[request.id] && !uploading[request.id]) {
                            e.currentTarget.style.background = '#2e7d32';
                          }
                        }}
                      >
                        {uploading[request.id] ? 'Uploading...' : 'Mark as Completed'}
                      </button>
                    </div>
                    </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
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
            src={fullImageView}
            alt="Full view"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '4px',
            }}
          />
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

export default RequestsModal;
