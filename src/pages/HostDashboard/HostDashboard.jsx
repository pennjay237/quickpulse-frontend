import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Plus, Calendar, Users } from 'lucide-react';
import Container from '../../components/layout/Container';
import Header from '../../components/layout/Header';

// ADD THIS LINE - Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
      const token = localStorage.getItem('token');
      // CHANGE THIS LINE - Use API_URL instead of hardcoded localhost
      const response = await fetch(`${API_URL}/api/sessions/host`, {
        headers: { 'x-auth-token': token }
      });
      const data = await response.json();
      setSessions(data);
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
      const token = localStorage.getItem('token');
      // CHANGE THIS LINE - Use API_URL instead of hardcoded localhost
      const response = await fetch(`${API_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ name: newSessionName })
      });
      const data = await response.json();
      setSessions([data, ...sessions]);
      setShowCreateModal(false);
      setNewSessionName('');
      navigate(`/host/session/${data.code}`);
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <Container className="py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Sessions</h1>
            <p className="text-gray-600 mt-1">Manage and monitor your active sessions</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>
        
        {sessions.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
            <p className="text-gray-600 mb-6">Create your first session to start polling</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              Create Your First Session
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <div 
                key={session.id} 
                className="card p-6 cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={() => navigate(`/host/session/${session.code}`)}
              >
                <h3 className="font-semibold text-gray-900 mb-2">{session.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <span>Code: {session.code}</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {session.participant_count || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`badge ${session.is_active ? 'badge-active' : 'badge-inactive'}`}>
                    {session.is_active ? 'Active' : 'Ended'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(session.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
      
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
          <div className="card p-6 w-full max-w-md mx-4 animate-scale-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Session</h2>
            <input
              type="text"
              placeholder="Session name"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className="input mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button 
                onClick={handleCreateSession} 
                disabled={creating}
                className="btn-primary flex-1"
              >
                {creating ? 'Creating...' : 'Create Session'}
              </button>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="btn-secondary"
              >
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