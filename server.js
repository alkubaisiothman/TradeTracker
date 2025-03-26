require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const saltRounds = 10;
const jwtSecret = process.env.JWT_SECRET || 'salainenavain';

// Middlewaret
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:5000', 'http://127.0.0.1:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Staattisten tiedostojen tarjoaminen
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB-yhteys
mongoose.connect('mongodb://127.0.0.1:27017/tradetrack', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
})
.then(() => console.log('Yhdistetty MongoDB:hen onnistuneesti'))
.catch(err => {
  console.error('MongoDB-yhteysvirhe:', err);
  process.exit(1);
});

// Mallit
const AlertSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  price: { type: Number, required: true },
  email: { type: String, required: true },
  currentPrice: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  triggered: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatarUrl: { type: String },
  trackedStocks: [{ type: String }],
  lastLogin: { type: Date }
}, { timestamps: true });

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

// API-avaimen tarkistus
if (!process.env.ALPHA_VANTAGE_API_KEY) {
  console.error('Alpha Vantage API -avain puuttuu!');
  process.exit(1);
}

// Apufunktio API-kutsuille
async function fetchStockData(symbol, functionParam = 'GLOBAL_QUOTE') {
  const url = `https://www.alphavantage.co/query?function=${functionParam}&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`;
  console.log('Tehdään API-kutsu:', url);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.Note) {
      throw new Error(`API rajoitus: ${data.Note}`);
    }

    if (data.Information) {
      throw new Error(`API info: ${data.Information}`);
    }

    return data;
  } catch (error) {
    console.error('API-kutsun virhe:', error);
    throw error;
  }
}

// Autentikointimiddleware
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// API-reitit
app.get('/api/test', (req, res) => {
  res.json({
    status: 'online',
    message: 'TradeTrack API toimii',
    timestamp: new Date().toISOString()
  });
});

// Osaketiedot
app.get('/api/stock-data', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ 
        success: false,
        error: 'Osaketunnus vaaditaan'
      });
    }

    const data = await fetchStockData(symbol);
    
    if (!data['Global Quote']) {
      return res.status(404).json({ 
        success: false,
        error: 'Osaketietoja ei löytynyt'
      });
    }

    res.json(data);
  } catch (error) {
    console.error('Osaketietojen haku epäonnistui:', error);
    res.status(500).json({ 
      success: false,
      error: 'Osaketietojen haku epäonnistui'
    });
  }
});

// Historialliset tiedot
app.get('/api/historical-data', async (req, res) => {
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
      case '1-day': functionParam = 'TIME_SERIES_INTRADAY&interval=60min'; break;
      case '1-week':
      case '1-month': functionParam = 'TIME_SERIES_DAILY'; break;
      case '1-year': functionParam = 'TIME_SERIES_MONTHLY'; break;
      default: return res.status(400).json({ error: 'Virheellinen ajanjakso' });
    }

    const data = await fetchStockData(symbol, functionParam);
    
    if (!data || Object.keys(data).length <= 1) {
      return res.status(404).json({ error: 'Historiallisia tietoja ei löytynyt' });
    }

    res.json(data);
  } catch (error) {
    console.error('Historiallisten tietojen haku epäonnistui:', error);
    res.status(500).json({ error: 'Historiallisten tietojen haku epäonnistui' });
  }
});

// Käyttäjähallinta
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Kaikki kentät ovat pakollisia' });
    }
    
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Käyttäjätunnus tai sähköposti on jo käytössä' });
    }
    
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    
    res.json({ success: true, message: 'Käyttäjä rekisteröity onnistuneesti' });
  } catch (error) {
    console.error('Rekisteröintivirhe:', error);
    res.status(500).json({ error: 'Rekisteröinti epäonnistui' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Sähköposti ja salasana ovat pakollisia' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Väärä sähköposti tai salasana' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Väärä sähköposti tai salasana' });
    }
    
    // Päivitä viimeisin kirjautumisaika
    user.lastLogin = new Date();
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      jwtSecret,
      { expiresIn: '1h' }
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
    res.status(500).json({ error: 'Kirjautuminen epäonnistui' });
  }
});

