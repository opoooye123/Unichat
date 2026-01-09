// Home.tsx - Refactored UI with searchable schools
import React, { useEffect, useState } from 'react';
import { useAuth } from '../hook/useAuth';
import { useSocket } from '../hook/useSocket';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

interface School {
  id: string;
  name: string;
  email_domain: string;
  logo_url?: string; // Optional for official logos
}

const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const [selected, setSelected] = useState<'any' | 'same' | string>('any');
  const [inQueue, setInQueue] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSchools, setFilteredSchools] = useState<School[]>([]);
  const [onlineUsers, setOnlineUsers] = useState(0); // NEW: Online count state
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await api.get('/schools');
        setSchools(res.data);
        setFilteredSchools(res.data); // Initial filter
      } catch (err) {
        toast.error('Failed to load schools');
      }
    };
    fetchSchools();
  }, []);

  useEffect(() => {
    const filtered = schools.filter(school =>
      school.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSchools(filtered);
  }, [searchTerm, schools]);

  useEffect(() => {
    if (!socket) return;
    socket.on('matchFound', ({ sessionId, partnerId, isInitiator }) => {
      toast.dismiss('queue');
      toast.success('Match found! 🎉');
      setInQueue(false);
      navigate('/chat', { state: { sessionId, partnerId, isInitiator } });
    });
    socket.on('rejoinQueue', () => {
      setInQueue(true);
      toast.loading('Searching...', { id: 'queue' });
    });
    // NEW: Online users listener
    socket.on('onlineUsers', (count) => {
      setOnlineUsers(count);
    });
    return () => {
      socket.off('matchFound');
      socket.off('rejoinQueue');
      socket.off('onlineUsers');
    };
  }, [socket, navigate]);

  const handleJoinQueue = () => {
    if (!socket) return toast.error('Connection error');
    setInQueue(true);
    toast.loading('Searching...', { id: 'queue' });
    socket.emit('joinQueue', { targetSchool: selected });
  };

  const handleCancel = () => {
    if (!socket) return;
    setInQueue(false);
    toast.dismiss('queue');
    socket.emit('leaveQueue');
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-green-800 to-blue-900 p-6 text-gray-200">
      <header className="w-full max-w-xl mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-green-400">NaijaCampus 🇳🇬</h1>
          <span className="text-green-300">{onlineUsers} online 📱</span> {/* NEW: Display count */}
          <button onClick={logout} className="text-gray-400 hover:text-red-500">Logout</button>
        </div>
        <p className="text-xl mt-2">Welcome, {user?.name}!</p>
      </header>

      <main className="w-full max-w-xl bg-gray-900 rounded-lg shadow-lg p-6 space-y-6">
        <h2 className="text-2xl font-semibold text-center">Chat with...?</h2>
        
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => setSelected('any')}
            className={`p-4 rounded-md flex items-center gap-3 ${selected === 'any' ? 'bg-green-600' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            <span className="text-2xl">🌍</span>
            <div>Anyone (Random across unis)</div>
          </button>
          <button
            onClick={() => setSelected('same')}
            className={`p-4 rounded-md flex items-center gap-3 ${selected === 'same' ? 'bg-green-600' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            <span className="text-2xl">🏫</span>
            <div>My School ({user?.schoolId})</div>
          </button>
        </div>

        <input
          type="text"
          placeholder="Search university..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        <div className="max-h-48 overflow-y-auto space-y-2">
          {filteredSchools.map((school) => (
            <button
              key={school.id}
              onClick={() => setSelected(school.id)}
              className={`w-full p-3 rounded-md flex items-center gap-3 ${selected === school.id ? 'bg-green-600' : 'bg-gray-800 hover:bg-gray-700'}`}
            >
              <img
                src={`https://logo.clearbit.com/${school.email_domain}?size=40`} // Switched to Clearbit
                alt={school.name}
                className="w-10 h-10 rounded-full"
                onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/40?text=' + school.name[0])}
              />
              <div>{school.name}</div>
            </button>
          ))}
          {filteredSchools.length === 0 && <p className="text-center text-gray-400">No schools found</p>}
        </div>

        {!inQueue ? (
          <button
            onClick={handleJoinQueue}
            className="w-full p-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition"
          >
            Start Chatting 🔥
          </button>
        ) : (
          <div className="text-center space-y-4">
            <p className="animate-pulse">Searching for match...</p>
            <button
              onClick={handleCancel}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md"
            >
              Cancel
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;