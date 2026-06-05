import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, Users, 
  Monitor, MessageSquare, X, Send, Clock, UserPlus,
  Check, XCircle, UserCheck
} from 'lucide-react';

const VideoMeeting = ({ roomId, userName, userId, onLeave, isHost = false }) => {
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [waitingParticipants, setWaitingParticipants] = useState([]);
  const [participantLimit, setParticipantLimit] = useState(10);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [newLimit, setNewLimit] = useState(10);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false);
  const [waitingPosition, setWaitingPosition] = useState(0);
  const [joinStatus, setJoinStatus] = useState('connecting');
  
  const { socket, isConnected } = useSocket();
  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const peersRef = useRef(new Map());
  const streamRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize local media
  useEffect(() => {
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setJoinStatus('requesting');
        requestJoin();
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setIsConnecting(false);
        setJoinStatus('error');
      }
    };
    initLocalStream();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const requestJoin = () => {
    if (socket && isConnected) {
      socket.emit('request-join-video', { roomId, userId, userName });
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket || !localStream) return;

    // Join approved
    socket.on('join-approved', () => {
      console.log('Join approved!');
      setJoinStatus('connected');
      setIsConnecting(false);
      setIsWaitingForApproval(false);
      
      socket.emit('join-video-room', { roomId, userId, userName });
    });

    // Waiting for approval
    socket.on('waiting-for-approval', ({ position }) => {
      setJoinStatus('waiting');
      setIsWaitingForApproval(true);
      setWaitingPosition(position);
      setIsConnecting(false);
    });

    // Join rejected
    socket.on('join-rejected', () => {
      setJoinStatus('rejected');
      setIsConnecting(false);
    });

    // Waiting approved
    socket.on('waiting-approved', () => {
      setIsWaitingForApproval(false);
      setJoinStatus('connected');
    });

    // Participant joined
    socket.on('participant-joined', ({ userId: newUserId, userName: newUserName }) => {
      setParticipants(prev => [...prev, { userId: newUserId, userName: newUserName }]);
    });

    // Waiting participant (for host)
    socket.on('waiting-participant', ({ userId: waitingId, userName: waitingName }) => {
      setWaitingParticipants(prev => [...prev, { userId: waitingId, userName: waitingName, socketId: waitingId }]);
    });

    // Video room participants
    socket.on('video-room-participants', (participantsList) => {
      setParticipants(participantsList.filter(p => p.socketId !== socket.id));
    });

    // User joined
    socket.on('user-joined-video', ({ socketId: joinedId, userName: joinedName }) => {
      if (joinedId !== socket.id) {
        createPeerConnection(joinedId, false);
      }
    });

    // WebRTC signal
    socket.on('video-signal', async ({ signal, from }) => {
      try {
        if (peersRef.current.has(from)) {
          await peersRef.current.get(from).signal(signal);
        } else {
          await createPeerConnection(from, false);
          const peer = peersRef.current.get(from);
          if (peer && signal) {
            await peer.signal(signal);
          }
        }
      } catch (err) {
        console.error('Signal error:', err);
      }
    });

    // User left
    socket.on('user-left-video', ({ socketId: leftId }) => {
      if (peersRef.current.has(leftId)) {
        peersRef.current.get(leftId).destroy();
        peersRef.current.delete(leftId);
        setRemoteStreams(prev => {
          const newStreams = new Map(prev);
          newStreams.delete(leftId);
          return newStreams;
        });
        setParticipants(prev => prev.filter(p => p.socketId !== leftId));
      }
    });

    // Chat message
    socket.on('new-chat-message', ({ message, userName: senderName, timestamp }) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        message,
        userName: senderName,
        timestamp: new Date(timestamp),
        isOwn: false
      }]);
    });

    // Screen share started
    socket.on('screen-share-started', ({ userId: sharerId, streamId }) => {
      // Handle screen share stream
      console.log('Screen share started by user:', sharerId);
    });

    // Screen share stopped
    socket.on('screen-share-stopped', ({ userId: sharerId }) => {
      console.log('Screen share stopped by user:', sharerId);
    });

    // Participant limit updated
    socket.on('participant-limit-updated', ({ limit }) => {
      setParticipantLimit(limit);
    });

    return () => {
      socket.off('join-approved');
      socket.off('waiting-for-approval');
      socket.off('join-rejected');
      socket.off('waiting-approved');
      socket.off('participant-joined');
      socket.off('waiting-participant');
      socket.off('video-room-participants');
      socket.off('user-joined-video');
      socket.off('video-signal');
      socket.off('user-left-video');
      socket.off('new-chat-message');
      socket.off('screen-share-started');
      socket.off('screen-share-stopped');
      socket.off('participant-limit-updated');
      
      peersRef.current.forEach(peer => peer.destroy());
      peersRef.current.clear();
      socket.emit('leave-video-room', { roomId });
    };
  }, [socket, isConnected, localStream, roomId, userId, userName]);

  const createPeerConnection = useCallback(async (socketId, isInitiator) => {
    const SimplePeer = (await import('simple-peer')).default;
    const streamToSend = isScreenSharing && screenStream ? screenStream : localStream;
    
    const peer = new SimplePeer({
      initiator: isInitiator,
      stream: streamToSend,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      }
    });
    
    peer.on('signal', (signal) => {
      socket.emit('video-signal', { to: socketId, signal, from: socket.id });
    });
    
    peer.on('stream', (remoteStream) => {
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.set(socketId, remoteStream);
        return newStreams;
      });
    });
    
    peer.on('error', (err) => console.error('Peer error:', err));
    peersRef.current.set(socketId, peer);
    return peer;
  }, [localStream, screenStream, isScreenSharing, socket]);

  // Update peer streams when screen sharing toggles
  useEffect(() => {
    const streamToSend = isScreenSharing && screenStream ? screenStream : localStream;
    peersRef.current.forEach(peer => {
      if (peer.destroyed) return;
      try {
        peer.removeStream(peer.stream);
        peer.addStream(streamToSend);
      } catch (err) {
        console.error('Error updating stream:', err);
      }
    });
  }, [isScreenSharing, screenStream, localStream]);

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(stream);
      setIsScreenSharing(true);
      socket.emit('start-screen-share', { roomId, streamId: socket.id });
      
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error('Error sharing screen:', err);
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      socket.emit('stop-screen-share', { roomId });
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      socket.emit('chat-message', {
        roomId,
        message: newMessage,
        userName,
        userId
      });
      setMessages(prev => [...prev, {
        id: Date.now(),
        message: newMessage,
        userName,
        timestamp: new Date(),
        isOwn: true
      }]);
      setNewMessage('');
    }
  };

  const setLimit = () => {
    if (newLimit >= 1 && newLimit <= 50) {
      setParticipantLimit(newLimit);
      socket.emit('set-participant-limit', { roomId, limit: newLimit });
      setShowLimitModal(false);
    }
  };

  const approveParticipant = (waitingUser) => {
    socket.emit('approve-participant', { 
      roomId, 
      userId: waitingUser.userId, 
      userName: waitingUser.userName 
    });
    setWaitingParticipants(prev => prev.filter(p => p.userId !== waitingUser.userId));
  };

  const rejectParticipant = (waitingUser) => {
    socket.emit('reject-participant', { roomId });
    setWaitingParticipants(prev => prev.filter(p => p.userId !== waitingUser.userId));
  };

  const leaveMeeting = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    peersRef.current.forEach(peer => peer.destroy());
    peersRef.current.clear();
    socket.emit('leave-video-room', { roomId });
    onLeave();
  };

  // Waiting for approval screen
  if (joinStatus === 'waiting') {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center max-w-md mx-4">
          <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-yellow-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Waiting for Host</h2>
          <p className="text-gray-400 mb-4">The host will let you in shortly</p>
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-400">Your position in line:</p>
            <p className="text-3xl font-bold text-yellow-500">{waitingPosition}</p>
          </div>
          <button onClick={leaveMeeting} className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Join rejected screen
  if (joinStatus === 'rejected') {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center max-w-md mx-4">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Join Request Declined</h2>
          <p className="text-gray-400 mb-6">The host has declined your request to join</p>
          <button onClick={leaveMeeting} className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition">
            Close
          </button>
        </div>
      </div>
    );
  }

  // Connecting screen
  if (isConnecting) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Connecting to video meeting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-50">
      {/* Controls */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3 z-10 bg-gray-800/90 backdrop-blur px-4 py-2 rounded-full">
        <button onClick={toggleVideo} className={`p-3 rounded-full transition-all ${isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'} text-white`}>
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        <button onClick={toggleAudio} className={`p-3 rounded-full transition-all ${isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'} text-white`}>
          {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        <button onClick={startScreenShare} disabled={isScreenSharing} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white transition-all">
          <Monitor className="w-5 h-5" />
        </button>
        {isScreenSharing && (
          <button onClick={stopScreenShare} className="p-3 bg-red-600 hover:bg-red-700 rounded-full text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        )}
        <button onClick={() => setShowChat(!showChat)} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white transition-all">
          <MessageSquare className="w-5 h-5" />
        </button>
        <button onClick={leaveMeeting} className="p-3 bg-red-600 hover:bg-red-700 rounded-full text-white transition-all">
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {/* Host Controls */}
      {isHost && (
        <div className="fixed top-4 right-4 flex gap-2 z-10">
          <button onClick={() => setShowLimitModal(true)} className="bg-gray-800/90 backdrop-blur px-3 py-1.5 rounded-lg text-white text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            Limit: {participantLimit}
          </button>
          {waitingParticipants.length > 0 && (
            <div className="relative">
              <button className="bg-yellow-500/90 backdrop-blur px-3 py-1.5 rounded-lg text-white text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Waiting: {waitingParticipants.length}
              </button>
              <div className="absolute top-full right-0 mt-2 bg-gray-800 rounded-lg shadow-lg w-64 z-20">
                {waitingParticipants.map(waiting => (
                  <div key={waiting.userId} className="p-3 border-b border-gray-700 flex justify-between items-center">
                    <span className="text-sm text-white">{waiting.userName}</span>
                    <div className="flex gap-2">
                      <button onClick={() => approveParticipant(waiting)} className="text-green-500 hover:text-green-400">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => rejectParticipant(waiting)} className="text-red-500 hover:text-red-400">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video Grid */}
      <div className="h-screen p-4 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-3 left-3 bg-black/50 px-2 py-1 rounded text-xs text-white">
              {userName} {isHost && '(Host)'}
              {!isVideoEnabled && ' (Video off)'}
            </div>
            {isScreenSharing && (
              <div className="absolute top-3 right-3 bg-green-500/80 px-2 py-1 rounded text-xs text-white">
                Sharing Screen
              </div>
            )}
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <VideoOff className="w-12 h-12 text-gray-500" />
              </div>
            )}
          </div>

          {/* Remote Videos */}
          {Array.from(remoteStreams.entries()).map(([socketId, stream]) => {
            const participant = participants.find(p => p.socketId === socketId);
            return (
              <div key={socketId} className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                <video autoPlay playsInline ref={el => { if (el && el.srcObject !== stream) el.srcObject = stream; }} className="w-full h-full object-cover" />
                <div className="absolute bottom-3 left-3 bg-black/50 px-2 py-1 rounded text-xs text-white">
                  {participant?.userName || 'Participant'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Participant Count */}
      <div className="fixed top-4 left-4 bg-black/50 px-3 py-1.5 rounded-full text-white text-sm flex items-center gap-2">
        <Users className="w-4 h-4" /> {participants.length + 1} / {participantLimit} participants
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="fixed right-4 top-20 bottom-24 w-80 bg-gray-800 rounded-lg shadow-xl flex flex-col z-10">
          <div className="p-3 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-white font-semibold">Chat</h3>
            <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-2 ${msg.isOwn ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                  <p className="text-xs mb-1 font-semibold">{msg.userName}</p>
                  <p className="text-sm">{msg.message}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className="p-3 border-t border-gray-700 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button type="submit" className="px-3 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white transition">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Participant Limit Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-white text-lg font-semibold mb-4">Set Participant Limit</h3>
            <input
              type="number"
              min="1"
              max="50"
              value={newLimit}
              onChange={(e) => setNewLimit(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg mb-4"
            />
            <div className="flex gap-3">
              <button onClick={setLimit} className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white">
                Apply
              </button>
              <button onClick={() => setShowLimitModal(false)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoMeeting;
