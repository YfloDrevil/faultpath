import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Send, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ConversationPage = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { toast } = useToast();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);

  useEffect(() => {
    fetchData();
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchData = async () => {
    try {
      const [conversationsRes, messagesRes] = await Promise.all([
        axios.get(`${API}/conversations`),
        axios.get(`${API}/conversations/${conversationId}/messages`),
      ]);

      const conv = conversationsRes.data.find((c) => c.id === conversationId);
      setConversation(conv);
      setMessages(messagesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImages((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() && uploadedImages.length === 0) return;

    setSending(true);
    try {
      const payload = {
        content: messageText.trim(),
        images: uploadedImages.length > 0 ? uploadedImages : null,
      };

      const res = await axios.post(
        `${API}/conversations/${conversationId}/messages`,
        payload
      );

      // Refresh messages
      const messagesRes = await axios.get(
        `${API}/conversations/${conversationId}/messages`
      );
      setMessages(messagesRes.data);

      // Clear input
      setMessageText('');
      setUploadedImages([]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              data-testid="back-to-chats-btn"
              onClick={() => navigate('/chat')}
              className="flex items-center text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <div className="text-center flex-1">
              <h1 className="text-xl font-bold text-white">
                {conversation?.equipment_name || 'Diagnostic Chat'}
              </h1>
              <p className="text-xs text-slate-400">FaultPath Assistant</p>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">
                Start the diagnosis
              </h3>
              <p className="text-slate-400">
                Describe the issue you're experiencing with your equipment
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                data-testid={`message-${message.role}`}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-100 border border-slate-700'
                  }`}
                >
                  {message.images && message.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {message.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Upload ${idx + 1}`}
                          className="rounded-lg max-h-40 object-cover"
                        />
                      ))}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {uploadedImages.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {uploadedImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={img}
                    alt={`Upload ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-slate-700"
                  />
                  <button
                    data-testid={`remove-image-${idx}`}
                    onClick={() => removeImage(idx)}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              data-testid="upload-image-btn"
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="icon"
              className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 flex-shrink-0"
            >
              <ImageIcon className="w-5 h-5" />
            </Button>

            <Textarea
              data-testid="message-input"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe the issue..."
              disabled={sending}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none min-h-[60px] max-h-[200px]"
              rows={2}
            />

            <Button
              data-testid="send-message-btn"
              onClick={handleSendMessage}
              disabled={sending || (!messageText.trim() && uploadedImages.length === 0)}
              className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
              size="icon"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>

          <p className="text-xs text-slate-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConversationPage;
