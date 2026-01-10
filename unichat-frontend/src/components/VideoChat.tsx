"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useSocket } from "../hook/useSocket"
import { useAuth } from "../hook/useAuth"
import toast from "react-hot-toast"
import api from "../utils/api"
import { PhoneOff, Send, X } from "lucide-react"

interface ChatMessage {
  text: string
  from: "me" | "partner"
}

interface LocationState {
  sessionId?: string
  partnerId?: string
  isInitiator?: boolean
}

interface ChatMessageData {
  message: string
  fromUserId: string
}

interface TypingData {
  isTyping: boolean
}

interface SignalingMessage {
  description?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

const VideoChat: React.FC = () => {
  const socket = useSocket()
  const { user: _user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { sessionId, partnerId, isInitiator } = (location.state as LocationState) || {}

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [showChat, setShowChat] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!socket || !sessionId || !partnerId) {
      toast.error("Invalid session")
      navigate("/home")
      return
    }

    let canceled = false
    let makingOffer = false
    let ignoreOffer = false
    let isSettingRemoteAnswerPending = false
    const polite = !isInitiator

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
    })
    pcRef.current = pc

    pc.onsignalingstatechange = () => {
      console.log("Signaling state:", pc.signalingState)
    }

    pc.oniceconnectionstatechange = () => {
      console.log("ICE state:", pc.iceConnectionState)
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
        toast.error("Connection failed")
        skipChat()
      }
    }

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState)
      if (pc.connectionState === "disconnected") {
        toast.error("Partner disconnected")
        skipChat()
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate")
        socket.emit("signaling", { candidate: event.candidate, targetUserId: partnerId })
      }
    }

    pc.ontrack = (event) => {
      console.log("ontrack fired with streams:", event.streams)
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
        remoteVideoRef.current.play().catch((e) => console.error("Remote video play error:", e))
        console.log("Remote stream assigned")
      } else {
        console.warn("No remote stream")
      }
    }

    pc.onnegotiationneeded = async () => {
      console.log("Negotiation needed")
      if (canceled) return
      try {
        makingOffer = true
        await pc.setLocalDescription()
        console.log("Local Description SDP:", pc.localDescription?.sdp)
        socket.emit("signaling", { description: pc.localDescription, targetUserId: partnerId })
      } catch (err) {
        console.error("Error in onnegotiationneeded:", err)
      } finally {
        makingOffer = false
      }
    }

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        localStreamRef.current = stream
        if (localVideoRef.current) localVideoRef.current.srcObject = stream
        return stream
      } catch (err: any) {
        console.error("Mic/Cam Error:", err.name, err.message)
        toast.error("Media access error")
        throw err
      }
    }

    const mediaPromise = initMedia()

    const addTracks = async () => {
      try {
        const stream = await mediaPromise
        if (canceled) return
        stream.getTracks().forEach((track) => {
          if (pc.signalingState !== "closed") {
            pc.addTrack(track, stream)
          }
        })
      } catch (err) {
        console.error("Error adding tracks:", err)
      }
    }
    addTracks()

    const handleSignalingMessage = async (msg: SignalingMessage) => {
      try {
        const { description, candidate } = msg
        if (description) {
          const readyForOffer = !makingOffer && (pc.signalingState === "stable" || isSettingRemoteAnswerPending)
          const offerCollision = description.type === "offer" && !readyForOffer

          ignoreOffer = !polite && offerCollision
          if (ignoreOffer) return

          isSettingRemoteAnswerPending = description.type === "answer"
          await pc.setRemoteDescription(description)
          isSettingRemoteAnswerPending = false

          if (description.type === "offer") {
            await pc.setLocalDescription()
            socket.emit("signaling", { description: pc.localDescription, targetUserId: partnerId })
          }
        } else if (candidate) {
          await pc.addIceCandidate(candidate)
        }
      } catch (err) {
        console.error("Signaling error:", err)
      }
    }

    socket.on("signaling", handleSignalingMessage)

    socket.on("chat-message", ({ message: msg }: ChatMessageData) => {
      setChatMessages((prev) => [...prev, { text: msg, from: "partner" }])
      scrollToBottom()
    })

    socket.on("typing", ({ isTyping: typing }: TypingData) => {
      setIsTyping(typing)
    })

    socket.on("signalingError", ({ msg }: { msg: string }) => {
      toast.error(msg)
    })

    return () => {
      canceled = true
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach((track) => track.stop())
      pc.close()
      socket.off("signaling")
      socket.off("chat-message")
      socket.off("typing")
      socket.off("signalingError")
    }
  }, [socket, sessionId, partnerId, isInitiator, navigate])

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = () => {
    if (!message.trim() || !socket || !partnerId) return
    socket.emit("chat-message", { targetUserId: partnerId, message })
    setChatMessages((prev) => [...prev, { text: message, from: "me" }])
    setMessage("")
    scrollToBottom()
  }

  const handleTyping = () => {
    if (!socket || !partnerId) return
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    socket.emit("typing", { targetUserId: partnerId, isTyping: true })
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { targetUserId: partnerId, isTyping: false })
    }, 3000)
  }

  const skipChat = () => {
    if (!socket || !sessionId) return
    socket.emit("skip", { sessionId })
    toast("Finding next...")
    navigate("/home")
  }

  const reportUser = async () => {
    if (!partnerId) return toast.error("No partner")
    const reason = prompt("Report reason?")
    if (!reason) return

    try {
      await api.post("/reports/submit", { reportedUserId: partnerId, reason })
      toast.success("Reported")
      skipChat()
    } catch (err) {
      toast.error("Report failed")
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      <div className="flex-1 relative bg-black">
        {/* Remote Video - Full screen */}
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

        <div className="absolute bottom-6 right-6 w-24 h-32 md:w-32 md:h-48 rounded-lg overflow-hidden shadow-2xl border-2 border-cyan-400/50 bg-black">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        </div>

        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4 z-20">
          <button
            onClick={skipChat}
            className="p-3 md:p-4 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all hover:scale-110"
            title="End call"
          >
            <PhoneOff size={24} />
          </button>
          <button
            onClick={reportUser}
            className="px-4 py-3 md:px-6 md:py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-medium shadow-lg transition-all text-sm"
            title="Report user"
          >
            Report
          </button>
        </div>

        <button
          onClick={() => setShowChat(!showChat)}
          className="absolute top-6 right-6 md:bottom-6 md:top-auto md:right-auto md:left-6 p-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full shadow-lg z-30 transition-all"
          title="Toggle chat"
        >
          <span className="text-sm font-bold">💬</span>
        </button>
      </div>

      {showChat && (
        <div className="absolute md:relative inset-0 md:inset-auto bottom-0 left-0 right-0 md:w-80 bg-slate-800/95 md:bg-slate-800 backdrop-blur md:backdrop-blur-none border-t md:border-l border-slate-700 flex flex-col h-96 md:h-full z-40 rounded-t-2xl md:rounded-none">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h3 className="text-white font-semibold">Messages</h3>
            <button onClick={() => setShowChat(false)} className="md:hidden text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isTyping && (
              <div className="flex items-end gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.from === "me"
                      ? "bg-cyan-500 text-white rounded-br-none"
                      : "bg-slate-700 text-slate-100 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm break-words">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-slate-700 flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                handleTyping()
              }}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Message..."
              className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-full placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
            />
            <button
              onClick={sendMessage}
              className="p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full transition-all"
              title="Send message"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoChat
