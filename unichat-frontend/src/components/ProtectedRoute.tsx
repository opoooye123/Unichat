import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hook/useAuth';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>;  // Or a spinner

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;