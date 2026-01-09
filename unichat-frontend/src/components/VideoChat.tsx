// src/components/VideoChat.tsx - Refactored UI
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../hook/useSocket';
import { useAuth } from '../hook/useAuth';
import toast from 'react-hot-toast';
import api from '../utils/api';

interface ChatMessage {
  text: string;
  from: 'me' | 'partner';
}

interface LocationState {
  sessionId?: string;
  partnerId?: string;
  isInitiator?: boolean;
}

interface ChatMessageData {
  message: string;
  fromUserId: string;
}

interface TypingData {
  isTyping: boolean;
}

interface SignalingMessage {
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

const VideoChat: React.FC = () => {
  const socket = useSocket();
  const { user: _user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId, partnerId, isInitiator } = (location.state as LocationState) || {};

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!socket || !sessionId || !partnerId) {
      toast.error('Invalid session');
      navigate('/home');
      return;
    }

    let canceled = false;
    let makingOffer = false;
    let ignoreOffer = false;
    let isSettingRemoteAnswerPending = false;
    const polite = !isInitiator;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
      ],
    });
    pcRef.current = pc;

    pc.onsignalingstatechange = () => {
      console.log('Signaling state:', pc.signalingState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        toast.error('Connection failed');
        skipChat();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'disconnected') {
        toast.error('Partner disconnected');
        skipChat();
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate');
        socket.emit('signaling', { candidate: event.candidate, targetUserId: partnerId });
      }
    };

    pc.ontrack = (event) => {
      console.log('ontrack fired with streams:', event.streams);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.play().catch(e => console.error('Remote video play error:', e));
        console.log('Remote stream assigned');
      } else {
        console.warn('No remote stream');
      }
    };

    pc.onnegotiationneeded = async () => {
      console.log('Negotiation needed');
      if (canceled) return;
      try {
        makingOffer = true;
        await pc.setLocalDescription();
        console.log('Local Description SDP:', pc.localDescription?.sdp);
        socket.emit('signaling', { description: pc.localDescription, targetUserId: partnerId });
      } catch (err) {
        console.error('Error in onnegotiationneeded:', err);
      } finally {
        makingOffer = false;
      }
    };

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        return stream;
      } catch (err: any) {
        console.error('Mic/Cam Error:', err.name, err.message);
        toast.error('Media access error');
        throw err;
      }
    };

    const mediaPromise = initMedia();

    const addTracks = async () => {
      try {
        const stream = await mediaPromise;
        if (canceled) return;
        stream.getTracks().forEach((track) => {
          if (pc.signalingState !== 'closed') {
            pc.addTrack(track, stream);
          }
        });
      } catch (err) {
        console.error('Error adding tracks:', err);
      }
    };
    addTracks();

    const handleSignalingMessage = async (msg: SignalingMessage) => {
      try {
        const { description, candidate } = msg;
        if (description) {
          const readyForOffer = !makingOffer && (pc.signalingState === 'stable' || isSettingRemoteAnswerPending);
          const offerCollision = description.type === 'offer' && !readyForOffer;

          ignoreOffer = !polite && offerCollision;
          if (ignoreOffer) return;

          isSettingRemoteAnswerPending = description.type === 'answer';
          await pc.setRemoteDescription(description);
          isSettingRemoteAnswerPending = false;

          if (description.type === 'offer') {
            await pc.setLocalDescription();
            socket.emit('signaling', { description: pc.localDescription, targetUserId: partnerId });
          }
        } else if (candidate) {
          await pc.addIceCandidate(candidate);
        }
      } catch (err) {
        console.error('Signaling error:', err);
      }
    };

    socket.on('signaling', handleSignalingMessage);

    socket.on('chat-message', ({ message: msg }: ChatMessageData) => {
      setChatMessages((prev) => [...prev, { text: msg, from: 'partner' }]);
      scrollToBottom();
    });

    socket.on('typing', ({ isTyping: typing }: TypingData) => {
      setIsTyping(typing);
    });

    socket.on('signalingError', ({ msg }: { msg: string }) => {
      toast.error(msg);
    });

    return () => {
      canceled = true;
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
      pc.close();
      socket.off('signaling');
      socket.off('chat-message');
      socket.off('typing');
      socket.off('signalingError');
    };
  }, [socket, sessionId, partnerId, isInitiator, navigate]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (!message.trim() || !socket || !partnerId) return;
    socket.emit('chat-message', { targetUserId: partnerId, message });
    setChatMessages((prev) => [...prev, { text: message, from: 'me' }]);
    setMessage('');
    scrollToBottom();
  };

  const handleTyping = () => {
    if (!socket || !partnerId) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    socket.emit('typing', { targetUserId: partnerId, isTyping: true });
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { targetUserId: partnerId, isTyping: false });
    }, 3000);
  };

  const skipChat = () => {
    if (!socket || !sessionId) return;
    socket.emit('skip', { sessionId });
    toast('Finding next...');
    navigate('/home');
  };

  const reportUser = async () => {
    if (!partnerId) return toast.error('No partner');
    const reason = prompt('Report reason?');
    if (!reason) return;

    try {
      await api.post('/reports/submit', { reportedUserId: partnerId, reason });
      toast.success('Reported');
      skipChat();
    } catch (err) {
      toast.error('Report failed');
    }
  };

  return(
<div className="flex flex-col min-h-screen bg-gradient-to-br from-green-800 to-blue-900 p-2 text-gray-200">
  <header className="text-center mb-2 md:mb-4">
    <h1 className="text-xl md:text-2xl font-bold text-green-400">Video Chat</h1>
  </header>

  <div className="flex flex-col md:flex-row flex-grow gap-2 md:gap-4">
    {/* Video Section */}
    <div className="flex flex-col md:flex-row flex-1 gap-2 md:gap-4">
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className="w-full md:w-1/2 h-48 md:h-auto rounded-md shadow-lg border-2 border-green-500 object-cover"
      />
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full md:w-1/2 h-48 md:h-auto rounded-md shadow-lg border-2 border-blue-500 object-cover"
      />
    </div>

    {/* Chat Section */}
    <div className="flex flex-col flex-1 h-60 md:h-auto">
      <div className="flex-grow overflow-y-auto p-2 md:p-4 bg-gray-800 rounded-md mb-2 md:mb-4">
        {isTyping && <p className="text-gray-400 animate-pulse">Typing...</p>}
        {chatMessages.map((msg, i) => (
          <p
            key={i}
            className={`mb-1 md:mb-2 ${msg.from === 'me' ? 'text-right text-green-400' : 'text-left text-blue-400'}`}
          >
            {msg.text}
          </p>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Message..."
          className="flex-1 p-2 md:p-3 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 md:px-4 md:py-3 bg-green-600 hover:bg-green-700 rounded-md text-sm md:text-base"
        >
          Send
        </button>
      </div>
    </div>
  </div>

  <div className="flex flex-col md:flex-row justify-center gap-2 md:gap-4 mt-2 md:mt-4">
    <button className="px-4 py-2 md:px-6 md:py-3 bg-yellow-600 hover:bg-yellow-700 rounded-md">
      Next
    </button>
    <button className="px-4 py-2 md:px-6 md:py-3 bg-red-600 hover:bg-red-700 rounded-md">
      Report
    </button>
  </div>
</div>

  );
};

export default VideoChat;