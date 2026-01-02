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
        { name: 'Michael Okpara University of Agriculture Umudike', email_domain: 'mouau.edu.ng', max_users: 1000 },
        { name: 'Modibbo Adama University of Technology', email_domain: 'mautech.edu.ng', max_users: 1000 },
        { name: 'National Open University of Nigeria', email_domain: 'noun.edu.ng', max_users: 1000 },
        { name: 'Nnamdi Azikiwe University', email_domain: 'unizik.edu.ng', max_users: 1000 },
        { name: 'Obafemi Awolowo University', email_domain: 'oauife.edu.ng', max_users: 1000 },
        { name: 'University of Abuja', email_domain: 'uniabuja.edu.ng', max_users: 1000 },
        { name: 'University of Benin', email_domain: 'uniben.edu.ng', max_users: 1000 },
        { name: 'University of Calabar', email_domain: 'unical.edu.ng', max_users: 1000 },
        { name: 'University of Ibadan', email_domain: 'ui.edu.ng', max_users: 1000 },
        { name: 'University of Ilorin', email_domain: 'unilorin.edu.ng', max_users: 1000 },
        { name: 'University of Jos', email_domain: 'unijos.edu.ng', max_users: 1000 },
        { name: 'University of Maiduguri', email_domain: 'unimaid.edu.ng', max_users: 1000 },
        { name: 'University of Nigeria Nsukka', email_domain: 'unn.edu.ng', max_users: 1000 },
        { name: 'University of Port Harcourt', email_domain: 'uniport.edu.ng', max_users: 1000 },
        { name: 'University of Uyo', email_domain: 'uniuyo.edu.ng', max_users: 1000 },
        { name: 'Usmanu Danfodiyo University', email_domain: 'udusok.edu.ng', max_users: 1000 },
        { name: 'Federal University of Agriculture Abeokuta', email_domain: 'funaab.edu.ng', max_users: 1000 },
        { name: 'University of Lagos', email_domain: 'live.unilag.edu.ng', max_users: 1000 },

        // State Universities (expanded from NUC 2025 list)
        { name: 'Abia State University', email_domain: 'abiastateuniversity.edu.ng', max_users: 1000 },
        { name: 'Adamawa State University', email_domain: 'adsu.edu.ng', max_users: 1000 },
        { name: 'Adekunle Ajasin University', email_domain: 'aaua.edu.ng', max_users: 1000 },
        { name: 'Akwa Ibom State University', email_domain: 'aksu.edu.ng', max_users: 1000 },
        { name: 'Ambrose Alli University', email_domain: 'aauekpoma.edu.ng', max_users: 1000 },
        { name: 'Chukwuemeka Odumegwu Ojukwu University', email_domain: 'coou.edu.ng', max_users: 1000 },
        { name: 'Bauchi State University', email_domain: 'basug.edu.ng', max_users: 1000 },
        { name: 'Benue State University', email_domain: 'bsum.edu.ng', max_users: 1000 },
        { name: 'Yobe State University', email_domain: 'ysu.edu.ng', max_users: 1000 },
        { name: 'Cross River State University of Technology', email_domain: 'crutech.edu.ng', max_users: 1000 },
        { name: 'Delta State University', email_domain: 'delsu.edu.ng', max_users: 1000 },
        { name: 'Ebonyi State University', email_domain: 'ebsu.edu.ng', max_users: 1000 },
        { name: 'Ekiti State University', email_domain: 'eksu.edu.ng', max_users: 1000 },
        { name: 'Enugu State University of Science and Technology', email_domain: 'esut.edu.ng', max_users: 1000 },
        { name: 'Gombe State University', email_domain: 'gsu.edu.ng', max_users: 1000 },
        { name: 'Ibrahim Badamasi Babangida University', email_domain: 'ibbu.edu.ng', max_users: 1000 },
        { name: 'Ignatius Ajuru University of Education', email_domain: 'iaue.edu.ng', max_users: 1000 },
        { name: 'Imo State University', email_domain: 'imsu.edu.ng', max_users: 1000 },
        { name: 'Sule Lamido University', email_domain: 'slu.edu.ng', max_users: 1000 },
        { name: 'Kaduna State University', email_domain: 'kasu.edu.ng', max_users: 1000 },
        { name: 'Kano University of Science and Technology', email_domain: 'kustwudil.edu.ng', max_users: 1000 },
        { name: 'Kebbi State University of Science and Technology', email_domain: 'ksusta.edu.ng', max_users: 1000 },
        { name: 'Kwara State University', email_domain: 'kwasu.edu.ng', max_users: 1000 },
        { name: 'Ladoke Akintola University of Technology', email_domain: 'lautech.edu.ng', max_users: 1000 },
        { name: 'Ondo State University of Science and Technology', email_domain: 'osustech.edu.ng', max_users: 1000 },
        { name: 'Rivers State University', email_domain: 'rsu.edu.ng', max_users: 1000 },
        { name: 'Olabisi Onabanjo University', email_domain: 'oouagoiwoye.edu.ng', max_users: 1000 },
        { name: 'Lagos State University', email_domain: 'lasu.edu.ng', max_users: 1000 },
        { name: 'Niger Delta University', email_domain: 'ndu.edu.ng', max_users: 1000 },
        { name: 'Nasarawa State University Keffi', email_domain: 'nsuk.edu.ng', max_users: 1000 },
        { name: 'Plateau State University Bokkos', email_domain: 'plasu.edu.ng', max_users: 1000 },
        { name: 'Tai Solarin University of Education', email_domain: 'tasued.edu.ng', max_users: 1000 },
        { name: 'Osun State University Osogbo', email_domain: 'uniosun.edu.ng', max_users: 1000 },
        { name: 'Taraba State University, Jalingo', email_domain: 'tsuniversity.edu.ng', max_users: 1000 },
        { name: 'Sokoto State University', email_domain: 'ssu.edu.ng', max_users: 1000 },
        { name: 'Yusuf Maitama Sule University Kano', email_domain: 'yumsuk.edu.ng', max_users: 1000 },
        { name: 'Kingsley Ozumba Mbadiwe University Ogboko', email_domain: 'komu.edu.ng', max_users: 1000 },
        { name: 'University of Delta, Agbor', email_domain: 'unidel.edu.ng', max_users: 1000 },
        { name: 'Dennis Osadebe University, Asaba', email_domain: 'dou.edu.ng', max_users: 1000 },
        { name: 'Bamidele Olumilua University of Science and Technology Ikere, Ekiti State', email_domain: 'bouesti.edu.ng', max_users: 1000 },
        { name: 'Lagos State University of Education, Ijanikin', email_domain: 'lasued.edu.ng', max_users: 1000 },
        { name: 'Lagos State University of Science and Technology Ikorodu', email_domain: 'lasustech.edu.ng', max_users: 1000 },
        { name: 'Olapo Arinjoro University of Medical Sciences Ilesa, Osun State', email_domain: 'oaums.edu.ng', max_users: 1000 },
        { name: 'Shehu Shagari University of Education, Sokoto', email_domain: 'ssues.edu.ng', max_users: 1000 },
        { name: 'Enugu State University of Medical and Applied Sciences, Igbo-Eno', email_domain: 'sumas.edu.ng', max_users: 1000 },
        { name: 'University of Ilesa, Osun State', email_domain: 'unilesa.edu.ng', max_users: 1000 },
        { name: 'Sokoto State University of Medical Sciences', email_domain: 'ssums.edu.ng', max_users: 1000 },
        { name: 'Aliko Dangote University of Science and Technology', email_domain: 'adustech.edu.ng', max_users: 1000 },

        // Private Universities (expanded from NUC 2025 list)
        { name: 'Babcock University', email_domain: 'babcock.edu.ng', max_users: 1000 },
        { name: 'Igbinedion University Okada', email_domain: 'iuokada.edu.ng', max_users: 1000 },
        { name: 'Madonna University', email_domain: 'madonnauniversity.edu.ng', max_users: 1000 },
        { name: 'Bowen University', email_domain: 'bowen.edu.ng', max_users: 1000 },
        { name: 'Benson Idahosa University', email_domain: 'biu.edu.ng', max_users: 1000 },
        { name: 'Covenant University', email_domain: 'covenantuniversity.edu.ng', max_users: 1000 },
        { name: 'Pan-Atlantic University', email_domain: 'pau.edu.ng', max_users: 1000 },
        { name: 'American University of Nigeria', email_domain: 'aun.edu.ng', max_users: 1000 },
        { name: 'Ajayi Crowther University', email_domain: 'acu.edu.ng', max_users: 1000 },
        { name: 'Al-Hikmah University', email_domain: 'alhikmah.edu.ng', max_users: 1000 },
        { name: 'Al-Qalam University', email_domain: 'auk.edu.ng', max_users: 1000 },
        { name: 'Bells University of Technology', email_domain: 'bellsuniversity.edu.ng', max_users: 1000 },
        { name: 'Bingham University', email_domain: 'binghamuni.edu.ng', max_users: 1000 },
        { name: 'Caritas University', email_domain: 'caritasuni.edu.ng', max_users: 1000 },
        { name: 'Crawford University', email_domain: 'crawforduniversity.edu.ng', max_users: 1000 },
        { name: 'Crescent University', email_domain: 'crescent.edu.ng', max_users: 1000 },
        { name: 'Kwararafa University', email_domain: 'kwararafauniversity.edu.ng', max_users: 1000 },
        { name: 'Lead City University', email_domain: 'lcu.edu.ng', max_users: 1000 },
        { name: 'Novena University', email_domain: 'novenauniversity.edu.ng', max_users: 1000 },
        { name: 'Redeemer\'s University', email_domain: 'run.edu.ng', max_users: 1000 },
        { name: 'Achievers University Owo', email_domain: 'achievers.edu.ng', max_users: 1000 },
        { name: 'Adeleke University Ede', email_domain: 'adelekeuniversity.edu.ng', max_users: 1000 },
        { name: 'African University of Science and Technology Abuja', email_domain: 'aust.edu.ng', max_users: 1000 },
        { name: 'Afe Babalola University', email_domain: 'abuad.edu.ng', max_users: 1000 },
        { name: 'Anchor University Ayobo Lagos State', email_domain: 'aul.edu.ng', max_users: 1000 },
        { name: 'Arthur Javis University Akpoyubo Cross river State', email_domain: 'arthurjarvisuniversity.edu.ng', max_users: 1000 },
        { name: 'Atiba University Oyo', email_domain: 'atibauniversity.edu.ng', max_users: 1000 },
        { name: 'Augustine University', email_domain: 'augustineuniversity.edu.ng', max_users: 1000 },
        { name: 'Ave Maria University, Piyanko, Nasarawa State', email_domain: 'avemariauniversity.edu.ng', max_users: 1000 },
        { name: 'Baze University', email_domain: 'bazeuniversity.edu.ng', max_users: 1000 },
        { name: 'Caleb University', email_domain: 'calebuniversity.edu.ng', max_users: 1000 },
        { name: 'Chrisland University', email_domain: 'chrislanduniversity.edu.ng', max_users: 1000 },
        { name: 'Christopher University Mowe', email_domain: 'christopheruniversity.edu.ng', max_users: 1000 },
        { name: 'Clifford University Owerrinta Abia State', email_domain: 'clifforduni.edu.ng', max_users: 1000 },
        { name: 'Coal City University Enugu State', email_domain: 'ccu.edu.ng', max_users: 1000 },
        { name: 'Crown Hill University Eiyenkorin, Kwara State', email_domain: 'crownhilluniversity.edu.ng', max_users: 1000 },
        { name: 'Dominican University Ibadan Oyo State', email_domain: 'dui.edu.ng', max_users: 1000 },
        { name: 'Dominion University Ibadan Oyo State', email_domain: 'dominionuniversity.edu.ng', max_users: 1000 },
        { name: 'Edwin Clark University, Kaigbodo', email_domain: 'edwinclarkuniversity.edu.ng', max_users: 1000 },
        { name: 'Eko University of Medical and Health Sciences Ijanikin, Lagos', email_domain: 'ekounimed.edu.ng', max_users: 1000 },
        { name: 'Elizade University, Ilara-Mokin', email_domain: 'elizadeuniversity.edu.ng', max_users: 1000 },
        { name: 'Evangel University, Akaeze', email_domain: 'evangeluniversity.edu.ng', max_users: 1000 },
        { name: 'Fountain Unveristy Oshogbo', email_domain: 'fuo.edu.ng', max_users: 1000 },
        { name: 'Godfrey Okoye University, Ugwuomu-Nike - Enugu State', email_domain: 'gouni.edu.ng', max_users: 1000 },
        { name: 'Gregory University, Uturu', email_domain: 'gregoryuniversityuturu.edu.ng', max_users: 1000 },
        { name: 'Hallsmark University', email_domain: 'hallmark.edu.ng', max_users: 1000 },
        { name: 'Hezekiah University, Umudi', email_domain: 'hezekiah.edu.ng', max_users: 1000 },
        { name: 'Kings University', email_domain: 'kingsuniversity.edu.ng', max_users: 1000 },
        { name: 'Karl-Kumm University, Vom, Plateau State', email_domain: 'kku.edu.ng', max_users: 1000 },
        { name: 'Khaled Ben Walid University, Maiduguri', email_domain: 'kbwu.edu.ng', max_users: 1000 },
        { name: 'Khalifa Isiyaku Rabiu University, Kano', email_domain: 'kiru.edu.ng', max_users: 1000 },
        { name: 'Margaret Lawrence University, Galilee, Delta State', email_domain: 'mlu.edu.ng', max_users: 1000 },
        { name: 'Maryam Abacha American University of Nigeria', email_domain: 'maaun.edu.ng', max_users: 1000 },
        { name: 'Mcpherson University, Seriki Sotayo, Ajebo', email_domain: 'mcu.edu.ng', max_users: 1000 },
        { name: 'Mudiame University, Irrua, Edo State', email_domain: 'mudiameuniversity.edu.ng', max_users: 1000 },
        { name: 'Mujayid University, Katsina', email_domain: 'muk.edu.ng', max_users: 1000 },
        { name: 'Newgate University, Minna, Niger State', email_domain: 'newgateuniversity.edu.ng', max_users: 1000 },
        { name: 'Nigerian British University, Asa, Abia State', email_domain: 'nbu.edu.ng', max_users: 1000 },
        { name: 'Nigerian Police Academy Wudil', email_domain: 'polac.edu.ng', max_users: 1000 },
        { name: 'Nile University of Nigeria, Abuja', email_domain: 'nileuniversity.edu.ng', max_users: 1000 },
        { name: 'NorthWest University Sokoto State', email_domain: 'nwus.edu.ng', max_users: 1000 },
        { name: 'Oduduwa University, Ipetumodu - Osun State', email_domain: 'oduduwauniversity.edu.ng', max_users: 1000 },
        { name: 'PAMO University of Medical Sciences, Portharcourt', email_domain: 'pums.edu.ng', max_users: 1000 },
        { name: 'Peter University, Achina-Onneh Anambra State', email_domain: 'peteruniversity.edu.ng', max_users: 1000 },
        { name: 'Philomath University, Kuje, Abuja', email_domain: 'philomathuniversity.edu.ng', max_users: 1000 },
        { name: 'Phoenix University, Agwada, Nasarawa State', email_domain: 'phoenixuniversity.edu.ng', max_users: 1000 },
        { name: 'Precious Cornerstone University, Oyo', email_domain: 'pcu.edu.ng', max_users: 1000 },
        { name: 'Prime University, Kuje, FCT Abuja', email_domain: 'primeuniversity.edu.ng', max_users: 1000 },
        { name: 'Rayhaan University, Kebbi', email_domain: 'rayhaanuniversity.edu.ng', max_users: 1000 },
        { name: 'Renaissance University, Enugu', email_domain: 'rnu.edu.ng', max_users: 1000 },
        { name: 'Rhema University, Obeama-Asa - Rivers State', email_domain: 'rhemauniversity.edu.ng', max_users: 1000 },
        { name: 'Ritman University, Ikot Ekpene, Akwa Ibom', email_domain: 'ritmanuniversity.edu.ng', max_users: 1000 },
        { name: 'Salem University, Lokoja', email_domain: 'salemuniversity.edu.ng', max_users: 1000 },
        { name: 'Saisa University of Medical Sciences and Allied Health Sciences, Sokoto State', email_domain: 'sumsa.edu.ng', max_users: 1000 },
        { name: 'Skyline University, Kano', email_domain: 'sun.edu.ng', max_users: 1000 },
        { name: 'Spiritan University, Nneochi Abia State', email_domain: 'spiritanuniversity.edu.ng', max_users: 1000 },
        { name: 'Sports University, Idumuje, Ugboko, Delta State', email_domain: 'sportsuniversity.edu.ng', max_users: 1000 },
        { name: 'Summit University', email_domain: 'summituniversity.edu.ng', max_users: 1000 },
        { name: 'Tansian University, Umunya', email_domain: 'tansianuniversity.edu.ng', max_users: 1000 },
        { name: 'Thomas Adewumi University, Oko-Irese, Kwara State', email_domain: 'tau.edu.ng', max_users: 1000 },
        { name: 'Topfaith University, Mkpatak, Akwa Ibom State', email_domain: 'topfaith.edu.ng', max_users: 1000 },
        { name: 'Trinity University Ogun State', email_domain: 'trinityuniversity.edu.ng', max_users: 1000 },
        { name: 'University of Mkar, Mkar', email_domain: 'unimkar.edu.ng', max_users: 1000 },
        { name: 'University of Offa, Kwara State', email_domain: 'unioffa.edu.ng', max_users: 1000 },
        { name: 'Veritas University, Abuja', email_domain: 'veritas.edu.ng', max_users: 1000 },
        { name: 'Vision University, Ikogbo, Ogun State', email_domain: 'visionuniversity.edu.ng', max_users: 1000 },
        { name: 'Wellspring University, Evbuobanosa - Edo State', email_domain: 'wellspringuniversity.edu.ng', max_users: 1000 },
        { name: 'Western Delta University, Oghara Delta State', email_domain: 'wdu.edu.ng', max_users: 1000 },
        { name: 'Westland University Iwo, Osun State', email_domain: 'westland.edu.ng', max_users: 1000 },
        { name: 'Wigwe University, Isiokpo Rivers State', email_domain: 'wigweuniversity.edu.ng', max_users: 1000 },
        // Add more if needed from NUC updates
      ]);
      console.log('Schools seeded successfully');
    }
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