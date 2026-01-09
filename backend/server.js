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
const schoolsRoutes = require('./routes/schoolRoutes');
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
  "https://naijacampus.vercel.app"   // Alternative local port
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

// UPDATED: Health check
app.get('/', (req, res) => res.send('UniChat Backend Running'));

// =======================
// 5. DATABASE CONNECTION
// =======================
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {  // Note: Added async for await calls
    console.log('MongoDB connected successfully');

    // Seed schools if empty (latest accredited list as of 2026)
    const School = require('./models/School');  // Add this import at the top of server.js if not already there
    const schoolsCount = await School.countDocuments();

    if (schoolsCount === 0) {
      await School.insertMany([
        // Federal Universities (expanded from NUC 2025 list)
        // Federal Universities (verified and pruned to popular ones)
        { name: 'Abubakar Tafawa Balewa University', email_domain: 'atbu.edu.ng', max_users: 1000 },
        { name: 'Ahmadu Bello University', email_domain: 'abu.edu.ng', max_users: 1000 },
        { name: 'Bayero University', email_domain: 'buk.edu.ng', max_users: 1000 },
        { name: 'Federal University Gashua', email_domain: 'fugashua.edu.ng', max_users: 1000 },
        { name: 'Federal University of Petroleum Resources Effurun', email_domain: 'fupre.edu.ng', max_users: 1000 },
        { name: 'Federal University of Technology Akure', email_domain: 'futa.edu.ng', max_users: 1000 },
        { name: 'Federal University of Technology Minna', email_domain: 'futminna.edu.ng', max_users: 1000 },
        { name: 'Federal University of Technology Owerri', email_domain: 'futo.edu.ng', max_users: 1000 },
        { name: 'Federal University Dutse', email_domain: 'fud.edu.ng', max_users: 1000 },
        { name: 'Federal University Dutsin-Ma', email_domain: 'fudutsinma.edu.ng', max_users: 1000 },
        { name: 'Federal University Kashere', email_domain: 'fukashere.edu.ng', max_users: 1000 },
        { name: 'Federal University Lafia', email_domain: 'fulafia.edu.ng', max_users: 1000 },
        { name: 'Federal University Lokoja', email_domain: 'fulokoja.edu.ng', max_users: 1000 },
        { name: 'Alex Ekwueme Federal University Ndufu-Alike', email_domain: 'funai.edu.ng', max_users: 1000 },
        { name: 'Federal University Otuoke', email_domain: 'fuotuoke.edu.ng', max_users: 1000 },
        { name: 'Federal University Oye-Ekiti', email_domain: 'fuoye.edu.ng', max_users: 1000 },
        { name: 'Federal University Wukari', email_domain: 'fuwukari.edu.ng', max_users: 1000 },
        { name: 'Federal University Birnin Kebbi', email_domain: 'fubk.edu.ng', max_users: 1000 },
        { name: 'Federal University Gusau', email_domain: 'fugusau.edu.ng', max_users: 1000 },
        { name: 'Michael Okpara University of Agriculture Abeokuta', email_domain: 'mouau.edu.ng', max_users: 1000 },
        { name: 'Modibbo Adama University of Technology', email_domain: 'mautech.edu.ng', max_users: 1000 },
        { name: 'National Open University of Nigeria', email_domain: 'noun.edu.ng', max_users: 1000 },
        { name: 'Nnamdi Azikiwe University', email_domain: 'unizik.edu.ng', max_users: 1000 },
        { name: 'Obafemi Awolowo University', email_domain: 'oauife.edu.ng', max_users: 1000 },
        { name: 'University of Abuja', email_domain: 'uniabuja.edu.ng', max_users: 1000 },
        { name: 'University of Benin', email_domain: 'uniben.edu.ng', max_users: 1000 },
        { name: 'University of Calabar', email_domain: 'unical.edu.ng', max_users: 1000 },
        { name: 'University of Ibadan', email_domain: 'stu.ui.edu.ng', max_users: 1000 },
        { name: 'University of Ilorin', email_domain: 'unilorin.edu.ng', max_users: 1000 },
        { name: 'University of Jos', email_domain: 'unijos.edu.ng', max_users: 1000 },
        { name: 'University of Maiduguri', email_domain: 'unimaid.edu.ng', max_users: 1000 },
        { name: 'University of Nigeria Nsukka', email_domain: 'unn.edu.ng', max_users: 1000 },
        { name: 'University of Port Harcourt', email_domain: 'uniport.edu.ng', max_users: 1000 },
        { name: 'University of Uyo', email_domain: 'uniuyo.edu.ng', max_users: 1000 },
        { name: 'Usmanu Danfodiyo University', email_domain: 'udusok.edu.ng', max_users: 1000 },
        { name: 'Federal University of Agriculture Abeokuta', email_domain: 'funaab.edu.ng', max_users: 1000 },
        { name: 'University of Lagos', email_domain: 'unilag.edu.ng', max_users: 1000 },

        // State Universities (pruned to popular ones)
        { name: 'Abia State University', email_domain: 'abiastateuniversity.edu.ng', max_users: 1000 },
        { name: 'Adamawa State University', email_domain: 'adsu.edu.ng', max_users: 1000 },
        { name: 'Adekunle Ajasin University', email_domain: 'aaua.edu.ng', max_users: 1000 },
        { name: 'Akwa Ibom State University', email_domain: 'aksu.edu.ng', max_users: 1000 },
        { name: 'Ambrose Alli University', email_domain: 'aauekpoma.edu.ng', max_users: 1000 },
        { name: 'Chukwuemeka Odumegwu Ojukwu University', email_domain: 'coou.edu.ng', max_users: 1000 },
        { name: 'Benue State University', email_domain: 'bsum.edu.ng', max_users: 1000 },
        { name: 'Delta State University', email_domain: 'delsu.edu.ng', max_users: 1000 },
        { name: 'Ebonyi State University', email_domain: 'ebsu.edu.ng', max_users: 1000 },
        { name: 'Ekiti State University', email_domain: 'eksu.edu.ng', max_users: 1000 },
        { name: 'Enugu State University of Science and Technology', email_domain: 'esut.edu.ng', max_users: 1000 },
        { name: 'Gombe State University', email_domain: 'gsu.edu.ng', max_users: 1000 },
        { name: 'Imo State University', email_domain: 'imsu.edu.ng', max_users: 1000 },
        { name: 'Kaduna State University', email_domain: 'kasu.edu.ng', max_users: 1000 },
        { name: 'Kwara State University', email_domain: 'kwasu.edu.ng', max_users: 1000 },
        { name: 'Ladoke Akintola University of Technology', email_domain: 'lautech.edu.ng', max_users: 1000 },
        { name: 'Rivers State University', email_domain: 'rsu.edu.ng', max_users: 1000 },
        { name: 'Olabisi Onabanjo University', email_domain: 'oouagoiwoye.edu.ng', max_users: 1000 },
        { name: 'Lagos State University', email_domain: 'lasu.edu.ng', max_users: 1000 },
        { name: 'Niger Delta University', email_domain: 'ndu.edu.ng', max_users: 1000 },
        { name: 'Nasarawa State University Keffi', email_domain: 'nsuk.edu.ng', max_users: 1000 },
        { name: 'Osun State University Osogbo', email_domain: 'uniosun.edu.ng', max_users: 1000 },

        // Private Universities (pruned to popular ones)
        { name: 'Babcock University', email_domain: 'babcock.edu.ng', max_users: 1000 },
        { name: 'Covenant University', email_domain: 'covenantuniversity.edu.ng', max_users: 1000 },
        { name: 'Pan-Atlantic University', email_domain: 'pau.edu.ng', max_users: 1000 },
        { name: 'American University of Nigeria', email_domain: 'aun.edu.ng', max_users: 1000 },
        { name: 'Redeemer\'s University', email_domain: 'run.edu.ng', max_users: 1000 },
        { name: 'Afe Babalola University', email_domain: 'abuad.edu.ng', max_users: 1000 },
        { name: 'Baze University', email_domain: 'bazeuniversity.edu.ng', max_users: 1000 },
        { name: 'Nile University of Nigeria, Abuja', email_domain: 'nileuniversity.edu.ng', max_users: 1000 },
        { name: 'Veritas University, Abuja', email_domain: 'veritas.edu.ng', max_users: 1000 },

        // Add General for Gmail users
        { name: 'General', email_domain: 'gmail.com', max_users: 1000 },

        // Add more if needed from NUC updates
      ]);
      console.log('Schools seeded successfully');
    }
    await School.updateOne(
      { email_domain: 'gmail.com' },
      {
        $setOnInsert: {
          name: 'General',
          email_domain: 'gmail.com',
          max_users: 1000,
        },
      },
      { upsert: true }
    );

    console.log('Gmail domain ensured');
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
app.use('/api/schools', schoolsRoutes);
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