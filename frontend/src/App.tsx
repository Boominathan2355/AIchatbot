import { useState } from 'react';
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { ChatPage } from './pages/ChatPage';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
      <div className="w-10 h-10 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ChatPageRoute() {
  const { id } = useParams<{ id: string }>();
  return <ChatPage conversationId={id || null} />;
}

/** Gates the app behind authentication, then renders the routes. */
function AppRoutes() {
  const { isLoading, isAuthenticated } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <LoginPage onToggleMode={() => setIsRegisterMode((previous) => !previous)} isRegister={isRegisterMode} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="/chat" element={<ChatPageRoute />} />
      <Route path="/chat/:id" element={<ChatPageRoute />} />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
