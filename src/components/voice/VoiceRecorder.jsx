import React, { useState, useRef } from 'react';
import './VoiceRecorder.css';

const VoiceRecorder = ({ sessionId, participantId, onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState(null);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        if (onRecordingComplete) {
          onRecordingComplete(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds++;
        setRecordingTime(seconds);
      }, 1000);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecordingTime(0);
      setAudioURL(null);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="voice-recorder">
      <div className="recorder-header">
        <h4>🎙️ Voice Message</h4>
        <p>Record a voice message for the host (optional)</p>
      </div>
      
      {error && <div className="recorder-error">{error}</div>}
      
      {!isRecording && !audioURL && (
        <button onClick={startRecording} className="record-btn">
          🎤 Start Recording
        </button>
      )}
      
      {isRecording && (
        <div className="recording-active">
          <div className="recording-wave">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
          <div className="recording-timer">
            Recording: {formatTime(recordingTime)}
          </div>
          <div className="recording-actions">
            <button onClick={stopRecording} className="stop-btn">
              ⏹️ Stop
            </button>
            <button onClick={cancelRecording} className="cancel-btn">
              ❌ Cancel
            </button>
          </div>
        </div>
      )}
      
      {audioURL && !isRecording && (
        <div className="recording-complete">
          <audio controls src={audioURL} className="audio-player" />
          <div className="audio-actions">
            <button onClick={() => {
              setAudioURL(null);
              setRecordingTime(0);
            }} className="record-again-btn">
              🔄 Record Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
