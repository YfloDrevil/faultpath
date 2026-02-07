from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM setup
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Pre-built diagnostic flows
DIAGNOSTIC_FLOWS = {
    "crank_no_start": {
        "title": "Crank No Start",
        "category": "Automotive",
        "description": "Engine cranks but won't start",
        "questions": [
            {
                "id": "q1",
                "question": "Do you have spark at the spark plugs?",
                "options": [
                    {"value": "yes", "label": "Yes - spark present", "next": "q2"},
                    {"value": "no", "label": "No spark", "diagnosis": "ignition_system"}
                ]
            },
            {
                "id": "q2",
                "question": "What is the fuel pressure reading?",
                "options": [
                    {"value": "normal", "label": "Normal pressure (55-65 PSI)", "next": "q3"},
                    {"value": "low", "label": "Low pressure (<40 PSI)", "diagnosis": "fuel_pressure"},
                    {"value": "zero", "label": "Zero pressure", "diagnosis": "fuel_pump"}
                ]
            },
            {
                "id": "q3",
                "question": "Can you hear the fuel pump prime when key is turned on?",
                "options": [
                    {"value": "yes", "label": "Yes - 2 second hum", "next": "q4"},
                    {"value": "no", "label": "No sound", "diagnosis": "fuel_pump_electrical"}
                ]
            },
            {
                "id": "q4",
                "question": "What color is the spark plug(s)?",
                "options": [
                    {"value": "tan", "label": "Tan/light brown - normal", "diagnosis": "compression_timing"},
                    {"value": "wet", "label": "Wet with fuel", "diagnosis": "flooded_engine"},
                    {"value": "black", "label": "Black/sooty", "diagnosis": "rich_mixture"},
                    {"value": "white", "label": "White/ashy", "diagnosis": "lean_mixture"}
                ]
            }
        ],
        "diagnoses": {
            "ignition_system": {
                "title": "Ignition System Failure",
                "probability": "HIGH",
                "causes": [
                    "Faulty ignition coil(s)",
                    "Bad crankshaft position sensor (CKP)",
                    "Failed ignition module/PCM",
                    "Broken timing belt/chain",
                    "Bad camshaft position sensor (CMP)"
                ],
                "tests": [
                    "Check CKP sensor resistance: 200-900 ohms typical",
                    "Check CMP sensor resistance: 200-900 ohms typical",
                    "Test ignition coil primary: 0.4-2 ohms, secondary: 6,000-30,000 ohms",
                    "Check for RPM signal on scan tool while cranking",
                    "Verify timing belt/chain alignment with timing marks"
                ],
                "repair": [
                    "Replace faulty CKP sensor if resistance out of spec",
                    "Replace ignition coils if primary/secondary resistance out of spec",
                    "Replace timing belt/chain if jumped or broken",
                    "Clear codes and verify repair with test drive"
                ],
                "parts": ["CKP sensor ($50-150)", "Ignition coils ($40-200 each)", "Timing belt kit ($150-400)"],
                "time": "1-4 hours depending on issue"
            },
            "fuel_pressure": {
                "title": "Low Fuel Pressure",
                "probability": "HIGH",
                "causes": [
                    "Weak fuel pump",
                    "Clogged fuel filter",
                    "Leaking fuel pressure regulator",
                    "Restricted fuel line",
                    "Bad fuel pump relay"
                ],
                "tests": [
                    "Install fuel pressure gauge: Key on = 55-62 PSI, Running = 58-65 PSI",
                    "Check fuel filter for restrictions",
                    "Test fuel pump amperage draw: 4-6 amps typical",
                    "Check fuel pressure regulator vacuum line for fuel",
                    "Verify fuel pump relay clicking and providing 12V"
                ],
                "repair": [
                    "Replace fuel filter first ($20-50, 30 minutes)",
                    "Replace fuel pump if weak ($200-600, 2-3 hours)",
                    "Replace fuel pressure regulator if leaking ($50-150, 1 hour)",
                    "Clear codes, verify pressure readings, test drive"
                ],
                "parts": ["Fuel filter ($20-50)", "Fuel pump ($200-600)", "Pressure regulator ($50-150)"],
                "time": "30 minutes - 3 hours"
            },
            "fuel_pump": {
                "title": "Fuel Pump Failure",
                "probability": "CRITICAL",
                "causes": [
                    "Failed fuel pump motor",
                    "No power to fuel pump",
                    "Blown fuel pump fuse",
                    "Bad fuel pump relay",
                    "Faulty PCM fuel pump driver"
                ],
                "tests": [
                    "Check fuel pump fuse (15-20A typical) - replace if blown",
                    "Check fuel pump relay - swap with similar relay to test",
                    "Test voltage at fuel pump connector: Should be 12V when cranking",
                    "Listen for fuel pump prime with helper turning key on",
                    "Check fuel pump ground circuit: Should be <0.2V drop"
                ],
                "repair": [
                    "Replace blown fuse, find short if it blows again",
                    "Replace fuel pump relay ($15-30, 5 minutes)",
                    "Repair wiring if voltage missing at pump",
                    "Replace fuel pump if power/ground OK but no prime ($200-600, 2-3 hours)",
                    "Clear codes, verify operation"
                ],
                "parts": ["Fuel pump fuse ($2-5)", "Fuel pump relay ($15-30)", "Fuel pump ($200-600)"],
                "time": "15 minutes - 3 hours"
            }
        }
    },
    "no_crank_no_start": {
        "title": "No Crank No Start",
        "category": "Automotive",
        "description": "Engine won't crank when key is turned",
        "questions": [
            {
                "id": "q1",
                "question": "What happens when you turn the key to start?",
                "options": [
                    {"value": "click", "label": "Single click sound", "next": "q2"},
                    {"value": "nothing", "label": "Nothing - no sound at all", "next": "q3"},
                    {"value": "rapid_click", "label": "Rapid clicking", "diagnosis": "low_battery"}
                ]
            },
            {
                "id": "q2",
                "question": "Do the dashboard lights dim when you turn the key?",
                "options": [
                    {"value": "yes", "label": "Yes - lights dim", "diagnosis": "bad_starter"},
                    {"value": "no", "label": "No - lights stay bright", "diagnosis": "starter_circuit"}
                ]
            },
            {
                "id": "q3",
                "question": "Do the dashboard lights come on with key on?",
                "options": [
                    {"value": "yes", "label": "Yes - dash lights work", "next": "q4"},
                    {"value": "no", "label": "No - completely dead", "diagnosis": "battery_dead"}
                ]
            },
            {
                "id": "q4",
                "question": "Is the vehicle an automatic transmission?",
                "options": [
                    {"value": "yes", "label": "Yes - automatic", "next": "q5"},
                    {"value": "no", "label": "No - manual", "next": "q6"}
                ]
            },
            {
                "id": "q5",
                "question": "Can you shift out of park easily?",
                "options": [
                    {"value": "yes", "label": "Yes - shifts normally", "diagnosis": "neutral_safety"},
                    {"value": "no", "label": "No - stuck in park", "diagnosis": "shift_interlock"}
                ]
            },
            {
                "id": "q6",
                "question": "Is the clutch pedal depressed when trying to start?",
                "options": [
                    {"value": "yes", "label": "Yes - clutch pressed", "diagnosis": "clutch_switch"},
                    {"value": "no", "label": "No - not pressed", "diagnosis": "clutch_required"}
                ]
            }
        ],
        "diagnoses": {
            "low_battery": {
                "title": "Low Battery Voltage",
                "probability": "CRITICAL",
                "causes": ["Weak/discharged battery", "Bad alternator", "Parasitic drain", "Corroded battery terminals"],
                "tests": [
                    "Test battery voltage: Key off = 12.6V, Key on = 12.4V minimum",
                    "Load test battery: Should maintain 9.6V under load",
                    "Check alternator output: 13.8-14.5V at 2000 RPM",
                    "Check for corrosion on battery terminals",
                    "Test for parasitic drain: <50mA with everything off"
                ],
                "repair": [
                    "Clean battery terminals with wire brush and baking soda solution",
                    "Charge battery with charger to 12.6V",
                    "Load test - replace battery if fails test ($100-200, 30 min)",
                    "Replace alternator if output low ($200-500, 1-2 hours)",
                    "Find and repair parasitic drain source"
                ],
                "parts": ["Battery ($100-200)", "Battery terminals ($10-20)", "Alternator ($200-500)"],
                "time": "30 minutes - 2 hours"
            },
            "bad_starter": {
                "title": "Failed Starter Motor",
                "probability": "HIGH",
                "causes": ["Worn starter motor", "Bad starter solenoid", "Seized engine", "Flywheel ring gear damaged"],
                "tests": [
                    "Tap starter with hammer while someone turns key - if it works, starter is bad",
                    "Check voltage at starter during crank: Should be 10V minimum",
                    "Test starter amperage draw: 80-150A typical, >250A indicates problem",
                    "Try to rotate engine by hand - should turn freely",
                    "Inspect flywheel ring gear for damaged teeth"
                ],
                "repair": [
                    "Remove starter motor (2-4 bolts, typically 1-2 hours)",
                    "Bench test starter: Should spin freely, draw 80-150A",
                    "Replace starter if failed ($150-400, 1-2 hours)",
                    "Replace flywheel if ring gear damaged ($300-800, 4-6 hours)",
                    "Verify 12V at solenoid trigger wire during start"
                ],
                "parts": ["Starter motor ($150-400)", "Starter solenoid ($30-80)", "Flywheel ($300-800)"],
                "time": "1-6 hours depending on issue"
            }
        }
    },
    "hydraulic_system": {
        "title": "Hydraulic System Diagnostics",
        "category": "Heavy Equipment",
        "description": "Hydraulic system troubleshooting",
        "questions": [
            {
                "id": "q1",
                "question": "What is the primary symptom?",
                "options": [
                    {"value": "slow", "label": "Slow operation", "next": "q2"},
                    {"value": "no_function", "label": "No function at all", "next": "q3"},
                    {"value": "erratic", "label": "Erratic/jerky movement", "diagnosis": "air_in_system"},
                    {"value": "leaking", "label": "External leaking", "diagnosis": "hydraulic_leak"}
                ]
            },
            {
                "id": "q2",
                "question": "What is the system pressure reading?",
                "options": [
                    {"value": "normal", "label": "Normal (2500-3000 PSI)", "next": "q4"},
                    {"value": "low", "label": "Low (<2000 PSI)", "diagnosis": "low_pressure"},
                    {"value": "zero", "label": "Zero pressure", "diagnosis": "pump_failure"}
                ]
            },
            {
                "id": "q3",
                "question": "Can you hear the hydraulic pump running?",
                "options": [
                    {"value": "yes", "label": "Yes - pump running", "next": "q2"},
                    {"value": "no", "label": "No - pump not running", "diagnosis": "pump_drive"}
                ]
            },
            {
                "id": "q4",
                "question": "What is the hydraulic oil temperature?",
                "options": [
                    {"value": "normal", "label": "Normal (110-140°F)", "diagnosis": "internal_leakage"},
                    {"value": "hot", "label": "Hot (>180°F)", "diagnosis": "overheating"},
                    {"value": "cold", "label": "Cold (<80°F)", "diagnosis": "cold_oil"}
                ]
            }
        ],
        "diagnoses": {
            "low_pressure": {
                "title": "Low Hydraulic Pressure",
                "probability": "HIGH",
                "causes": ["Worn hydraulic pump", "Relief valve set too low", "Internal leakage", "Restricted filter", "Low oil level"],
                "tests": [
                    "Check hydraulic oil level in reservoir - should be at FULL mark",
                    "Install pressure gauge at pump output: Should read 2500-3000 PSI at full load",
                    "Check relief valve setting: Adjust to spec (typically 3000 PSI)",
                    "Check filter restriction indicator - replace if restricted",
                    "Test pump flow rate: Should match spec (15-25 GPM typical)"
                ],
                "repair": [
                    "Add hydraulic oil to proper level (ISO VG 46 or per spec)",
                    "Replace hydraulic filter ($30-100, 30 minutes)",
                    "Adjust relief valve to proper pressure setting",
                    "Replace hydraulic pump if worn ($800-3000, 4-8 hours)",
                    "Flush system if contaminated"
                ],
                "parts": ["Hydraulic oil (5-20 gal, $50-200)", "Filters ($30-100)", "Pump ($800-3000)"],
                "time": "30 minutes - 8 hours"
            },
            "pump_failure": {
                "title": "Hydraulic Pump Failure",
                "probability": "CRITICAL",
                "causes": ["Seized pump", "Broken pump drive", "Sheared coupling", "No oil in reservoir"],
                "tests": [
                    "Check oil level - CRITICAL: pump will fail if run dry",
                    "Check pump drive coupling for damage",
                    "Try to rotate pump by hand - should turn with some resistance",
                    "Check for metal contamination in oil - indicates pump failure",
                    "Verify PTO or pump drive is engaging"
                ],
                "repair": [
                    "If seized: Replace hydraulic pump ($800-3000, 4-8 hours)",
                    "If coupling broken: Replace coupling ($100-300, 2-3 hours)",
                    "Flush entire system if metal contamination present",
                    "Replace all filters after pump replacement",
                    "Fill to proper level, bleed air from system"
                ],
                "parts": ["Hydraulic pump ($800-3000)", "Drive coupling ($100-300)", "Filters ($30-100)"],
                "time": "2-8 hours"
            }
        }
    },
    "transmission": {
        "title": "Transmission/Gearbox",
        "category": "Automotive",
        "description": "Transmission problems",
        "questions": [
            {
                "id": "q1",
                "question": "Is this an automatic or manual transmission?",
                "options": [
                    {"value": "auto", "label": "Automatic", "next": "q2"},
                    {"value": "manual", "label": "Manual", "next": "q5"}
                ]
            },
            {
                "id": "q2",
                "question": "What is the primary issue?",
                "options": [
                    {"value": "no_shift", "label": "Won't shift out of park", "diagnosis": "shift_lock"},
                    {"value": "slipping", "label": "Slipping/high RPM", "next": "q3"},
                    {"value": "harsh", "label": "Harsh shifting", "next": "q4"},
                    {"value": "no_engage", "label": "Won't engage any gear", "diagnosis": "trans_failure"}
                ]
            },
            {
                "id": "q3",
                "question": "When does the slipping occur?",
                "options": [
                    {"value": "all_gears", "label": "All gears", "diagnosis": "low_fluid"},
                    {"value": "one_gear", "label": "Specific gear only", "diagnosis": "clutch_pack"},
                    {"value": "upshift", "label": "During upshifts only", "diagnosis": "solenoid"}
                ]
            },
            {
                "id": "q4",
                "question": "Have you checked the transmission fluid level?",
                "options": [
                    {"value": "yes_ok", "label": "Yes - level is OK", "diagnosis": "valve_body"},
                    {"value": "yes_low", "label": "Yes - level is low", "diagnosis": "low_fluid"},
                    {"value": "no", "label": "Not checked yet", "diagnosis": "check_fluid_first"}
                ]
            },
            {
                "id": "q5",
                "question": "What is the clutch issue?",
                "options": [
                    {"value": "slipping", "label": "Clutch slipping", "diagnosis": "worn_clutch"},
                    {"value": "no_disengage", "label": "Won't disengage", "diagnosis": "clutch_hydraulic"},
                    {"value": "noise", "label": "Grinding noise shifting", "diagnosis": "synchro"},
                    {"value": "hard_shift", "label": "Hard to shift", "diagnosis": "linkage"}
                ]
            }
        ],
        "diagnoses": {
            "low_fluid": {
                "title": "Low Transmission Fluid",
                "probability": "HIGH",
                "causes": ["Fluid leak", "Worn seals", "Cooler line leak", "Pan gasket leak"],
                "tests": [
                    "Check fluid level with engine running, trans in park, on level ground",
                    "Check fluid condition: Should be red/pink, not brown/burnt",
                    "Look for leaks: pan, cooler lines, seals, torque converter",
                    "Check for ATF in coolant (indicates cooler leak)",
                    "Perform pressure test: 50-150 PSI typical at idle"
                ],
                "repair": [
                    "Add correct ATF fluid to proper level (Dexron VI, Mercon V, etc.)",
                    "Replace pan gasket if leaking ($20-50, 1 hour)",
                    "Replace cooler lines if leaking ($30-80, 1-2 hours)",
                    "Replace input/output shaft seals ($50-200, 2-4 hours)",
                    "Scan for codes, test drive, recheck level"
                ],
                "parts": ["ATF fluid ($10-20/qt)", "Pan gasket ($20-50)", "Seals ($50-200)"],
                "time": "1-4 hours"
            },
            "clutch_pack": {
                "title": "Worn Clutch Pack",
                "probability": "HIGH",
                "causes": ["Normal wear", "Burnt clutches", "Low fluid", "Overheating"],
                "tests": [
                    "Scan for transmission codes - will show clutch slip codes",
                    "Perform stall test: Should be 2200-2800 RPM, higher indicates slip",
                    "Check fluid for burnt smell and dark color",
                    "Monitor transmission temp: Should be 175-200°F normal",
                    "Road test - note which gear slips"
                ],
                "repair": [
                    "Transmission rebuild required ($1500-3500, 8-20 hours)",
                    "Replace specific clutch pack ($800-2000, 6-12 hours)",
                    "Replace all friction plates and steels",
                    "Replace filter and fluid",
                    "Perform relearn procedure after repair"
                ],
                "parts": ["Rebuild kit ($400-800)", "Clutch pack ($300-600)", "Filter ($30-60)"],
                "time": "6-20 hours"
            },
            "worn_clutch": {
                "title": "Worn Clutch (Manual)",
                "probability": "HIGH",
                "causes": ["Normal wear", "Riding clutch", "Oil contamination", "Worn pressure plate"],
                "tests": [
                    "Test clutch engagement height - should be mid-pedal",
                    "Check for slipping under load (high gear, low RPM acceleration)",
                    "Inspect clutch hydraulic fluid level",
                    "Check for oil leaks on clutch disc (rear main seal)",
                    "Test pressure plate release fingers"
                ],
                "repair": [
                    "Replace clutch kit: disc, pressure plate, throwout bearing ($200-500, 4-8 hours)",
                    "Resurface or replace flywheel ($100-300 additional)",
                    "Replace rear main seal if leaking ($50-150 additional)",
                    "Bleed clutch hydraulic system",
                    "Road test and verify proper operation"
                ],
                "parts": ["Clutch kit ($200-500)", "Flywheel ($100-300)", "Hydraulic fluid ($10-15)"],
                "time": "4-8 hours"
            }
        }
    },
    "air_brakes": {
        "title": "Air Brake System",
        "category": "Heavy Equipment",
        "description": "Air brake diagnostics",
        "questions": [
            {
                "id": "q1",
                "question": "What is the primary issue?",
                "options": [
                    {"value": "low_pressure", "label": "Low air pressure", "next": "q2"},
                    {"value": "no_brakes", "label": "No braking power", "next": "q3"},
                    {"value": "dragging", "label": "Brakes dragging", "diagnosis": "brake_drag"},
                    {"value": "air_leak", "label": "Audible air leak", "diagnosis": "air_leak_check"}
                ]
            },
            {
                "id": "q2",
                "question": "What is the air pressure reading?",
                "options": [
                    {"value": "slow_build", "label": "Builds slowly (>2 min to 120 PSI)", "next": "q4"},
                    {"value": "wont_build", "label": "Won't build above 80 PSI", "diagnosis": "compressor"},
                    {"value": "drops_fast", "label": "Builds OK but drops fast", "diagnosis": "major_leak"}
                ]
            },
            {
                "id": "q3",
                "question": "Is air pressure above 90 PSI?",
                "options": [
                    {"value": "yes", "label": "Yes - pressure OK", "diagnosis": "brake_chamber"},
                    {"value": "no", "label": "No - low pressure", "next": "q2"}
                ]
            },
            {
                "id": "q4",
                "question": "Can you hear the compressor running?",
                "options": [
                    {"value": "yes", "label": "Yes - constantly running", "diagnosis": "air_leak_check"},
                    {"value": "no", "label": "No - not running enough", "diagnosis": "compressor"}
                ]
            }
        ],
        "diagnoses": {
            "compressor": {
                "title": "Air Compressor Failure",
                "probability": "HIGH",
                "causes": ["Worn compressor", "Broken compressor drive", "Stuck unloader valve", "Blown head gasket"],
                "tests": [
                    "Check compressor drive belt tension - should not slip",
                    "Listen for compressor operation during pressure build",
                    "Check compressor output: Should build 0-120 PSI in <2 minutes",
                    "Test unloader valve operation at governor cut-out (120 PSI)",
                    "Check for oil in air lines (indicates compressor wear)"
                ],
                "repair": [
                    "Replace air compressor ($500-1500, 3-5 hours)",
                    "Replace compressor drive belt ($30-80, 30 minutes)",
                    "Replace unloader valve ($50-150, 1 hour)",
                    "Rebuild compressor if available ($300-800, 4-6 hours)",
                    "Replace air dryer cartridge after compressor work ($80-200)"
                ],
                "parts": ["Air compressor ($500-1500)", "Drive belt ($30-80)", "Unloader valve ($50-150)"],
                "time": "1-6 hours"
            },
            "major_leak": {
                "title": "Major Air System Leak",
                "probability": "CRITICAL",
                "causes": ["Cracked air line", "Failed air tank", "Leaking brake chamber", "Failed air dryer"],
                "tests": [
                    "Build air to 120 PSI, shut off engine",
                    "Listen for air leaks at: tanks, chambers, valves, lines",
                    "Spray soapy water on connections to find leaks",
                    "System should not drop more than 3 PSI/minute at 120 PSI",
                    "Apply brakes - should not drop more than 6 PSI/minute"
                ],
                "repair": [
                    "Replace cracked air lines ($20-100, 1-2 hours)",
                    "Replace leaking brake chambers ($80-200 each, 1-2 hours per)",
                    "Replace air dryer if leaking ($200-500, 2-3 hours)",
                    "Replace air tank if rusted/cracked ($150-400, 2-4 hours)",
                    "Pressure test entire system after repairs"
                ],
                "parts": ["Air lines ($20-100)", "Brake chambers ($80-200)", "Air dryer ($200-500)"],
                "time": "1-6 hours depending on location"
            },
            "brake_chamber": {
                "title": "Brake Chamber/Slack Adjuster",
                "probability": "HIGH",
                "causes": ["Out of adjustment slack adjuster", "Worn brake chamber", "Frozen S-cam", "Broken return spring"],
                "tests": [
                    "Check pushrod travel: Should be 1.5-2 inches when brakes applied",
                    "If >2 inches: brakes need adjustment",
                    "Check slack adjuster operation - should self-adjust",
                    "Inspect brake chamber for air leaks",
                    "Check S-cam bushings for wear"
                ],
                "repair": [
                    "Adjust slack adjusters to spec (1.5-2\" travel, 30 minutes)",
                    "Replace brake chambers if leaking ($80-200 each, 1 hour)",
                    "Replace slack adjusters if worn ($40-100 each, 1 hour)",
                    "Lubricate S-cam and bushings",
                    "Replace brake shoes if worn ($100-200 per axle, 2-3 hours)"
                ],
                "parts": ["Brake chambers ($80-200)", "Slack adjusters ($40-100)", "Brake shoes ($100-200)"],
                "time": "30 minutes - 4 hours"
            }
        }
    },
    "hybrid_system": {
        "title": "Hybrid System Diagnostics",
        "category": "Hybrid/Electric",
        "description": "Hybrid vehicle troubleshooting",
        "questions": [
            {
                "id": "q1",
                "question": "What is the primary symptom?",
                "options": [
                    {"value": "no_start", "label": "Won't start/go to READY", "next": "q2"},
                    {"value": "warning_light", "label": "Hybrid system warning light", "diagnosis": "scan_codes"},
                    {"value": "no_ev", "label": "Won't run in EV mode", "next": "q3"},
                    {"value": "reduced_power", "label": "Reduced power mode", "diagnosis": "scan_codes"}
                ]
            },
            {
                "id": "q2",
                "question": "Does the 12V battery have proper voltage?",
                "options": [
                    {"value": "yes", "label": "Yes - 12.6V or higher", "next": "q4"},
                    {"value": "no", "label": "No - low voltage", "diagnosis": "12v_battery"},
                    {"value": "not_checked", "label": "Haven't checked", "diagnosis": "check_12v_first"}
                ]
            },
            {
                "id": "q3",
                "question": "What is the hybrid battery state of charge?",
                "options": [
                    {"value": "normal", "label": "Normal (40-80%)", "diagnosis": "hybrid_control"},
                    {"value": "low", "label": "Low (<20%)", "diagnosis": "hv_battery_low"},
                    {"value": "unknown", "label": "Can't determine", "diagnosis": "scan_codes"}
                ]
            },
            {
                "id": "q4",
                "question": "Do you hear the HV system relays click when pressing power button?",
                "options": [
                    {"value": "yes", "label": "Yes - relays click", "diagnosis": "hv_interlock"},
                    {"value": "no", "label": "No - no click", "diagnosis": "hv_relay"}
                ]
            }
        ],
        "diagnoses": {
            "scan_codes": {
                "title": "Scan Hybrid System Codes",
                "probability": "CRITICAL",
                "causes": ["Various hybrid system faults"],
                "tests": [
                    "Connect scan tool capable of reading hybrid codes (HDS, Techstream, etc.)",
                    "Read all DTCs from: PCM, HV ECU, Battery ECU, Inverter",
                    "Record freeze frame data for all codes",
                    "Check HV battery voltage: Should be 200-300V nominal",
                    "Monitor HV battery module voltages: All should be within 0.5V"
                ],
                "repair": [
                    "Common codes and fixes:",
                    "P0A80 - HV Battery Pack Failure: Check module voltages, may need cell replacement",
                    "P3000-P3999 - HV Battery Deterioration: Battery capacity test needed",
                    "P0A0F - Hybrid Battery Cooling Fan: Replace fan or clean vents",
                    "P0AA6 - Hybrid Battery Positive Contactor: Replace main relay assembly",
                    "U0100 - Lost Communication: Check 12V battery, HV system fuse"
                ],
                "parts": ["Varies by code - battery modules ($1000-3000)", "HV relays ($200-500)"],
                "time": "1-8 hours depending on issue"
            },
            "12v_battery": {
                "title": "12V Auxiliary Battery",
                "probability": "HIGH",
                "causes": ["Weak 12V battery", "Corroded terminals", "Failed DC-DC converter"],
                "tests": [
                    "Test 12V battery: Should be 12.6V key off, 14.2V when READY",
                    "Load test 12V battery: Should maintain 9.6V under load",
                    "Check DC-DC converter output when READY: 13.8-14.5V",
                    "Check for parasitic drain: <50mA with vehicle off",
                    "Inspect 12V battery terminals for corrosion"
                ],
                "repair": [
                    "Clean battery terminals thoroughly",
                    "Replace 12V battery if weak ($150-250, 30 minutes)",
                    "Replace DC-DC converter if no output ($500-1200, 2-3 hours)",
                    "Check for parasitic drain sources",
                    "Verify hybrid system boots after 12V repair"
                ],
                "parts": ["12V battery ($150-250)", "DC-DC converter ($500-1200)", "Terminals ($15-30)"],
                "time": "30 minutes - 3 hours"
            },
            "hv_battery_low": {
                "title": "High Voltage Battery Depleted",
                "probability": "MEDIUM",
                "causes": ["Battery not charging", "Long term storage", "Failed charging system"],
                "tests": [
                    "Check HV battery voltage: Should be 200-300V (varies by vehicle)",
                    "Start engine and monitor HV battery charging",
                    "Check generator/motor-generator operation",
                    "Verify battery cooling fan operation",
                    "Check for HV battery insulation resistance: >500 kOhm to chassis"
                ],
                "repair": [
                    "Allow vehicle to charge HV battery (may take 30-60 minutes of running)",
                    "Check and clean HV battery cooling vents/filters",
                    "Replace HV battery cooling fan if failed ($150-400)",
                    "If won't charge: Check HV fuse, main relay, inverter",
                    "Complete recharge cycle: Drive for 20-30 minutes"
                ],
                "parts": ["HV cooling fan ($150-400)", "HV fuse ($20-50)"],
                "time": "30 minutes - 2 hours"
            },
            "hv_interlock": {
                "title": "HV System Interlock Open",
                "probability": "HIGH",
                "causes": ["Service plug removed", "Interlock circuit open", "Crash sensor triggered"],
                "tests": [
                    "SAFETY: Wear insulated gloves rated for HV work (Class 00 minimum)",
                    "Check HV service plug is fully installed in battery pack",
                    "Test interlock circuit continuity: Should be <1 ohm",
                    "Check crash sensors have not triggered",
                    "Verify all HV connectors are fully seated",
                    "Check HV relay operation with scan tool"
                ],
                "repair": [
                    "Reinstall HV service plug if removed",
                    "Repair interlock circuit if open ($100-300, 1-2 hours)",
                    "Reset crash sensor if triggered (scan tool procedure)",
                    "Replace damaged HV connectors ($50-200 each)",
                    "Clear codes and verify READY mode"
                ],
                "parts": ["Interlock connector ($50-150)", "HV service plug ($80-200)"],
                "time": "30 minutes - 2 hours"
            }
        }
    },
    "excavator": {
        "title": "Excavator Diagnostics",
        "category": "Heavy Equipment",
        "description": "Excavator hydraulic and engine issues",
        "questions": [
            {
                "id": "q1",
                "question": "What system is having issues?",
                "options": [
                    {"value": "boom", "label": "Boom (main arm) slow or no movement", "next": "q2"},
                    {"value": "swing", "label": "Swing motor not turning", "next": "q3"},
                    {"value": "travel", "label": "Travel motor issues", "next": "q4"},
                    {"value": "engine", "label": "Engine performance issues", "diagnosis": "engine_power"}
                ]
            },
            {
                "id": "q2",
                "question": "Does the bucket or stick work normally?",
                "options": [
                    {"value": "yes", "label": "Yes - only boom affected", "diagnosis": "boom_cylinder"},
                    {"value": "no", "label": "No - all functions slow", "diagnosis": "main_pump"}
                ]
            },
            {
                "id": "q3",
                "question": "Can you hear the swing motor engaging?",
                "options": [
                    {"value": "yes", "label": "Yes - motor tries but won't turn", "diagnosis": "swing_brake"},
                    {"value": "no", "label": "No - no sound at all", "diagnosis": "swing_motor"}
                ]
            },
            {
                "id": "q4",
                "question": "Which track is affected?",
                "options": [
                    {"value": "both", "label": "Both tracks weak/slow", "diagnosis": "travel_pump"},
                    {"value": "one", "label": "Only one track", "diagnosis": "travel_motor_single"}
                ]
            }
        ],
        "diagnoses": {
            "boom_cylinder": {
                "title": "Boom Cylinder or Control Valve Issue",
                "probability": "HIGH",
                "causes": ["Leaking boom cylinder seals", "Spool valve wear", "Pilot pressure low", "Cylinder rod bent/scored"],
                "tests": [
                    "Check pilot pressure: Should be 28-35 PSI at joystick",
                    "Test main hydraulic pressure: Should be 4500-5000 PSI at boom circuit",
                    "Inspect boom cylinder for external leaks and scoring",
                    "Check cylinder drift: Raise boom, shut off engine, measure drop in 5 minutes (<2 inches OK)",
                    "Test control valve spool movement - should move freely"
                ],
                "repair": [
                    "Replace boom cylinder seals ($200-800, 6-10 hours)",
                    "Rebuild control valve spool ($500-1500, 8-12 hours)",
                    "Check and adjust pilot pressure to spec",
                    "Replace cylinder if rod bent/scored ($2000-5000, 10-16 hours)",
                    "Flush hydraulic system, change filters"
                ],
                "parts": ["Cylinder seal kit ($200-800)", "Control valve rebuild ($500-1500)", "Hydraulic filters ($50-150)"],
                "time": "6-16 hours"
            },
            "main_pump": {
                "title": "Main Hydraulic Pump Failure",
                "probability": "CRITICAL",
                "causes": ["Worn pump", "Low oil level", "Contaminated oil", "Broken pump drive"],
                "tests": [
                    "Check hydraulic oil level - MUST be at FULL mark",
                    "Check oil condition - look for metal particles, milky appearance",
                    "Test main pump pressure: Should be 4500-5000 PSI",
                    "Listen for pump whining/grinding noise",
                    "Check pump case drain flow: Should be <1 GPM (excessive = internal wear)"
                ],
                "repair": [
                    "Replace main hydraulic pump ($3000-8000, 12-20 hours)",
                    "Flush entire hydraulic system",
                    "Replace all hydraulic filters",
                    "Clean hydraulic tank thoroughly",
                    "Refill with correct hydraulic oil (ISO VG 46 typical, 50-80 gallons)"
                ],
                "parts": ["Main pump ($3000-8000)", "Filters ($150-300)", "Hydraulic oil (50-80 gal, $300-600)"],
                "time": "12-20 hours"
            },
            "swing_brake": {
                "title": "Swing Brake Not Releasing",
                "probability": "HIGH",
                "causes": ["Seized swing brake", "Low pilot pressure", "Failed brake solenoid", "Contaminated brake"],
                "tests": [
                    "Check pilot pressure at swing motor: Should be 28-35 PSI",
                    "Test brake release solenoid: Should have 12-24V when swing engaged",
                    "Try manually releasing brake (if accessible) - should free up swing",
                    "Check for brake fluid/oil leaking onto brake discs",
                    "Measure swing motor case pressure: Should be <50 PSI"
                ],
                "repair": [
                    "Rebuild/replace swing brake ($800-2000, 6-10 hours)",
                    "Replace brake solenoid if failed ($150-400, 2-3 hours)",
                    "Clean brake discs if oil contaminated ($300-600, 4-6 hours)",
                    "Adjust pilot pressure if low",
                    "Test swing operation - should rotate smoothly 360°"
                ],
                "parts": ["Swing brake kit ($800-2000)", "Brake solenoid ($150-400)", "Seals ($100-250)"],
                "time": "4-10 hours"
            }
        }
    },
    "forklift": {
        "title": "Forklift Diagnostics",
        "category": "Heavy Equipment",
        "description": "Forklift mast and drive issues",
        "questions": [
            {
                "id": "q1",
                "question": "What is the primary issue?",
                "options": [
                    {"value": "no_lift", "label": "Forks won't lift", "next": "q2"},
                    {"value": "drift", "label": "Forks drift down slowly", "diagnosis": "cylinder_leak"},
                    {"value": "no_drive", "label": "Won't move forward/backward", "next": "q3"},
                    {"value": "steering", "label": "Steering issues", "diagnosis": "steering_system"}
                ]
            },
            {
                "id": "q2",
                "question": "Can you hear the hydraulic pump running?",
                "options": [
                    {"value": "yes", "label": "Yes - pump runs", "diagnosis": "lift_valve"},
                    {"value": "no", "label": "No - no pump sound", "diagnosis": "pump_motor"}
                ]
            },
            {
                "id": "q3",
                "question": "Is this a diesel, propane, or electric forklift?",
                "options": [
                    {"value": "diesel", "label": "Diesel", "diagnosis": "diesel_drive"},
                    {"value": "propane", "label": "Propane/LPG", "diagnosis": "propane_drive"},
                    {"value": "electric", "label": "Electric", "diagnosis": "electric_drive"}
                ]
            }
        ],
        "diagnoses": {
            "cylinder_leak": {
                "title": "Lift Cylinder Internal Leak",
                "probability": "HIGH",
                "causes": ["Worn cylinder seals", "Scored cylinder rod", "Damaged piston", "Contaminated hydraulic oil"],
                "tests": [
                    "Raise forks to full height, shut off engine/power",
                    "Measure fork drop over 5 minutes: >3 inches = internal leak",
                    "Check for external oil leaks on cylinder rod",
                    "Inspect rod for scoring, pitting, rust",
                    "Check hydraulic oil condition for contamination"
                ],
                "repair": [
                    "Replace lift cylinder seals ($150-500, 4-6 hours)",
                    "Polish cylinder rod if minor scoring ($200-400, 2-3 hours)",
                    "Replace cylinder if rod severely damaged ($800-2000, 6-8 hours)",
                    "Change hydraulic oil and filter",
                    "Test lift/lower operation after repair"
                ],
                "parts": ["Cylinder seal kit ($150-500)", "Hydraulic oil (5-10 gal, $50-150)", "Filter ($30-80)"],
                "time": "4-8 hours"
            },
            "lift_valve": {
                "title": "Lift Control Valve Failure",
                "probability": "HIGH",
                "causes": ["Stuck valve spool", "Worn valve seals", "Contaminated valve", "Broken valve spring"],
                "tests": [
                    "Test hydraulic pressure at pump: Should be 2200-2800 PSI",
                    "Check pilot pressure at lift lever: Should be 200-400 PSI",
                    "Remove valve cover, inspect spool for sticking/scoring",
                    "Test valve manually if accessible",
                    "Check for metal particles in oil (indicates valve wear)"
                ],
                "repair": [
                    "Rebuild lift control valve ($300-800, 4-6 hours)",
                    "Replace valve if severely worn ($600-1500, 4-6 hours)",
                    "Flush hydraulic system",
                    "Replace hydraulic filter",
                    "Adjust relief valve to spec (2200-2800 PSI typical)"
                ],
                "parts": ["Valve rebuild kit ($300-800)", "New valve ($600-1500)", "Filter ($30-80)"],
                "time": "4-6 hours"
            },
            "electric_drive": {
                "title": "Electric Drive Motor/Controller Issue",
                "probability": "HIGH",
                "causes": ["Low battery voltage", "Failed motor controller", "Worn drive motor brushes", "Bad accelerator potentiometer"],
                "tests": [
                    "Check battery voltage: Should be 36V, 48V, or 80V nominal (depends on model)",
                    "Load test batteries: Should maintain voltage under load",
                    "Test accelerator potentiometer: Should show 0-5V sweep when pedal pressed",
                    "Check motor controller for error codes",
                    "Test drive motor amperage: Should be 200-400A under load"
                ],
                "repair": [
                    "Charge batteries fully: 36V=43.2V, 48V=57.6V, 80V=96V",
                    "Replace weak batteries ($150-300 each, 2-4 hours for full set)",
                    "Replace motor controller if failed ($800-2000, 3-5 hours)",
                    "Replace drive motor brushes ($100-300, 2-3 hours)",
                    "Replace accelerator pedal/pot ($150-400, 1-2 hours)"
                ],
                "parts": ["Batteries ($150-300 each)", "Controller ($800-2000)", "Brushes ($100-300)"],
                "time": "2-5 hours"
            }
        }
    },
    "generator": {
        "title": "Generator Diagnostics",
        "category": "Heavy Equipment",
        "description": "Generator won't start or produce power",
        "questions": [
            {
                "id": "q1",
                "question": "What is the main issue?",
                "options": [
                    {"value": "no_start", "label": "Won't start", "next": "q2"},
                    {"value": "runs_no_power", "label": "Runs but no electrical output", "next": "q3"},
                    {"value": "low_power", "label": "Low voltage output", "diagnosis": "avr_issue"},
                    {"value": "surging", "label": "Engine surging/unstable", "diagnosis": "governor"}
                ]
            },
            {
                "id": "q2",
                "question": "Does the engine crank?",
                "options": [
                    {"value": "yes", "label": "Yes - cranks but won't fire", "diagnosis": "fuel_ignition"},
                    {"value": "no", "label": "No - won't crank", "diagnosis": "starting_system"}
                ]
            },
            {
                "id": "q3",
                "question": "What is the voltage reading on the panel?",
                "options": [
                    {"value": "zero", "label": "0V - no output at all", "diagnosis": "excitation"},
                    {"value": "low", "label": "Some voltage but low", "diagnosis": "avr_issue"}
                ]
            }
        ],
        "diagnoses": {
            "fuel_ignition": {
                "title": "Fuel or Ignition System Issue",
                "probability": "HIGH",
                "causes": ["Empty fuel tank", "Clogged fuel filter", "Bad spark plug", "Faulty ignition coil", "Stale fuel"],
                "tests": [
                    "Check fuel level in tank - add fresh fuel if low/empty",
                    "Test spark plug: Remove, ground to engine, crank - should see blue spark",
                    "Check spark plug gap: Should be 0.028-0.032 inches",
                    "Test fuel flow: Remove fuel line at carburetor, should flow freely",
                    "Check fuel shut-off solenoid: Should click when key turned on"
                ],
                "repair": [
                    "Add fresh fuel if stale (drain old fuel first)",
                    "Replace fuel filter ($10-30, 15 minutes)",
                    "Replace spark plug ($5-15, 10 minutes) - Use correct heat range",
                    "Replace ignition coil if no spark ($40-100, 30 minutes)",
                    "Clean carburetor if fuel flow restricted ($50-150, 1-2 hours)"
                ],
                "parts": ["Spark plug ($5-15)", "Fuel filter ($10-30)", "Ignition coil ($40-100)", "Carb kit ($20-50)"],
                "time": "15 minutes - 2 hours"
            },
            "starting_system": {
                "title": "Starting System Failure",
                "probability": "HIGH",
                "causes": ["Dead battery", "Bad starter", "Seized engine", "Faulty key switch"],
                "tests": [
                    "Check battery voltage: Should be 12.6V or higher",
                    "Load test battery: Should maintain 9.6V under load",
                    "Test voltage at starter during crank: Should be 10V minimum",
                    "Check starter amperage: 80-150A typical, >250A indicates problem",
                    "Try rotating engine by hand - should turn freely"
                ],
                "repair": [
                    "Charge or replace battery ($80-150, 30 minutes)",
                    "Clean battery terminals",
                    "Replace starter if failed ($150-400, 1-2 hours)",
                    "Replace key switch if no voltage at starter ($30-80, 30 minutes)",
                    "Check engine oil level - add if low (may prevent starting)"
                ],
                "parts": ["Battery ($80-150)", "Starter ($150-400)", "Key switch ($30-80)"],
                "time": "30 minutes - 2 hours"
            },
            "avr_issue": {
                "title": "AVR (Automatic Voltage Regulator) Failure",
                "probability": "HIGH",
                "causes": ["Failed AVR", "Bad rotor windings", "Loose connections", "Faulty capacitor"],
                "tests": [
                    "Check output voltage with multimeter: Should be 120V/240V ±5%",
                    "Test rotor resistance: Should be 5-15 ohms (varies by model)",
                    "Check excitation voltage at AVR: Should be present when running",
                    "Inspect all electrical connections for looseness/corrosion",
                    "Test output with no load vs. full load"
                ],
                "repair": [
                    "Replace AVR module ($50-200, 30-60 minutes)",
                    "Tighten all electrical connections",
                    "Replace rotor if resistance out of spec ($300-800, 3-5 hours)",
                    "Replace start capacitor if failed ($20-60, 20 minutes)",
                    "Adjust AVR potentiometer to correct voltage output"
                ],
                "parts": ["AVR module ($50-200)", "Start capacitor ($20-60)", "Rotor ($300-800)"],
                "time": "30 minutes - 5 hours"
            }
        }
    }
}

