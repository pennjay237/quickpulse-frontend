import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PollCreator from '../../components/host/PollCreator/PollCreator';
import './HostSession.css';

const HostSession = () => {
  const { sessionCode } = useParams();
  const [session, setSession] = useState(null);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Helper function to get token
  const getToken = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      navigate('/host/login');
      return null;
    }
    return token;
  };

  // Helper function for authenticated fetch
  const authFetch = async (url, options = {}) => {
    const token = getToken();
    if (!token) return null;

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (response.status === 401) {
        // Token expired or invalid
        console.error('Authentication failed');
        logout();
        navigate('/host/login');
        return null;
      }
      
      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchSession();
    fetchPolls();
    fetchParticipants();
  }, [sessionCode]);

  const fetchSession = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/sessions/code/${sessionCode}`);
      const data = await response.json();
      if (response.ok) {
        setSession(data);
      } else {
        navigate('/host/dashboard');
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    }
  };

  const fetchPolls = async () => {
    try {
      const token = getToken();
      if (!token) return;
      
      const response = await fetch(`http://localhost:5000/api/polls/session/${sessionCode}`, {
        headers: { 'x-auth-token': token }
      });
      
      if (response.status === 401) {
        logout();
        navigate('/host/login');
        return;
      }
      
      const data = await response.json();
      if (response.ok) {
        setPolls(data);
      }
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    if (!session?.id) return;
    try {
      const token = getToken();
      if (!token) return;
      
      const response = await fetch(`http://localhost:5000/api/sessions/${session.id}/participants`, {
        headers: { 'x-auth-token': token }
      });
      
      if (response.ok) {
        const data = await response.json();
        setParticipants(data);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const handlePollCreated = (newPoll) => {
    setPolls([newPoll, ...polls]);
  };

  const publishPoll = async (pollId) => {
    try {
      const token = getToken();
      if (!token) return;
      
      const response = await fetch(`http://localhost:5000/api/polls/${pollId}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        }
      });
      
      if (response.ok) {
        fetchPolls();
      } else if (response.status === 401) {
        logout();
        navigate('/host/login');
      }
    } catch (error) {
      console.error('Error publishing poll:', error);
    }
  };

  const closePoll = async (pollId) => {
    try {
      const token = getToken();
      if (!token) return;
      
      const response = await fetch(`http://localhost:5000/api/polls/${pollId}/close`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        }
      });
      
      if (response.ok) {
        fetchPolls();
      } else if (response.status === 401) {
        logout();
        navigate('/host/login');
      }
    } catch (error) {
      console.error('Error closing poll:', error);
    }
  };

  const reopenPoll = async (pollId) => {
    try {
      const token = getToken();
      if (!token) return;
      
      console.log('Reopening poll:', pollId);
      console.log('Token:', token);
      
      const response = await fetch(`http://localhost:5000/api/polls/${pollId}/reopen`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Poll reopened:', data);
        fetchPolls();
      } else if (response.status === 401) {
        console.error('Authentication failed - redirecting to login');
        logout();
        navigate('/host/login');
      } else {
        const error = await response.json();
        console.error('Error reopening poll:', error);
      }
    } catch (error) {
      console.error('Error reopening poll:', error);
    }
  };

  const viewResults = async (poll) => {
    try {
      const token = getToken();
      if (!token) return;
      
      const response = await fetch(`http://localhost:5000/api/polls/${poll.id}/results`, {
        headers: { 'x-auth-token': token }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedPoll(data);
        setShowResults(true);
      } else if (response.status === 401) {
        logout();
        navigate('/host/login');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  const getPollTypeIcon = (type) => {
    switch(type) {
      case 'single-choice': return '🔘';
      case 'multiple-choice': return '✅';
      case 'open-ended': return '✏️';
      default: return '📊';
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'draft': return <span className="badge draft">📝 Draft</span>;
      case 'published': return <span className="badge published">✓ Published</span>;
      case 'closed': return <span className="badge closed">🔒 Closed</span>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading session...</p>
      </div>
    );
  }

  return (
    <div className="host-session">
      <header className="session-header">
        <div>
          <h1>{session?.name}</h1>
          <p className="session-code">Session Code: <strong>{sessionCode}</strong></p>
          <p className="participant-count">👥 {participants.length} participants joined</p>
        </div>
        <div className="header-actions">
          <button 
            className="share-btn"
            onClick={() => {
              const link = `${window.location.origin}/join/${sessionCode}`;
              navigator.clipboard.writeText(link);
              alert('✓ Join link copied to clipboard!');
            }}
          >
            📋 Copy Join Link
          </button>
          <button className="back-btn" onClick={() => navigate('/host/dashboard')}>
            ← Dashboard
          </button>
        </div>
      </header>

      <main className="session-main">
        <div className="create-poll-section">
          <PollCreator 
            sessionId={session?.id} 
            onPollCreated={handlePollCreated}
          />
        </div>

        <div className="polls-section">
          <h2>📋 Your Polls ({polls.length})</h2>
          {polls.length === 0 ? (
            <div className="no-polls">
              <div className="no-polls-icon">📊</div>
              <h3>No polls yet</h3>
              <p>Create your first poll using the form above!</p>
            </div>
          ) : (
            <div className="polls-list">
              {polls.map(poll => (
                <div key={poll.id} className="poll-card">
                  <div className="poll-card-header">
                    <div className="poll-title">
                      <span className="poll-icon">{getPollTypeIcon(poll.type)}</span>
                      <h3>{poll.question}</h3>
                    </div>
                    <div className="poll-badges">
                      {getStatusBadge(poll.status)}
                      <span className="poll-type-badge">{poll.type}</span>
                    </div>
                  </div>
                  
                  <div className="poll-stats">
                    <div className="stat">
                      <span className="stat-label">Responses:</span>
                      <span className="stat-value">{poll.response_count || 0}</span>
                    </div>
                  </div>
                  
                  <div className="poll-actions">
                    {poll.status === 'draft' && (
                      <button onClick={() => publishPoll(poll.id)} className="publish-btn">
                        📢 Publish Poll
                      </button>
                    )}
                    {poll.status === 'published' && (
                      <>
                        <button onClick={() => closePoll(poll.id)} className="close-btn">
                          🔒 Close Poll
                        </button>
                        <button onClick={() => viewResults(poll)} className="results-btn">
                          📊 View Results
                        </button>
                      </>
                    )}
                    {poll.status === 'closed' && (
                      <>
                        <button onClick={() => reopenPoll(poll.id)} className="reopen-btn">
                          🔄 Reopen Poll
                        </button>
                        <button onClick={() => viewResults(poll)} className="results-btn">
                          📊 View Results
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Results Modal */}
      {showResults && selectedPoll && (
        <div className="modal-overlay" onClick={() => setShowResults(false)}>
          <div className="results-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Poll Results</h2>
              <button className="close-modal" onClick={() => setShowResults(false)}>✕</button>
            </div>
            <div className="modal-body">
              <h3>{selectedPoll.question}</h3>
              <div className="results-stats">
                <div className="total-responses">
                  Total Responses: <strong>{selectedPoll.total_responses || 0}</strong>
                </div>
              </div>
              
              {selectedPoll.responses && selectedPoll.responses.length > 0 ? (
                <div className="responses-list">
                  <h4>Participant Responses:</h4>
                  {selectedPoll.responses.map((response, idx) => (
                    <div key={idx} className="response-item">
                      <div className="response-answer">📝 {response.answer}</div>
                      <div className="response-meta">
                        from: {response.participant_name} at {new Date(response.submitted_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-responses">No responses yet. Share the poll with participants!</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostSession;
