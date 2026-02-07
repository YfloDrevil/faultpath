import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Upload, Image as ImageIcon, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DiagramList = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const { toast } = useToast();
  const [category, setCategory] = useState(null);
  const [diagrams, setDiagrams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_data: null,
    file_name: '',
    file_type: '',
  });

  useEffect(() => {
    fetchData();
  }, [categoryId]);

  const fetchData = async () => {
    try {
      const [categoriesRes, diagramsRes] = await Promise.all([
        axios.get(`${API}/categories`),
        axios.get(`${API}/diagrams?category_id=${categoryId}`),
      ]);
      const foundCategory = categoriesRes.data.find((c) => c.id === categoryId);
      setCategory(foundCategory);
      setDiagrams(diagramsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({
        ...formData,
        image_data: reader.result,
        file_name: file.name,
        file_type: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) {
      toast({ title: 'Error', description: 'Please enter a title', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      await axios.post(`${API}/diagrams`, {
        category_id: categoryId,
        title: formData.title,
        description: formData.description,
        image_data: formData.image_data,
        file_name: formData.file_name,
        file_type: formData.file_type,
      });

      toast({ title: 'Success', description: 'Diagram uploaded successfully' });
      setUploadOpen(false);
      setFormData({ title: '', description: '', image_data: null, file_name: '', file_type: '' });
      fetchData();
    } catch (error) {
      console.error('Error uploading diagram:', error);
      toast({ title: 'Error', description: 'Failed to upload diagram', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const isPdfSource = (source, type) =>
    type === 'application/pdf' ||
    source?.startsWith('data:application/pdf') ||
    source?.toLowerCase().endsWith('.pdf');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              data-testid="back-btn"
              onClick={() => navigate('/reference-diagrams')}
              className="flex items-center text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold text-white">{category?.name || 'Diagrams'}</h1>
              <p className="text-sm text-slate-400">{category?.description}</p>
            </div>
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button
                  data-testid="add-diagram-btn"
                  variant="outline"
                  className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add Diagram
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>Upload Diagram</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Title</label>
                    <Input
                      data-testid="diagram-title-input"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white"
                      placeholder="e.g., Engine Wiring Diagram"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Description (optional)</label>
                    <Textarea
                      data-testid="diagram-description-input"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white"
                      placeholder="Additional details..."
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Image</label>
                    <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-slate-600 transition-colors">
                      {formData.image_data ? (
                        <div className="relative">
                          <img src={formData.image_data} alt="Preview" className="max-h-48 mx-auto rounded" />
                          <Button
                            type="button"
                            onClick={() => setFormData({ ...formData, image_data: null })}
                            className="mt-4 bg-red-600 hover:bg-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                          <p className="text-slate-400 mb-2">Click to upload image</p>
                          <input
                            data-testid="diagram-image-input"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  <Button
                    data-testid="submit-diagram-btn"
                    type="submit"
                    disabled={uploading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {uploading ? 'Uploading...' : 'Upload Diagram'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {diagrams.length === 0 ? (
          <div className="text-center py-20">
            <ImageIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No diagrams yet</h3>
            <p className="text-slate-400 mb-6">Upload your first diagram to get started</p>
            <Button
              data-testid="upload-first-diagram-btn"
              onClick={() => setUploadOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Diagram
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {diagrams.map((diagram) => (
              <div
                key={diagram.id}
                data-testid={`diagram-${diagram.id}`}
                className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-all"
              >
                {diagram.image_data && (
                  <img
                    src={diagram.image_data}
                    alt={diagram.title}
                    className="w-full h-64 object-cover"
                  />
                )}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-3">{diagram.title}</h3>
                  {diagram.description && (
                    <div className="text-sm text-slate-300 whitespace-pre-wrap font-mono bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                      {diagram.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagramList;