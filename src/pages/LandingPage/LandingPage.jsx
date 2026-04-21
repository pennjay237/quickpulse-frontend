import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <div className="landing-content">
        <h1>QuickPulse</h1>
        <p>Real-time polling for meetings and webinars</p>
        
        <div className="role-buttons">
          <button className="host-btn" onClick={() => navigate('/host/login')}>
            🎤 Host a Session
          </button>
          
          <button className="participant-btn" onClick={() => navigate('/join')}>
            👥 Join a Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
