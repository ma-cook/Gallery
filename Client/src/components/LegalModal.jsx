import React, { useState } from 'react';

const LegalModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('terms');

  if (!isOpen) return null;

  const tabs = [
    { id: 'terms', label: 'Terms of Service' },
    { id: 'privacy', label: 'Privacy Policy' },
    { id: 'refund', label: 'Refund Policy' },
    { id: 'cookies', label: 'Cookies' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'terms':
        return (
          <div style={{ fontSize: '13px', color: '#444', lineHeight: '1.7' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#111' }}>Terms of Service</h3>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Last updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            
            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>1. Acceptance of Terms</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              By accessing and using this website and our commission services, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>2. Commission Services</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              We provide custom artwork commission services. When you submit a commission request:
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li>You agree to provide accurate information about your request</li>
              <li>You understand that artwork is created specifically for you based on your description</li>
              <li>Completion times may vary based on complexity and current workload</li>
              <li>You will receive a preview before final payment is required</li>
            </ul>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>3. Payment Terms</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              All payments are processed securely through Stripe. By making a payment, you agree to Stripe's terms of service. Payment is required to download the full-resolution artwork after completion.
            </p>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>4. Intellectual Property</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              Upon full payment, you receive a personal, non-exclusive license to use the commissioned artwork for personal use. The artist retains copyright and may use the artwork for portfolio/promotional purposes unless otherwise agreed.
            </p>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>5. User Conduct</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              You agree not to use our services for any unlawful purpose or to request content that is illegal, harmful, or infringes on others' rights.
            </p>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>6. Limitation of Liability</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              We are not liable for any indirect, incidental, or consequential damages arising from your use of our services. Our total liability shall not exceed the amount paid for the specific commission in question.
            </p>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>7. Changes to Terms</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              We reserve the right to modify these terms at any time. Continued use of our services after changes constitutes acceptance of the new terms.
            </p>
          </div>
        );

      case 'privacy':
        return (
          <div style={{ fontSize: '13px', color: '#444', lineHeight: '1.7' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#111' }}>Privacy Policy</h3>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Last updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>Information We Collect</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              We collect information you provide directly to us, including:
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li><strong>Account Information:</strong> Email address and authentication data when you sign in</li>
              <li><strong>Commission Details:</strong> Name, email, description, and any reference images you provide</li>
              <li><strong>Payment Information:</strong> Processed securely by Stripe; we do not store your card details</li>
            </ul>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>How We Use Your Information</h4>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li>To provide and fulfill commission services</li>
              <li>To communicate with you about your requests</li>
              <li>To process payments</li>
              <li>To improve our services</li>
            </ul>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>Data Storage</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              Your data is stored securely using Firebase (Google Cloud) services. We implement appropriate security measures to protect your personal information.
            </p>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>Third-Party Services</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              We use the following third-party services:
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li><strong>Firebase:</strong> Authentication and data storage</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Google Sign-In:</strong> Optional authentication method</li>
            </ul>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>Your Rights (GDPR/CCPA)</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              You have the right to:
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Data portability</li>
            </ul>
            <p style={{ margin: '0 0 12px 0' }}>
              To exercise these rights, please contact us through our social media channels.
            </p>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>Data Retention</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time.
            </p>
          </div>
        );

      case 'refund':
        return (
          <div style={{ fontSize: '13px', color: '#444', lineHeight: '1.7' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#111' }}>Refund Policy</h3>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Last updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>Before Payment</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              You may cancel your commission request at any time before the artwork is marked as completed, at no cost. Simply use the "Cancel Request" option in your commission dashboard.
            </p>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>Preview Period</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              When your artwork is completed, you will receive a low-resolution preview. This allows you to review the work before committing to payment. Payment is only required to download the full-resolution version.
            </p>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>After Payment</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              Due to the digital nature of our products:
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li>Refunds are generally not available after you have downloaded the full-resolution artwork</li>
              <li>If you experience technical issues preventing download, contact us and we will resolve the issue</li>
              <li>If the delivered artwork significantly differs from the agreed description, we will work with you to make corrections or provide a refund</li>
            </ul>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>Refund Requests</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              To request a refund, please contact us through our social media channels within 14 days of payment. Include your order details and reason for the refund request. We review each request on a case-by-case basis.
            </p>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>Processing Time</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              Approved refunds are processed within 5-10 business days. The refund will be credited to the original payment method used.
            </p>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>Disputes</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              We encourage you to contact us directly before initiating a payment dispute with your bank. We are committed to resolving issues fairly and promptly.
            </p>
          </div>
        );

      case 'cookies':
        return (
          <div style={{ fontSize: '13px', color: '#444', lineHeight: '1.7' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#111' }}>Cookie Policy</h3>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Last updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>What Are Cookies</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and improve your experience.
            </p>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>Cookies We Use</h4>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Essential Cookies:</strong>
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li><strong>Authentication:</strong> Firebase uses cookies to keep you signed in</li>
              <li><strong>Security:</strong> To protect against fraud and unauthorized access</li>
            </ul>

            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Functional Cookies:</strong>
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li><strong>Preferences:</strong> To remember your settings and preferences</li>
              <li><strong>Performance:</strong> To cache images for faster loading (IndexedDB)</li>
            </ul>

            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Third-Party Cookies:</strong>
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li><strong>Stripe:</strong> For secure payment processing</li>
              <li><strong>Google:</strong> If you use Google Sign-In</li>
            </ul>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>Managing Cookies</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              You can control cookies through your browser settings. Note that disabling essential cookies may affect website functionality, including:
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li>Inability to stay signed in</li>
              <li>Payment processing issues</li>
              <li>Loss of saved preferences</li>
            </ul>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111' }}>Your Consent</h4>
            <p style={{ margin: '0 0 12px 0' }}>
              By continuing to use this website, you consent to our use of essential and functional cookies as described above. We do not use cookies for advertising or tracking purposes.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '520px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        background: '#fff',
        borderRadius: '12px',
        zIndex: 1000,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 20px',
        borderBottom: '1px solid #eee',
        flexShrink: 0,
      }}>
        <h2 style={{ margin: 0, color: '#111', fontSize: '15px', fontWeight: 700 }}>
          Legal & Policies
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#999',
            lineHeight: 1,
            padding: 0,
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#111'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#999'; }}
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #eee',
        padding: '0 20px',
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #111' : '2px solid transparent',
              color: activeTab === tab.id ? '#111' : '#888',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
              marginBottom: '-1px',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.color = '#555';
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.color = '#888';
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '16px 20px',
      }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default LegalModal;
