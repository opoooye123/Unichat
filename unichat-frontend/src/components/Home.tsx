import React, { useEffect, useState } from 'react';
import { useAuth } from '../hook/useAuth';
import { useSocket } from '../hook/useSocket';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const schools = [
  { id: 'unilag', name: 'University of Lagos (UNILAG)' },
  { id: 'futa', name: 'Federal University of Technology Akure (FUTA)' },
  { id: 'babcock', name: 'Babcock University' },
  { id: 'caleb', name: 'Caleb University' },
  { id: 'pau', name: 'Pan-Atlantic University (PAU)' },
];

const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const [selected, setSelected] = useState<'any' | 'same' | string>('any');
  const [inQueue, setInQueue] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return;

    socket.on('matchFound', ({ sessionId, partnerId }: { sessionId: string; partnerId: string }) => {
      toast.dismiss('queue'); // ← Dismiss the "Searching..." toast
      toast.success('Match found! 🎉 Starting chat...');
      setInQueue(false);
      navigate('/chat', { state: { sessionId, partnerId } });
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
    if (inQueue) return;

    let targetSchool: string | undefined = undefined;
    if (selected === 'any') targetSchool = 'any';
    else if (selected === 'same') targetSchool = 'same';
    else targetSchool = selected;

    socket?.emit('joinQueue', { targetSchool });
    setInQueue(true);
    toast.loading('Searching for someone... ⏳', { id: 'queue' });
  };

const handleCancel = () => {
  socket?.emit('leaveQueue'); // ← New dedicated event
  setInQueue(false);
  toast.dismiss('queue');
  toast.dismiss('Search cancelled');
};
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-gray-900 dark:to-black flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Unichat 🇳🇬
          </h1>
          <p className="text-2xl mt-4">Welcome back, {user.name.split(' ')[0]}!</p>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Your school: <span className="font-bold text-purple-600">{user.schoolId.toUpperCase()}</span>
          </p>
        </div>

        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-3xl shadow-2xl p-10">
          <h2 className="text-3xl font-bold text-center mb-10">Who do you want to chat with?</h2>

          <div className="grid gap-6 mb-10">
            {/* Anyone */}
            <button
              onClick={() => setSelected('any')}
              disabled={inQueue}
              className={`p-8 rounded-3xl border-4 transition-all flex items-center gap-6 ${
                selected === 'any'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/40 shadow-2xl scale-105'
                  : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
              }`}
            >
              <div className="text-6xl">🌍</div>
              <div className="text-left flex-1">
                <div className="text-2xl font-bold">Anyone</div>
                <div className="text-gray-600 dark:text-gray-400">Random match from any school (including yours)</div>
              </div>
            </button>

            {/* Same School */}
            <button
              onClick={() => setSelected('same')}
              disabled={inQueue}
              className={`p-8 rounded-3xl border-4 transition-all flex items-center gap-6 ${
                selected === 'same'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/40 shadow-2xl scale-105'
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
              }`}
            >
              <img
                src={`/logos/${user.schoolId}.png`}
                alt="My School"
                className="w-20 h-20 rounded-full object-contain bg-white shadow-lg"
                onError={(e) => (e.currentTarget.src = 'https://picsum.photos/80/80?blur=2')}
              />
              <div className="text-left flex-1">
                <div className="text-2xl font-bold">Same School Only</div>
                <div className="text-gray-600 dark:text-gray-400">Connect with fellow {user.schoolId.toUpperCase()} students</div>
              </div>
            </button>

            {/* Other Schools */}
            {schools.filter(s => s.id !== user.schoolId).map(school => (
              <button
                key={school.id}
                onClick={() => setSelected(school.id)}
                disabled={inQueue}
                className={`p-8 rounded-3xl border-4 transition-all flex items-center gap-6 ${
                  selected === school.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40 shadow-2xl scale-105'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                <img
                  src={`/logos/${school.id}.png`}
                  alt={school.name}
                  className="w-20 h-20 rounded-full object-contain bg-white shadow-lg"
                  onError={(e) => (e.currentTarget.src = 'https://picsum.photos/80/80?random=' + school.id)}
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
    </div>
  );
};

export default Home;