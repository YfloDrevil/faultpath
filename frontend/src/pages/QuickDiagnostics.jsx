import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SYMPTOMS = [
  {
    slug: 'no-start',
    title: 'No start',
    description: 'Engine cranks but will not start'
  },
  {
    slug: 'blowing-fuse',
    title: 'Blowing fuse',
    description: 'Fuse blows repeatedly under load'
  },
  {
    slug: 'lights-behaving-weird',
    title: 'Lights behaving weird',
    description: 'Flicker, dim, or erratic lighting'
  },
  {
    slug: 'no-boom-movement',
    title: 'No boom movement',
    description: 'Hydraulic boom not responding'
  },
  {
    slug: 'overheating',
    title: 'Overheating',
    description: 'Engine or system running hot'
  },
  {
    slug: 'no-communication',
    title: 'No communication (CAN)',
    description: 'Scan tool cannot communicate'
  }
];

const QuickDiagnostics = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              data-testid="back-btn"
              onClick={() => navigate('/')}
              className="flex items-center text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Zap className="w-6 h-6 text-yellow-400" />
                <h1 className="text-2xl font-bold text-white">Quick Diagnostics</h1>
              </div>
              <p className="text-sm text-slate-400">Expert diagnostic workflows with precise answers</p>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">What’s the problem?</h2>
          <p className="text-slate-400">
            Pick a symptom to start an AI-guided diagnostic path with pass/fail checks
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SYMPTOMS.map((symptom) => (
            <Card
              key={symptom.slug}
              data-testid={`symptom-${symptom.slug}-btn`}
              onClick={() =>
                navigate(`/quick-diagnostics/${symptom.slug}`, {
                  state: { symptom: symptom.title }
                })
              }
              className="bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer group"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <Badge variant="outline" className="border-slate-600 text-slate-300">
                    Symptom
                  </Badge>
                </div>
                <CardTitle className="text-white">{symptom.title}</CardTitle>
                <CardDescription className="text-slate-400">
                  {symptom.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-blue-400 group-hover:text-blue-300">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Start guided diagnostic path
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-slate-800/30 border border-slate-700 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">How Quick Diagnostics Works</h3>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">1.</span>
                  Select a symptom that matches your issue
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">2.</span>
                  Follow step-by-step checks with pass/fail decisions
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">3.</span>
                  Get AI-guided procedures with expected values and next actions
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">4.</span>
                  Add optional equipment details only when needed to improve accuracy
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickDiagnostics;
