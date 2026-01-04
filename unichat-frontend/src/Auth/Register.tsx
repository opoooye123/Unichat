// frontend/src/components/Register.tsx - New component for register (add this file)
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-96">
        <h1 className="text-4xl font-bold text-center mb-2">Unichat Register</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mb-4 p-4 border rounded-lg dark:bg-gray-700 text-lg"
            required
            disabled={loading}
          />
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
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          Already have an account? <a href="/" className="text-blue-600 hover:underline">Login</a>
        </p>
      </div>
    </div>
  );
};

export default Register;