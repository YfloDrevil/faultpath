import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, AlertTriangle, CheckCircle2, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SYMPTOMS = [
  { slug: 'no-start', title: 'No start', description: 'Engine cranks but will not start' },
  { slug: 'blowing-fuse', title: 'Blowing fuse', description: 'Fuse blows repeatedly under load' },
  { slug: 'lights-behaving-weird', title: 'Lights behaving weird', description: 'Flicker, dim, or erratic lighting' },
  { slug: 'no-boom-movement', title: 'No boom movement', description: 'Hydraulic boom not responding' },
  { slug: 'overheating', title: 'Overheating', description: 'Engine or system running hot' },
  { slug: 'no-communication', title: 'No communication (CAN)', description: 'Scan tool cannot communicate' },
];

const EQUIPMENT_TYPE_OPTIONS = [
  'Vehicle (Car/Truck/SUV)',
  'Mobile Plant',
  'Fixed Plant',
  'Heavy Diesel Equipment',
  'Forklift/Material Handling',
  'Excavator/Loader',
  'Generator/Compressor',
  'Other'
];

const getSymptomLabel = (slug) => {
  const match = SYMPTOMS.find((item) => item.slug === slug);
  if (match) return match.title;
  return slug ? slug.replace(/-/g, ' ') : 'Unknown symptom';
};

