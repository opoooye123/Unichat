// src/components/VideoChat.tsx
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

    let canceled = false; // Flag to skip async ops on simulated unmount

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
        toast.error('Connection failed - try again');
        skipChat();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'disconnected') {
        toast.error('Stranger disconnected');
        skipChat();
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate');
        socket.emit('ice-candidate', { candidate: event.candidate, targetUserId: partnerId });
      }
    };

    pc.ontrack = (event) => {
      console.log('ontrack fired', event.streams);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        return stream; // Resolve with stream for awaiting
      } catch (err: any) {
        console.error('Mic/Cam Error:', err.name, err.message);
        let msg = 'Allow mic/camera access or try text chat.';
        if (err.name === 'NotReadableError') {
          msg = 'Camera/mic in use by another app/tab. Close them and retry.';
        } else if (err.name === 'NotAllowedError') {
          msg = 'Permission denied. Check browser settings and allow access.';
        } else if (err.name === 'InvalidStateError') {
          msg = 'Connection closed unexpectedly. Retry matching.';
        }
        toast.error(msg);
        throw err; // Propagate error if needed
      }
    };

    const mediaPromise = initMedia(); // Start media acquisition

    const addTracks = async () => {
      try {
        const stream = await mediaPromise; // Wait for media
        if (canceled) {
          console.log('Add tracks canceled due to unmount');
          return;
        }
        stream.getTracks().forEach((track) => {
          if (pc.signalingState !== 'closed') {
            pc.addTrack(track, stream);
          } else {
            console.warn('PC closed - skipping addTrack');
          }
        });
      } catch (err) {
        console.error('Error adding tracks:', err);
      }
    };
    addTracks(); // Run async, but we'll await mediaPromise elsewhere

    socket.on('offer', async ({ sdp }) => {
      console.log('Received offer');
      try {
        await mediaPromise; // Ensure tracks added before processing offer
        if (canceled) {
          console.log('Offer handling canceled due to unmount');
          return;
        }
        if (pc.signalingState === 'stable') {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log('Answer SDP:', pc.localDescription?.sdp); // Debug: Check for m=video/audio lines
          socket.emit('answer', { sdp: answer, targetUserId: partnerId });
        } else {
          console.warn('Ignoring offer in non-stable state');
        }
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    });

    socket.on('answer', async ({ sdp }) => {
      console.log('Received answer');
      if (pc.signalingState !== 'closed') {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } else {
        console.warn('PC closed - ignoring answer');
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      console.log('Received ICE candidate');
      if (pc.signalingState !== 'closed') {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        console.warn('PC closed - ignoring ICE');
      }
    });

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

    if (isInitiator) {
      console.log('Creating offer as initiator');
      (async () => {
        try {
          await mediaPromise; // Ensure tracks added before offer
          if (canceled) {
            console.log('Offer creation canceled due to unmount');
            return;
          }
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          console.log('Offer SDP:', pc.localDescription?.sdp); // Debug: Check for m=video/audio lines
          socket.emit('offer', { sdp: offer, targetUserId: partnerId });
        } catch (err) {
          console.error('Error creating offer:', err);
        }
      })();
    }

    return () => {
      canceled = true; // Cancel pending async ops
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      pc.close();
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
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
    toast('Finding next match...');
    navigate('/home');
  };

  const reportUser = async () => {
    if (!partnerId) return toast.error('No partner to report');
    const reason = prompt('Why are you reporting?');
    if (!reason) return;

    try {
      await api.post('/reports/submit', { reportedUserId: partnerId, reason });
      toast.success('Report submitted');
      skipChat();
    } catch (err) {
      toast.error('Report failed');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 p-6">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8">
        <h1 className="text-4xl font-extrabold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          Video Chat
        </h1>

        <div className="flex gap-6 mb-8">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-1/2 rounded-2xl shadow-xl border-4 border-purple-500" />
          <video ref={remoteVideoRef} autoPlay playsInline className="w-1/2 rounded-2xl shadow-xl border-4 border-blue-500" />
        </div>

        <div className="h-64 overflow-y-auto mb-4 p-6 bg-gray-100 dark:bg-gray-900 rounded-2xl">
          {isTyping && <p className="text-gray-500 animate-pulse mb-2">Partner is typing...</p>}
          {chatMessages.map((msg, i) => (
            <p key={i} className={`mb-3 ${msg.from === 'me' ? 'text-right text-blue-400' : 'text-left text-green-400'}`}>
              {msg.text}
            </p>
          ))}
          <div ref={chatEndRef} />
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
            Next
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