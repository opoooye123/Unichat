// =======================
// 1. IMPORTS
// =======================
const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Socket handler
const socketHandler = require('./socket');

// =======================
// 2. ENV SETUP
// =======================
dotenv.config();

// =======================
// 3. APP & SERVER SETUP
// =======================
const app = express();
const server = http.createServer(app);

// =======================
// DYNAMIC CORS CONFIG
// =======================
// Add your deployed frontend URL here after deployment
const allowedOrigins = [
  "http://localhost:5173",     // Local development
  "http://localhost:3000",  
  "https://unichat-sigma.vercel.app"   // Alternative local port
  // "https://your-frontend.vercel.app",  // ← Add this after Vercel deployment
  // "https://unichat.ng",                // ← Add custom domain later if you have one
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
};

// Apply CORS to Express
app.use(cors(corsOptions));

// Apply CORS to Socket.io
const io = new Server(server, {
  cors: corsOptions,
});

// =======================
// 4. MIDDLEWARE
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =======================
// 5. DATABASE CONNECTION
// =======================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// =======================
// 6. API ROUTES
// =======================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/reports', reportRoutes);

// =======================
// 7. SOCKET.IO HANDLER
// =======================
socketHandler(io);

// =======================
// 8. START SERVER
// =======================
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
});