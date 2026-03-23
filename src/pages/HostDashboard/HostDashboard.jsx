import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getHostSessions, createSession } from '../../services/api';
import './HostDashboard.css';

const HostDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [creating, setCreating] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await getHostSessions();
      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;
    
    setCreating(true);
    try {
      const response = await createSession(newSessionName);
      setSessions([response.data, ...sessions]);
      setShowCreateModal(false);
      setNewSessionName('');
      navigate(`/host/session/${response.data.code}`);
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/host/login');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>QuickPulse Dashboard</h1>
          <p>Welcome, {user?.email}</p>
        </div>
        <div>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            + New Session
          </button>
          <button onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <h2>Your Sessions</h2>
        
        {sessions.length === 0 ? (
          <div className="empty-state">
            <p>You haven't created any sessions yet.</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              Create Your First Session
            </button>
          </div>
        ) : (
          <div className="sessions-grid">
            {sessions.map((session) => (
              <div 
                key={session.id} 
                className="session-card"
                onClick={() => navigate(`/host/session/${session.code}`)}
              >
                <h3>{session.name}</h3>
                <p className="session-code">Code: {session.code}</p>
                <p className="session-date">
                  Created: {new Date(session.created_at).toLocaleDateString()}
                </p>
                <span className={`status-badge ${session.is_active ? 'active' : 'inactive'}`}>
                  {session.is_active ? 'Active' : 'Ended'}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Create New Session</h2>
            <input
              type="text"
              placeholder="Session Name (e.g., Team Meeting)"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button 
                onClick={handleCreateSession} 
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostDashboard;
