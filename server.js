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
const User = require('./script/models/User'); 


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
const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI', 'FINNHUB_API_KEY'];
requiredEnvVars.forEach(env => {
  if (!process.env[env]) {
    console.error(`VIRHE: ${env} ympäristömuuttuja puuttuu`);
    process.exit(1);
  }
});

// Lisää tämä ennen reitityksiä
app.use(cors({
  origin: 'https://trade-track.netlify.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors()); 

// Turvallisuusmiddlewaret
app.use(helmet());
app.use(mongoSanitize());
app.use(hpp());
app.set('trust proxy', 1);
// Rajoita API-kutsujen määrää
const apiLimiter = rateLimit({
  windowMs: API_RATE_LIMIT_WINDOW,
  max: API_RATE_LIMIT_MAX,
  message: 'Liian monta pyyntöä, yritä myöhemmin uudelleen'
});

// Sovellusmiddlewaret
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

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
},
{
  trackedStocks: [ // <--- uusi kenttä
    {type: String,
      uppercase: true,
      trim: true
    }
  ]
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
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
const Alert = mongoose.model('Alert', AlertSchema);

async function sendAlertEmail({ symbol, price, currentPrice, email }) {
  const mailOptions = {
    from: `"TradeTrack" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Uusi hälytys asetettu osakkeelle ${symbol}`,
    html: `
      <div style="max-width:600px; margin:0 auto; font-family:Arial, sans-serif; background-color:#f9f9f9; padding:20px; border-radius:10px; border:1px solid #ddd;">
        <div style="text-align:center; margin-bottom:20px;">
          <img src="https://i.imgur.com/4M7IWwP.png" alt="TradeTrack Logo" style="width:120px; height:auto;" />
          <h2 style="color:#0A192F;">Hälytys asetettu onnistuneesti!</h2>
        </div>
        <p style="font-size:16px; color:#333;">Hei,</p>
        <p style="font-size:16px; color:#333;">
          Olet asettanut hälytyksen osakkeelle <strong>${symbol}</strong>.
        </p>
        <ul style="list-style:none; padding:0; font-size:16px;">
          <li><strong>Hälytyshinta:</strong> ${price} USD</li>
          <li><strong>Nykyinen hinta:</strong> ${currentPrice} USD</li>
        </ul>
        <p style="font-size:16px; color:#333;">
          Voit hallita hälytyksiäsi kirjautumalla sisään TradeTrack-sovellukseen.
        </p>
        <div style="text-align:center; margin-top:30px;">
          <a href="http://localhost:5500/sivut/Alerts.html" style="background-color:#17C3B2; color:#fff; padding:10px 20px; text-decoration:none; border-radius:5px; font-weight:bold;">Avaa hälytyksesi</a>
        </div>
        <p style="font-size:12px; color:#aaa; margin-top:30px; text-align:center;">
          © ${new Date().getFullYear()} TradeTrack – Group 14
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Hälytyssähköposti lähetetty: ${email}`);
  } catch (err) {
    console.error('Sähköpostin lähetys epäonnistui:', err);
  }
}

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
async function fetchStockData(symbol) {
  const API_KEY = process.env.FINNHUB_API_KEY;
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`;

  console.log('Hakee tiedot osoitteesta:', url);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data || !data.c) {
      throw new Error('Virheellinen data tai osaketta ei löytynyt');
    }

    // Palautetaan muotoiltu data vastaamaan vanhaa rakennetta
    return {
      '01. symbol': symbol,
      '05. price': data.c.toString(),            // current price
      '09. change': (data.c - data.pc).toFixed(2), // change
      '10. change percent': ((data.c - data.pc) / data.pc * 100).toFixed(2) + '%' // percent
    };

  } catch (error) {
    console.error('Finnhub API-virhe:', error.message);
    throw error;
  }
}

// Historiallisten hintatietojen haku Finnhubilta
async function fetchHistoricalData(symbol, period) {
  const API_KEY = process.env.FINNHUB_API_KEY;
  const resolutionMap = {
    '1-day': '60',
    '1-week': '60',
    '1-month': 'D',
    '1-year': 'M'
  };

  const resolution = resolutionMap[period] || 'D';
  const now = Math.floor(Date.now() / 1000);
  let from;

  switch (period) {
    case '1-day':
      from = now - 60 * 60 * 24;
      break;
    case '1-week':
      from = now - 60 * 60 * 24 * 7;
      break;
    case '1-month':
      from = now - 60 * 60 * 24 * 30;
      break;
    case '1-year':
      from = now - 60 * 60 * 24 * 365;
      break;
    default:
      throw new Error('Virheellinen ajanjakso');
  }

  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${now}&token=${API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.s !== 'ok') {
    throw new Error('Historiallisia tietoja ei löytynyt');
  }

  const timeSeries = data.t.map((timestamp, i) => ({
    time: new Date(timestamp * 1000).toISOString(),
    close: data.c[i]
  }));

  return timeSeries;
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
// Reitti stock-data:lle (Finnhub Quote)
app.get('/api/stock-data', apiLimiter, async (req, res) => {
  try {
    const { symbol } = req.query;
    console.log('Haetaan osaketietoja symbolille:', symbol);

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Osaketunnus vaaditaan'
      });
    }
    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`);
    const data = await response.json();

    if (!data || !data.c) {
      return res.status(404).json({
        success: false,
        error: 'Osaketietoja ei löytynyt',
        receivedData: data
      });
    }
    const formattedData = {
      '01. symbol': symbol,
      '05. price': data.c.toString(),
      '09. change': data.d?.toString() || '0',
      '10. change percent': (data.dp?.toFixed(2) + '%') || '0%'
    };

    console.log('Palautetaan frontendille:', formattedData);
    res.json({ success: true, data: formattedData });

  } catch (error) {
    console.error('Virhe stock-data-haussa:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Virhe osaketietojen haussa'
    });
  }
});

