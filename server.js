require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

// Alusta Express-sovellus
const app = express();

// Vakiot ja konfiguraatio
const SALT_ROUNDS = 10;
const JWT_CONFIG = {
  expiresIn: '1h',
  issuer: 'tradetrack-api'
};
const API_RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minuuttia
const API_RATE_LIMIT_MAX = 100;

// Tarkista pakolliset ympäristömuuttujat
const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI', 'ALPHA_VANTAGE_API_KEY'];
requiredEnvVars.forEach(env => {
  if (!process.env[env]) {
    console.error(`VIRHE: ${env} ympäristömuuttuja puuttuu`);
    process.exit(1);
  }
});

// Turvallisuusmiddlewaret
app.use(helmet());
app.use(mongoSanitize());
app.use(hpp());

// Rajoita API-kutsujen määrää
const apiLimiter = rateLimit({
  windowMs: API_RATE_LIMIT_WINDOW,
  max: API_RATE_LIMIT_MAX,
  message: 'Liian monta pyyntöä, yritä myöhemmin uudelleen'
});

// Sovellusmiddlewaret
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cors({
  origin: [
    'http://localhost:5500', 
    'http://127.0.0.1:5500', 
    'http://localhost:5000', 
    'http://127.0.0.1:5000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Staattisten tiedostojen tarjoaminen
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB-yhteys
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tradetrack')
.then(() => console.log('Yhdistetty MongoDB:hen onnistuneesti'))
.catch(err => {
  console.error('MongoDB-yhteysvirhe:', err);
  process.exit(1);
});

// MongoDB mallit
const AlertSchema = new mongoose.Schema({
  symbol: { 
    type: String, 
    required: [true, 'Osaketunnus on pakollinen'],
    uppercase: true,
    trim: true
  },
  price: { 
    type: Number, 
    required: [true, 'Hinta on pakollinen'],
    min: [0, 'Hinnan tulee olla positiivinen']
  },
  email: { 
    type: String, 
    required: [true, 'Sähköposti on pakollinen'],
    lowercase: true,
    trim: true
  },
  currentPrice: { 
    type: Number, 
    required: [true, 'Nykyinen hinta on pakollinen'] 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'Käyttäjä-ID on pakollinen'] 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  triggered: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, 'Käyttäjänimi on pakollinen'],
    unique: true,
    minlength: [3, 'Käyttäjänimen tulee olla vähintään 3 merkkiä pitkä'],
    maxlength: [20, 'Käyttäjänimi saa olla enintään 20 merkkiä pitkä'],
    match: [/^[a-zA-Z0-9]+$/, 'Käyttäjänimi saa sisältää vain kirjaimia ja numeroita'],
    trim: true
  },
  email: { 
    type: String, 
    required: [true, 'Sähköposti on pakollinen'],
    unique: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Syötä validi sähköpostiosoite'],
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: [true, 'Salasana on pakollinen'],
    minlength: [6, 'Salasanan tulee olla vähintään 6 merkkiä pitkä'],
    select: false
  },
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Salasana hash ennen tallennusta
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

// Vertaa salasanoja
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Alert = mongoose.model('Alert', AlertSchema);
const User = mongoose.model('User', UserSchema);

// Sähköpostin lähetys
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Autentikointimiddleware (SIJRATTU YLÖS ENNEN KÄYTTÖÄ)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Kirjautuminen vaaditaan'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false,
        error: 'Virheellinen tai vanhentunut token'
      });
    }
    req.user = user;
    next();
  });
}

// Apufunktio API-kutsuille
async function fetchStockData(symbol, functionParam = 'GLOBAL_QUOTE') {
  console.log(`Käytetään API-avainta: ${process.env.ALPHA_VANTAGE_API_KEY}`); // Lisätty
  const url = `https://www.alphavantage.co/query?function=${functionParam}&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`;
  console.log('URL:', url); // Lisätty debug-tuloste
  
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.Note) {
      throw new Error(`API rajoitus: ${data.Note}`);
    }

    if (data.Information) {
      throw new Error(`API info: ${data.Information}`);
    }

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    return data;
  } catch (error) {
    console.error('API-kutsun virhe:', error);
    throw error;
  }
}

// API-reitit
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Osaketiedot
app.get('/api/stock-data', apiLimiter, async (req, res) => {
  try {
    const { symbol } = req.query;
    console.log('Haetaan osaketietoja symbolille:', symbol); // Debug
    
    if (!symbol) {
      return res.status(400).json({ 
        success: false,
        error: 'Osaketunnus vaaditaan'
      });
    }

    const data = await fetchStockData(symbol);
    console.log('API vastaus:', JSON.stringify(data, null, 2)); // Debug
    
    if (!data || !data['Global Quote']) {
      return res.status(404).json({ 
        success: false,
        error: 'Osaketietoja ei löytynyt',
        receivedData: data // Lisätty debug-tieto
      });
    }

    res.json({
      success: true,
      data: data['Global Quote']
    });
  } catch (error) {
    console.error('Osaketietojen haku epäonnistui:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Osaketietojen haku epäonnistui',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Historialliset tiedot
app.get('/api/historical-data', apiLimiter, async (req, res) => {
  try {
    const { symbol, period } = req.query;

    if (!symbol || !period) {
      return res.status(400).json({ 
        success: false,
        error: 'Osaketunnus ja ajanjakso vaaditaan'
      });
    }

    let functionParam;
    switch (period) {
      case '1-day': 
        functionParam = 'TIME_SERIES_INTRADAY&interval=60min'; 
        break;
      case '1-week':
      case '1-month': 
        functionParam = 'TIME_SERIES_DAILY'; 
        break;
      case '1-year': 
        functionParam = 'TIME_SERIES_MONTHLY'; 
        break;
      default: 
        return res.status(400).json({ 
          success: false,
          error: 'Virheellinen ajanjakso'
        });
    }

    const data = await fetchStockData(symbol, functionParam);
    
    if (!data || Object.keys(data).length <= 1) {
      return res.status(404).json({ 
        success: false,
        error: 'Historiallisia tietoja ei löytynyt'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Historiallisten tietojen haku epäonnistui:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Historiallisten tietojen haku epäonnistui'
    });
  }
});

// Käyttäjähallinta
app.post('/api/register', apiLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validoi syötteet
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Kaikki kentät ovat pakollisia'
      });
    }
    
    // Tarkista onko käyttäjä olemassa
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'Käyttäjätunnus tai sähköposti on jo käytössä'
      });
    }
    
    // Luo uusi käyttäjä
    const newUser = new User({ username, email, password });
    await newUser.save();
    
    // Luo JWT-token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      JWT_CONFIG
    );
    
    res.status(201).json({ 
      success: true,
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('Rekisteröintivirhe:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Rekisteröinti epäonnistui'
    });
  }
});

app.post('/api/login', apiLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Sähköposti ja salasana ovat pakollisia'
      });
    }
    
    // Etsi käyttäjä sähköpostilla
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Väärä sähköposti tai salasana'
      });
    }
    
    // Vertaa salasanoja
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        error: 'Väärä sähköposti tai salasana'
      });
    }
    
    // Päivitä viimeisin kirjautumisaika
    user.lastLogin = new Date();
    await user.save();
    
    // Luo JWT-token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      JWT_CONFIG
    );
    
    res.json({ 
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Kirjautumisvirhe:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Kirjautuminen epäonnistui'
    });
  }
});

// Profiili- ja hälytysreitit
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Käyttäjää ei löytynyt'
      });
    }

    const alerts = await Alert.find({ userId: user._id, isActive: true })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        },
        alertCount: alerts.length,
        recentAlerts: alerts
      }
    });
  } catch (error) {
    console.error('Profiilin hakuvirhe:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Profiilin haku epäonnistui'
    });
  }
});

