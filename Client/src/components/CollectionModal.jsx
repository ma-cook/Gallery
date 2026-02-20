import React, { useState, useEffect, useCallback } from 'react';
import { fetchUserRequests, getFullResDownloadUrl } from '../utils/firebaseFunctions';

const CollectionModal = ({ isOpen, onClose, user, onOpenCommission }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState(null);

  // Fetch completed requests whenever modal opens
  useEffect(() => {
    if (!isOpen || !user) return;

    const load = async () => {
      setLoading(true);
      setExpandedId(null);
      setDownloadError(null);
      try {
        const all = await fetchUserRequests(user.uid);
        setRequests(all.filter((r) => r.status === 'completed'));
      } catch (err) {
        console.error('Error loading collection:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, user]);

  const handleDownload = useCallback(async (request) => {
    setDownloadingId(request.id);
    setDownloadError(null);
    try {
      const url = await getFullResDownloadUrl(request.id);
      // Trigger browser download via a temporary anchor
      const a = document.createElement('a');
      a.href = url;
      a.download = `artwork_${request.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      setDownloadError(
        err?.code === 'functions/permission-denied'
          ? 'Payment required to download the full-resolution file.'
          : 'Download failed. Please try again.'
      );
    } finally {
      setDownloadingId(null);
    }
  }, []);

  if (!isOpen) return null;

  const completedCount = requests.length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#1a1a1a',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '760px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              margin: 0,
              color: '#fff',
              fontSize: '20px',
              fontWeight: 600,
              letterSpacing: '0.3px',
            }}
          >
            My Collection
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '24px',
              lineHeight: 1,
              padding: '4px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
          }}
        >
          {loading ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '200px',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '14px',
              }}
            >
              Loading your collection…
            </div>
          ) : completedCount === 0 ? (
            /* Empty state */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                height: '240px',
                textAlign: 'center',
              }}
            >
              {/* Art frame icon */}
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p
                style={{
                  margin: 0,
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '15px',
                  lineHeight: 1.6,
                  maxWidth: '300px',
                }}
              >
                You have no completed artwork yet.
              </p>
              <button
                onClick={onOpenCommission}
                style={{
                  marginTop: '4px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.18)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
              >
                Commission an artwork →
              </button>
            </div>
          ) : (
            /* Thumbnail grid */
            <>
              {downloadError && (
                <div
                  style={{
                    background: 'rgba(220, 53, 69, 0.15)',
                    border: '1px solid rgba(220, 53, 69, 0.4)',
                    borderRadius: '8px',
                    color: '#ff8a8a',
                    fontSize: '13px',
                    padding: '12px 16px',
                    marginBottom: '20px',
                  }}
                >
                  {downloadError}
                </div>
              )}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '12px',
                }}
              >
                {requests.map((request) => (
                  <div
                    key={request.id}
                    style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
                  >
                    {/* Thumbnail card */}
                    <div
                      onClick={() =>
                        setExpandedId(expandedId === request.id ? null : request.id)
                      }
                      style={{
                        position: 'relative',
                        borderRadius: expandedId === request.id ? '10px 10px 0 0' : '10px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: 'rgba(255,255,255,0.05)',
                        aspectRatio: '1',
                        border:
                          expandedId === request.id
                            ? '2px solid rgba(255,255,255,0.3)'
                            : '2px solid transparent',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (expandedId !== request.id)
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        if (expandedId !== request.id)
                          e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      {request.completedPreviewUrl ? (
                        <img
                          src={request.completedPreviewUrl}
                          alt={request.description || 'Completed artwork'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255,255,255,0.2)',
                            fontSize: '12px',
                          }}
                        >
                          No preview
                        </div>
                      )}

                      {/* Expand indicator */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          right: '6px',
                          background: 'rgba(0,0,0,0.55)',
                          borderRadius: '4px',
                          padding: '3px 5px',
                          lineHeight: 1,
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="rgba(255,255,255,0.7)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          {expandedId === request.id ? (
                            <polyline points="18 15 12 9 6 15" />
                          ) : (
                            <polyline points="6 9 12 15 18 9" />
                          )}
                        </svg>
                      </div>
                    </div>

                    {/* Expanded panel */}
                    {expandedId === request.id && (
                      <div
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTop: 'none',
                          borderRadius: '0 0 10px 10px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        {/* Full-res preview */}
                        {request.completedPreviewUrl && (
                          <img
                            src={request.completedPreviewUrl}
                            alt="Full preview"
                            style={{
                              width: '100%',
                              borderRadius: '6px',
                              display: 'block',
                            }}
                          />
                        )}

                        {/* Description */}
                        {request.description && (
                          <p
                            style={{
                              margin: 0,
                              color: 'rgba(255,255,255,0.6)',
                              fontSize: '12px',
                              lineHeight: 1.5,
                            }}
                          >
                            {request.description}
                          </p>
                        )}

                        {/* Download button */}
                        <button
                          onClick={() => handleDownload(request)}
                          disabled={downloadingId === request.id}
                          style={{
                            width: '100%',
                            background:
                              downloadingId === request.id
                                ? 'rgba(255,255,255,0.05)'
                                : 'rgba(255,255,255,0.12)',
                            border: '1px solid rgba(255,255,255,0.25)',
                            borderRadius: '6px',
                            color: downloadingId === request.id ? 'rgba(255,255,255,0.35)' : '#fff',
                            fontSize: '12px',
                            padding: '9px 12px',
                            cursor: downloadingId === request.id ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (downloadingId !== request.id)
                              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                          }}
                          onMouseLeave={(e) => {
                            if (downloadingId !== request.id)
                              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                          }}
                        >
                          {downloadingId === request.id ? (
                            'Preparing…'
                          ) : (
                            <>
                              <svg
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                              Download full resolution
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollectionModal;
