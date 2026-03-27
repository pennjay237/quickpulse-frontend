import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './HostLogin.css';

const HostLogin = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = isLogin 
      ? await login(email, password)
      : await register(email, password);

    if (result.success) {
      navigate('/host/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="host-login-container">
      <div className="login-box">
        <h1>QuickPulse</h1>
        <h2>{isLogin ? 'Host Login' : 'Create Host Account'}</h2>
        
        <p className="host-info">
          🎤 Host accounts let you create and manage polls for your sessions.
        </p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="your@email.com"
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              placeholder="••••••"
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Login as Host' : 'Register as Host')}
          </button>
        </form>
        
        <p className="toggle-link">
          {isLogin ? "Don't have a host account? " : "Already have a host account? "}
          <button onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Register as Host' : 'Login as Host'}
          </button>
        </p>
        
        <p className="back-link">
          <Link to="/" className="link-btn">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
};

export default HostLogin;