app.get('/api/alerts', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const alerts = await Alert.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalAlerts = await Alert.countDocuments({ userId: req.user.userId });

    res.json({
      success: true,
      data: {
        alerts,
        pagination: {
          total: totalAlerts,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalAlerts / limit)
        }
      }
    });
  } catch (error) {
    console.error('Hälytysten hakuvirhe:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Hälytysten haku epäonnistui'
    });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { username, avatarUrl } = req.body;
    
    const updates = {};
    if (username) updates.username = username;
    if (avatarUrl) updates.avatarUrl = avatarUrl;
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Profiilin päivitysvirhe:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Profiilin päivitys epäonnistui'
    });
  }
});

app.put('/api/profile/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Nykyinen ja uusi salasana vaaditaan'
      });
    }
    
    const user = await User.findById(req.user.userId).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        error: 'Väärä nykyinen salasana'
      });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ 
      success: true,
      message: 'Salasana vaihdettu onnistuneesti' 
    });
  } catch (error) {
    console.error('Salasanan vaihtovirhe:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Salasanan vaihto epäonnistui'
    });
  }
});

app.delete('/api/profile', authenticateToken, async (req, res) => {
  try {
    if (!req.body.confirm) {
      return res.status(400).json({ 
        success: false,
        error: 'Vahvista tilin poisto'
      });
    }

    await User.findByIdAndDelete(req.user.userId);
    await Alert.deleteMany({ userId: req.user.userId });
    
    res.json({ 
      success: true,
      message: 'Tili poistettu onnistuneesti' 
    });
  } catch (error) {
    console.error('Tilin poistovirhe:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Tilin poisto epäonnistui'
    });
  }
});

// Hälytykset
app.post('/api/alerts', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const { symbol, price, currentPrice } = req.body;
    
    if (!symbol || !price || !currentPrice) {
      return res.status(400).json({ 
        success: false,
        error: 'Kaikki kentät ovat pakollisia'
      });
    }
    
    const newAlert = new Alert({
      symbol,
      price,
      currentPrice,
      email: req.user.email,
      userId: req.user.userId
    });

    await newAlert.save();

    // Lähetä sähköpostivahvistus
    try {
      await transporter.sendMail({
        from: `TradeTrack <${process.env.EMAIL_USER}>`,
        to: req.user.email,
        subject: `Uusi hälytys asetettu: ${symbol}`,
        html: `
          <h2>Hälytys asetettu onnistuneesti</h2>
          <p>Olet asettanut hälytyksen osakkeelle <strong>${symbol}</strong>.</p>
          <p><strong>Hälytyshinta:</strong> ${price} USD</p>
          <p><strong>Nykyinen hinta:</strong> ${currentPrice} USD</p>
          <p>Voit hallita hälytyksiä profiilissasi.</p>
        `
      });
    } catch (emailError) {
      console.error('Sähköpostin lähetysvirhe:', emailError);
    }

    res.status(201).json({
      success: true,
      data: newAlert
    });
  } catch (error) {
    console.error('Hälytyksen tallennusvirhe:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Hälytyksen tallennus epäonnistui'
    });
  }
});

app.delete('/api/alerts/:id', authenticateToken, async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!alert) {
      return res.status(404).json({ 
        success: false,
        error: 'Hälytystä ei löytynyt'
      });
    }
    
    res.json({ 
      success: true,
      message: 'Hälytys poistettu onnistuneesti' 
    });
  } catch (error) {
    console.error('Hälytyksen poistovirhe:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Hälytyksen poisto epäonnistui'
    });
  }
});

// Staattisten sivujen reititys
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404-virheenkäsittelijä
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Resurssia ei löytynyt'
  });
});

// Yleinen virheenkäsittelijä
app.use((err, req, res, next) => {
  console.error('Palvelinvirhe:', err);
  res.status(500).json({
    success: false,
    error: 'Palvelinvirhe',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Palvelimen käynnistys
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n--- TradeTrack API ---`);
  console.log(`Palvelin käynnissä portissa ${PORT}`);
  console.log(`Ympäristö: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MongoDB: ${mongoose.connection.readyState === 1 ? 'Yhdistetty' : 'Ei yhteyttä'}`);
  console.log(`Testaa: http://localhost:${PORT}/api/health\n`);
});

// Käsittele odottamattomat virheet
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

module.exports = server;