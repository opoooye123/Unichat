// Home.tsx updated with Logo.dev and email_domain

import React, { useEffect, useState } from 'react';
import { useAuth } from '../hook/useAuth';
import { useSocket } from '../hook/useSocket';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

interface School {
  id: string;
  name: string;
  email_domain: string; // UPDATED: Add email_domain
}

const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const [selected, setSelected] = useState<'any' | 'same' | string>('any');
  const [inQueue, setInQueue] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await api.get('/schools');
        setSchools(res.data); // Now includes email_domain
      } catch (err) {
        toast.error('Failed to load schools');
      }
    };
    fetchSchools();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('matchFound', ({ sessionId, partnerId, isInitiator }) => {
      toast.dismiss('queue');
      toast.success('Match found! 🎉 Starting chat...');
      setInQueue(false);
      navigate('/chat', { state: { sessionId, partnerId, isInitiator } });
    });
    socket.on('rejoinQueue', () => {
      setInQueue(true);
      toast.dismiss('queue');
      toast.loading('Searching for someone... ⏳', { id: 'queue' });
    });
    return () => {
      socket.off('matchFound');
      socket.off('rejoinQueue');
    };
  }, [socket, navigate]);

  const handleJoinQueue = () => {
    if (!socket) return toast.error('Connection error');
    setInQueue(true);
    toast.loading('Searching for someone... ⏳', { id: 'queue' });
    socket.emit('joinQueue', { targetSchool: selected });
  };

  const handleCancel = () => {
    if (!socket) return;
    setInQueue(false);
    toast.dismiss('queue');
    socket.emit('leaveQueue');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 p-6">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
            Unichat
          </h1>
          <p className="text-xl">Welcome, {user?.name}!</p>
        </div>
        <p className="text-2xl mb-8 text-center">Who do you want to chat with? 👥</p>
        <div className="space-y-4 mb-10">
          <button
            onClick={() => setSelected('any')}
            className={`w-full p-6 rounded-2xl transition flex items-center gap-4 ${
              selected === 'any' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="text-3xl">🌍</div>
            <div className="text-left flex-1">
              <div className="text-2xl font-bold">Anyone</div>
              <div className="text-gray-600 dark:text-gray-400">Random student from any uni</div>
            </div>
          </button>
          <button
            onClick={() => setSelected('same')}
            className={`w-full p-6 rounded-2xl transition flex items-center gap-4 ${
              selected === 'same' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="text-3xl">🏫</div>
            <div className="text-left flex-1">
              <div className="text-2xl font-bold">My School</div>
              <div className="text-gray-600 dark:text-gray-400">Someone from {user?.schoolId}</div>
            </div>
          </button>
          {schools.map((school) => (
            <button
              key={school.id}
              onClick={() => setSelected(school.id)}
              className={`w-full p-6 rounded-2xl transition flex items-center gap-4 ${
                selected === school.id ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
              }`}
            >
              <img
                src={`https://img.logo.dev/${school.email_domain}?size=80&fallback=monogram`} // UPDATED: Use Logo.dev with email_domain
                alt={school.name}
                className="w-16 h-16 rounded-full bg-white shadow-lg"
                onError={(e) => (e.currentTarget.src = `https://picsum.photos/80/80?random=${school.id}`)}
              />
              <div className="text-left flex-1">
                <div className="text-2xl font-bold">{school.name}</div>
                <div className="text-gray-600 dark:text-gray-400">Chat with students from {school.name}</div>
              </div>
            </button>
          ))}
        </div>
        {!inQueue ? (
          <button
            onClick={handleJoinQueue}
            className="w-full py-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-2xl font-bold rounded-3xl shadow-2xl transform hover:scale-105 transition"
          >
            Start Chatting 🔥
          </button>
        ) : (
          <div className="text-center">
            <p className="text-3xl mb-6 animate-pulse">🔍 Searching for your match...</p>
            <button
              onClick={handleCancel}
              className="px-12 py-5 bg-red-600 hover:bg-red-700 text-white text-xl font-bold rounded-2xl"
            >
              Cancel Search
            </button>
          </div>
        )}
      </div>
      <button onClick={logout} className="block mx-auto mt-10 text-gray-600 hover:text-red-600">
        Logout
      </button>
    </div>
  );
};

export default Home;