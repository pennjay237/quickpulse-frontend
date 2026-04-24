import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Plus, X, Send, BarChart3, Eye, EyeOff, RotateCcw, Copy, Download, Video, VideoOff } from 'lucide-react';
import Container from '../../components/layout/Container';
import Header from '../../components/layout/Header';
import QRCode from 'qrcode';
import VideoMeeting from '../../components/video/VideoMeeting';

const HostSession = () => {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, isConnected, joinHostRoom, emitPollPublished, emitPollClosed, emitPollReopened } = useSocket();
  
  const [session, setSession] = useState(null);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPoll, setNewPoll] = useState({ question: '', type: 'single', options: ['', ''] });
  const [showResults, setShowResults] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [showVideoMeeting, setShowVideoMeeting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      joinHostRoom(user.id);
    }
  }, [user, joinHostRoom]);

  useEffect(() => {
    fetchSession();
    fetchPolls();
    fetchParticipants();
    generateQRCode();
  }, [sessionCode]);

  useEffect(() => {
    if (socket) {
      socket.on('response-received', () => {
        fetchPolls();
      });
      return () => {
        socket.off('response-received');
      };
    }
  }, [socket]);

  const generateQRCode = async () => {
    try {
      const url = `${window.location.origin}/join/${sessionCode}`;
      const qr = await QRCode.toDataURL(url, { width: 200, margin: 2 });
      setQrCodeUrl(qr);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  const fetchSession = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/sessions/code/${sessionCode}`);
      const data = await response.json();
      if (response.ok) {
        setSession(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchPolls = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/polls/session/${sessionCode}`, {
        headers: { 'x-auth-token': token }
      });
      const data = await response.json();
      if (response.ok) {
        setPolls(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    if (!session?.id) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/sessions/${session.id}/participants`, {
        headers: { 'x-auth-token': token }
      });
      const data = await response.json();
      if (response.ok) {
        setParticipants(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const createPoll = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          sessionId: session?.id,
          question: newPoll.question,
          type: newPoll.type === 'single' ? 'single-choice' : 
                newPoll.type === 'multiple' ? 'multiple-choice' : 'open-ended',
          options: newPoll.type !== 'open' ? newPoll.options.filter(o => o.trim()) : []
        })
      });
      if (response.ok) {
        fetchPolls();
        setShowCreateModal(false);
        setNewPoll({ question: '', type: 'single', options: ['', ''] });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const publishPoll = async (pollId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/polls/${pollId}/publish`, {
        method: 'PATCH',
        headers: { 'x-auth-token': token }
      });
      const publishedPoll = await response.json();
      if (response.ok) {
        emitPollPublished(publishedPoll, sessionCode);
        fetchPolls();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const closePoll = async (pollId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/polls/${pollId}/close`, {
        method: 'PATCH',
        headers: { 'x-auth-token': token }
      });
      if (response.ok) {
        emitPollClosed(pollId, sessionCode);
        fetchPolls();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const reopenPoll = async (pollId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/polls/${pollId}/reopen`, {
        method: 'PATCH',
        headers: { 'x-auth-token': token }
      });
      const reopenedPoll = await response.json();
      if (response.ok) {
        emitPollReopened(reopenedPoll, sessionCode);
        fetchPolls();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const copyJoinLink = () => {
    const link = `${window.location.origin}/join/${sessionCode}`;
    navigator.clipboard.writeText(link);
    alert('Join link copied to clipboard');
  };

  const getStatusConfig = (status) => {
    switch(status) {
      case 'draft': return { label: 'Draft', className: 'badge-draft', icon: EyeOff };
      case 'published': return { label: 'Published', className: 'badge-published', icon: Eye };
      case 'closed': return { label: 'Closed', className: 'badge-closed', icon: EyeOff };
      default: return { label: status, className: 'badge-inactive', icon: EyeOff };
    }
  };

  const addOption = () => {
    setNewPoll({ ...newPoll, options: [...newPoll.options, ''] });
  };

  const updateOption = (index, value) => {
    const updated = [...newPoll.options];
    updated[index] = value;
    setNewPoll({ ...newPoll, options: updated });
  };

  const removeOption = (index) => {
    const updated = newPoll.options.filter((_, i) => i !== index);
    setNewPoll({ ...newPoll, options: updated });
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
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{session?.name}</h1>
            <p className="text-gray-600 mt-1">Session Code: <span className="font-mono font-semibold">{sessionCode}</span></p>
            <p className="text-sm text-gray-500 mt-1">{participants.length} participant(s) joined</p>
            {!isConnected && (
              <p className="text-xs text-red-500 mt-1">Reconnecting to real-time server...</p>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowVideoMeeting(true)} className="btn-primary">
              <Video className="w-4 h-4" />
              Start Video Meeting
            </button>
            <button onClick={copyJoinLink} className="btn-secondary">
              <Copy className="w-4 h-4" />
              Copy Link
            </button>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Create Poll
            </button>
          </div>
        </div>

        {qrCodeUrl && (
          <div className="card p-6 mb-8 flex items-center gap-6 flex-wrap">
            <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24" />
            <div>
              <h3 className="font-semibold text-gray-900">Quick Join</h3>
              <p className="text-sm text-gray-600">Scan this QR code with your phone camera to join</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Polls</h2>
          {polls.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-gray-500">No polls created yet. Click Create Poll to get started.</p>
            </div>
          ) : (
            polls.map(poll => {
              const status = getStatusConfig(poll.status);
              const StatusIcon = status.icon;
              return (
                <div key={poll.id} className="card p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{poll.question}</h3>
                      <div className="flex gap-2 mt-2">
                        <span className={`badge ${status.className}`}>
                          <StatusIcon className="w-3 h-3 inline mr-1" />
                          {status.label}
                        </span>
                        <span className="text-xs text-gray-500">{poll.type}</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {poll.response_count || 0} response(s)
                    </div>
                  </div>
                  
                  {poll.options && poll.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {poll.options.slice(0, 4).map((opt, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                          {opt}
                        </span>
                      ))}
                      {poll.options.length > 4 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-md">
                          +{poll.options.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {poll.status === 'draft' && (
                      <button onClick={() => publishPoll(poll.id)} className="btn-primary text-sm">
                        Publish
                      </button>
                    )}
                    {poll.status === 'published' && (
                      <>
                        <button onClick={() => closePoll(poll.id)} className="btn-secondary text-sm">
                          Close
                        </button>
                        <button onClick={() => setShowResults(poll)} className="btn-outline text-sm">
                          <BarChart3 className="w-4 h-4" />
                          Results
                        </button>
                      </>
                    )}
                    {poll.status === 'closed' && (
                      <>
                        <button onClick={() => reopenPoll(poll.id)} className="btn-outline text-sm">
                          <RotateCcw className="w-4 h-4" />
                          Reopen
                        </button>
                        <button onClick={() => setShowResults(poll)} className="btn-outline text-sm">
                          <BarChart3 className="w-4 h-4" />
                          Results
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Container>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Create Poll</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="label">Question</label>
                <input
                  type="text"
                  value={newPoll.question}
                  onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
                  className="input"
                  placeholder="What would you like to ask?"
                />
              </div>
              
              <div>
                <label className="label">Poll Type</label>
                <select
                  value={newPoll.type}
                  onChange={(e) => setNewPoll({ ...newPoll, type: e.target.value, options: ['', ''] })}
                  className="input"
                >
                  <option value="single">Single Choice</option>
                  <option value="multiple">Multiple Choice</option>
                  <option value="open">Open Ended</option>
                </select>
              </div>
              
              {newPoll.type !== 'open' && (
                <div>
                  <label className="label">Options</label>
                  {newPoll.options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        className="input flex-1"
                        placeholder={`Option ${idx + 1}`}
                      />
                      {newPoll.options.length > 2 && (
                        <button onClick={() => removeOption(idx)} className="text-gray-400 hover:text-red-600">
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addOption} className="btn-ghost text-sm mt-1">
                    <Plus className="w-4 h-4" />
                    Add Option
                  </button>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button onClick={createPoll} className="btn-primary flex-1">
                  <Send className="w-4 h-4" />
                  Create Poll
                </button>
                <button onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResults && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Poll Results</h2>
              <button onClick={() => setShowResults(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <h3 className="font-medium text-gray-900 mb-4">{showResults.question}</h3>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Total responses: {showResults.response_count || 0}</p>
              
              {showResults.options && showResults.options.map((opt, idx) => {
                const count = showResults.responses?.filter(r => r.answer === opt).length || 0;
                const percentage = showResults.response_count ? (count / showResults.response_count) * 100 : 0;
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{opt}</span>
                      <span className="text-gray-500">{count} ({Math.round(percentage)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Video Meeting Modal */}
      {showVideoMeeting && (
        <VideoMeeting
          roomId={sessionCode}
          userName={user?.email?.split('@')[0] || 'Host'}
          userId={user?.id}
          onLeave={() => setShowVideoMeeting(false)}
        />
      )}
    </div>
  );
};

export default HostSession;
