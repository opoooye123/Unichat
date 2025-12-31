import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hook/useAuth';

const VerifyOTP: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('OTP must be 6 digits');

    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp });
      login(res.data.token);
      toast.success('Welcome to Unichat! 🎉');
      navigate('/home');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <form onSubmit={handleSubmit} className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-2 text-center">Verify Your Email</h2>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
          We sent a 6-digit code to <br /><strong>{email}</strong>
        </p>

        <input
          type="text"
          maxLength={6}
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          className="w-full text-center text-2xl tracking-widest mb-8 p-4 border rounded-lg dark:bg-gray-700"
          required
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-70 text-white font-bold py-3 rounded-lg transition"
        >
          {loading ? 'Verifying...' : 'Verify & Join'}
        </button>

        <p className="mt-4 text-center text-sm">
          Didn't receive code? Check spam or try registering again.
        </p>
      </form>
    </div>
  );
};

export default VerifyOTP;