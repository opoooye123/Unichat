// frontend/src/components/Login.tsx - Updated for password
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../hook/useAuth';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      await login(response.data.token); // Pass only token; handle user in context
      toast.success('Login successful!');
      navigate('/home');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-96">
        <h1 className="text-4xl font-bold text-center mb-2">Unichat</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Connect with students across Nigerian universities 🇳🇬
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Your school email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 p-4 border rounded-lg dark:bg-gray-700 text-lg"
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-6 p-4 border rounded-lg dark:bg-gray-700 text-lg"
            required
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 rounded-lg text-lg transition"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          Don't have an account? <a href="/register" className="text-blue-600 hover:underline">Register</a>
        </p>
        <p className="mt-2 text-center text-sm text-gray-500">
          Only verified university emails allowed
        </p>
      </div>
    </div>
  );
};

export default Login;