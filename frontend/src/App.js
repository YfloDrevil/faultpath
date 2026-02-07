import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@/App.css';
import Home from '@/pages/Home';
import ReferenceDiagrams from '@/pages/ReferenceDiagrams';
import DiagramList from '@/pages/DiagramList';
import ChatPage from '@/pages/ChatPage';
import ConversationPage from '@/pages/ConversationPage';
import QuickDiagnostics from '@/pages/QuickDiagnostics';
import DiagnosticFlow from '@/pages/DiagnosticFlow';
import { Toaster } from '@/components/ui/toaster';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/reference-diagrams" element={<ReferenceDiagrams />} />
        <Route path="/diagrams/:categoryId" element={<DiagramList />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:conversationId" element={<ConversationPage />} />
        <Route path="/quick-diagnostics" element={<QuickDiagnostics />} />
        <Route path="/quick-diagnostics/:flowId" element={<DiagnosticFlow />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;