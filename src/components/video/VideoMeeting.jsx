import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users } from 'lucide-react';

const VideoMeeting = ({ roomId, userName, userId, onLeave }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const { socket, isConnected } = useSocket();
  
  const localVideoRef = useRef(null);
  const peersRef = useRef(new Map());
  const streamRef = useRef(null);

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
      } catch (err) {
        console.error('Error accessing media devices:', err);
      } finally {
        setIsConnecting(false);
      }
    };
    initLocalStream();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!socket || !isConnected || !localStream || !roomId) return;

    socket.emit('join-video-room', { roomId, userId, userName });
    
    const handleParticipants = (participantsList) => {
      setParticipants(participantsList);
      participantsList.forEach(participant => {
        if (participant.socketId !== socket.id) {
          createPeerConnection(participant.socketId, true);
        }
      });
    };

    const handleUserJoined = ({ socketId, userName: joinedName }) => {
      if (socketId !== socket.id) {
        setParticipants(prev => [...prev, { socketId, userName: joinedName, userId }]);
        createPeerConnection(socketId, false);
      }
    };

    const handleSignal = async ({ signal, from }) => {
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
    };

    const handleUserLeft = ({ socketId: leftSocketId }) => {
      if (peersRef.current.has(leftSocketId)) {
        peersRef.current.get(leftSocketId).destroy();
        peersRef.current.delete(leftSocketId);
        setRemoteStreams(prev => {
          const newStreams = new Map(prev);
          newStreams.delete(leftSocketId);
          return newStreams;
        });
        setParticipants(prev => prev.filter(p => p.socketId !== leftSocketId));
      }
    };

    socket.on('video-room-participants', handleParticipants);
    socket.on('user-joined-video', handleUserJoined);
    socket.on('video-signal', handleSignal);
    socket.on('user-left-video', handleUserLeft);

    return () => {
      socket.off('video-room-participants', handleParticipants);
      socket.off('user-joined-video', handleUserJoined);
      socket.off('video-signal', handleSignal);
      socket.off('user-left-video', handleUserLeft);
      peersRef.current.forEach(peer => peer.destroy());
      peersRef.current.clear();
      socket.emit('leave-video-room', { roomId });
    };
  }, [socket, isConnected, localStream, roomId, userId, userName]);

  const createPeerConnection = useCallback(async (socketId, isInitiator) => {
    const SimplePeer = (await import('simple-peer')).default;
    const peer = new SimplePeer({
      initiator: isInitiator,
      stream: localStream,
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
  }, [localStream, socket]);

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

  const leaveMeeting = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    peersRef.current.forEach(peer => peer.destroy());
    peersRef.current.clear();
    socket.emit('leave-video-room', { roomId });
    onLeave();
  };

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
      <div className="fixed bottom-6 left-0 right-0 flex justify-center gap-4 z-10">
        <button onClick={toggleVideo} className={`p-4 rounded-full transition-all ${isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'} text-white`}>
          {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </button>
        <button onClick={toggleAudio} className={`p-4 rounded-full transition-all ${isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'} text-white`}>
          {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>
        <button onClick={leaveMeeting} className="p-4 bg-red-600 hover:bg-red-700 rounded-full text-white transition-all">
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>

      <div className="h-screen p-4 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-3 left-3 bg-black/50 px-2 py-1 rounded text-xs text-white">You ({userName})</div>
            {!isVideoEnabled && <div className="absolute inset-0 flex items-center justify-center bg-gray-800"><VideoOff className="w-12 h-12 text-gray-500" /></div>}
          </div>

          {Array.from(remoteStreams.entries()).map(([socketId, stream]) => {
            const participant = participants.find(p => p.socketId === socketId);
            return (
              <div key={socketId} className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                <video autoPlay playsInline ref={el => { if (el && el.srcObject !== stream) el.srcObject = stream; }} className="w-full h-full object-cover" />
                <div className="absolute bottom-3 left-3 bg-black/50 px-2 py-1 rounded text-xs text-white">{participant?.userName || 'Participant'}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed top-4 right-4 bg-black/50 px-3 py-1.5 rounded-full text-white text-sm flex items-center gap-2">
        <Users className="w-4 h-4" /> {participants.length + 1} participants
      </div>
    </div>
  );
};

export default VideoMeeting;
