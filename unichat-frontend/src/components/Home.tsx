"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useAuth } from "../hook/useAuth"
import { useSocket } from "../hook/useSocket"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import api from "../utils/api"

interface School {
  id: string
  name: string
  email_domain: string
  logo_url?: string
}

const Home: React.FC = () => {
  const { user, logout } = useAuth()
  const socket = useSocket()
  const [selected, setSelected] = useState<"any" | "same" | string>("any")
  const [inQueue, setInQueue] = useState(false)
  const [schools, setSchools] = useState<School[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredSchools, setFilteredSchools] = useState<School[]>([])
  const [onlineUsers, setOnlineUsers] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await api.get("/schools")
        setSchools(res.data)
        setFilteredSchools(res.data)
      } catch (err) {
        toast.error("Failed to load schools")
      }
    }
    fetchSchools()
  }, [])

  useEffect(() => {
    const filtered = schools.filter((school) => school.name.toLowerCase().includes(searchTerm.toLowerCase()))
    setFilteredSchools(filtered)
  }, [searchTerm, schools])

  useEffect(() => {
    if (!socket) return
    socket.on("matchFound", ({ sessionId, partnerId, isInitiator }) => {
      toast.dismiss("queue")
      toast.success("Match found! 🎉")
      setInQueue(false)
      navigate("/chat", { state: { sessionId, partnerId, isInitiator } })
    })
    socket.on("rejoinQueue", () => {
      setInQueue(true)
      toast.loading("Searching...", { id: "queue" })
    })
    socket.on("onlineUsers", (count) => {
      setOnlineUsers(count)
    })
    return () => {
      socket.off("matchFound")
      socket.off("rejoinQueue")
      socket.off("onlineUsers")
    }
  }, [socket, navigate])

  const handleJoinQueue = () => {
    if (!socket) return toast.error("Connection error")
    setInQueue(true)
    toast.loading("Searching...", { id: "queue" })
    socket.emit("joinQueue", { targetSchool: selected })
  }

  const handleCancel = () => {
    if (!socket) return
    setInQueue(false)
    toast.dismiss("queue")
    socket.emit("leaveQueue")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">NC</span>
            </div>
            <h1 className="text-2xl font-bold text-white">NaijaCampus</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-cyan-400 font-semibold">{onlineUsers}</p>
              <p className="text-xs text-slate-400">online</p>
            </div>
            <button onClick={logout} className="px-4 py-2 text-slate-300 hover:text-red-400 transition text-sm">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-2">Welcome back, {user?.name}! 👋</h2>
          <p className="text-slate-400 text-lg">Connect with fellow students from Nigerian universities</p>
        </div>

        {/* Selection Section */}
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Who do you want to chat with?</h3>

            {/* Quick Selection Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setSelected("any")}
                className={`p-6 rounded-lg border-2 transition-all duration-300 ${
                  selected === "any"
                    ? "bg-cyan-600/20 border-cyan-500 shadow-lg shadow-cyan-500/20"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="text-3xl mb-2">🌍</div>
                <div className="font-semibold text-white">Anyone</div>
                <div className="text-sm text-slate-400">Random across all universities</div>
              </button>

              <button
                onClick={() => setSelected("same")}
                className={`p-6 rounded-lg border-2 transition-all duration-300 ${
                  selected === "same"
                    ? "bg-cyan-600/20 border-cyan-500 shadow-lg shadow-cyan-500/20"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="text-3xl mb-2">🏫</div>
                <div className="font-semibold text-white">Your School</div>
                <div className="text-sm text-slate-400">{user?.schoolId || "Select your school"}</div>
              </button>
            </div>
          </div>

          {/* School Search Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Or choose a specific university</h3>
            <input
              type="text"
              placeholder="Search universities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition"
            />
          </div>

          {searchTerm.trim() && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filteredSchools.length > 0 ? (
                filteredSchools.map((school) => (
                  <button
                    key={school.id}
                    onClick={() => setSelected(school.id)}
                    className={`w-full p-4 rounded-lg border-2 flex items-center gap-4 transition-all duration-300 ${
                      selected === school.id
                        ? "bg-cyan-600/20 border-cyan-500 shadow-lg shadow-cyan-500/20"
                        : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <img
                      src={`https://logo.clearbit.com/${school.email_domain}?size=40`}
                      alt={school.name}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/40?text=" + school.name[0])}
                    />
                    <div className="text-left">
                      <div className="font-medium text-white">{school.name}</div>
                      <div className="text-xs text-slate-500">{school.email_domain}</div>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-center text-slate-400 py-8">No universities found. Try a different search.</p>
              )}
            </div>
          )}

          {/* CTA Button */}
          {!inQueue ? (
            <button
              onClick={handleJoinQueue}
              disabled={!selected}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-cyan-500/30 text-lg"
            >
              Start Chatting ✨
            </button>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                  <p className="text-cyan-400 font-medium">Searching for match...</p>
                </div>
                <p className="text-slate-400 text-sm">You'll be connected shortly</p>
              </div>
              <button
                onClick={handleCancel}
                className="w-full px-6 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 rounded-lg font-medium transition"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Home