// Profiili- ja hälytysreitit
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .lean();
    
    if (!user) {
      return res.status(404).json({ error: 'Käyttäjää ei löytynyt' });
    }

    const alerts = await Alert.find({ userId: user._id, isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      ...user,
      alertCount: alerts.length,
      alerts
    });
  } catch (error) {
    console.error('Profiilin hakuvirhe:', error);
    res.status(500).json({ error: 'Profiilin haku epäonnistui' });
  }
});

app.get('/api/alerts', authenticateToken, async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();
    
    res.json(alerts);
  } catch (error) {
    console.error('Hälytysten hakuvirhe:', error);
    res.status(500).json({ error: 'Hälytysten haku epäonnistui' });
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
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    console.error('Profiilin päivitysvirhe:', error);
    res.status(500).json({ error: 'Profiilin päivitys epäonnistui' });
  }
});

app.put('/api/profile/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Nykyinen ja uusi salasana vaaditaan' });
    }
    
    const user = await User.findById(req.user.userId);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Väärä nykyinen salasana' });
    }
    
    user.password = await bcrypt.hash(newPassword, saltRounds);
    await user.save();
    
    res.json({ message: 'Salasana vaihdettu onnistuneesti' });
  } catch (error) {
    console.error('Salasanan vaihtovirhe:', error);
    res.status(500).json({ error: 'Salasanan vaihto epäonnistui' });
  }
});

app.delete('/api/profile', authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.userId);
    await Alert.deleteMany({ userId: req.user.userId });
    
    res.json({ message: 'Tili poistettu onnistuneesti' });
  } catch (error) {
    console.error('Tilin poistovirhe:', error);
    res.status(500).json({ error: 'Tilin poisto epäonnistui' });
  }
});

// Hälytykset
app.post('/api/alerts', authenticateToken, async (req, res) => {
  try {
    const { symbol, price, currentPrice } = req.body;
    
    if (!symbol || !price || !currentPrice) {
      return res.status(400).json({ error: 'Kaikki kentät ovat pakollisia' });
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
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: req.user.email,
      subject: `Uusi hälytys asetettu: ${symbol}`,
      text: `Asetit hälytyksen osakkeelle ${symbol} hinnalla ${price} USD. Nykyinen hinta: ${currentPrice} USD.`
    });

    res.json(newAlert);
  } catch (error) {
    console.error('Hälytyksen tallennusvirhe:', error);
    res.status(500).json({ error: 'Hälytyksen tallennus epäonnistui' });
  }
});

app.delete('/api/alerts/:id', authenticateToken, async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!alert) {
      return res.status(404).json({ error: 'Hälytystä ei löytynyt' });
    }
    
    res.json({ message: 'Hälytys poistettu onnistuneesti' });
  } catch (error) {
    console.error('Hälytyksen poistovirhe:', error);
    res.status(500).json({ error: 'Hälytyksen poisto epäonnistui' });
  }
});

// Staattisten sivujen reititys
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Virheenkäsittelijä
app.use((err, req, res, next) => {
  console.error('Palvelinvirhe:', err);
  res.status(500).json({
    success: false,
    error: 'Palvelinvirhe',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Palvelimen käynnistys
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n--- TradeTrack API ---`);
  console.log(`Palvelin käynnissä portissa ${PORT}`);
  console.log(`Ympäristö: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API-avain: ${process.env.ALPHA_VANTAGE_API_KEY ? 'Ladattu' : 'Puuttuu'}`);
  console.log(`MongoDB: ${mongoose.connection.readyState === 1 ? 'Yhdistetty' : 'Ei yhteyttä'}`);
  console.log(`Testaa: http://localhost:${PORT}/api/test\n`);
});