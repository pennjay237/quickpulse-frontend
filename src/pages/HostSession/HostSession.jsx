import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getSessionByCode, getParticipants } from '../../services/api';
import './HostSession.css';

const HostSession = () => {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [activeTab, setActiveTab] = useState('polls'); // 'polls' or 'participants'

  useEffect(() => {
    fetchSessionDetails();
    
    // Join host room for real-time updates
    if (socket && user) {
      socket.emit('join-host', user.id);
      
      // Listen for new participants
      socket.on('participant-joined', (data) => {
        if (data.sessionId === session?.id) {
          setParticipants(prev => [...prev, data.participant]);
        }
      });

      // Listen for new responses
      socket.on('response-received', (data) => {
        // Update poll results
        setPolls(prevPolls => 
          prevPolls.map(poll => 
            poll.id === data.pollId 
              ? { ...poll, results: data.results }
              : poll
          )
        );
      });
    }

    return () => {
      if (socket) {
        socket.off('participant-joined');
        socket.off('response-received');
      }
    };
  }, [sessionCode, socket, user, session?.id]);

  const fetchSessionDetails = async () => {
    try {
      // Get session info
      const sessionRes = await getSessionByCode(sessionCode);
      setSession(sessionRes.data);
      
      // Get participants
      const participantsRes = await getParticipants(sessionRes.data.id);
      setParticipants(participantsRes.data);
      
      // TODO: Get polls when we create that endpoint
      setPolls([]);
    } catch (error) {
      console.error('Error fetching session:', error);
      navigate('/host/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const copyJoinLink = () => {
    const link = `${window.location.origin}/join/${sessionCode}`;
    navigator.clipboard.writeText(link);
    alert('Join link copied to clipboard!');
  };

  if (loading) {
    return <div className="loading">Loading session...</div>;
  }

  if (!session) {
    return <div className="error">Session not found</div>;
  }

  return (
    <div className="host-session">
      <header className="session-header">
        <div>
          <h1>{session.name}</h1>
          <p className="session-code-display">Session Code: <strong>{session.code}</strong></p>
        </div>
        <div className="header-actions">
          <button onClick={copyJoinLink} className="btn-secondary">
            Copy Join Link
          </button>
          <button onClick={() => navigate('/host/dashboard')} className="btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="session-stats">
        <div className="stat-card">
          <h3>Participants</h3>
          <p className="stat-number">{participants.length}</p>
        </div>
        <div className="stat-card">
          <h3>Polls</h3>
          <p className="stat-number">{polls.length}</p>
        </div>
        <div className="stat-card">
          <h3>Status</h3>
          <p className={`status-text ${session.is_active ? 'active' : 'inactive'}`}>
            {session.is_active ? 'Live' : 'Ended'}
          </p>
        </div>
      </div>

      <div className="session-tabs">
        <button 
          className={`tab-btn ${activeTab === 'polls' ? 'active' : ''}`}
          onClick={() => setActiveTab('polls')}
        >
          Polls
        </button>
        <button 
          className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`}
          onClick={() => setActiveTab('participants')}
        >
          Participants ({participants.length})
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'polls' && (
          <div className="polls-tab">
            <div className="polls-header">
              <h2>Polls</h2>
              <button 
                className="btn-primary"
                onClick={() => setShowCreatePoll(true)}
              >
                + Create Poll
              </button>
            </div>
            
            {polls.length === 0 ? (
              <div className="empty-state">
                <p>No polls created yet.</p>
                <button onClick={() => setShowCreatePoll(true)}>
                  Create Your First Poll
                </button>
              </div>
            ) : (
              <div className="polls-list">
                {polls.map(poll => (
                  <div key={poll.id} className="poll-card">
                    <h3>{poll.question}</h3>
                    <p>Type: {poll.type}</p>
                    <p>Status: {poll.status}</p>
                    {/* TODO: Add poll controls */}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="participants-tab">
            <h2>Participants</h2>
            {participants.length === 0 ? (
              <div className="empty-state">
                <p>No participants have joined yet.</p>
                <p>Share the session code: <strong>{session.code}</strong></p>
              </div>
            ) : (
              <div className="participants-list">
                {participants.map(p => (
                  <div key={p.id} className="participant-item">
                    <div className="participant-info">
                      <strong>{p.name}</strong>
                      <span>{p.email}</span>
                    </div>
                    <span className="join-time">
                      Joined: {new Date(p.joined_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showCreatePoll && (
        <div className="modal">
          <div className="modal-content">
            <h2>Create New Poll</h2>
            <p className="coming-soon">Poll creation coming soon!</p>
            <button onClick={() => setShowCreatePoll(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostSession;
