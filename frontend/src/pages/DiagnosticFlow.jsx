import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, AlertTriangle, Wrench, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DiagnosticFlow = () => {
  const navigate = useNavigate();
  const { flowId } = useParams();
  const [flow, setFlow] = useState(null);
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchFlow();
  }, [flowId]);

  const fetchFlow = async () => {
    try {
      const res = await axios.get(`${API}/diagnostic-flows/${flowId}`);
      setFlow(res.data);
      setCurrentQuestionId(res.data.questions[0].id);
    } catch (error) {
      console.error('Error fetching flow:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (option) => {
    const currentQuestion = flow.questions.find(q => q.id === currentQuestionId);
    
    // Add to history
    setHistory([...history, {
      question: currentQuestion.question,
      answer: option.label
    }]);

    // Check if this leads to a diagnosis or next question
    if (option.diagnosis) {
      setDiagnosis(flow.diagnoses[option.diagnosis]);
      setCurrentQuestionId(null);
    } else if (option.next) {
      setCurrentQuestionId(option.next);
    }
  };

  const restart = () => {
    setCurrentQuestionId(flow.questions[0].id);
    setDiagnosis(null);
    setHistory([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const currentQuestion = flow?.questions.find(q => q.id === currentQuestionId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/quick-diagnostics')}
              className="flex items-center text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <div className="text-center flex-1">
              <h1 className="text-xl font-bold text-white">{flow?.title}</h1>
              <p className="text-xs text-slate-400">{flow?.description}</p>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress History */}
        {history.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-lg">Diagnostic Path</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-300 font-medium">{item.question}</p>
                    <p className="text-blue-400">{item.answer}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Current Question */}
        {currentQuestion && !diagnosis && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">{currentQuestion.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentQuestion.options.map((option, idx) => (
                <Button
                  key={idx}
                  onClick={() => handleAnswer(option)}
                  className="w-full justify-start text-left h-auto py-4 px-6 bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 hover:border-blue-500"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-base">{option.label}</span>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Diagnosis Result */}
        {diagnosis && (
          <div className="space-y-6">
            {/* Header */}
            <Card className="bg-gradient-to-r from-blue-600 to-cyan-600 border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-2xl mb-2">{diagnosis.title}</CardTitle>
                    <Badge className={`${
                      diagnosis.probability === 'CRITICAL' ? 'bg-red-600' :
                      diagnosis.probability === 'HIGH' ? 'bg-orange-500' :
                      'bg-yellow-500'
                    } text-white`}>
                      {diagnosis.probability} Probability
                    </Badge>
                  </div>
                  <AlertTriangle className="w-12 h-12 text-white" />
                </div>
              </CardHeader>
            </Card>

            {/* Causes */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Common Causes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {diagnosis.causes.map((cause, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-300">
                      <span className="text-yellow-400 mt-1">•</span>
                      {cause}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Testing Procedures */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  Diagnostic Testing Procedures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {diagnosis.tests.map((test, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-slate-200">{test}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Repair Procedures */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-blue-400" />
                  Repair Procedures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {diagnosis.repair.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-slate-200">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Parts & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    Parts Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {diagnosis.parts.map((part, idx) => (
                      <li key={idx} className="text-slate-300 flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        {part}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    Estimated Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-400">{diagnosis.time}</p>
                  <p className="text-sm text-slate-400 mt-2">Typical repair duration</p>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={restart}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Start Over
              </Button>
              <Button
                onClick={() => navigate('/quick-diagnostics')}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Choose Different Flow
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosticFlow;
