import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Mail, Phone, ArrowRight, Code } from 'lucide-react';
import Container from '../../components/layout/Container';
import Header from '../../components/layout/Header';

const ParticipantJoin = () => {
  const { sessionCode: urlCode } = useParams();
  const [step, setStep] = useState(urlCode ? 'details' : 'code');
  const [sessionCode, setSessionCode] = useState(urlCode || '');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchSessionInfo = async (code) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:5000/api/sessions/code/${code}`);
      const data = await response.json();
      if (response.ok) {
        setSessionInfo(data);
        setStep('details');
      } else {
        setError('Session not found. Please check the code.');
      }
    } catch (err) {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (sessionCode.length === 6) {
      await fetchSessionInfo(sessionCode);
    } else {
      setError('Please enter a valid 6-character session code');
    }
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: sessionCode,
          name: formData.name,
          email: formData.email,
          phone: formData.phone
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('participant', JSON.stringify(data.participant));
        localStorage.setItem('sessionCode', sessionCode);
        localStorage.setItem('sessionInfo', JSON.stringify(data.session));
        navigate(`/participant/${sessionCode}`);
      } else {
        setError(data.error || 'Failed to join session');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <Container className="py-12">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Join Session</h1>
            <p className="text-gray-600 mt-1">Enter the session code to participate</p>
          </div>
          
          <div className="card p-8">
            {step === 'code' ? (
              <form onSubmit={handleCodeSubmit}>
                <div className="mb-6">
                  <label className="label">Session Code</label>
                  <div className="relative">
                    <Code className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Enter 6-character code"
                      value={sessionCode}
                      onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                      maxLength="6"
                      className="input pl-10 text-center tracking-wider font-mono"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Example: ABC123</p>
                </div>
                
                {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>}
                
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                  {loading ? 'Checking...' : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinSubmit}>
                {sessionInfo && (
                  <div className="bg-primary-50 border border-primary-100 rounded-lg p-4 mb-6">
                    <p className="text-sm text-primary-700">Joining session:</p>
                    <p className="font-semibold text-primary-800">{sessionInfo.name}</p>
                    <p className="text-xs text-primary-600 mt-1">Code: {sessionCode}</p>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="label">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="input pl-10"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="label">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="input pl-10"
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="label">Phone (Optional)</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="input pl-10"
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>
                </div>
                
                {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mt-4">{error}</div>}
                
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setStep('code')} className="btn-secondary flex-1">
                    Back
                  </button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1">
                    {loading ? 'Joining...' : 'Join Session'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
};

export default ParticipantJoin;
