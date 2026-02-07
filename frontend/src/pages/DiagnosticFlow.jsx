import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, AlertTriangle, Wrench, Clock, DollarSign, Upload, Image as ImageIcon, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EQUIPMENT_TYPES = [
  // Light Vehicles
  'Toyota (Car/Truck/SUV)',
  'Ford (Car/Truck/SUV)',
  'Isuzu (Truck/Commercial)',
  'Nissan (Car/Truck/SUV)',
  'Hino (Commercial Truck)',
  'Kia (Car/SUV)',
  'Hyundai (Car/SUV)',
  'Mitsubishi (Car/Truck)',
  'Mazda (Car/SUV)',
  'Honda (Car/SUV)',
  'Subaru (Car/SUV)',
  'Suzuki (Car)',
  'Scania (Heavy Truck)',
  'Volvo (Truck/Car)',
  'MAN (Commercial Truck)',
  'Mercedes-Benz (Car/Truck)',
  'Chevrolet/GM (Car/Truck)',
  'Dodge/RAM (Truck)',
  'Other Car/Light Vehicle',
  // Heavy Equipment
  'Caterpillar Equipment',
  'Komatsu Equipment',
  'Bobcat/Skid Steer',
  'Excavator (Any Brand)',
  'Mobile Crusher',
  'Forklift (Any Brand)',
  'Franna Crane',
  'Telehandler',
  'Generator (Any Brand)',
  'Loader',
  'Backhoe',
  'Dozer',
  'Grader',
  'Compressor',
  'Other Heavy Equipment'
];

const normalizeValue = (value) => (value || '').toLowerCase();
const includesAny = (value, terms) => terms.some((term) => value.includes(term));

const buildBrandContext = (details) => {
  const combined = `${details.equipment_type || ''} ${details.make || ''}`.toLowerCase();
  return {
    combined,
    isToyota: includesAny(combined, ['toyota', 'lexus']),
    isFord: includesAny(combined, ['ford', 'lincoln']),
    isNissan: includesAny(combined, ['nissan']),
    isHonda: includesAny(combined, ['honda', 'acura']),
    isBobcat: includesAny(combined, ['bobcat', 'skid steer']),
    isCaterpillar: includesAny(combined, ['caterpillar', 'cat ']),
    isKomatsu: includesAny(combined, ['komatsu']),
    isExcavator: includesAny(combined, ['excavator']),
    isForklift: includesAny(combined, ['forklift'])
  };
};

