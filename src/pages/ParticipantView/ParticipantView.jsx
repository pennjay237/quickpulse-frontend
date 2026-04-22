import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './ParticipantView.css';

const ParticipantView = () => {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const [sessionInfo, setSessionInfo] = useState(null);
  const [participantInfo, setParticipantInfo] = useState(null);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [error, setError] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Get stored participant and session info
    const storedParticipant = localStorage.getItem('participant');
    const storedSessionInfo = localStorage.getItem('sessionInfo');
    
    if (!storedParticipant || !storedSessionInfo) {
      navigate(`/join/${sessionCode}`);
      return;
    }
    
    setParticipantInfo(JSON.parse(storedParticipant));
    const session = JSON.parse(storedSessionInfo);
    setSessionInfo(session);
    setShowVoice(session.voice_enabled || false);
    
    fetchPolls();
  }, [sessionCode, navigate]);

  const fetchPolls = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/polls/session/${sessionCode}`);
      const data = await response.json();
      if (response.ok) {
        // Filter only published polls
        const publishedPolls = data.filter(poll => poll.status === 'published');
        setPolls(publishedPolls);
      }
    } catch (err) {
      console.error('Error fetching polls:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (pollId, answer) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [pollId]: answer
    });
  };

  const handleSubmitAnswer = async (pollId) => {
    const answer = selectedAnswers[pollId];
    if (!answer && answer !== 0) {
      setError('Please select an answer');
      return;
    }

    setSubmitting({ ...submitting, [pollId]: true });
    setError('');

    try {
      const response = await fetch(`http://localhost:5000/api/polls/${pollId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participantInfo.id,
          answer: answer.toString()
        })
      });

      if (response.ok) {
        // Mark poll as answered
        setPolls(polls.map(poll => 
          poll.id === pollId ? { ...poll, answered: true } : poll
        ));
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit answer');
      }
    } catch (err) {
      setError('Failed to submit answer');
    } finally {
      setSubmitting({ ...submitting, [pollId]: false });
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Here you would implement actual audio muting
  };

  const leaveSession = () => {
    localStorage.removeItem('participant');
    localStorage.removeItem('sessionInfo');
    localStorage.removeItem('sessionCode');
    navigate('/');
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
    <div className="participant-view">
      {/* Header */}
      <header className="participant-header">
        <div className="header-content">
          <div>
            <h1>{sessionInfo?.name}</h1>
            <p className="session-code">Code: {sessionCode}</p>
          </div>
          <div className="header-actions">
            {showVoice && (
              <button 
                onClick={toggleMute} 
                className={`voice-btn ${isMuted ? 'muted' : ''}`}
              >
                {isMuted ? '🔇 Unmute' : '🎤 Mute'}
              </button>
            )}
            <button onClick={leaveSession} className="leave-btn">
              Leave Session
            </button>
          </div>
        </div>
      </header>

      {/* Participant Info */}
      <div className="participant-info">
        <div className="info-card">
          <span className="info-label">You are participating as:</span>
          <span className="info-value">{participantInfo?.name}</span>
          <span className="info-email">{participantInfo?.email}</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="participant-main">
        <div className="polls-container">
          <h2>Active Polls</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          {polls.length === 0 ? (
            <div className="no-polls">
              <div className="no-polls-icon">📊</div>
              <h3>No Active Polls</h3>
              <p>When the host publishes a poll, it will appear here.</p>
            </div>
          ) : (
            <AnimatePresence>
              {polls.map((poll, index) => (
                <motion.div
                  key={poll.id}
                  className="poll-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="poll-header">
                    <h3>{poll.question}</h3>
                    {poll.answered && (
                      <span className="answered-badge">✓ Answered</span>
                    )}
                  </div>
                  
                  <div className="poll-options">
                    {poll.type === 'multiple-choice' && poll.options && (
                      <div className="options-grid">
                        {poll.options.map((option, idx) => (
                          <label 
                            key={idx} 
                            className={`option-label ${selectedAnswers[poll.id] === option ? 'selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              value={option}
                              checked={selectedAnswers[poll.id] === option}
                              onChange={() => handleAnswerSelect(poll.id, option)}
                              disabled={poll.answered || submitting[poll.id]}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {poll.type === 'single-choice' && poll.options && (
                      <div className="options-grid">
                        {poll.options.map((option, idx) => (
                          <label 
                            key={idx} 
                            className={`option-label radio ${selectedAnswers[poll.id] === option ? 'selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name={`poll-${poll.id}`}
                              value={option}
                              checked={selectedAnswers[poll.id] === option}
                              onChange={() => handleAnswerSelect(poll.id, option)}
                              disabled={poll.answered || submitting[poll.id]}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {poll.type === 'open-ended' && (
                      <textarea
                        className="open-ended-input"
                        placeholder="Type your answer here..."
                        value={selectedAnswers[poll.id] || ''}
                        onChange={(e) => handleAnswerSelect(poll.id, e.target.value)}
                        disabled={poll.answered || submitting[poll.id]}
                        rows={3}
                      />
                    )}
                  </div>
                  
                  {!poll.answered && (
                    <button
                      onClick={() => handleSubmitAnswer(poll.id)}
                      disabled={submitting[poll.id]}
                      className="submit-btn"
                    >
                      {submitting[poll.id] ? 'Submitting...' : 'Submit Answer'}
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
};

export default ParticipantView;
