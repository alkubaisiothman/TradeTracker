require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');
const path = require('path');

const app = express();

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
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

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

// API-reitit
app.get('/api/test', (req, res) => {
  res.json({
    status: 'online',
    message: 'TradeTrack API toimii',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/stock-data', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ 
        success: false,
        error: 'Osaketunnus vaaditaan',
        example: '/api/stock-data?symbol=AAPL'
      });
    }

    console.log(`Haetaan osaketietoja symbolille: ${symbol}`);
    const data = await fetchStockData(symbol);
    
    if (!data['Global Quote']) {
      return res.status(404).json({ 
        success: false,
        error: 'Osaketietoja ei löytynyt',
        note: 'Tarkista osaketunnus ja API-kutsujen määrä',
        receivedData: data
      });
    }

    res.json(data);
  } catch (error) {
    console.error('Osaketietojen haku epäonnistui:', error);
    res.status(500).json({ 
      success: false,
      error: 'Osaketietojen haku epäonnistui',
      details: error.message,
      solution: 'Yritä uudelleen hetken kuluttua'
    });
  }
});

app.get('/api/historical-data', async (req, res) => {
  try {
    const { symbol, period } = req.query;

    if (!symbol || !period) {
      return res.status(400).json({ 
        success: false,
        error: 'Osaketunnus ja ajanjakso vaaditaan',
        example: '/api/historical-data?symbol=AAPL&period=1-month'
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
          error: 'Virheellinen ajanjakso',
          validPeriods: ['1-day', '1-week', '1-month', '1-year']
        });
    }

    console.log(`Haetaan historiallisia tietoja: ${symbol}, ${period}`);
    const data = await fetchStockData(symbol, functionParam);
    
    if (!data || Object.keys(data).length <= 1) {
      return res.status(404).json({ 
        success: false,
        error: 'Historiallisia tietoja ei löytynyt',
        note: 'Tarkista osaketunnus ja API-kutsujen määrä'
      });
    }

    res.json(data);
  } catch (error) {
    console.error('Historiallisten tietojen haku epäonnistui:', error);
    res.status(500).json({ 
      success: false,
      error: 'Historiallisten tietojen haku epäonnistui',
      details: error.message
    });
  }
});

// Kirjautumisreitit
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Tässä pitäisi olla oikea kirjautumislogiikka
    const user = await User.findOne({ email, password });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Väärä sähköposti tai salasana'
      });
    }

    const token = 'generated-token-' + Math.random().toString(36).substring(2);
    
    res.json({
      success: true,
      token,
      user: {
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Kirjautuminen epäonnistui'
    });
  }
});

// Hälytysreitit
app.post('/api/alerts', async (req, res) => {
  try {
    const { symbol, price, email, currentPrice } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Kirjautuminen vaaditaan'
      });
    }

    const newAlert = new Alert({
      symbol,
      price,
      email,
      currentPrice
    });

    await newAlert.save();

    // Lähetä sähköpostivahvistus
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Uusi hälytys asetettu: ${symbol}`,
      text: `Asetit hälytyksen osakkeelle ${symbol} hinnalla ${price} USD. Nykyinen hinta: ${currentPrice} USD.`
    });

    res.json({
      success: true,
      message: 'Hälytys tallennettu',
      alert: newAlert
    });
  } catch (error) {
    console.error('Hälytyksen tallennusvirhe:', error);
    res.status(500).json({
      success: false,
      error: 'Hälytyksen tallennus epäonnistui'
    });
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