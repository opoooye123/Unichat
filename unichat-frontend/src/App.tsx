import { Routes, Route, Navigate } from 'react-router-dom';
import Register from './Auth/Resgister';
import VerifyOTP from './Auth/VerifyOTP';
import Login from './Auth/Login';
import Home from './components/Home';
import VideoChat from './components/VideoChat';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<VerifyOTP />} />
            <Route path="/login" element={<Login />} />
            <Route path="/home" element={<Home />} />
            <Route path="/chat" element={<VideoChat />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <Toaster position="top-center" />
        </div>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;