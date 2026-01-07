// frontend/src/components/Register.tsx - Refactored UI
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/register', { name, email, password });
      localStorage.setItem('token', response.data.token);
      toast.success('Registered successfully!');
      navigate('/home');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Registration failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-800 to-blue-900">
      <div className="p-6 bg-gray-900 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-green-400">Join NaijaCampus🇳🇬</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 bg-gray-800 text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            required
            disabled={loading}
          />
          <input
            type="email"
            placeholder="School email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-gray-800 text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-gray-800 text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            required
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-400">
          Have an account? <a href="/login" className="text-green-400 hover:underline">Login</a>
        </p>
      </div>
    </div>
  );
};

export default Register;