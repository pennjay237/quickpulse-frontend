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
          <button 
            className="host-btn"
            onClick={() => navigate('/host/login')}
          >
            <h2>🎤 Host a Session</h2>
            <p>Create and manage polls for your audience</p>
          </button>
          
          <button 
            className="participant-btn"
            onClick={() => navigate('/join')}
          >
            <h2>👥 Join a Session</h2>
            <p>Enter a session code to participate</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