# Models
class DiagramCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    icon: str
    color: str
    diagram_type: str  # 'wiring' or 'equipment'
    count: int
    description: Optional[str] = None

class Diagram(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category_id: str
    title: str
    description: Optional[str] = None
    image_data: Optional[str] = None  # Base64 encoded image
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    role: str  # 'user' or 'assistant'
    content: str
    images: Optional[List[str]] = None  # Base64 encoded images
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatConversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    equipment_name: str
    category: Optional[str] = None  # Automotive, Heavy Diesel, HVAC, etc.
    fuel_type: Optional[str] = None
    vin_number: Optional[str] = None
    year: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    symptoms: Optional[str] = None
    fault_codes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request/Response Models
class CategoryCreate(BaseModel):
    name: str
    icon: str
    color: str
    diagram_type: str
    count: int
    description: Optional[str] = None

class DiagramCreate(BaseModel):
    category_id: str
    title: str
    description: Optional[str] = None
    image_data: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None

class MessageCreate(BaseModel):
    content: str
    images: Optional[List[str]] = None

class ConversationCreate(BaseModel):
    equipment_name: str
    category: Optional[str] = None
    fuel_type: Optional[str] = None
    vin_number: Optional[str] = None
    year: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    symptoms: Optional[str] = None
    fault_codes: Optional[str] = None

# Initialize default categories
async def init_default_data():
    category_seed = [
        # Wiring Diagrams
        {"name": "Automotive", "icon": "car", "color": "#3B82F6", "diagram_type": "wiring", "description": "Engine, transmission, brakes"},
        {"name": "Electrical", "icon": "zap", "color": "#F97316", "diagram_type": "wiring", "description": "Electrical systems"},
        {"name": "HVAC", "icon": "wind", "color": "#14B8A6", "diagram_type": "wiring", "description": "Heating & cooling"},
        {"name": "Plumbing", "icon": "droplet", "color": "#A855F7", "diagram_type": "wiring", "description": "Plumbing systems"},
        {"name": "General", "icon": "wrench", "color": "#6B7280", "diagram_type": "wiring", "description": "General repairs"},
        # Equipment & Parts
        {"name": "Fixed Plant", "icon": "factory", "color": "#10B981", "diagram_type": "equipment", "description": "Generators, compressors, pumps"},
        {"name": "Mobile Plant", "icon": "truck", "color": "#F97316", "diagram_type": "equipment", "description": "Excavators, loaders, cranes"},
        {"name": "Heavy Diesel", "icon": "cog", "color": "#EC4899", "diagram_type": "equipment", "description": "Engine systems and components"}
    ]

    existing_categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    existing_map = {(c["name"], c["diagram_type"]): c for c in existing_categories}

    for seed in category_seed:
        key = (seed["name"], seed["diagram_type"])
        if key in existing_map:
            await db.categories.update_one(
                {"id": existing_map[key]["id"]},
                {"$set": {**seed}}
            )
        else:
            await db.categories.insert_one({
                **seed,
                "id": str(uuid.uuid4()),
                "count": 0
            })

    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    category_map = {c["name"]: c["id"] for c in categories}

    legacy_titles = [
        "OBD-II Diagnostic Trouble Code Reference",
        "Fuel System Pressure Specifications",
        "Voltage Drop Testing Guide",
        "Sensor Testing Quick Reference"
    ]
    await db.diagrams.delete_many({"title": {"$in": legacy_titles}})

    existing_image_count = await db.diagrams.count_documents({"image_data": {"$ne": None}})
    if existing_image_count == 0:
        await db.diagrams.delete_many({"source": "seed"})
        sample_diagrams = [
            {
                "id": str(uuid.uuid4()),
                "category_id": category_map.get("Automotive"),
                "title": "Wiring Harness Routing Overview",
                "description": "Main harness routing and branch points in the engine bay.",
                "image_data": "https://images.unsplash.com/photo-1694617983959-7dd9ac7e09ae?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwyfHxhdXRvbW90aXZlJTIwd2lyaW5nJTIwZGlhZ3JhbXxlbnwwfHx8fDE3NzA0ODA1NDV8MA&ixlib=rb-4.1.0&q=85",
                "source": "seed",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "category_id": category_map.get("Electrical"),
                "title": "Control Module Circuit Layout",
                "description": "Reference layout for power, ground, and signal paths.",
                "image_data": "https://images.unsplash.com/photo-1769149068959-b11392164add?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxlbGVjdHJpY2FsJTIwY2lyY3VpdCUyMGRpYWdyYW18ZW58MHx8fHwxNzcwNDgwNTUwfDA&ixlib=rb-4.1.0&q=85",
                "source": "seed",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "category_id": category_map.get("HVAC"),
                "title": "HVAC Airflow & Blend Door Diagram",
                "description": "Air distribution and blend door routing reference.",
                "image_data": "https://images.unsplash.com/photo-1708807524676-86a7a4d42d2f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTJ8MHwxfHNlYXJjaHwxfHxodmFjJTIwc3lzdGVtJTIwZGlhZ3JhbXxlbnwwfHx8fDE3NzA0ODA1NTV8MA&ixlib=rb-4.1.0&q=85",
                "source": "seed",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "category_id": category_map.get("Plumbing"),
                "title": "Fluid Line Schematic",
                "description": "Typical routing for supply, return, and drain lines.",
                "image_data": "https://images.unsplash.com/photo-1650246363606-a2402ec42b08?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTB8MHwxfHNlYXJjaHwxfHxwbHVtYmluZyUyMHNjaGVtYXRpY3xlbnwwfHx8fDE3NzA0ODA1NTl8MA&ixlib=rb-4.1.0&q=85",
                "source": "seed",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "category_id": category_map.get("General"),
                "title": "Component Assembly Blueprint",
                "description": "Exploded view reference for component alignment.",
                "image_data": "https://images.unsplash.com/photo-1769152683420-f4eff91cb30b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwyfHxtZWNoYW5pY2FsJTIwYmx1ZXByaW50fGVufDB8fHx8MTc3MDQ4MDU2M3ww&ixlib=rb-4.1.0&q=85",
                "source": "seed",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "category_id": category_map.get("Fixed Plant"),
                "title": "Generator Control Panel Layout",
                "description": "Reference layout for fixed-plant generator controls.",
                "image_data": "https://images.unsplash.com/photo-1705051278299-7e64ba21437a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwyfHxpbmR1c3RyaWFsJTIwZ2VuZXJhdG9yfGVufDB8fHx8MTc3MDQ4MDU3NHww&ixlib=rb-4.1.0&q=85",
                "source": "seed",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "category_id": category_map.get("Mobile Plant"),
                "title": "Excavator Hydraulic Circuit Overview",
                "description": "Hydraulic routing and major components for mobile plant.",
                "image_data": "https://images.unsplash.com/photo-1580901369227-308f6f40bdeb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NDh8MHwxfHNlYXJjaHwyfHxleGNhdmF0b3IlMjBoeWRyYXVsaWN8ZW58MHx8fHwxNzcwNDgwNTc4fDA&ixlib=rb-4.1.0&q=85",
                "source": "seed",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "category_id": category_map.get("Heavy Diesel"),
                "title": "Diesel Engine System Diagram",
                "description": "Cylinder head, fuel system, and lubrication overview.",
                "image_data": "https://images.unsplash.com/photo-1725916631310-4d7cdf815079?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwxfHxkaWVzZWwlMjBlbmdpbmUlMjBkaWFncmFtfGVufDB8fHx8MTc3MDQ4MDU4Mnww&ixlib=rb-4.1.0&q=85",
                "source": "seed",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]

        await db.diagrams.insert_many([d for d in sample_diagrams if d["category_id"]])

    for cat in categories:
        count = await db.diagrams.count_documents({"category_id": cat["id"]})
        await db.categories.update_one({"id": cat["id"]}, {"$set": {"count": count}})

    logger.info("Default categories and sample diagrams initialized")

# API Routes
@api_router.get("/")
async def root():
    return {"message": "FaultPath API", "version": "1.0"}

@api_router.get("/categories", response_model=List[DiagramCategory])
async def get_categories(diagram_type: Optional[str] = None):
    query = {}
    if diagram_type:
        query["diagram_type"] = diagram_type
    
    categories = await db.categories.find(query, {"_id": 0}).to_list(100)
    return categories

@api_router.post("/categories", response_model=DiagramCategory)
async def create_category(category: CategoryCreate):
    cat_obj = DiagramCategory(**category.model_dump())
    doc = cat_obj.model_dump()
    await db.categories.insert_one(doc)
    return cat_obj

@api_router.get("/diagrams", response_model=List[Diagram])
async def get_diagrams(category_id: Optional[str] = None):
    query = {}
    if category_id:
        query["category_id"] = category_id
    
    diagrams = await db.diagrams.find(query, {"_id": 0}).to_list(1000)
    
    for diagram in diagrams:
        if isinstance(diagram.get('created_at'), str):
            diagram['created_at'] = datetime.fromisoformat(diagram['created_at'])
    
    return diagrams

@api_router.post("/diagrams", response_model=Diagram)
async def create_diagram(diagram: DiagramCreate):
    diagram_obj = Diagram(**diagram.model_dump())
    doc = diagram_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.diagrams.insert_one(doc)
    
    # Update category count
    await db.categories.update_one(
        {"id": diagram.category_id},
        {"$inc": {"count": 1}}
    )
    
    return diagram_obj

@api_router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_data = base64.b64encode(contents).decode('utf-8')
        mime_type = file.content_type or 'image/jpeg'
        return {"image_data": f"data:{mime_type};base64,{base64_data}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Chat endpoints
@api_router.get("/conversations", response_model=List[ChatConversation])
async def get_conversations():
    conversations = await db.conversations.find({}, {"_id": 0}).sort("updated_at", -1).to_list(100)
    
    for conv in conversations:
        if isinstance(conv.get('created_at'), str):
            conv['created_at'] = datetime.fromisoformat(conv['created_at'])
        if isinstance(conv.get('updated_at'), str):
            conv['updated_at'] = datetime.fromisoformat(conv['updated_at'])
    
    return conversations

@api_router.post("/conversations", response_model=ChatConversation)
async def create_conversation(conversation: ConversationCreate):
    conv_obj = ChatConversation(**conversation.model_dump())
    doc = conv_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.conversations.insert_one(doc)
    return conv_obj

@api_router.get("/conversations/{conversation_id}/messages", response_model=List[ChatMessage])
async def get_messages(conversation_id: str):
    messages = await db.messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)
    
    for msg in messages:
        if isinstance(msg.get('timestamp'), str):
            msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
    
    return messages

@api_router.post("/conversations/{conversation_id}/messages", response_model=ChatMessage)
async def send_message(conversation_id: str, message: MessageCreate):
    # Create user message
    user_msg = ChatMessage(
        conversation_id=conversation_id,
        role="user",
        content=message.content,
        images=message.images
    )
    
    user_doc = user_msg.model_dump()
    user_doc['timestamp'] = user_doc['timestamp'].isoformat()
    await db.messages.insert_one(user_doc)
    
    # Get conversation details
    conv = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    
    # Build detailed context from conversation metadata
    context_parts = []
    if conv:
        context_parts.append(f"Equipment: {conv.get('equipment_name', 'Unknown')}")
        if conv.get('category'):
            context_parts.append(f"Category: {conv['category']}")
        if conv.get('fuel_type'):
            context_parts.append(f"Fuel Type: {conv['fuel_type']}")
        if conv.get('vin_number'):
            context_parts.append(f"VIN: {conv['vin_number']}")
        if conv.get('year'):
            context_parts.append(f"Year: {conv['year']}")
        if conv.get('make'):
            context_parts.append(f"Make: {conv['make']}")
        if conv.get('model'):
            context_parts.append(f"Model: {conv['model']}")
        if conv.get('symptoms'):
            context_parts.append(f"Reported Symptoms: {conv['symptoms']}")
        if conv.get('fault_codes'):
            context_parts.append(f"Fault Codes: {conv['fault_codes']}")
    
    equipment_context = "\n".join(context_parts) if context_parts else "No additional context provided"
    
    # Enhanced system prompt for comprehensive diagnostics
    system_prompt = f"""You are FaultPath, the world's most advanced diagnostic assistant for professional mechanics and technicians. You have access to complete technical service manuals, fault code databases, and decades of repair expertise.

**CRITICAL INSTRUCTIONS:**
- NEVER ask the user to provide more information or upload diagrams
- ALWAYS provide maximum technical detail in your FIRST response
- Act as if you have the complete service manual and diagnostic database
- Provide specific values, measurements, and procedures immediately
- Be comprehensive, detailed, and technically precise from the start

**Current Equipment Context:**
{equipment_context}

**YOUR RESPONSE MUST ALWAYS INCLUDE:**

═══════════════════════════════════════════════════════════════

**1. FAULT CODE ANALYSIS** (if codes are present)
For EACH fault code, provide:
   • Full code definition (P0420 = Catalyst System Efficiency Below Threshold Bank 1)
   • What the code ACTUALLY means in plain technical terms
   • Common root causes (list 5-8 causes in order of probability)
   • Related codes that often appear together
   • Manufacturer-specific variations or TSB numbers
   • Freeze frame data to look for

**2. SYMPTOM ANALYSIS**
   • What each symptom indicates about system function
   • How symptoms relate to each other
   • Which systems are affected (fuel, ignition, mechanical, electrical, etc.)
   • Probability ranking of issues

**3. STEP-BY-STEP DIAGNOSTIC PROCEDURE**
Provide a complete diagnostic roadmap:

   **PHASE 1: VISUAL INSPECTION** (5-10 minutes)
   • Specific items to inspect with photos/diagrams descriptions
   • What to look for (cracks, leaks, corrosion, damaged wires)
   • Common failure points for this make/model

   **PHASE 2: SCAN TOOL DIAGNOSTICS** (10-15 minutes)
   • What data PIDs to monitor (actual PID names like LTFT, STFT, MAF g/s)
   • Expected values vs. actual (e.g., "STFT should be ±5%, LTFT ±8%")
   • Live data to capture while running/driving
   • Freeze frame analysis
   • Readiness monitors status

   **PHASE 3: COMPONENT TESTING**
   For each suspect component, provide:
   • **Exact test procedure** (step-by-step with multimeter settings)
   • **Expected values** (voltage, resistance, pressure, flow rates)
   • **Connector pin-outs** (describe which pins to test)
   • **Pass/Fail criteria** (specific numbers)
   
   Examples:
   - "MAF Sensor: Key on, backprobe pins 1 & 3, should read 12V±0.5V"
   - "Fuel pressure: Connect gauge to test port, key on = 55-62 PSI, running = 58-65 PSI"
   - "O2 Sensor: Warm engine, graph voltage, should cycle 0.1-0.9V every 1-3 seconds"

   **PHASE 4: COMPONENT LOCATIONS**
   • Exact location of each component (be specific: "behind glove box, left side, silver connector")
   • Access procedures (what needs removal to access)
   • Connector colors and pin counts

**4. COMPLETE REPAIR PROCEDURES**
For the most likely issues, provide:

   **A. PARTS REQUIRED**
   • OEM part numbers (or generic equivalent description)
   • Gaskets, seals, fluids needed
   • Special tools required
   • Estimated cost ranges

   **B. STEP-BY-STEP REPAIR** (20-30 detailed steps)
   Example format:
   ```
   1. Disconnect battery negative terminal, wait 2 minutes
   2. Remove air intake tube (2x 8mm bolts, 1x hose clamp)
   3. Disconnect MAF sensor connector (press tab, pull straight)
   4. Remove MAF sensor (2x T25 Torx screws)
   5. Clean throttle body with MAF cleaner (spray 3-4 times)
   ...
   20. Reconnect battery
   21. Start engine, let idle for 30 seconds
   22. Perform relearn procedure: [specific steps]
   ```

   **C. TORQUE SPECIFICATIONS**
   • List ALL fastener torques (ft-lbs and N⋅m)
   • Torque sequence if critical
   • Thread locker requirements

   **D. FLUID SPECIFICATIONS**
   • Exact fluid types (DOT 3, 5W-20 synthetic, Dexron VI, etc.)
   • Capacities in quarts/liters
   • Fill procedures

**5. TESTING & VERIFICATION**
   • How to verify the repair worked
   • What values should now be correct
   • Test drive procedures
   • How to clear codes and verify they don't return
   • Relearn procedures (idle, fuel trim, transmission, etc.)

**6. ADDITIONAL TECHNICAL DETAILS**

   **For AUTOMOTIVE AC Systems:**
   • Static pressure chart (ambient temp vs. expected PSI)
   • Dynamic pressures (low side: 25-45 PSI, high side: 200-250 PSI at 75°F)
   • Refrigerant capacity (oz/grams)
   • Compressor oil type and capacity
   • Superheat/subcooling calculations
   • Evaporator temp (38-42°F)

   **For HYDRAULIC Systems:**
   • System pressure specs (e.g., "Main relief: 3000 PSI")
   • Flow rates (GPM)
   • Cylinder rod sizes and bore
   • Oil viscosity grades (ISO VG 46, etc.)
   • Filter micron ratings
   • Accumulator pre-charge (typically 90% of system pressure)

   **For ELECTRICAL Systems:**
   • Circuit diagrams (describe wire colors, connector types)
   • Fuse/relay locations and amperage ratings
   • Voltage drop testing procedures (max 0.2V on ground, 0.4V on power)
   • Wire gauge requirements for repairs
   • Ground point locations

   **For HVAC Systems:**
   • Refrigerant type (R-410A, R-22, etc.)
   • Pressure/temp charts
   • Capacitor ratings (run: 35-45 MFD, start: 88-108 MFD)
   • Amperage draws for compressor/fan motors
   • Airflow calculations (CFM = tons × 400)
   • Duct static pressure limits

**7. KNOWN ISSUES & TSBs**
   • Common failures for this year/make/model
   • TSB (Technical Service Bulletin) numbers and descriptions
   • Recalls related to these symptoms
   • Aftermarket solution improvements
   • Forums/common mechanic knowledge

**8. PROCESS OF ELIMINATION FLOWCHART**
Present as a decision tree:
```
Start → Test A → Result Good? → Test B → Result Good? → Test C
                ↓ Bad                    ↓ Bad              ↓ Bad
           Repair/Replace A    Repair/Replace B   Repair/Replace C
```

**9. SAFETY WARNINGS**
   • Specific hazards (high pressure, high voltage, hot surfaces)
   • Required PPE (safety glasses, gloves, face shield)
   • Depressurization procedures
   • Lockout/tagout requirements
   • Proper lifting points and support

**10. SPECIAL NOTES**
   • Common mistakes to avoid
   • Tips from experienced techs
   • Time estimates for repairs
   • Difficulty rating (novice/intermediate/advanced)

═══════════════════════════════════════════════════════════════

**RESPONSE FORMAT:**
- Use clear headings and sections
- Include specific numbers, values, and measurements
- Provide both metric and imperial units
- Use bullet points and numbered lists
- Be comprehensive but organized

**CRITICAL RULES:**
- DO NOT ask for more information - provide maximum detail with what you have
- DO NOT suggest uploading diagrams - describe procedures in text
- DO NOT give vague advice - be specific with numbers and procedures
- DO NOT hold back - provide professional-level technical detail
- DO provide 2000+ words of comprehensive diagnostic and repair information

Your goal is to give the technician EVERYTHING they need to diagnose and repair the issue in ONE comprehensive response."""
    
    # Initialize LlmChat with enhanced prompt
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=conversation_id,
        system_message=system_prompt
    ).with_model("openai", "gpt-4o")
    
    # Get AI response
    try:
        user_content = message.content
        if message.images:
            user_content += "\n\n[User has uploaded diagnostic images for analysis]"
        
        user_message = UserMessage(text=user_content)
        assistant_content = await chat.send_message(user_message)
    except Exception as e:
        logger.error(f"AI error: {e}")
        assistant_content = "I apologize, but I'm having trouble processing your request. Please try again or rephrase your question."
    
    # Create assistant message
    assistant_msg = ChatMessage(
        conversation_id=conversation_id,
        role="assistant",
        content=assistant_content
    )
    
    assistant_doc = assistant_msg.model_dump()
    assistant_doc['timestamp'] = assistant_doc['timestamp'].isoformat()
    await db.messages.insert_one(assistant_doc)
    
    # Update conversation timestamp
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return assistant_msg

# Quick Diagnostics Endpoints
@api_router.get("/diagnostic-flows")
async def get_diagnostic_flows():
    """Get list of all available diagnostic flows"""
    flows = []
    for key, flow in DIAGNOSTIC_FLOWS.items():
        flows.append({
            "id": key,
            "title": flow["title"],
            "category": flow["category"],
            "description": flow["description"]
        })
    return flows

@api_router.get("/diagnostic-flows/{flow_id}")
async def get_diagnostic_flow(flow_id: str):
    """Get specific diagnostic flow with questions and diagnoses"""
    if flow_id not in DIAGNOSTIC_FLOWS:
        raise HTTPException(status_code=404, detail="Diagnostic flow not found")
    return DIAGNOSTIC_FLOWS[flow_id]

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await init_default_data()
    logger.info("FaultPath API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
