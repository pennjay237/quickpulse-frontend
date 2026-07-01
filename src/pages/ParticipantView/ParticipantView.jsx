import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { Send, LogOut, Check, Wifi, WifiOff, Bell, Lock, ArrowUp, Video } from 'lucide-react';
import Container from '../../components/layout/Container';
import Header from '../../components/layout/Header';
import VideoMeeting from '../../components/video/VideoMeeting';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ParticipantView = () => {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const { socket, isConnected, joinSessionRoom, emitResponse } = useSocket();
  
  const [sessionInfo, setSessionInfo] = useState(null);
  const [participantInfo, setParticipantInfo] = useState(null);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);
  const [showVideoMeeting, setShowVideoMeeting] = useState(false);

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

  useEffect(() => {
    if (isConnected && participantInfo && sessionCode) {
      joinSessionRoom(sessionCode, participantInfo.id, participantInfo.name);
    }
  }, [isConnected, participantInfo, sessionCode, joinSessionRoom]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (!socket) return;

    const handleNewPoll = (poll) => {
      setNotification({
        type: 'new-poll',
        title: 'New Poll Available!',
        message: poll.question
      });
      
      setPolls(prev => {
        if (prev.some(p => p.id === poll.id)) return prev;
        const newPoll = { ...poll, answered: false, status: 'published' };
        const unanswered = prev.filter(p => !p.answered && p.status !== 'closed');
        const answered = prev.filter(p => p.answered || p.status === 'closed');
        return [newPoll, ...unanswered, ...answered];
      });
    };

    const handlePollClosed = ({ pollId }) => {
      setNotification({
        type: 'poll-closed',
        title: 'Poll Closed',
        message: 'This poll is no longer accepting answers'
      });
      
      setPolls(prev => {
        const updated = prev.map(poll => 
          poll.id === pollId ? { ...poll, status: 'closed', active: false } : poll
        );
        const unanswered = updated.filter(p => !p.answered && p.status !== 'closed');
        const closedOrAnswered = updated.filter(p => p.answered || p.status === 'closed');
        return [...unanswered, ...closedOrAnswered];
      });
    };

    const handlePollReopened = (poll) => {
      setNotification({
        type: 'poll-reopened',
        title: 'Poll Reopened',
        message: poll.question
      });
      
      setPolls(prev => {
        const updated = prev.map(p => 
          p.id === poll.id ? { ...poll, status: 'published', answered: false } : p
        );
        const unanswered = updated.filter(p => !p.answered && p.status === 'published');
        const answered = updated.filter(p => p.answered || p.status === 'closed');
        return [...unanswered, ...answered];
      });
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
      const response = await fetch(`${API_URL}/api/polls/session/${sessionCode}`);
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
      const response = await fetch(`${API_URL}/api/polls/${pollId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participantInfo.id,
          answer: finalAnswer
        })
      });

      if (response.ok) {
        emitResponse(pollId, finalAnswer, participantInfo.name, sessionCode);
        
        setPolls(prev => {
          const updated = prev.map(poll => 
            poll.id === pollId ? { ...poll, answered: true, status: 'answered' } : poll
          );
          const unanswered = updated.filter(p => !p.answered && p.status !== 'closed');
          const answered = updated.filter(p => p.answered || p.status === 'closed');
          return [...unanswered, ...answered];
        });
        
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

  const activePolls = polls.filter(p => !p.answered && p.status !== 'closed');
  const answeredPolls = polls.filter(p => p.answered || p.status === 'closed');

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
        {notification && (
          <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md animate-slide-in ${
            notification.type === 'new-poll' ? 'bg-blue-500' :
            notification.type === 'poll-closed' ? 'bg-yellow-500' :
            notification.type === 'poll-reopened' ? 'bg-purple-500' :
            'bg-green-500'
          } text-white rounded-lg shadow-lg`}>
            <div className="p-4 flex items-center gap-3">
              <Bell className="w-5 h-5" />
              <div className="flex-1">
                <p className="font-semibold">{notification.title}</p>
                <p className="text-sm opacity-90">{notification.message}</p>
              </div>
              <button onClick={() => setNotification(null)} className="text-white/70 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

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
            <button onClick={() => setShowVideoMeeting(true)} className="btn-primary text-sm">
              <Video className="w-4 h-4" />
              Join Video
            </button>
            <button onClick={leaveSession} className="btn-secondary text-sm">
              <LogOut className="w-4 h-4" />
              Leave
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {activePolls.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Active Polls</h2>
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{activePolls.length}</span>
              </div>
              
              <div className="grid gap-4">
                {activePolls.map(poll => (
                  <div key={poll.id} className="card p-6 transition-all duration-200 hover:shadow-md border-l-4 border-l-primary-500">
                    <div className="mb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">{poll.question}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {poll.type === 'single-choice' ? 'Single Choice' : 
                               poll.type === 'multiple-choice' ? 'Multiple Choice' : 'Open Ended'}
                            </span>
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              Accepting answers
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {poll.type === 'single-choice' && poll.options?.map((opt, idx) => (
                        <label key={idx} className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-150 cursor-pointer
                          ${!poll.answered && selectedAnswers[poll.id] === opt ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                          <input
                            type="radio"
                            name={`poll-${poll.id}`}
                            value={opt}
                            checked={selectedAnswers[poll.id] === opt}
                            onChange={() => handleAnswerSelect(poll.id, opt, 'single-choice')}
                            disabled={poll.answered}
                            className="w-4 h-4 text-primary-600"
                          />
                          <span className="text-gray-700">{opt}</span>
                        </label>
                      ))}
                      
                      {poll.type === 'multiple-choice' && poll.options?.map((opt, idx) => (
                        <label key={idx} className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-150 cursor-pointer
                          ${!poll.answered && (selectedAnswers[poll.id] || []).includes(opt) ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                          <input
                            type="checkbox"
                            value={opt}
                            checked={(selectedAnswers[poll.id] || []).includes(opt)}
                            onChange={() => handleAnswerSelect(poll.id, opt, 'multiple-choice')}
                            disabled={poll.answered}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                          <span className="text-gray-700">{opt}</span>
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {answeredPolls.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pt-4 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Past Polls</h2>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{answeredPolls.length}</span>
              </div>
              
              <div className="grid gap-3 opacity-75">
                {answeredPolls.map(poll => (
                  <div key={poll.id} className="card p-5 bg-gray-50 border-l-4 border-l-gray-300">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-700">{poll.question}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          {poll.answered ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" />
                              Answered
                            </span>
                          ) : poll.status === 'closed' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
                              <Lock className="w-3 h-3" />
                              Closed
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {polls.length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-gray-500">No active polls at the moment.</p>
              <p className="text-xs text-gray-400 mt-2">
                When the host publishes a poll, it will appear here instantly at the top.
              </p>
            </div>
          )}
        </div>
      </Container>

      {showVideoMeeting && (
        <VideoMeeting
          roomId={sessionCode}
          userName={participantInfo?.name || 'Participant'}
          userId={participantInfo?.id}
          onLeave={() => setShowVideoMeeting(false)}
        />
      )}
    </div>
  );
};

export default ParticipantView;