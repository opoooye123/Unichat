import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hook/useAuth';

const PublicRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return isAuthenticated ? <Navigate to="/home" replace /> : <Outlet />;
};

export default PublicRoute;