const SymptomDiagnostics = () => {
  const navigate = useNavigate();
  const { flowId } = useParams();
  const location = useLocation();

  const initialSymptom = location.state?.symptom || getSymptomLabel(flowId);
  const [symptom, setSymptom] = useState(initialSymptom);
  const [equipmentDetails, setEquipmentDetails] = useState({
    fuel_type: '',
    equipment_type: '',
    year: '',
    make: '',
    model: '',
    vin: '',
    images: []
  });
  const [playbook, setPlaybook] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepResult, setStepResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSymptom(initialSymptom);
    setPlaybook(null);
    setCurrentStepIndex(0);
    setStepResult(null);
  }, [initialSymptom]);

  const currentStep = useMemo(() => {
    if (!playbook?.steps?.length) return null;
    return playbook.steps[currentStepIndex];
  }, [playbook, currentStepIndex]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEquipmentDetails((prev) => ({
          ...prev,
          images: [...prev.images, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setEquipmentDetails((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const startDiagnostic = async () => {
    if (!symptom) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/diagnostic-playbook`, {
        symptom,
        details: {
          fuel_type: equipmentDetails.fuel_type,
          equipment_type: equipmentDetails.equipment_type,
          year: equipmentDetails.year,
          make: equipmentDetails.make,
          model: equipmentDetails.model,
          vin_number: equipmentDetails.vin,
          photos_count: equipmentDetails.images.length
        }
      });
      setPlaybook(res.data);
      setCurrentStepIndex(0);
      setStepResult(null);
    } catch (error) {
      console.error('Error generating playbook:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStepResult = (status) => {
    if (!currentStep) return;
    setStepResult({
      status,
      outcome: status === 'pass' ? currentStep.pass_outcome : currentStep.fail_outcome,
      action: status === 'pass' ? currentStep.pass_action : currentStep.fail_action
    });
  };

  const handleContinue = () => {
    if (!playbook?.steps?.length) return;
    if (currentStepIndex < playbook.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setStepResult(null);
    }
  };

  const restart = () => {
    setPlaybook(null);
    setCurrentStepIndex(0);
    setStepResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              data-testid="diagnostic-back-btn"
              onClick={() => navigate('/quick-diagnostics')}
              className="flex items-center text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <div className="text-center flex-1">
              <h1 className="text-xl font-bold text-white">Guided Diagnostic Path</h1>
              <p className="text-xs text-slate-400">Start with the symptom, refine only when needed</p>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-2xl">What’s the problem?</CardTitle>
            <p className="text-slate-400">Selected symptom</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge data-testid="selected-symptom-badge" className="bg-blue-600 text-white">
                {symptom}
              </Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                AI-guided steps
              </Badge>
            </div>
          </CardContent>
        </Card>

        <details data-testid="optional-details-toggle" className="bg-slate-800/40 border border-slate-700 rounded-xl p-6">
          <summary className="text-white font-semibold cursor-pointer">
            Optional Equipment Details (Improve Accuracy)
          </summary>
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Fuel Type</Label>
                <Select
                  value={equipmentDetails.fuel_type}
                  onValueChange={(value) => setEquipmentDetails({ ...equipmentDetails, fuel_type: value })}
                >
                  <SelectTrigger data-testid="fuel-type-select" className="bg-slate-900 border-slate-700 text-white mt-2">
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
                  onValueChange={(value) => setEquipmentDetails({ ...equipmentDetails, equipment_type: value })}
                >
                  <SelectTrigger data-testid="equipment-type-select" className="bg-slate-900 border-slate-700 text-white mt-2">
                    <SelectValue placeholder="Select equipment type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 max-h-[260px]">
                    {EQUIPMENT_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type} className="text-white hover:bg-slate-700">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-300">Year</Label>
                <Input
                  data-testid="diagnostic-year-input"
                  value={equipmentDetails.year}
                  onChange={(e) => setEquipmentDetails({ ...equipmentDetails, year: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white mt-2"
                  placeholder="2020"
                />
              </div>
              <div>
                <Label className="text-slate-300">Make / Brand</Label>
                <Input
                  data-testid="diagnostic-make-input"
                  value={equipmentDetails.make}
                  onChange={(e) => setEquipmentDetails({ ...equipmentDetails, make: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white mt-2"
                  placeholder="Toyota, Caterpillar"
                />
              </div>
              <div>
                <Label className="text-slate-300">Model</Label>
                <Input
                  data-testid="diagnostic-model-input"
                  value={equipmentDetails.model}
                  onChange={(e) => setEquipmentDetails({ ...equipmentDetails, model: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white mt-2"
                  placeholder="Hilux, 320D"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">VIN / Serial Number (Optional)</Label>
              <Input
                data-testid="diagnostic-vin-input"
                value={equipmentDetails.vin}
                onChange={(e) => setEquipmentDetails({ ...equipmentDetails, vin: e.target.value.toUpperCase() })}
                className="bg-slate-900 border-slate-700 text-white mt-2"
                placeholder="17-digit VIN or equipment serial number"
                maxLength={17}
              />
            </div>

            <div>
              <Label className="text-slate-300">Upload Photos (Optional)</Label>
              <div className="mt-2 border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-slate-600 transition-colors">
                {equipmentDetails.images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {equipmentDetails.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-24 object-cover rounded" />
                        <button
                          data-testid={`remove-photo-btn-${idx}`}
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
                  <p className="text-slate-400 mb-2">Upload photos of fuse boxes, wiring damage, dash warnings, or valve blocks</p>
                  <p className="text-xs text-slate-500">Photos help identify component locations and common failure patterns only.</p>
                  <input
                    data-testid="diagnostic-photos-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </details>

        {!playbook && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6 flex flex-col items-start gap-4">
              <p className="text-slate-300">
                Start the guided diagnostic path to see the first check, expected value, and pass/fail actions.
              </p>
              <Button
                data-testid="start-diagnostic-btn"
                onClick={startDiagnostic}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? 'Generating Diagnostic Path…' : 'Start Diagnostic Path'}
              </Button>
            </CardContent>
          </Card>
        )}

        {playbook && currentStep && (
          <div className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-xl">Step {currentStepIndex + 1} of {playbook.steps.length}</CardTitle>
                    <p className="text-slate-400 text-sm">{playbook.title}</p>
                  </div>
                  <Badge variant="outline" className="border-slate-600 text-slate-300">{playbook.source || 'AI'} path</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-slate-200 font-semibold">Check</p>
                  <p className="text-slate-300">{currentStep.check}</p>
                </div>
                <div>
                  <p className="text-slate-200 font-semibold">Expected Value</p>
                  <p className="text-blue-300">{currentStep.expected_value}</p>
                </div>
                <div>
                  <p className="text-slate-200 font-semibold">Why this matters</p>
                  <p className="text-slate-300">{currentStep.why}</p>
                </div>
                <div>
                  <p className="text-slate-200 font-semibold">Common mistakes to avoid</p>
                  <ul className="text-slate-300 list-disc list-inside space-y-1">
                    {currentStep.mistakes.map((mistake, idx) => (
                      <li key={idx}>{mistake}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <Button
                    data-testid="step-pass-btn"
                    onClick={() => handleStepResult('pass')}
                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Pass
                  </Button>
                  <Button
                    data-testid="step-fail-btn"
                    onClick={() => handleStepResult('fail')}
                    className="bg-red-600 hover:bg-red-700 text-white flex-1"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Fail
                  </Button>
                </div>
              </CardContent>
            </Card>

            {stepResult && (
              <Card className="bg-slate-900/70 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">
                    {stepResult.status === 'pass' ? 'Pass Result' : 'Fail Result'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-slate-200 font-semibold">{stepResult.outcome}</p>
                  <p className="text-slate-300">{stepResult.action}</p>
                  <div className="flex flex-wrap gap-3">
                    {currentStepIndex < playbook.steps.length - 1 && (
                      <Button
                        data-testid="continue-step-btn"
                        onClick={handleContinue}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Continue to Next Step
                      </Button>
                    )}
                    <Button
                      data-testid="restart-diagnostic-btn"
                      onClick={restart}
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-800"
                    >
                      Restart Path
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {playbook.clarifying_questions?.length > 0 && (
              <Card className="bg-slate-800/40 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Clarifying questions (only if needed)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-slate-300 list-disc list-inside space-y-1">
                    {playbook.clarifying_questions.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SymptomDiagnostics;