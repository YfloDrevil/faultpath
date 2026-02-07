import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@/App.css';
import Home from '@/pages/Home';
import ReferenceDiagrams from '@/pages/ReferenceDiagrams';
import DiagramList from '@/pages/DiagramList';
import ChatPage from '@/pages/ChatPage';
import ConversationPage from '@/pages/ConversationPage';
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
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;