import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinSession } from '../../services/api';
import './ParticipantJoin.css';

const ParticipantJoin = () => {
  const [step, setStep] = useState('code'); // 'code' or 'details'
  const [sessionCode, setSessionCode] = useState('');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check if session exists
      const response = await fetch(`http://localhost:5000/api/sessions/code/${sessionCode}`);
      const data = await response.json();
      
      if (response.ok) {
        setSessionInfo(data);
        setStep('details');
      } else {
        setError(data.error || 'Session not found');
      }
    } catch (err) {
      setError('Failed to find session. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await joinSession(
        sessionCode,
        formData.name,
        formData.email,
        formData.phone
      );
      
      // Store participant info
      localStorage.setItem('participant', JSON.stringify(response.data.participant));
      localStorage.setItem('sessionCode', sessionCode);
      
      // Navigate to participant view
      navigate(`/participant/${sessionCode}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join session');
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
        <h1>Join a Session</h1>
        
        {step === 'code' ? (
          <>
            <p className="instruction">Enter the 6-character session code</p>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleCodeSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Session Code (e.g., 78W45M)"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  maxLength="6"
                  required
                  disabled={loading}
                  className="code-input"
                />
              </div>
              
              <button type="submit" disabled={loading}>
                {loading ? 'Checking...' : 'Continue'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="session-info">
              <h3>{sessionInfo?.name}</h3>
              <p>Session Code: <strong>{sessionCode}</strong></p>
            </div>
            
            <p className="instruction">Tell us about yourself</p>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleDetailsSubmit}>
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
              
              <div className="form-actions">
                <button type="button" onClick={() => setStep('code')} className="btn-back">
                  Back
                </button>
                <button type="submit" disabled={loading}>
                  {loading ? 'Joining...' : 'Join Session'}
                </button>
              </div>
            </form>
          </>
        )}
        
        <p className="back-link">
          <button onClick={() => navigate('/')} className="link-btn">
            ← Back to Home
          </button>
        </p>
      </div>
    </div>
  );
};

export default ParticipantJoin;
