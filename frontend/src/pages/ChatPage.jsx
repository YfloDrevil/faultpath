import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = [
  'Automotive',
  'Heavy Diesel',
  'Mobile Plant',
  'Fixed Plant',
  'HVAC',
  'Electrical',
  'Plumbing',
  'General'
];

const ChatPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    equipment_name: '',
    category: '',
    fuel_type: '',
    vin_number: '',
    year: '',
    make: '',
    model: '',
    symptoms: '',
    fault_codes: '',
  });

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`${API}/conversations`);
      setConversations(res.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConversation = async () => {
    if (!formData.equipment_name.trim()) {
      toast({ title: 'Error', description: 'Please enter equipment name', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const res = await axios.post(`${API}/conversations`, formData);

      toast({ title: 'Success', description: 'Diagnostic session started' });
      navigate(`/chat/${res.data.id}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({ title: 'Error', description: 'Failed to start conversation', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
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
              <h1 className="text-2xl font-bold text-white">Diagnostic Chat</h1>
              <p className="text-sm text-slate-400">Professional troubleshooting assistant</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="new-chat-btn" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Diagnosis
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">Start New Diagnostic Session</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {/* Equipment Name */}
                  <div>
                    <Label className="text-slate-300">Equipment / Vehicle Name *</Label>
                    <Input
                      data-testid="equipment-name-input"
                      value={formData.equipment_name}
                      onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white mt-2"
                      placeholder="e.g., 2015 Ford F-150, Caterpillar 320D Excavator"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <Label className="text-slate-300">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger data-testid="category-select" className="bg-slate-900 border-slate-700 text-white mt-2">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat} className="text-white hover:bg-slate-700">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fuel Type */}
                  <div>
                    <Label className="text-slate-300">Fuel Type</Label>
                    <Select
                      value={formData.fuel_type}
                      onValueChange={(value) => setFormData({ ...formData, fuel_type: value })}
                    >
                      <SelectTrigger data-testid="chat-fuel-type-select" className="bg-slate-900 border-slate-700 text-white mt-2">
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

                  {/* VIN Number */}
                  <div>
                    <Label className="text-slate-300">VIN Number</Label>
                    <Input
                      data-testid="vin-input"
                      value={formData.vin_number}
                      onChange={(e) => setFormData({ ...formData, vin_number: e.target.value.toUpperCase() })}
                      className="bg-slate-900 border-slate-700 text-white mt-2"
                      placeholder="17-digit VIN"
                      maxLength={17}
                    />
                  </div>

                  {/* Year, Make, Model */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-300">Year</Label>
                      <Input
                        data-testid="year-input"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        className="bg-slate-900 border-slate-700 text-white mt-2"
                        placeholder="2020"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Make</Label>
                      <Input
                        data-testid="make-input"
                        value={formData.make}
                        onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                        className="bg-slate-900 border-slate-700 text-white mt-2"
                        placeholder="Ford"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Model</Label>
                      <Input
                        data-testid="model-input"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="bg-slate-900 border-slate-700 text-white mt-2"
                        placeholder="F-150"
                      />
                    </div>
                  </div>

                  {/* Fault Codes */}
                  <div>
                    <Label className="text-slate-300">Fault Codes (if any)</Label>
                    <Input
                      data-testid="fault-codes-input"
                      value={formData.fault_codes}
                      onChange={(e) => setFormData({ ...formData, fault_codes: e.target.value.toUpperCase() })}
                      className="bg-slate-900 border-slate-700 text-white mt-2"
                      placeholder="e.g., P0420, P0171, C1234"
                    />
                  </div>

                  {/* Symptoms */}
                  <div>
                    <Label className="text-slate-300">Symptoms / Issues</Label>
                    <Textarea
                      data-testid="symptoms-input"
                      value={formData.symptoms}
                      onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white mt-2 min-h-[100px]"
                      placeholder="Describe the problem in detail... e.g., Engine cranks but won't start, makes clicking noise, check engine light on"
                    />
                  </div>

                  <Button
                    data-testid="start-conversation-btn"
                    onClick={handleCreateConversation}
                    disabled={creating}
                    className="w-full bg-blue-600 hover:bg-blue-700 py-6"
                  >
                    {creating ? 'Starting Session...' : 'Start Diagnostic Session'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No diagnostic sessions yet</h3>
            <p className="text-slate-400 mb-6">Start your first professional diagnostic session</p>
            <Button
              data-testid="start-first-chat-btn"
              onClick={() => setDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Start Diagnosis
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-6">Your Diagnostic Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  data-testid={`conversation-${conv.id}`}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-left hover:bg-slate-800 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-1 truncate">
                        {conv.equipment_name}
                      </h3>
                      {conv.category && (
                        <p className="text-sm text-blue-400 mb-1">{conv.category}</p>
                      )}
                      {(conv.year || conv.make || conv.model) && (
                        <p className="text-sm text-slate-400 mb-1">
                          {[conv.year, conv.make, conv.model].filter(Boolean).join(' ')}
                        </p>
                      )}
                      {conv.fault_codes && (
                        <p className="text-sm text-orange-400 mb-1">Codes: {conv.fault_codes}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">{formatDate(conv.updated_at)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;