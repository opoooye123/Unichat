import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api'; // UPDATED: Import api if not already (assuming it's in utils/api)

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // UPDATED: Add the API call here
      const response = await api.post('/auth/login', { email });
      console.log('Login response:', response.data); // For debugging

      toast.success('OTP sent to your email!');

      localStorage.setItem('auth_email', email);

      navigate('/verify', { state: { email } });
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed';
      toast.error(message);

      if (message === 'Email not verified') {
        localStorage.setItem('auth_email', email);

        navigate('/verify', { state: { email } });
      }
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
            className="w-full mb-6 p-4 border rounded-lg dark:bg-gray-700 text-lg"
            required
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 rounded-lg text-lg transition"
          >
            {loading ? 'Sending OTP...' : 'Login / Register'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          Only verified university emails allowed
        </p>
      </div>
    </div>
  );
};

export default Login;