import React, { useState, useRef, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import './QRScanner.css';

const QRScanner = ({ onScanSuccess, onClose }) => {
  const [error, setError] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        const match = decodedText.match(/\/join\/([A-Z0-9]{6})/);
        if (match) {
          scanner.clear();
          onScanSuccess(match[1]);
        } else {
          setError('Invalid QR code. Please scan a valid session QR code.');
        }
      },
      (errorMessage) => {
        console.warn(errorMessage);
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
        
        <div id="qr-reader" className="scanner-wrapper"></div>
        
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