const insertBrandQuestion = (flow, question, diagnoses) => ({
  ...flow,
  questions: [question, ...flow.questions],
  diagnoses: { ...flow.diagnoses, ...diagnoses }
});

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
    if (flow) {
      let updatedFlow = adjustFlowForFuelType(flow, equipmentDetails.fuel_type);
      updatedFlow = applyBrandSpecificAdjustments(updatedFlow, equipmentDetails);
      setFlow(updatedFlow);
      setCurrentQuestionId(updatedFlow.questions[0].id);
    }
    setShowEquipmentForm(false);
  };

  const adjustFlowForFuelType = (originalFlow, fuelType) => {
    const flowId = originalFlow.title.toLowerCase().replace(/\s+/g, '_');
    
    // CRANK NO START - Fuel-aware
    if (flowId === "crank_no_start") {
      if (fuelType === 'diesel') {
        return {
          ...originalFlow,
          title: "Crank No Start (Diesel Engine)",
          questions: [
            {
              "id": "q1",
              "question": "What happens when you turn the key to start? (Diesel Engine)",
              "options": [
                {"value": "cranks", "label": "Engine cranks but won't start", "next": "q2_diesel"},
                {"value": "slow_crank", "label": "Cranks slowly/labored", "diagnosis": "battery_diesel"},
                {"value": "no_crank", "label": "No crank at all", "diagnosis": "starting_system"}
              ]
            },
            {
              "id": "q2_diesel",
              "question": "Can you see white/gray smoke from exhaust when cranking?",
              "options": [
                {"value": "yes", "label": "Yes - smoke present (engine trying)", "next": "q3_diesel"},
                {"value": "no", "label": "No smoke at all", "diagnosis": "glow_plugs_diesel"}
              ]
            },
            {
              "id": "q3_diesel",
              "question": "Does the engine sound normal when cranking?",
              "options": [
                {"value": "normal", "label": "Yes - normal cranking sound", "diagnosis": "fuel_system_diesel"},
                {"value": "abnormal", "label": "No - sounds different/weak", "diagnosis": "compression_diesel"}
              ]
            }
          ],
          diagnoses: {
            ...originalFlow.diagnoses,
            "battery_diesel": {
              "title": "Weak Battery (Diesel)",
              "probability": "HIGH",
              "causes": ["Weak battery - diesels need HIGH cranking power (400-600 CCA)", "Bad battery cables", "Corroded terminals", "Bad alternator"],
              "tests": [
                "Test battery voltage: Should be 12.6V minimum (diesel needs more!)",
                "Load test battery: Should maintain 9.6V under load",
                "Diesel engines need 400-600 CCA minimum (higher than petrol)",
                "Check battery cables for corrosion and tightness",
                "Test alternator output: 13.8-14.5V at 2000 RPM",
                "Cold weather increases battery load significantly"
              ],
              "repair": [
                "Charge battery fully with proper charger",
                "Clean battery terminals with wire brush and baking soda",
                "Load test - replace if fails (heavy duty diesel battery $150-300)",
                "Replace corroded battery cables ($30-80 per cable)",
                "Ensure battery is rated for diesel (minimum 600 CCA recommended)"
              ],
              "parts": ["Heavy duty diesel battery 600-800 CCA ($150-300)", "Battery cables ($30-80)", "Terminals ($10-20)"],
              "time": "30 minutes - 1 hour"
            },
            "glow_plugs_diesel": {
              "title": "Glow Plug System Failure (Diesel)",
              "probability": "CRITICAL",
              "causes": ["Failed glow plugs (common in cold weather)", "Bad glow plug relay/module", "Broken glow plug wiring", "Faulty glow plug controller/timer"],
              "tests": [
                "Check glow plug light on dash: Should illuminate for 5-30 seconds (longer when cold)",
                "Test glow plug resistance: 0.5-2 ohms per plug when COLD",
                "Test voltage at glow plugs: Should be 11-12V when activated",
                "Check glow plug relay: Should click when key turned on",
                "Test each glow plug individually with multimeter",
                "Cold engine temperature increases glow time (critical for diesel starting)"
              ],
              "repair": [
                "Replace ALL glow plugs if one failed (prevent future issues) - $20-50 each",
                "Replace glow plug relay/module if clicking but no voltage ($50-150)",
                "Repair broken glow plug wiring/connectors",
                "Clean carbon buildup on glow plug tips if accessible",
                "Test system: Glow plugs should heat for proper time, then start",
                "Time estimate: 2-4 hours for all plugs"
              ],
              "parts": ["Glow plugs - replace all ($80-200 for set)", "Glow plug relay ($50-150)", "Controller module ($100-300)"],
              "time": "1-4 hours"
            },
            "fuel_system_diesel": {
              "title": "Diesel Fuel System Issue",
              "probability": "CRITICAL",
              "causes": ["Air in fuel system (very common on diesels!)", "Clogged fuel filter", "Failed lift/transfer pump", "Bad injector pump", "Water in fuel", "Fuel line leak"],
              "tests": [
                "Check for air leaks: Inspect all fuel lines from tank to injector pump",
                "Test fuel pressure at lift pump: Should be 5-15 PSI",
                "Check fuel filter for water/contamination (drain water separator)",
                "Look for fuel leaks (creates air entry when engine off)",
                "Check fuel quality - diesel can gel in cold weather",
                "Listen for injector pump operation when cranking"
              ],
              "repair": [
                "BLEED AIR from fuel system (critical!): Start at filter, work to injector pump",
                "Replace fuel filter ($20-50, 30 minutes) - do this FIRST",
                "Fix any air leaks in fuel lines/connections",
                "Replace lift/transfer pump if no pressure ($150-400, 2-3 hours)",
                "Drain water from fuel separator (very important!)",
                "Prime fuel system: Crank 10-15 seconds, wait 30 seconds, repeat 3-4 times",
                "May need injector pump replacement if damaged ($800-2000+)"
              ],
              "parts": ["Fuel filter ($20-50)", "Lift pump ($150-400)", "Fuel lines/fittings ($30-100)", "Injector pump ($800-2000)"],
              "time": "30 minutes - 6 hours"
            },
            "compression_diesel": {
              "title": "Low Compression (Diesel Engine)",
              "probability": "HIGH",
              "causes": ["Worn piston rings", "Blown head gasket", "Worn cylinder walls", "Valve timing jumped", "Broken timing belt/chain"],
              "tests": [
                "Compression test: Diesel should be 350-500 PSI (MUCH higher than petrol!)",
                "All cylinders must be within 10% of each other",
                "Check for white smoke: Coolant in combustion chamber (head gasket)",
                "Check for blue smoke: Oil burning (rings/valve seals)",
                "Verify timing belt/chain: Not broken or jumped teeth",
                "Low compression on all cylinders: Worn rings. One cylinder: Head gasket/valve"
              ],
              "repair": [
                "If one cylinder low: Check valves, replace head gasket ($500-1500, 6-10 hours)",
                "If all cylinders low: Worn piston rings, major overhaul needed",
                "Check/replace timing belt if jumped ($300-800, 4-8 hours)",
                "Engine rebuild/replacement if severely worn ($3000-8000+, 20-40 hours)",
                "Cylinder head reconditioning if valves damaged ($800-1500)"
              ],
              "parts": ["Head gasket kit ($150-400)", "Timing belt kit ($200-500)", "Piston rings ($200-600)", "Engine rebuild ($3000-8000+)"],
              "time": "4-40 hours depending on issue"
            }
          }
        };
      }
      // Return original petrol flow if not diesel
      return originalFlow;
    }
    
    // NO CRANK NO START - Universal but add equipment context
    if (flowId === "no_crank_no_start") {
      return {
        ...originalFlow,
        title: `No Crank No Start${fuelType ? ` (${fuelType.charAt(0).toUpperCase() + fuelType.slice(1)})` : ''}`,
      };
    }
    
    // TRANSMISSION - Adjust for equipment type
    if (flowId === "transmission/gearbox") {
      // Check if heavy equipment from equipment details
      const isHeavyEquipment = equipmentDetails.equipment_type?.includes('Excavator') || 
                               equipmentDetails.equipment_type?.includes('Loader') ||
                               equipmentDetails.equipment_type?.includes('Dozer');
      
      if (isHeavyEquipment) {
        return {
          ...originalFlow,
          title: "Transmission/Powershift (Heavy Equipment)",
          description: "Heavy equipment transmission and powershift issues"
        };
      }
    }
    
    return originalFlow;
  };

  const applyBrandSpecificAdjustments = (originalFlow, details) => {
    const context = buildBrandContext(details);
    const firstQuestionId = originalFlow.questions?.[0]?.id;
    if (!firstQuestionId) return originalFlow;

    if (flowId === 'crank_no_start') {
      if (context.isToyota) {
        return insertBrandQuestion(
          originalFlow,
          {
            id: 'q_toyota_immobilizer',
            question: 'Is the security/immobilizer light flashing rapidly while cranking?',
            options: [
              { value: 'yes', label: 'Yes - security light flashing', diagnosis: 'immobilizer_active' },
              { value: 'no', label: 'No - light normal/off', next: firstQuestionId }
            ]
          },
          {
            immobilizer_active: {
              title: 'Immobilizer/Security System Active (Toyota/Lexus)',
              probability: 'HIGH',
              causes: [
                'Unrecognized key transponder',
                'Faulty immobilizer antenna ring',
                'Security ECU not authorizing start',
                'Low key fob battery (smart key systems)'
              ],
              tests: [
                'Try a spare programmed key',
                'Check key fob battery and proximity function',
                'Scan for immobilizer DTCs (B2799, B279A common)',
                'Verify immobilizer antenna resistance per service data'
              ],
              repair: [
                'Replace key fob battery and re-test',
                'Reprogram key if needed (dealer/locksmith)',
                'Replace immobilizer antenna ring if failed',
                'Repair security ECU wiring/ground'
              ],
              parts: ['Key fob battery ($5-15)', 'Immobilizer antenna ring ($60-150)'],
              time: '30 minutes - 2 hours'
            }
          }
        );
      }

      if (context.isFord) {
        return insertBrandQuestion(
          originalFlow,
          {
            id: 'q_ford_pats',
            question: 'Is the PATS/theft light flashing fast or staying on during crank?',
            options: [
              { value: 'yes', label: 'Yes - PATS/theft light active', diagnosis: 'pats_issue' },
              { value: 'no', label: 'No - theft light normal', next: firstQuestionId }
            ]
          },
          {
            pats_issue: {
              title: 'PATS/Anti-Theft Preventing Start (Ford)',
              probability: 'HIGH',
              causes: [
                'Unprogrammed or damaged transponder key',
                'Faulty PATS antenna ring',
                'PATS module/PCM communication fault',
                'Aftermarket remote start/immobilizer conflict'
              ],
              tests: [
                'Try a spare known-good key',
                'Check for PATS codes (B1600, B1601, P1260)',
                'Verify antenna ring connection and resistance',
                'Disconnect aftermarket alarm/remote start if installed'
              ],
              repair: [
                'Program keys using IDS or locksmith tool',
                'Replace PATS antenna ring if failed',
                'Repair wiring between PATS module and PCM',
                'Remove/repair conflicting aftermarket security system'
              ],
              parts: ['PATS antenna ring ($50-120)', 'Transponder key ($30-120)'],
              time: '30 minutes - 2 hours'
            }
          }
        );
      }
    }

    if (flowId === 'hydraulic_system' && context.isBobcat) {
      return insertBrandQuestion(
        originalFlow,
        {
          id: 'q_bobcat_interlock',
          question: 'Is the seat bar down and the hydraulic interlock unlocked?',
          options: [
            { value: 'no', label: 'No - interlock not engaged', diagnosis: 'safety_interlock' },
            { value: 'yes', label: 'Yes - interlock engaged', next: firstQuestionId }
          ]
        },
        {
          safety_interlock: {
            title: 'Safety Interlock Preventing Hydraulics (Bobcat)',
            probability: 'HIGH',
            causes: [
              'Seat bar not fully latched',
              'Parking brake switch not engaged',
              'Hydraulic lockout solenoid not energizing',
              'Seat bar position sensor failure'
            ],
            tests: [
              'Verify seat bar fully lowered and indicator light',
              'Check parking brake switch operation',
              'Listen for lockout solenoid click when enabling hydraulics',
              'Inspect seat bar sensor wiring and connectors'
            ],
            repair: [
              'Adjust or replace seat bar latch mechanism',
              'Replace faulty seat bar sensor',
              'Repair lockout solenoid wiring',
              'Reset safety interlock per service procedure'
            ],
            parts: ['Seat bar sensor ($80-200)', 'Lockout solenoid ($120-300)'],
            time: '30 minutes - 2 hours'
          }
        }
      );
    }

    if (flowId === 'excavator' && (context.isCaterpillar || context.isKomatsu || context.isExcavator)) {
      return insertBrandQuestion(
        originalFlow,
        {
          id: 'q_excavator_lockout',
          question: 'Is the hydraulic lockout lever (pilot control shutoff) in the ON position?',
          options: [
            { value: 'no', label: 'No - lockout engaged', diagnosis: 'lockout_engaged' },
            { value: 'yes', label: 'Yes - lockout off', next: firstQuestionId }
          ]
        },
        {
          lockout_engaged: {
            title: 'Hydraulic Lockout Engaged',
            probability: 'MEDIUM',
            causes: [
              'Pilot control lockout lever left engaged',
              'Faulty pilot shutoff valve',
              'Pilot solenoid not energizing'
            ],
            tests: [
              'Verify lockout lever position and indicator light',
              'Check pilot pressure at joystick when lockout is OFF',
              'Test pilot solenoid power/ground when lever is released'
            ],
            repair: [
              'Set lockout lever to OFF and retest',
              'Replace pilot shutoff valve if sticking',
              'Repair pilot solenoid wiring or replace solenoid'
            ],
            parts: ['Pilot shutoff solenoid ($150-400)'],
            time: '30 minutes - 2 hours'
          }
        }
      );
    }

    if (flowId === 'forklift' && context.isForklift) {
      return insertBrandQuestion(
        originalFlow,
        {
          id: 'q_forklift_ops',
          question: 'Is the operator presence/seat switch engaged and parking brake released?',
          options: [
            { value: 'no', label: 'No - seat switch or brake not engaged', diagnosis: 'operator_presence' },
            { value: 'yes', label: 'Yes - switches engaged', next: firstQuestionId }
          ]
        },
        {
          operator_presence: {
            title: 'Operator Presence Interlock Active',
            probability: 'HIGH',
            causes: [
              'Seat switch not closing',
              'Parking brake switch stuck',
              'OPS module fault (Toyota/Hyster style systems)'
            ],
            tests: [
              'Check seat switch continuity when operator seated',
              'Verify parking brake switch state on dash',
              'Inspect OPS module connections and ground'
            ],
            repair: [
              'Adjust or replace seat switch',
              'Replace faulty parking brake switch',
              'Repair OPS module wiring'
            ],
            parts: ['Seat switch ($60-180)', 'OPS module ($200-500)'],
            time: '30 minutes - 2 hours'
          }
        }
      );
    }

    return originalFlow;
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

  const handleAskAI = async () => {
    try {
      // Build comprehensive context message
      const contextMessage = `I need help with a diagnostic I just completed using FaultPath Quick Diagnostics:

**Equipment Details:**
${equipmentDetails.equipment_type ? `Equipment Type: ${equipmentDetails.equipment_type}` : ''}
${equipmentDetails.fuel_type ? `Fuel Type: ${equipmentDetails.fuel_type.toUpperCase()}` : ''}
${equipmentDetails.year || equipmentDetails.make || equipmentDetails.model ? `Vehicle: ${[equipmentDetails.year, equipmentDetails.make, equipmentDetails.model].filter(Boolean).join(' ')}` : ''}
${equipmentDetails.vin ? `VIN: ${equipmentDetails.vin}` : ''}

**Diagnostic Flow:** ${flow.title}

**Diagnostic Path Taken:**
${history.map((h, idx) => `${idx + 1}. Q: ${h.question}\n   A: ${h.answer}`).join('\n')}

**Diagnosis Result:** ${diagnosis.title}
**Probability:** ${diagnosis.probability}

**Identified Causes:**
${diagnosis.causes.map((c, idx) => `${idx + 1}. ${c}`).join('\n')}

**I need more detailed assistance with:**
- Understanding the root cause
- Clarification on testing procedures
- Step-by-step repair guidance
- Parts recommendations
- Any additional diagnostic steps

Please provide detailed technical assistance based on my specific equipment and the diagnosis above.`;

      // Create a new conversation with this context
      const conversationData = {
        equipment_name: `${equipmentDetails.year || ''} ${equipmentDetails.make || ''} ${equipmentDetails.model || ''} ${equipmentDetails.equipment_type || 'Vehicle'}`.trim(),
        category: flow.category || 'Automotive',
        fuel_type: equipmentDetails.fuel_type,
        year: equipmentDetails.year,
        make: equipmentDetails.make,
        model: equipmentDetails.model,
        vin: equipmentDetails.vin,
        symptoms: `Quick Diagnostic Result: ${diagnosis.title} - ${diagnosis.causes.join(', ')}`,
        fault_codes: ''
      };

      const res = await axios.post(`${API}/conversations`, conversationData);
      
      // Navigate to the chat with the conversation ID
      // The context message will be used as the first message
      navigate(`/chat/${res.data.id}`, { 
        state: { 
          initialMessage: contextMessage,
          diagnosticContext: {
            diagnosis: diagnosis.title,
            equipment: equipmentDetails,
            history: history
          }
        } 
      });
    } catch (error) {
      console.error('Error creating AI conversation:', error);
      // Fallback: Just navigate to chat page
      navigate('/chat');
    }
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
              {equipmentDetails.fuel_type && (
                <div className="mt-3 p-3 bg-blue-600/20 border border-blue-500 rounded-lg">
                  <p className="text-blue-300 text-sm font-semibold">
                    🔧 Diagnostics adjusted for {equipmentDetails.fuel_type.toUpperCase()} engine
                  </p>
                </div>
              )}
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
            <div className="space-y-4">
              {/* AI Chat Button - Prominent */}
              <Card className="bg-gradient-to-r from-purple-600 to-blue-600 border-0">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg mb-2">Need More Detailed Help?</h3>
                      <p className="text-blue-100 text-sm">
                        Get AI-powered assistance with your specific equipment details and diagnostic results
                      </p>
                    </div>
                    <Button
                      data-testid="ai-chat-help-btn"
                      onClick={handleAskAI}
                      className="bg-white text-purple-600 hover:bg-blue-50 font-semibold px-6 py-6 ml-4"
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Ask AI Assistant
                    </Button>
                  </div>
                </CardContent>
              </Card>

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
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosticFlow;
