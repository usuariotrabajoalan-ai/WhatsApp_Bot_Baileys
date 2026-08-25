require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { startWhatsApp, getStatus, sendMessage } = require('./src/controllers/whatsappController');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// API Routes
app.get('/api/whatsapp/status', (req, res) => {
  const statusInfo = getStatus();
  res.json(statusInfo);
});

// Visual QR Route
app.get('/qr', (req, res) => {
  const statusInfo = getStatus();
  if (statusInfo.status === 'waiting_for_qr') {
    res.send(`<div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
      <h2>Escanea este código con tu WhatsApp:</h2>
      <img src="${statusInfo.qr}" style="width:300px;height:300px; border: 1px solid #ccc; border-radius: 10px; padding: 10px;"/>
      <p>Refresca la página si el código no funciona.</p>
    </div>`);
  } else if (statusInfo.status === 'connected') {
    res.send(`<h2 style="font-family: sans-serif; text-align: center; margin-top: 50px; color: green;">✅ ¡El bot ya está conectado y listo!</h2>`);
  } else {
    res.send(`<h2 style="font-family: sans-serif; text-align: center; margin-top: 50px;">⏳ El bot se está iniciando... Recarga esta página en 5 segundos.</h2>`);
  }
});

app.post('/api/whatsapp/start', (req, res) => {
  startWhatsApp();
  res.json({ message: 'WhatsApp bot startup initiated.' });
});

app.post('/api/whatsapp/send', async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone and message are required.' });
  }

  try {
    await sendMessage(phone, message);
    res.json({ success: true, message: 'Message sent successfully.' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`WhatsApp API Server running on port ${PORT}`);
  // Automatically start the bot when server starts
  startWhatsApp();
});
