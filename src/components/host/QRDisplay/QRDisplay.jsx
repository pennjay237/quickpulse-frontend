import React, { useState, useEffect } from 'react';
import './QRDisplay.css';

const QRDisplay = ({ sessionCode, sessionId }) => {
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateQRCode();
  }, [sessionCode]);

  const generateQRCode = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/sessions/${sessionId}/qrcode`, {
        headers: { 'x-auth-token': token }
      });
      const data = await response.json();
      if (response.ok) {
        setQrCode(data.qrCode);
      } else {
        // Generate QR code locally if backend doesn't have it
        const QRCode = await import('qrcode');
        const url = `${window.location.origin}/join/${sessionCode}`;
        const qrDataUrl = await QRCode.toDataURL(url);
        setQrCode(qrDataUrl);
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.download = `session-${sessionCode}-qr.png`;
    link.href = qrCode;
    link.click();
  };

  if (loading) {
    return <div className="qr-loading">Generating QR Code...</div>;
  }

  return (
    <div className="qr-display">
      <div className="qr-header">
        <h3>📱 QR Code for Participants</h3>
        <p>Scan to join this session instantly</p>
      </div>
      <div className="qr-code-container">
        {qrCode && <img src={qrCode} alt="Session QR Code" className="qr-image" />}
      </div>
      <div className="qr-actions">
        <button onClick={downloadQR} className="download-qr-btn">
          💾 Download QR Code
        </button>
        <button 
          onClick={() => {
            const url = `${window.location.origin}/join/${sessionCode}`;
            navigator.clipboard.writeText(url);
            alert('Join link copied!');
          }}
          className="copy-link-btn"
        >
          📋 Copy Join Link
        </button>
      </div>
      <div className="qr-info">
        <p>Or share this code: <strong>{sessionCode}</strong></p>
      </div>
    </div>
  );
};

export default QRDisplay;
