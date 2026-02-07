import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Book, Search, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const technicalReferences = [
  {
    id: 1,
    category: "OBD-II Codes",
    title: "OBD-II Diagnostic Trouble Code Reference",
    description: "Complete P, C, B, U code families with definitions",
    content: `Common OBD-II Codes Quick Reference:

P0XXX - Powertrain Codes
• P0030-P0061: O2 Sensor Heater Circuits
• P0100-P0199: Fuel & Air Metering
• P0171: System Too Lean (Bank 1)
• P0172: System Too Rich (Bank 1)
• P0300-P0312: Misfire Codes
• P0420-P0434: Catalyst System
• P0500-P0599: Vehicle Speed & Idle Control

P1XXX - Manufacturer Specific
P2XXX - Powertrain (Fuel, Ignition)
P3XXX - Powertrain (Ignition, Misfire)

C0XXX - Chassis Codes (ABS, suspension, steering)
B0XXX - Body Codes (airbags, climate, security)
U0XXX - Network Communication Codes

Testing Procedures:
1. Connect OBD-II scanner
2. Record all codes AND freeze frame data
3. Research each code definition
4. Clear codes only AFTER repairs
5. Test drive and rescan to verify`
  },
  {
    id: 2,
    category: "Fuel Systems",
    title: "Fuel Pressure Specifications",
    description: "Port injection, direct injection, diesel fuel specs",
    content: `Fuel Pressure Specifications by System:

PORT FUEL INJECTION (Petrol):
• Most vehicles: 55-65 PSI
• Honda/Acura: 38-46 PSI
• GM (older): 41-47 PSI
• Ford: 30-45 PSI (varies by system)
• Toyota: 38-44 PSI

DIRECT INJECTION (Petrol):
• Low pressure pump: 50-80 PSI
• High pressure pump: 500-2000+ PSI
• Rail pressure sensor critical

DIESEL SYSTEMS:
• Lift/Transfer pump: 5-15 PSI
• Common rail: 20,000-30,000+ PSI
• Air in system = no start

Testing Procedure:
1. Install fuel pressure gauge at test port
2. Key ON, engine OFF: Note pressure
3. Start engine: Pressure should increase
4. Rev to 2000 RPM: Maintain pressure
5. Snap throttle: Watch for drop

Acceptable Values:
• Within 5 PSI of spec at key on
• Within 3 PSI of spec when running
• No drop >5 PSI on throttle snap
• Hold pressure 5+ min after key off`
  },
  {
    id: 3,
    category: "Electrical",
    title: "Voltage Drop Testing",
    description: "Ground, power, starter circuit specifications",
    content: `Voltage Drop Testing Specifications:

MAXIMUM ACCEPTABLE DROPS:
• Ground circuits: 0.2V maximum
• Power circuits: 0.4V maximum
• Starter circuit: 0.5V maximum
• Charging circuit: 0.2V maximum

Testing Procedure:
1. Set multimeter to DC volts (20V scale)
2. Connect black lead to battery negative
3. Connect red lead to component ground
4. Activate circuit/component
5. Read voltage drop

Common Test Points:
• Battery (-) to engine block: <0.1V
• Battery (-) to body ground: <0.1V
• Battery (+) to starter: <0.5V
• Fuse to component: <0.2V
• Relay contacts: <0.1V
• Alternator B+ to battery: <0.2V

High Resistance Indicators:
• Voltage drop exceeds spec
• Heat at connection point
• Visible corrosion
• Loose/damaged terminals
• Intermittent operation

Repair Procedures:
• Clean connections with wire brush
• Apply dielectric grease
• Replace damaged wires
• Ensure tight connections
• Retest after repair`
  },
  {
    id: 4,
    category: "Sensors",
    title: "Sensor Testing Specifications",
    description: "O2, MAF, MAP, TPS, CKP, CMP, temp sensors",
    content: `Sensor Testing Quick Reference:

OXYGEN SENSORS (O2):
• Warm engine: 0.1-0.9V cycling (1-3 sec)
• Cold engine: ~0.45V fixed
• Heater circuit: 2-10 ohms
• Response time: <100ms
• Replace at 100k miles

MASS AIR FLOW (MAF):
• Key on: 0.5-0.8V
• Idle: 1.5-2.5V
• 2000 RPM: 2.5-4.0V
• Clean with MAF cleaner only

MANIFOLD ABSOLUTE PRESSURE (MAP):
• Key on, engine off: 4.5-4.8V (1 bar)
• Idle: 1.0-2.0V (vacuum)
• WOT: 4.5V (atmospheric)
• Check vacuum hose

THROTTLE POSITION SENSOR (TPS):
• Closed throttle: 0.5-0.9V
• Wide open: 4.5-5.0V
• Smooth sweep when opening
• No dead spots or glitches

CRANKSHAFT/CAMSHAFT POSITION:
• AC voltage: 0.5-2.0V AC
• Resistance: 200-900 ohms typical
• Air gap: 0.020-0.050 inches
• Check tone ring/reluctor

COOLANT TEMPERATURE:
• Cold (70°F): 2000-3000 ohms
• Warm (200°F): 200-400 ohms
• Test with thermometer + ohmmeter
• Replace if out of spec >10%`
  },
  {
    id: 5,
    category: "Diesel",
    title: "Diesel Engine Specifications",
    description: "Glow plugs, compression, fuel system specs",
    content: `Diesel Engine Specific Testing:

GLOW PLUGS:
• Resistance: 0.5-2 ohms when COLD
• Voltage: 11-12V when activated
• Glow time: 5-30 seconds (longer when cold)
• Test individually with multimeter
• Replace all if one fails

COMPRESSION:
• Diesel: 350-500 PSI (MUCH higher than petrol!)
• All cylinders within 10% of each other
• Low on one = valve/head gasket
• Low on all = worn rings
• White smoke = coolant in chamber

FUEL SYSTEM:
• Lift pump: 5-15 PSI
• Bleed air: Start at filter, work to pump
• Water separator: Drain regularly
• Common rail: 20,000-30,000 PSI
• Injector balance: Within 2mm³
• Check for air leaks when off

DIESEL SPECIFIC ISSUES:
• Air in fuel = won't start
• Water in fuel = damage injectors
• Fuel gelling in cold weather
• DPF regeneration required
• EGR valve carbon buildup

BATTERY REQUIREMENTS:
• Minimum 600 CCA (Cold Cranking Amps)
• 800+ CCA recommended
• Cold weather drains faster
• Load test critical`
  },
  {
    id: 6,
    category: "HVAC",
    title: "AC System Pressures & Diagnostics",
    description: "Refrigerant pressures, superheat, subcooling",
    content: `AC System Pressure & Testing:

STATIC PRESSURE (Engine Off):
• 70°F ambient: 55-75 PSI both sides
• 80°F ambient: 85-105 PSI both sides
• 90°F ambient: 105-125 PSI both sides
• Both sides should equalize

DYNAMIC PRESSURES (Running):
At 75°F Ambient:
• Low side: 25-45 PSI
• High side: 200-250 PSI

At 90°F Ambient:
• Low side: 30-50 PSI
• High side: 250-300 PSI

SUPERHEAT CALCULATION:
Superheat = Suction temp - Evap temp
• Normal: 10-20°F
• High = undercharge or restriction
• Low = overcharge

SUBCOOLING CALCULATION:
Subcooling = Condenser temp - Liquid temp
• Normal: 10-15°F
• High = overcharge
• Low = undercharge

COMMON ISSUES:
• Low on both sides = low charge
• High on both = overcharge/airflow
• Low on low, high on high = restriction
• High on low, low on high = compressor

REFRIGERANT CAPACITY:
• Check underhood label
• Typically 1.5-3 lbs automotive
• Never overcharge
• Evacuate before recharge`
  }
];

