import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await api.post('/auth/register', { name, email });
    toast.success('OTP sent to your email!');

    // ✅ ADD THIS LINE
    localStorage.setItem('auth_email', email);

    navigate('/verify', { state: { email } });
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Registration failed');
  }
};


  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">  {/* ← Synced gradient */}
      <form onSubmit={handleSubmit} className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-96">  {/* ← Synced styling */}
        <h2 className="text-4xl font-bold text-center mb-2">Join Unichat 🇳🇬</h2>  {/* ← Larger header */}
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Connect with students across Nigerian universities
        </p>
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-4 p-4 border rounded-lg dark:bg-gray-700 text-lg"  
          required
        />
        <input
          type="email"
          placeholder="School Email (e.g. name@unilag.edu.ng)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-6 p-4 border rounded-lg dark:bg-gray-700 text-lg"
          required
        />
        <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 rounded-lg text-lg transition">  {/* ← Synced button */}
          Send OTP
        </button>
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account? <a href="/login" className="text-blue-500 hover:underline">Login</a>
        </p>
      </form>
    </div>
  );
};

export default Register;