import React, { useState, useRef, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import './QRScanner.css';

const QRScanner = ({ onScanSuccess, onClose }) => {
  const [error, setError] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    // Initialize QR scanner
    const scanner = new Html5QrcodeScanner(
      "qr-reader-container",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        // Try to extract session code from URL or direct code
        let sessionCode = decodedText;
        
        // Check if it's a URL
        const match = decodedText.match(/\/join\/([A-Z0-9]{6})/i);
        if (match) {
          sessionCode = match[1];
        }
        
        // Check if it's just a 6-character code
        if (/^[A-Z0-9]{6}$/i.test(sessionCode)) {
          scanner.clear();
          onScanSuccess(sessionCode.toUpperCase());
        } else {
          setError('Invalid QR code. Please scan a valid session QR code.');
          // Auto clear error after 3 seconds
          setTimeout(() => setError(''), 3000);
        }
      },
      (errorMessage) => {
        // Ignore scanning errors, they happen frequently during scanning
        console.debug(errorMessage);
      }
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="qr-scanner-modal">
      <div className="qr-scanner-container">
        <div className="qr-scanner-header">
          <h2>Scan QR Code</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <div id="qr-reader-container" className="scanner-wrapper"></div>
        
        {error && <div className="error-message">{error}</div>}
        
        <p className="scanner-instruction">
          Position the QR code within the frame
        </p>
        
        <button onClick={onClose} className="cancel-btn">
          Cancel
        </button>
      </div>
    </div>
  );
};

export default QRScanner;
