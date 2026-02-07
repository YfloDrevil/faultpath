import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, AlertTriangle, Wrench, Clock, DollarSign, Upload, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EQUIPMENT_TYPES = [
  'Bobcat/Skid Steer',
  'Excavator',
  'Mobile Crusher',
  'Forklift',
  'Franna Crane',
  'Truck',
  'Telehandler',
  'Generator',
  'Loader',
  'Backhoe',
  'Dozer',
  'Grader',
  'Other Heavy Equipment'
];

const DiagnosticFlow = () => {
  const navigate = useNavigate();
  const { flowId } = useParams();
  const [flow, setFlow] = useState(null);
  const [showEquipmentForm, setShowEquipmentForm] = useState(true);
  const [equipmentDetails, setEquipmentDetails] = useState({
    fuel_type: '',
    year: '',
    make: '',
    model: '',
    vin: '',
    equipment_type: '',
    images: []
  });
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

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEquipmentDetails(prev => ({
          ...prev,
          images: [...prev.images, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setEquipmentDetails(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const startDiagnostic = () => {
    setShowEquipmentForm(false);
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
    setShowEquipmentForm(true);
    setEquipmentDetails({
      fuel_type: '',
      year: '',
      make: '',
      model: '',
      vin: '',
      equipment_type: '',
      images: []
    });
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
        {/* Equipment Details Form */}
        {showEquipmentForm && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">Equipment/Vehicle Details</CardTitle>
              <p className="text-slate-400 text-sm">Provide details for more accurate diagnostics</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fuel Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Fuel Type</Label>
                  <Select
                    value={equipmentDetails.fuel_type}
                    onValueChange={(value) => setEquipmentDetails({...equipmentDetails, fuel_type: value})}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-2">
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="petrol" className="text-white hover:bg-slate-700">Petrol/Gasoline</SelectItem>
                      <SelectItem value="diesel" className="text-white hover:bg-slate-700">Diesel</SelectItem>
                      <SelectItem value="hybrid" className="text-white hover:bg-slate-700">Hybrid</SelectItem>
                      <SelectItem value="electric" className="text-white hover:bg-slate-700">Electric</SelectItem>
                      <SelectItem value="lpg" className="text-white hover:bg-slate-700">LPG/CNG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-300">Equipment Type</Label>
                  <Select
                    value={equipmentDetails.equipment_type}
                    onValueChange={(value) => setEquipmentDetails({...equipmentDetails, equipment_type: value})}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-2">
                      <SelectValue placeholder="Select equipment type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 max-h-[300px]">
                      {EQUIPMENT_TYPES.map(type => (
                        <SelectItem key={type} value={type} className="text-white hover:bg-slate-700">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Year, Make, Model */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300">Year</Label>
                  <Input
                    value={equipmentDetails.year}
                    onChange={(e) => setEquipmentDetails({...equipmentDetails, year: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white mt-2"
                    placeholder="2020"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Make</Label>
                  <Input
                    value={equipmentDetails.make}
                    onChange={(e) => setEquipmentDetails({...equipmentDetails, make: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white mt-2"
                    placeholder="Ford, Caterpillar"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Model</Label>
                  <Input
                    value={equipmentDetails.model}
                    onChange={(e) => setEquipmentDetails({...equipmentDetails, model: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white mt-2"
                    placeholder="F-150, 320D"
                  />
                </div>
              </div>

              {/* VIN */}
              <div>
                <Label className="text-slate-300">VIN / Serial Number (Optional)</Label>
                <Input
                  value={equipmentDetails.vin}
                  onChange={(e) => setEquipmentDetails({...equipmentDetails, vin: e.target.value.toUpperCase()})}
                  className="bg-slate-900 border-slate-700 text-white mt-2"
                  placeholder="17-digit VIN or equipment serial number"
                  maxLength={17}
                />
              </div>

              {/* Image Upload */}
              <div>
                <Label className="text-slate-300">Upload Photos (Optional)</Label>
                <div className="mt-2 border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-slate-600 transition-colors">
                  {equipmentDetails.images.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {equipmentDetails.images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-24 object-cover rounded" />
                          <button
                            onClick={() => removeImage(idx)}
                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  )}
                  <label className="cursor-pointer">
                    <p className="text-slate-400 mb-2">Click to upload equipment photos</p>
                    <p className="text-xs text-slate-500">Helps with visual diagnosis</p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <Button
                onClick={startDiagnostic}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6"
              >
                Start Diagnostic Questions
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Equipment Context Card */}
        {!showEquipmentForm && (
          <Card className="bg-slate-800/30 border-slate-700 mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                {equipmentDetails.fuel_type && (
                  <Badge variant="outline" className="border-blue-600 text-blue-400">
                    {equipmentDetails.fuel_type.toUpperCase()}
                  </Badge>
                )}
                {equipmentDetails.equipment_type && (
                  <Badge variant="outline" className="border-green-600 text-green-400">
                    {equipmentDetails.equipment_type}
                  </Badge>
                )}
                {(equipmentDetails.year || equipmentDetails.make || equipmentDetails.model) && (
                  <Badge variant="outline" className="border-slate-600 text-slate-300">
                    {[equipmentDetails.year, equipmentDetails.make, equipmentDetails.model].filter(Boolean).join(' ')}
                  </Badge>
                )}
                {equipmentDetails.vin && (
                  <Badge variant="outline" className="border-slate-600 text-slate-300">
                    VIN: {equipmentDetails.vin}
                  </Badge>
                )}
                {equipmentDetails.images.length > 0 && (
                  <Badge variant="outline" className="border-purple-600 text-purple-400">
                    📷 {equipmentDetails.images.length} Photo{equipmentDetails.images.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress History */}
        {!showEquipmentForm && history.length > 0 && (
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
        {currentQuestion && !diagnosis && !showEquipmentForm && (
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
        {diagnosis && !showEquipmentForm && (
          <div className="space-y-6">
            {/* Uploaded Images Display */}
            {equipmentDetails.images.length > 0 && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-purple-400" />
                    Uploaded Equipment Photos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {equipmentDetails.images.map((img, idx) => (
                      <img key={idx} src={img} alt={`Equipment ${idx + 1}`} className="w-full h-32 object-cover rounded-lg border border-slate-700" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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

            {/* Rest of diagnosis content... */}

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
