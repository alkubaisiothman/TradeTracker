require('dotenv').config(); // Lataa ympäristömuuttujat .env-tiedostosta
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch'); // Tarvitaan API-kutsuja varten

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Yhdistä MongoDB-tietokantaan
mongoose.connect('mongodb://localhost:27017/tradetrack', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Määritä hälytysmalli
const AlertSchema = new mongoose.Schema({
  symbol: String,
  price: Number,
  email: String,
});

const Alert = mongoose.model('Alert', AlertSchema);

// Sähköpostin lähetys
const transporter = nodemailer.createTransport({
  service: 'gmail', // Käytä Gmailiä
  auth: {
    user: process.env.EMAIL_USER, // Sähköpostiosoite .env-tiedostosta
    pass: process.env.EMAIL_PASSWORD, // Sähköpostin salasana .env-tiedostosta
  },
});

// Hae osaketiedot Alpha Vantage -API:sta
app.get('/api/stock-data', async (req, res) => {
  const symbol = req.query.symbol;
  if (!symbol) {
    return res.status(400).send('Syötä osakkeen symboli!');
  }

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
    );
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Virhe haettaessa osaketietoja:', error);
    res.status(500).send('Osaketietojen haku epäonnistui.');
  }
});

// Hae historialliset tiedot Alpha Vantage -API:sta
app.get('/api/historical-data', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).send('URL puuttuu!');
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Virhe haettaessa historiallisia tietoja:', error);
    res.status(500).send('Historiallisten tietojen haku epäonnistui.');
  }
});

// Tallenna hälytys
app.post('/api/alerts', async (req, res) => {
  const { symbol, price, email } = req.body;

  if (!symbol || !price || !email) {
    return res.status(400).send('Täytä kaikki kentät!');
  }

  try {
    const newAlert = new Alert({ symbol, price, email });
    await newAlert.save();
    res.status(201).send('Hälytys tallennettu!');
  } catch (error) {
    console.error('Virhe tallennettaessa hälytystä:', error);
    res.status(500).send('Hälytyksen tallennus epäonnistui.');
  }
});

// Tarkista hälytykset ja lähetä sähköposti
setInterval(async () => {
  const alerts = await Alert.find({});
  for (const alert of alerts) {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${alert.symbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
      );
      const data = await response.json();

      if (data['Global Quote']) {
        const currentPrice = parseFloat(data['Global Quote']['05. price']);
        if (currentPrice >= alert.price) {
          // Lähetä sähköposti
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: alert.email,
            subject: `Hälytys: ${alert.symbol} on saavuttanut hinnan ${currentPrice} USD`,
            text: `Osake ${alert.symbol} on saavuttanut hinnan ${currentPrice} USD.`,
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Virhe lähetettäessä sähköpostia:', error);
            } else {
              console.log('Sähköposti lähetetty:', info.response);
            }
          });

          // Poista hälytys tietokannasta
          await Alert.findByIdAndDelete(alert._id);
        }
      }
    } catch (error) {
      console.error('Virhe tarkistettaessa osakkeen hintaa:', error);
    }
  }
}, 60000); // Tarkista minuutin välein

// Käynnistä palvelin
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Palvelin käynnissä portissa ${PORT}`);
});