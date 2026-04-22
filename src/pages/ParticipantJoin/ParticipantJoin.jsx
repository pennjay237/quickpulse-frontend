import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './ParticipantJoin.css';

const ParticipantJoin = () => {
  const { sessionCode: urlCode } = useParams();
  const [step, setStep] = useState(urlCode ? 'details' : 'code');
  const [sessionCode, setSessionCode] = useState(urlCode || '');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchSessionInfo = async (code) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:5000/api/sessions/code/${code}`);
      const data = await response.json();
      if (response.ok) {
        setSessionInfo(data);
        setStep('details');
      } else {
        setError(data.error || 'Session not found. Please check the code.');
      }
    } catch (err) {
      setError('Cannot connect to server. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (sessionCode.length === 6) {
      await fetchSessionInfo(sessionCode);
    } else {
      setError('Please enter a valid 6-character session code');
    }
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: sessionCode,
          name: formData.name,
          email: formData.email,
          phone: formData.phone
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('participant', JSON.stringify(data.participant));
        localStorage.setItem('sessionCode', sessionCode);
        localStorage.setItem('sessionInfo', JSON.stringify(data.session));
        navigate(`/participant/${sessionCode}`);
      } else {
        setError(data.error || 'Failed to join session');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="join-container">
      <div className="join-box">
        <h1>Join Session</h1>
        
        {step === 'code' ? (
          <form onSubmit={handleCodeSubmit}>
            <div className="form-group">
              <label>Enter Session Code</label>
              <input
                type="text"
                placeholder="e.g., 78W45M"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                maxLength="6"
                required
                disabled={loading}
                className="code-input"
                autoFocus
              />
              <small>Enter the 6-character code provided by the host</small>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button type="submit" disabled={loading}>
              {loading ? 'Checking...' : 'Continue →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinSubmit}>
            {sessionInfo && (
              <div className="session-info">
                <h3>{sessionInfo.name}</h3>
                <p>Session Code: <strong>{sessionCode}</strong></p>
                {sessionInfo.voice_enabled && (
                  <span className="voice-badge">🎤 Voice Enabled</span>
                )}
              </div>
            )}
            
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="John Doe"
              />
            </div>
            
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="john@example.com"
              />
            </div>
            
            <div className="form-group">
              <label>Phone (optional)</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
                placeholder="+1234567890"
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-actions">
              <button type="button" onClick={() => setStep('code')} className="btn-back">
                ← Back
              </button>
              <button type="submit" disabled={loading}>
                {loading ? 'Joining...' : 'Join Session →'}
              </button>
            </div>
          </form>
        )}
        
        <button onClick={() => navigate('/')} className="link-btn">
          ← Back to Home
        </button>
      </div>
    </div>
  );
};

export default ParticipantJoin;
