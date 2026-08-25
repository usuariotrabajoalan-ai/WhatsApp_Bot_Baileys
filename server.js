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
