import { Routes, Route, Navigate } from 'react-router-dom';
import Register from './Auth/Register';
import Login from './Auth/Login';
import Home from './components/Home';
import VideoChat from './components/VideoChat';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';  // ← Added
import PublicRoute from './components/PublicRoute';  // ← Added

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<Home />} />
              <Route path="/chat" element={<VideoChat />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <Toaster position="top-center" />
        </div>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;