const TechnicalReference = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRef, setSelectedRef] = useState(null);

  const filteredRefs = technicalReferences.filter(ref =>
    ref.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ref.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ref.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => selectedRef ? setSelectedRef(null) : navigate('/')}
              className="flex items-center text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Book className="w-6 h-6 text-blue-400" />
                <h1 className="text-2xl font-bold text-white">Technical Reference</h1>
              </div>
              <p className="text-sm text-slate-400">Quick reference guides and specifications</p>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedRef ? (
          <>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search technical references..."
                  className="pl-10 bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* Reference List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRefs.map((ref) => (
                <Card
                  key={ref.id}
                  onClick={() => setSelectedRef(ref)}
                  className="bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-blue-500 transition-all cursor-pointer group"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                        <Book className="w-6 h-6 text-blue-400" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <div className="text-xs font-semibold text-blue-400 mb-2">{ref.category}</div>
                    <CardTitle className="text-white text-lg">{ref.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-400">{ref.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          /* Reference Detail */
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="text-xs font-semibold text-blue-400 mb-2">{selectedRef.category}</div>
              <CardTitle className="text-white text-2xl">{selectedRef.title}</CardTitle>
              <p className="text-slate-400 mt-2">{selectedRef.description}</p>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                <pre className="text-sm text-slate-200 whitespace-pre-wrap font-mono">
                  {selectedRef.content}
                </pre>
              </div>
              <Button
                onClick={() => setSelectedRef(null)}
                className="mt-6 bg-blue-600 hover:bg-blue-700 w-full"
              >
                Back to References
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TechnicalReference;
