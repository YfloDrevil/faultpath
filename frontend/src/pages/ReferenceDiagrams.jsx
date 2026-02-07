import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, FileText, Upload, Car, Zap, Wind, Droplet, Wrench, Factory, Truck, Cog, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const iconMap = {
  car: Car,
  zap: Zap,
  wind: Wind,
  droplet: Droplet,
  wrench: Wrench,
  factory: Factory,
  truck: Truck,
  cog: Cog,
};

const ReferenceDiagrams = () => {
  const navigate = useNavigate();
  const [wiringCategories, setWiringCategories] = useState([]);
  const [equipmentCategories, setEquipmentCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const [wiringRes, equipmentRes] = await Promise.all([
        axios.get(`${API}/categories?diagram_type=wiring`),
        axios.get(`${API}/categories?diagram_type=equipment`),
      ]);
      setWiringCategories(wiringRes.data);
      setEquipmentCategories(equipmentRes.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const CategoryCard = ({ category }) => {
    const Icon = iconMap[category.icon] || FileText;
    return (
      <button
        data-testid={`category-${category.name.toLowerCase().replace(/\s+/g, '-')}-btn`}
        onClick={() => navigate(`/diagrams/${category.id}`)}
        className="group bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl p-6 text-left transition-all duration-200 hover:border-slate-600 hover:shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: category.color + '20' }}
            >
              <Icon className="w-8 h-8" style={{ color: category.color }} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">{category.name}</h3>
              <p className="text-sm text-slate-400">
                {category.description || `${category.count} diagrams`}
              </p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
        </div>
      </button>
    );
  };

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
              <h1 className="text-2xl font-bold text-white">Reference Diagrams</h1>
              <p className="text-sm text-slate-400">Wiring, parts & equipment diagrams</p>
            </div>
            <Button
              data-testid="upload-diagram-btn"
              variant="outline"
              className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="wiring" className="w-full">
          <TabsList data-testid="diagram-tabs" className="grid w-full max-w-md mx-auto grid-cols-2 bg-slate-800/50 border border-slate-700 mb-8">
            <TabsTrigger
              data-testid="wiring-diagrams-tab"
              value="wiring"
              className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white"
            >
              Wiring Diagrams
            </TabsTrigger>
            <TabsTrigger
              data-testid="equipment-parts-tab"
              value="equipment"
              className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white"
            >
              Equipment & Parts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wiring" data-testid="wiring-content" className="space-y-6">
            <p className="text-slate-400 text-center mb-6">
              Select a trade to view wiring and system diagrams.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {loading ? (
                <div className="col-span-2 text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : (
                wiringCategories.map((category) => (
                  <CategoryCard key={category.id} category={category} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="equipment" data-testid="equipment-content" className="space-y-6">
            <p className="text-slate-400 text-center mb-6">
              View parts locations and reference photos for heavy equipment.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {loading ? (
                <div className="col-span-2 text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : (
                equipmentCategories.map((category) => (
                  <CategoryCard key={category.id} category={category} />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ReferenceDiagrams;