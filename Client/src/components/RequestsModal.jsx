import React, { useState, useEffect } from 'react';
import { fetchRequests, updateRequestStatus, uploadCompletedRequestImage } from '../firebaseFunctions';

const RequestsModal = ({ isOpen, onClose }) => {
  const [requests, setRequests] = useState([]);
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadedImages, setUploadedImages] = useState({});
  const [fullImageView, setFullImageView] = useState(null);
  const [uploading, setUploading] = useState({});

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
      await uploadCompletedRequestImage(userId, requestId, imageData.file, request);
      // Update local state
      setRequests(requests.map(req => 
        req.id === requestId ? { ...req, status: 'completed' } : req
      ));
      // Clear uploaded image from state
      setUploadedImages(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
    } catch (error) {
      console.error('Error marking as completed:', error);
      alert('Failed to upload image and mark as completed. Please try again.');
    } finally {
      setUploading(prev => ({ ...prev, [requestId]: false }));
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
          Artwork Requests
        </h2>
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

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#666', fontSize: '13px', padding: '1.5rem' }}>Loading requests...</p>
        ) : requests.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', fontSize: '13px', padding: '1.5rem' }}>No requests yet.</p>
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
                      {request.name}
                    </h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: '#666' }}>
                      {request.email}
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
                          '#f5f5f5',
                        color: 
                          request.status === 'open' ? '#1976d2' :
                          request.status === 'in progress' ? '#f57c00' :
                          request.status === 'completed' ? '#388e3c' :
                          '#666',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {request.status}
                    </span>
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
                        Submitted
                      </label>
                      <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                        {request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleString() : 'N/A'}
                      </p>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Update Status
                      </label>
                      <select
                        value={request.status}
                        onChange={(e) => handleStatusChange(request.userId, request.id, e.target.value)}
                        style={{
                          padding: '0.5rem 0.65rem',
                          fontSize: '13px',
                          border: '1px solid rgba(0, 0, 0, 0.2)',
                          borderRadius: '3px',
                          background: '#fff',
                          cursor: 'pointer',
                          minWidth: '150px',
                          fontWeight: 500,
                        }}
                      >
                        <option value="open">Open</option>
                        <option value="in progress">In Progress</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                              marginTop: '0.5rem',
                              padding: '0.4rem 0.8rem',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#666',
                              background: 'transparent',
                              border: '1px solid rgba(0, 0, 0, 0.2)',
                              borderRadius: '3px',
                              cursor: 'pointer',
                            }}
                          >
                            Remove Image
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => document.getElementById(`file-${request.id}`).click()}
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
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      <button
                        onClick={() => handleMarkCompleted(request.userId, request.id, request)}
                        disabled={!uploadedImages[request.id] || uploading[request.id]}
                        style={{
                          width: '100%',
                          padding: '0.6rem 1rem',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: uploadedImages[request.id] && !uploading[request.id] ? '#fff' : '#999',
                          background: uploadedImages[request.id] && !uploading[request.id] ? '#388e3c' : '#e0e0e0',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: uploadedImages[request.id] && !uploading[request.id] ? 'pointer' : 'not-allowed',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (uploadedImages[request.id] && !uploading[request.id]) {
                            e.currentTarget.style.background = '#2e7d32';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (uploadedImages[request.id] && !uploading[request.id]) {
                            e.currentTarget.style.background = '#388e3c';
                          }
                        }}
                      >
                        {uploading[request.id] ? 'Uploading...' : 'Mark as Completed'}
                      </button>
                    </div>
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
            }}
          />
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
    </div>
  );
};

export default RequestsModal;