app.get('/api/historical-data', apiLimiter, async (req, res) => {
  try {
    const { symbol, period } = req.query;
    if (!symbol || !period) {
      return res.status(400).json({ success: false, error: 'symbol ja period ovat pakollisia' });
    }

    const historicalData = await fetchHistoricalData(symbol, period);
    const timestamps = historicalData.map(d => new Date(d.time).getTime() / 1000);
    const closes = historicalData.map(d => d.close);

    res.json({
      success: true,
      data: {
        t: timestamps,
        c: closes
      }
    });
  } catch (error) {
    console.error('Historiallisten tietojen hakuvirhe:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Virhe historiallisissa tiedoissa' });
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
          createdAt: user.createdAt,
          trackedStocks: user.trackedStocks || [] // <-- lisätty
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
// Seurattavat osakkeet
app.put('/api/profile/stocks', authenticateToken, async (req, res) => {
  try {
    const { trackedStocks } = req.body;

    if (!Array.isArray(trackedStocks)) {
      return res.status(400).json({
        success: false,
        error: 'trackedStocks täytyy olla taulukko'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { trackedStocks },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedUser.trackedStocks
    });
  } catch (error) {
    console.error('Seurattujen osakkeiden päivitysvirhe:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Päivitys epäonnistui'
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

    // ✅ Lähetetään sähköposti onnistuneesti asettamisesta
    const mailOptions = {
      from: `TradeTrack <${process.env.EMAIL_USER}>`,
      to: alert.email, // ✅ suoraan kirjautuneen käyttäjän email
      subject: `✅ Hälytys asetettu: ${symbol}`,
      html: `
        <div style="font-family:Arial, sans-serif; max-width:600px; margin:0 auto; padding:20px;">
          <h2 style="color:#0A192F;">Hälytys asetettu onnistuneesti!</h2>
          <p>Olet asettanut hälytyksen osakkeelle <strong>${symbol}</strong>.</p>
          <ul>
            <li><strong>Hälytyshinta:</strong> ${price} USD</li>
            <li><strong>Nykyinen hinta:</strong> ${currentPrice} USD</li>
          </ul>
          <p>Voit hallita hälytyksiäsi <a href="https://trade-track.netlify.app/sivut/Alerts.html">TradeTrackin Hälytykset-sivulta</a>.</p>
          <p style="font-size:12px; color:#888;">© ${new Date().getFullYear()} TradeTrack – Group 14</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Hälytyssähköposti lähetetty: ${req.user.email}`);

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

//  HÄLYTYSSEURANTA 5 min välein
function startAlertMonitor() {
  const CHECK_INTERVAL = 5 * 60 * 1000;

  setInterval(async () => {
    console.log(`[ALERT-MONITOR] Käynnistetään hälytystarkistus...`);
    try {
      const activeAlerts = await Alert.find({ isActive: true, triggered: false });

      for (const alert of activeAlerts) {
        try {
          const symbol = alert.symbol;
          const priceLimit = alert.price;

          const quote = await fetchStockData(symbol);
          const currentPrice = parseFloat(quote['Global Quote']?.['05. price']);

          if (!currentPrice || isNaN(currentPrice)) continue;

          const thresholdReached = (priceLimit > currentPrice) || (priceLimit < currentPrice);

          // Raja ylittynyt
          if (thresholdReached) {
            // Merkitään triggerediksi
            alert.triggered = true;
            alert.currentPrice = currentPrice;
            await alert.save();

            // Lähetetään ilmoitussähköposti
            await transporter.sendMail({
              from: `TradeTrack <${process.env.EMAIL_USER}>`,
              to: alert.email, // <- OIKEIN! Tämä on route-käsittelijän sisällä
              subject: `🔔 Hälytys lauennut: ${symbol}`,
              html: `
                <div style="max-width:600px; margin:0 auto; font-family:Arial, sans-serif; background-color:#f9f9f9; padding:20px; border-radius:10px; border:1px solid #ddd;">
                  <div style="text-align:center; margin-bottom:20px;">
                    <img src="https://i.imgur.com/4M7IWwP.png" alt="TradeTrack Logo" style="width:120px; height:auto;" />
                    <h2 style="color:#0A192F;">Hälytys lauennut!</h2>
                  </div>
                  <p style="font-size:16px; color:#333;">Hei,</p>
                  <p style="font-size:16px; color:#333;">
                    Asettamasi hälytys osakkeelle <strong>${symbol}</strong> on laukaissut.
                  </p>
                  <ul style="list-style:none; padding:0; font-size:16px;">
                    <li><strong>Hälytyshinta:</strong> ${priceLimit} USD</li>
                    <li><strong>Nykyinen hinta:</strong> ${currentPrice.toFixed(2)} USD</li>
                  </ul>
                  <p style="font-size:16px; color:#333;">
                    Voit tarkastella hälytyksiä profiilissasi.
                  </p>
                  <div style="text-align:center; margin-top:30px;">
                    <a href="http://localhost:5500/sivut/Alerts.html" style="background-color:#17C3B2; color:#fff; padding:10px 20px; text-decoration:none; border-radius:5px; font-weight:bold;">Avaa hälytykset</a>
                  </div>
                  <p style="font-size:12px; color:#aaa; margin-top:30px; text-align:center;">
                    © ${new Date().getFullYear()} TradeTrack – Group 14
                  </p>
                </div>
              `
            });

            console.log(`[ALERT-MONITOR] Sähköposti lähetetty käyttäjälle ${alert.email} (${symbol} @ ${currentPrice})`);
          }
        } catch (err) {
          console.error(`[ALERT-MONITOR] Virhe yhden hälytyksen tarkistuksessa:`, err.message);
        }
      }
    } catch (error) {
      console.error('[ALERT-MONITOR] Tarkistus epäonnistui:', error.message);
    }
  }, CHECK_INTERVAL);
}

//  Käynnistä monitorointi palvelimen yhteydessä
startAlertMonitor();

module.exports = server;