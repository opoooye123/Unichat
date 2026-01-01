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

  // ✅ Get email from router state OR localStorage (fallback)
  const email =
    (location.state as { email?: string })?.email ||
    localStorage.getItem('auth_email') ||
    '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ Hard guard: prevent empty email
    if (!email) {
      toast.error('Email missing. Please login again.');
      navigate('/login');
      return;
    }

    // ✅ OTP validation
    if (otp.length !== 6) {
      toast.error('OTP must be 6 digits');
      return;
    }

    setLoading(true);
    try {
      // ✅ Correct API call (baseURL already has /api)
      const res = await api.post('/auth/verify-otp', {
        email,
        otp,
      });

      // ✅ Save token & login
      login(res.data.token);

      // Optional cleanup
      localStorage.removeItem('auth_email');

      toast.success('Welcome to Unichat! 🎉');
      navigate('/home');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <form
        onSubmit={handleSubmit}
        className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-96"
      >
        <h2 className="text-4xl font-bold text-center mb-2">
          Verify Your Email
        </h2>

        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          We sent a 6-digit code to <br />
          <strong>{email}</strong>
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
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 rounded-lg text-lg transition"
        >
          {loading ? 'Verifying...' : 'Verify & Join'}
        </button>

        <p className="mt-6 text-center text-sm text-gray-500">
          Didn't receive code? Check spam or try again.
        </p>
      </form>
    </div>
  );
};

export default VerifyOTP;
