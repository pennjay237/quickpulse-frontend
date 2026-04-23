import React, { useState, useEffect } from 'react';
import './QRCodeDisplay.css';

const QRCodeDisplay = ({ sessionCode, sessionName }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [joinUrl, setJoinUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateQRCode();
  }, [sessionCode]);

  const generateQRCode = async () => {
    try {
      // Import qrcode dynamically
      const QRCode = await import('qrcode');
      
      // Create the join URL
      const url = `${window.location.origin}/join/${sessionCode}`;
      setJoinUrl(url);
      
      // Generate QR code as data URL
      const qrDataUrl = await QRCode.default.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#764ba2',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
      
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `quickpulse-session-${sessionCode}.png`;
      link.href = qrCodeUrl;
      link.click();
    }
  };

  const copyJoinLink = () => {
    navigator.clipboard.writeText(joinUrl);
    alert('✓ Join link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="qr-loading">
        <div className="loader"></div>
        <p>Generating QR code...</p>
      </div>
    );
  }

  return (
    <div className="qr-code-display">
      <div className="qr-header">
        <h3>📱 Quick Join with QR Code</h3>
        <p>Participants can scan this QR code with their phone camera</p>
      </div>
      
      <div className="qr-code-wrapper">
        {qrCodeUrl && (
          <img 
            src={qrCodeUrl} 
            alt={`QR Code for session ${sessionCode}`} 
            className="qr-code-image"
          />
        )}
      </div>
      
      <div className="session-info">
        <div className="session-name">{sessionName}</div>
        <div className="session-code-display">
          Session Code: <strong>{sessionCode}</strong>
        </div>
      </div>
      
      <div className="qr-actions">
        <button onClick={downloadQRCode} className="btn-download">
          💾 Download QR Code
        </button>
        <button onClick={copyJoinLink} className="btn-copy">
          📋 Copy Join Link
        </button>
      </div>
      
      <div className="instructions">
        <div className="instruction">
          <span className="instruction-icon">1</span>
          <span>Open camera app on phone</span>
        </div>
        <div className="instruction">
          <span className="instruction-icon">2</span>
          <span>Point at QR code</span>
        </div>
        <div className="instruction">
          <span className="instruction-icon">3</span>
          <span>Tap the link that appears</span>
        </div>
        <div className="instruction">
          <span className="instruction-icon">4</span>
          <span>Enter name and join session</span>
        </div>
      </div>
      
      <div className="alternative-link">
        <p>Or share this link:</p>
        <div className="link-box">
          <input type="text" value={joinUrl} readOnly className="link-input" />
          <button onClick={copyJoinLink} className="copy-btn-small">Copy</button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
