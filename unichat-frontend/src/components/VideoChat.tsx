import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../hook/useSocket';
import { useAuth } from '../hook/useAuth';
import toast from 'react-hot-toast';

const VideoChat: React.FC = () => {
  const socket = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { sessionId, partnerId } = (location.state as { sessionId?: string; partnerId?: string }) || {};

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [chatMessages, setChatMessages] = useState<{ text: string; from: 'me' | 'partner' }[]>([]);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  let typingTimer: ReturnType<typeof setTimeout> | undefined = undefined;

  useEffect(() => {
    if (!socket || !sessionId || !partnerId || !user) {
      toast.error('Invalid session');
      navigate('/home');
      return;
    }

    console.log('Starting video chat:', { sessionId, partnerId });

    // Create peer connection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    pcRef.current = pc;

    // Get media
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((localStream) => {
        setStream(localStream);
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

        // Add tracks
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });

        // Remote stream
        pc.ontrack = (event) => {
          const remoteStream = event.streams[0];
          console.log('✅ Remote video connected!');
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        };

        // ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice-candidate', {
              targetUserId: partnerId,
              candidate: event.candidate.toJSON(),
            });
          }
        };

        // Create offer
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .then(() => {
            socket.emit('offer', {
              targetUserId: partnerId,
              sdp: pc.localDescription,
            });
          });
      })
      .catch(err => {
        console.error('Media error:', err);
        toast.error('Camera/mic denied. Refresh after allowing.');
      });

    // Handle incoming signals
    socket.on('offer', async ({ sdp }) => {
      if (pc.signalingState !== 'stable') return;
      await pc.setRemoteDescription(sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { targetUserId: partnerId, sdp: pc.localDescription });
    });

    socket.on('answer', async ({ sdp }) => {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(sdp);
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.warn('ICE candidate failed:', e);
      }
    });

    // Chat & typing
    socket.on('chat-message', ({ message: msg }) => {
      setChatMessages(prev => [...prev, { text: msg, from: 'partner' }]);
    });

    socket.on('typing', ({ isTyping }) => setIsTyping(isTyping));

    socket.on('rejoinQueue', () => {
      toast.dismiss();
      toast.success('Back in queue!');
      navigate('/home');
    });

    return () => {
      stream?.getTracks().forEach(t => t.stop());
      pc.close();
      pcRef.current = null;
      socket.off();
    };
  }, [socket, sessionId, partnerId, user, navigate]);

  const sendMessage = () => {
    if (!message.trim() || !socket) return;
    socket.emit('chat-message', { targetUserId: partnerId, message });
    setChatMessages(prev => [...prev, { text: message, from: 'me' }]);
    setMessage('');
  };

  const handleTyping = () => {
    socket?.emit('typing', { targetUserId: partnerId, isTyping: true });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      socket?.emit('typing', { targetUserId: partnerId, isTyping: false });
    }, 1000);
  };

  const skipChat = () => {
    socket?.emit('skip', { sessionId });
    toast.loading('Ending chat...', { id: 'skip' });
  };

  const reportUser = () => {
    const reason = prompt('Report reason:');
    if (reason?.trim()) {
      socket?.emit('report-user', { reportedUserId: partnerId, reason });
      toast('Reported');
      skipChat();
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-1 flex flex-col md:flex-row gap-2 p-2">
        <video ref={localVideoRef} autoPlay muted playsInline className="w-full md:w-1/2 object-cover rounded-2xl bg-gray-900" />
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full md:w-1/2 object-cover rounded-2xl bg-gray-900" />
      </div>

      <div className="h-80 bg-gray-900 p-6 flex flex-col rounded-t-3xl">
        <div className="flex-1 overflow-y-auto mb-4 text-white">
          {isTyping && <p className="text-gray-400 italic animate-pulse mb-2">Partner is typing...</p>}
          {chatMessages.map((msg, i) => (
            <p key={i} className={`mb-3 ${msg.from === 'me' ? 'text-right text-blue-400' : 'text-left text-green-400'}`}>
              {msg.text}
            </p>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 p-4 rounded-2xl bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-purple-500"
          />
          <button onClick={sendMessage} className="px-8 bg-purple-600 hover:bg-purple-700 rounded-2xl font-bold transition">
            Send
          </button>
        </div>

        <div className="flex justify-center gap-8">
          <button onClick={skipChat} className="px-12 py-4 bg-yellow-600 hover:bg-yellow-700 rounded-2xl text-xl font-bold transition">
            Skip
          </button>
          <button onClick={reportUser} className="px-12 py-4 bg-red-600 hover:bg-red-700 rounded-2xl text-xl font-bold transition">
            Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoChat;