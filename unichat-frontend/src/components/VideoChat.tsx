// src/components/VideoChat.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../hook/useSocket';
import { useAuth } from '../hook/useAuth';
import toast from 'react-hot-toast';

interface ChatMessage {
  text: string;
  from: 'me' | 'partner';
}

interface LocationState {
  sessionId?: string;
  partnerId?: string;
  isInitiator?: boolean;
}

interface SignalData {
  sdp: RTCSessionDescriptionInit;
  fromUserId: string;
}

interface IceCandidateData {
  candidate: RTCIceCandidateInit;
  fromUserId: string;
}

interface ChatMessageData {
  message: string;
  fromUserId: string;
}

interface TypingData {
  isTyping: boolean;
}

const VideoChat: React.FC = () => {
  const socket = useSocket(); // returns Socket | null
  const { user: _user } = useAuth(); // prefix to avoid unused warning
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
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  useEffect(() => {
    // guard
    if (!socket || !sessionId || !partnerId) return;

    let cancelled = false; // cancels async work if effect cleans up quickly

    // create PC and attach to ref
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    pcRef.current = pc;

    // helper: safe addTrack that checks signalingState and catches errors
    const safeAddTracks = (stream: MediaStream) => {
      const candidatePc = pcRef.current;
      if (!candidatePc) return;
      if (candidatePc.signalingState === 'closed') {
        // can't add tracks to closed pc
        return;
      }
      for (const track of stream.getTracks()) {
        try {
          candidatePc.addTrack(track, stream);
        } catch (err) {
          // log but continue — some browsers may throw if pc state changed
          console.warn('addTrack failed (ignored):', err);
        }
      }
    };

    // init local media and add tracks
    const initStream = async () => {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        // if effect already cleaned up, stop tracks and bail
        if (cancelled) {
          localStream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = localStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

        // Safely add tracks to PC (no op if pc closed)
        safeAddTracks(localStream);
      } catch (err) {
        console.error('getUserMedia failed', err);
        toast.error('Unable to access camera/microphone');
      }
    };

    // ontrack -> attach remote stream
    pc.ontrack = (event) => {
      // event.streams is an array; use first
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0] ?? null;
      }
    };

    // send ICE candidates to partner
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        try {
          socket.emit('ice-candidate', { targetUserId: partnerId, candidate: event.candidate });
        } catch (err) {
          console.warn('emit ice-candidate failed', err);
        }
      }
    };

    // signaling handlers (typed)
    const handleOffer = async (data: SignalData) => {
      const { sdp, fromUserId } = data;
      if (fromUserId !== partnerId) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { targetUserId: partnerId, sdp: answer });
      } catch (err) {
        console.error('handleOffer error', err);
      }
    };

    const handleAnswer = async (data: SignalData) => {
      const { sdp, fromUserId } = data;
      if (fromUserId !== partnerId) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error('handleAnswer error', err);
      }
    };

    const handleIce = async (data: IceCandidateData) => {
      const { candidate, fromUserId } = data;
      if (fromUserId !== partnerId || !candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('addIceCandidate error', err);
      }
    };

    const handleChat = (data: ChatMessageData) => {
      const { message: msg, fromUserId } = data;
      if (fromUserId !== partnerId) return;
      setChatMessages((prev) => [...prev, { text: msg, from: 'partner' }]);
    };

    const handleTyping = (data: TypingData) => {
      setIsTyping(Boolean(data.isTyping));
    };

    // attach socket listeners
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIce);
    socket.on('chat-message', handleChat);
    socket.on('typing', handleTyping);

    // partner left or server asked to rejoin queue
    socket.on('rejoinQueue', () => {
      toast('Partner left. Finding a new one...');
      // stop and clear state locally — server will emit matchFound when a new partner is found
      // close pc; next effect re-creates PC when new sessionId/partnerId arrives
      try {
        pcRef.current?.close();
      } catch {}
      pcRef.current = null;

      // stop local stream if we want to re-acquire later; keep it usually to avoid camera flicker
      // localStreamRef.current?.getTracks().forEach((t) => t.stop());
      setChatMessages([]);
    });

    socket.on('banned', ({ reason }: { reason: string }) => {
      toast.error(`You have been banned: ${reason}`);
      navigate('/login');
    });

    // start local stream and add tracks (safe)
    initStream();

    // if we're initiator, create offer (do after a tiny delay to allow tracks to be added)
    const offerTimeout = setTimeout(async () => {
      try {
        if (isInitiator) {
          // only create offer if pc still exists and not closed
          if (pcRef.current && pcRef.current.signalingState !== 'closed') {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('offer', { targetUserId: partnerId, sdp: offer });
          }
        }
      } catch (err) {
        console.error('createOffer error', err);
      }
    }, 250);

    // cleanup
    return () => {
      cancelled = true;
      clearTimeout(offerTimeout);

      // remove socket listeners safely
      try {
        socket.off('offer', handleOffer);
        socket.off('answer', handleAnswer);
        socket.off('ice-candidate', handleIce);
        socket.off('chat-message', handleChat);
        socket.off('typing', handleTyping);
        socket.off('rejoinQueue');
        socket.off('banned');
      } catch {}

      // stop local tracks
      try {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch (err) {}

      // close pc if exists
      try {
        pcRef.current?.close();
      } catch {}
      pcRef.current = null;
    };
    // intentionally excluding localStreamRef from deps to avoid re-runs when set
    // effect depends on socket/sessionId/partnerId/isInitiator only
  }, [socket, sessionId, partnerId, isInitiator, navigate]);

  // send message
  const sendMessage = () => {
    if (!message.trim() || !socket || !partnerId) return;
    try {
      socket.emit('chat-message', { targetUserId: partnerId, message });
      setChatMessages((prev) => [...prev, { text: message, from: 'me' }]);
      setMessage('');
    } catch (err) {
      console.warn('emit chat-message failed', err);
    }
  };

  // typing
  const handleTyping = () => {
    if (!socket || !partnerId) return;
    try {
      socket.emit('typing', { targetUserId: partnerId, isTyping: true });
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        socket.emit('typing', { targetUserId: partnerId, isTyping: false });
      }, 1000);
    } catch (err) {
      console.warn('typing emit failed', err);
    }
  };

  const skipChat = () => {
    if (!socket || !sessionId) return;
    try {
      socket.emit('skip', { sessionId });
      toast.loading('Finding next partner...', { id: 'skip' });
    } catch (err) {
      console.warn('skip emit failed', err);
    }
  };

  const reportUser = () => {
    const reason = prompt('Report reason:');
    if (!reason?.trim() || !socket || !partnerId) return;
    try {
      socket.emit('report-user', { reportedUserId: partnerId, reason });
      toast.success('Reported');
      skipChat();
    } catch (err) {
      console.warn('report-user emit failed', err);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-1 flex flex-col md:flex-row gap-2 p-2">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full md:w-1/2 object-cover rounded-2xl bg-gray-900"
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full md:w-1/2 object-cover rounded-2xl bg-gray-900"
        />
      </div>

      <div className="h-80 bg-gray-900 p-6 flex flex-col rounded-t-3xl">
        <div className="flex-1 overflow-y-auto mb-4 text-white">
          {isTyping && <p className="text-gray-400 italic animate-pulse mb-2">Partner is typing...</p>}
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
