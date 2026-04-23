import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { Send, LogOut, Check, Wifi, WifiOff, Bell } from 'lucide-react';
import Container from '../../components/layout/Container';
import Header from '../../components/layout/Header';

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
  const [notification, setNotification] = useState(null);
  const { socket, isConnected, joinSessionRoom, emitResponse } = useSocket();

  // Initialize participant data
  useEffect(() => {
    const storedParticipant = localStorage.getItem('participant');
    const storedSessionInfo = localStorage.getItem('sessionInfo');
    
    if (!storedParticipant || !storedSessionInfo) {
      navigate(`/join/${sessionCode}`);
      return;
    }
    
    setParticipantInfo(JSON.parse(storedParticipant));
    setSessionInfo(JSON.parse(storedSessionInfo));
    
    fetchPolls();
  }, [sessionCode, navigate]);

  // Join socket room only when socket is connected
  useEffect(() => {
    if (isConnected && participantInfo && sessionCode) {
      console.log('Socket connected, joining session room');
      joinSessionRoom(sessionCode, participantInfo.id, participantInfo.name);
    }
  }, [isConnected, participantInfo, sessionCode, joinSessionRoom]);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;
    
    console.log('Setting up socket listeners');

    const handleNewPoll = (poll) => {
      console.log('New poll received:', poll);
      
      // Show notification
      setNotification({
        type: 'new-poll',
        title: 'New Poll Available!',
        message: poll.question
      });
      
      // Add poll to state - THIS MAKES IT APPEAR IMMEDIATELY
      setPolls(prev => {
        // Check if poll already exists
        if (prev.some(p => p.id === poll.id)) {
          return prev;
        }
        console.log('Adding new poll to list:', poll.question);
        return [...prev, { 
          ...poll, 
          answered: false,
          status: 'published'
        }];
      });
    };

    const handlePollClosed = ({ pollId }) => {
      console.log('Poll closed:', pollId);
      setNotification({
        type: 'poll-closed',
        title: 'Poll Closed',
        message: 'A poll has been closed'
      });
      setPolls(prev => prev.map(poll => 
        poll.id === pollId ? { ...poll, status: 'closed', active: false } : poll
      ));
    };

    const handlePollReopened = (poll) => {
      console.log('Poll reopened:', poll);
      setNotification({
        type: 'poll-reopened',
        title: 'Poll Reopened',
        message: poll.question
      });
      setPolls(prev => prev.map(p => 
        p.id === poll.id ? { ...poll, status: 'published', answered: false } : p
      ));
    };

    socket.on('new-poll', handleNewPoll);
    socket.on('poll-closed', handlePollClosed);
    socket.on('poll-reopened', handlePollReopened);

    return () => {
      socket.off('new-poll', handleNewPoll);
      socket.off('poll-closed', handlePollClosed);
      socket.off('poll-reopened', handlePollReopened);
    };
  }, [socket]);

  const fetchPolls = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/polls/session/${sessionCode}`);
      const data = await response.json();
      if (response.ok) {
        const publishedPolls = data.filter(poll => poll.status === 'published');
        setPolls(publishedPolls.map(poll => ({ ...poll, answered: false })));
      }
    } catch (err) {
      console.error('Error fetching polls:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (pollId, answer, type) => {
    if (type === 'single-choice') {
      setSelectedAnswers({ ...selectedAnswers, [pollId]: answer });
    } else if (type === 'multiple-choice') {
      const current = selectedAnswers[pollId] || [];
      if (current.includes(answer)) {
        setSelectedAnswers({ ...selectedAnswers, [pollId]: current.filter(a => a !== answer) });
      } else {
        setSelectedAnswers({ ...selectedAnswers, [pollId]: [...current, answer] });
      }
    } else {
      setSelectedAnswers({ ...selectedAnswers, [pollId]: answer });
    }
  };

  const handleSubmit = async (pollId, answer, type) => {
    let finalAnswer = answer;
    if (type === 'multiple-choice' && Array.isArray(answer)) {
      finalAnswer = answer.join(', ');
    }
    
    if (!finalAnswer || (Array.isArray(finalAnswer) && finalAnswer.length === 0)) {
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
          answer: finalAnswer
        })
      });

      if (response.ok) {
        emitResponse(pollId, finalAnswer, participantInfo.name, sessionCode);
        
        // Mark poll as answered - THIS HIDES THE SUBMIT BUTTON
        setPolls(prev => prev.map(poll => 
          poll.id === pollId ? { ...poll, answered: true } : poll
        ));
        
        setNotification({
          type: 'success',
          title: 'Answer Submitted!',
          message: 'Your response has been recorded'
        });
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit');
      }
    } catch (err) {
      setError('Failed to submit answer');
    } finally {
      setSubmitting({ ...submitting, [pollId]: false });
    }
  };

  const leaveSession = () => {
    localStorage.removeItem('participant');
    localStorage.removeItem('sessionInfo');
    localStorage.removeItem('sessionCode');
    navigate('/');
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
        {/* Notification Banner */}
        {notification && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 animate-slide-in ${
            notification.type === 'new-poll' ? 'bg-blue-50 border border-blue-200' :
            notification.type === 'poll-closed' ? 'bg-yellow-50 border border-yellow-200' :
            notification.type === 'poll-reopened' ? 'bg-purple-50 border border-purple-200' :
            'bg-green-50 border border-green-200'
          }`}>
            <Bell className={`w-5 h-5 ${
              notification.type === 'new-poll' ? 'text-blue-600' :
              notification.type === 'poll-closed' ? 'text-yellow-600' :
              notification.type === 'poll-reopened' ? 'text-purple-600' :
              'text-green-600'
            }`} />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{notification.title}</p>
              <p className="text-sm text-gray-600">{notification.message}</p>
            </div>
            <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Connection Status */}
        <div className="mb-4 p-3 bg-gray-100 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Connected - Real-time updates active</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-yellow-600" />
                <span className="text-yellow-600">Connecting to real-time...</span>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{sessionInfo?.name}</h1>
            <p className="text-sm text-gray-500">Code: {sessionCode}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{participantInfo?.name}</span>
            <button onClick={leaveSession} className="btn-secondary text-sm">
              <LogOut className="w-4 h-4" />
              Leave
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Active Polls ({polls.length})</h2>
            {polls.length > 0 && (
              <span className="text-xs text-gray-500">Live updates enabled</span>
            )}
          </div>
          
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
          
          {polls.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-gray-500">No active polls at the moment.</p>
              <p className="text-xs text-gray-400 mt-2">
                When the host publishes a poll, it will appear here instantly.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {polls.map(poll => (
                <div key={poll.id} className="card p-6 transition-all duration-200 hover:shadow-md">
                  <div className="mb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">{poll.question}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {poll.type === 'single-choice' ? 'Single Choice' : 
                             poll.type === 'multiple-choice' ? 'Multiple Choice' : 'Open Ended'}
                          </span>
                        </div>
                      </div>
                      {poll.answered && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                          <Check className="w-3 h-3" />
                          Answered
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {poll.type === 'single-choice' && poll.options?.map((opt, idx) => (
                      <label 
                        key={idx} 
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-150 cursor-pointer
                          ${!poll.answered && 'hover:bg-gray-50'}
                          ${selectedAnswers[poll.id] === opt && !poll.answered ? 'bg-primary-50 border border-primary-200' : 'border border-transparent'}
                        `}
                      >
                        <input
                          type="radio"
                          name={`poll-${poll.id}`}
                          value={opt}
                          checked={selectedAnswers[poll.id] === opt}
                          onChange={() => handleAnswerSelect(poll.id, opt, 'single-choice')}
                          disabled={poll.answered}
                          className="w-4 h-4 text-primary-600"
                        />
                        <span className={`text-gray-700 ${poll.answered ? 'text-gray-400' : ''}`}>{opt}</span>
                      </label>
                    ))}
                    
                    {poll.type === 'multiple-choice' && poll.options?.map((opt, idx) => (
                      <label 
                        key={idx} 
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-150 cursor-pointer
                          ${!poll.answered && 'hover:bg-gray-50'}
                          ${(selectedAnswers[poll.id] || []).includes(opt) && !poll.answered ? 'bg-primary-50 border border-primary-200' : 'border border-transparent'}
                        `}
                      >
                        <input
                          type="checkbox"
                          value={opt}
                          checked={(selectedAnswers[poll.id] || []).includes(opt)}
                          onChange={() => handleAnswerSelect(poll.id, opt, 'multiple-choice')}
                          disabled={poll.answered}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        <span className={`text-gray-700 ${poll.answered ? 'text-gray-400' : ''}`}>{opt}</span>
                      </label>
                    ))}
                    
                    {poll.type === 'open-ended' && (
                      <textarea
                        value={selectedAnswers[poll.id] || ''}
                        onChange={(e) => handleAnswerSelect(poll.id, e.target.value, 'open-ended')}
                        disabled={poll.answered}
                        className="input"
                        rows={3}
                        placeholder="Type your answer here..."
                      />
                    )}
                  </div>
                  
                  {/* Submit button - only shows if poll is NOT answered */}
                  {!poll.answered && (
                    <button
                      onClick={() => handleSubmit(poll.id, selectedAnswers[poll.id], poll.type)}
                      disabled={submitting[poll.id]}
                      className="btn-primary mt-5 w-full py-2.5"
                    >
                      {submitting[poll.id] ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit Answer
                        </>
                      )}
                    </button>
                  )}
                  
                  {/* Show "Already Answered" message when answered */}
                  {poll.answered && (
                    <div className="mt-5 p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-sm text-green-700 flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />
                        You've already answered this poll
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};

export default ParticipantView;
