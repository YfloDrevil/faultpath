import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ChatPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [equipmentName, setEquipmentName] = useState('');
  const [creating, setCreating] = useState(false);

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
    if (!equipmentName.trim()) {
      toast({ title: 'Error', description: 'Please enter equipment name', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const res = await axios.post(`${API}/conversations`, {
        equipment_name: equipmentName,
      });

      toast({ title: 'Success', description: 'Conversation started' });
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
              <p className="text-sm text-slate-400">AI-powered troubleshooting</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="new-chat-btn" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>Start New Diagnosis</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">
                      What equipment are you diagnosing?
                    </label>
                    <Input
                      data-testid="equipment-name-input"
                      value={equipmentName}
                      onChange={(e) => setEquipmentName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateConversation()}
                      className="bg-slate-900 border-slate-700 text-white"
                      placeholder="e.g., Terex Franna MAC25 Crane"
                    />
                  </div>
                  <Button
                    data-testid="start-conversation-btn"
                    onClick={handleCreateConversation}
                    disabled={creating}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {creating ? 'Starting...' : 'Start Conversation'}
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
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No conversations yet</h3>
            <p className="text-slate-400 mb-6">Start your first diagnostic conversation</p>
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
            <h2 className="text-2xl font-bold text-white mb-6">Your Conversations</h2>
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
                      <p className="text-sm text-slate-400">{formatDate(conv.updated_at)}</p>
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