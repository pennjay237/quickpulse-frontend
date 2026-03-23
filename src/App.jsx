import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import HostLogin from './pages/HostLogin/HostLogin';
import HostDashboard from './pages/HostDashboard/HostDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/host/login" element={<HostLogin />} />
            <Route path="/host/dashboard" element={<HostDashboard />} />
            <Route path="/" element={<Navigate to="/host/login" />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;