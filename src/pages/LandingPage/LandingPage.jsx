import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, Users, Zap, Shield, Globe } from 'lucide-react';
import Container from '../../components/layout/Container';
import Header from '../../components/layout/Header';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Zap,
      title: 'Real-time Polling',
      description: 'Polls appear instantly as you publish them. No page refresh needed.',
    },
    {
      icon: BarChart3,
      title: 'Live Results',
      description: 'Watch responses come in real-time with detailed analytics.',
    },
    {
      icon: Users,
      title: 'Easy Join',
      description: 'Participants join with a simple code or QR scan.',
    },
    {
      icon: Shield,
      title: 'Secure Sessions',
      description: 'Private sessions with participant authentication.',
    },
    {
      icon: Globe,
      title: 'Works Anywhere',
      description: 'Mobile-friendly and accessible from any device.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Header />
      
      <section className="py-20 lg:py-32">
        <Container>
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6">
              Real-time Polling for{' '}
              <span className="text-primary-600">Engaged Meetings</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Create live polls, gather instant feedback, and keep your audience engaged in real-time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => navigate('/host/login')} 
                className="btn-primary text-base px-6 py-3"
              >
                Start Hosting
                <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => navigate('/join')} 
                className="btn-secondary text-base px-6 py-3"
              >
                Join as Participant
              </button>
            </div>
          </div>
        </Container>
      </section>
      
      <section className="py-20 bg-white border-t border-gray-100">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need for live engagement
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              QuickPulse makes it easy to create polls, gather responses, and analyze results.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card p-6 hover:shadow-lg transition-all duration-200">
                <feature.icon className="w-10 h-10 text-primary-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
      
      <section className="py-20">
        <Container>
          <div className="bg-gradient-to-r from-primary-700 to-primary-800 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to engage your audience?
            </h2>
            <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
              Start creating real-time polls and get instant feedback from your participants.
            </p>
            <button 
              onClick={() => navigate('/host/login')} 
              className="bg-white text-primary-700 px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
            >
              Get Started
            </button>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default LandingPage;
