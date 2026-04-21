import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import LandingPage from './pages/LandingPage/LandingPage';
import HostLogin from './pages/HostLogin/HostLogin';
import HostDashboard from './pages/HostDashboard/HostDashboard';
import HostSession from './pages/HostSession/HostSession';
import ParticipantJoin from './pages/ParticipantJoin/ParticipantJoin';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/host/login" element={<HostLogin />} />
            <Route path="/host/dashboard" element={<HostDashboard />} />
            <Route path="/host/session/:sessionCode" element={<HostSession />} />
            <Route path="/join" element={<ParticipantJoin />} />
            <Route path="/join/:sessionCode" element={<ParticipantJoin />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
