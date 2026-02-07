import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Zap, Wind, Droplet, Wrench, ArrowRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Home = () => {
  const navigate = useNavigate();

  const trades = [
    { id: 1, icon: Car, name: 'Automotive', desc: 'Engine, transmission, brakes', color: '#3B82F6' },
    { id: 2, icon: Zap, name: 'Electrical', desc: '3 diagrams', color: '#F97316' },
    { id: 3, icon: Wind, name: 'HVAC', desc: '3 diagrams', color: '#14B8A6' },
    { id: 4, icon: Droplet, name: 'Plumbing', desc: '2 diagrams', color: '#A855F7' },
    { id: 5, icon: Wrench, name: 'General', desc: '2 diagrams', color: '#6B7280' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">FaultPath</h1>
              <p className="text-sm text-slate-400">Diagnostic Assistant</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              data-testid="quick-diagnostics-nav-btn"
              onClick={() => navigate('/quick-diagnostics')}
              variant="outline"
              className="border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white"
            >
              <Zap className="w-4 h-4 mr-2" />
              Quick Diagnostics
            </Button>
            <Button
              data-testid="technical-reference-nav-btn"
              onClick={() => navigate('/technical-reference')}
              variant="outline"
              className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
            >
              Technical Reference
            </Button>
            <Button
              data-testid="reference-diagrams-nav-btn"
              onClick={() => navigate('/reference-diagrams')}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Wiring Diagrams
            </Button>
            <Button
              data-testid="chat-nav-btn"
              onClick={() => navigate('/chat')}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              AI Chat
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-6">
          <h2 className="text-5xl md:text-6xl font-bold text-white">
            Step-by-Step
          </h2>
          <h3 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Guided Diagnostics
          </h3>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mt-6">
            No guessing. No hallucinated wiring. Just systematic troubleshooting that works.
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap justify-center gap-4 mt-10">
            <div className="px-6 py-3 bg-slate-800/50 border border-blue-500/30 rounded-full backdrop-blur-sm">
              <span className="text-blue-400 font-semibold">⚡ Fast Diagnosis</span>
            </div>
            <div className="px-6 py-3 bg-slate-800/50 border border-green-500/30 rounded-full backdrop-blur-sm">
              <span className="text-green-400 font-semibold">🛡️ Proven Methods</span>
            </div>
            <div className="px-6 py-3 bg-slate-800/50 border border-purple-500/30 rounded-full backdrop-blur-sm">
              <span className="text-purple-400 font-semibold">📡 Works Offline</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trade Selection */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h4 className="text-3xl font-bold text-white mb-8">Select Your Trade</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trades.map((trade) => {
            const Icon = trade.icon;
            return (
              <button
                key={trade.id}
                data-testid={`trade-${trade.name.toLowerCase()}-btn`}
                onClick={() => navigate('/reference-diagrams')}
                className="group bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-2xl p-6 text-left transition-all duration-200 hover:border-slate-600 hover:shadow-lg hover:shadow-blue-500/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: trade.color + '20' }}
                    >
                      <Icon className="w-8 h-8" style={{ color: trade.color }} />
                    </div>
                    <div>
                      <h5 className="text-xl font-semibold text-white mb-1">{trade.name}</h5>
                      <p className="text-sm text-slate-400">{trade.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl p-12 text-center">
          <h4 className="text-3xl font-bold text-white mb-4">
            Ready to diagnose your equipment?
          </h4>
          <p className="text-blue-100 text-lg mb-8">
            Start a conversation with our AI diagnostic assistant
          </p>
          <Button
            data-testid="start-diagnosis-cta-btn"
            onClick={() => navigate('/chat')}
            size="lg"
            className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-6 h-auto"
          >
            Start Diagnosis Now
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Home;