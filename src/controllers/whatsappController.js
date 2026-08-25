const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { usePostgresAuthState } = require('../config/usePostgresAuthState');
const QRCode = require('qrcode');
const { Boom } = require('@hapi/boom');
const pino = require('pino');

let sock;
let currentQR = null;
let isConnected = false;
let isInitializing = false;

const startWhatsApp = async () => {
  if (isInitializing) return;
  isInitializing = true;
  console.log('Starting WhatsApp Bot...');

  try {
    const { state, saveCreds, clearAuth } = await usePostgresAuthState();

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: 'silent' }), // Hide verbose logs
      browser: ['AFEMEC Coberturas', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Generate QR as Base64 for the web panel
        currentQR = await QRCode.toDataURL(qr);
        isConnected = false;
        console.log('New QR code generated.');
      }

      if (connection === 'close') {
        isConnected = false;
        const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('Connection closed due to:', lastDisconnect?.error, ', reconnecting:', shouldReconnect);

        if (shouldReconnect) {
          setTimeout(startWhatsApp, 3000); // Reconnect automatically
        } else {
          // Logged out
          console.log('Logged out. Clearing auth data and restarting...');
          await clearAuth();
          currentQR = null;
          startWhatsApp();
        }
      } else if (connection === 'open') {
        isConnected = true;
        currentQR = null;
        console.log('WhatsApp connected successfully!');
      }
    });

  } catch (error) {
    console.error('Failed to initialize WhatsApp:', error);
  } finally {
    isInitializing = false;
  }
};

const getStatus = () => {
  if (isConnected) {
    return { status: 'connected' };
  } else if (currentQR) {
    return { status: 'waiting_for_qr', qr: currentQR };
  } else {
    return { status: 'disconnected' };
  }
};

const sendMessage = async (phone, text) => {
  if (!isConnected || !sock) {
    throw new Error('WhatsApp is not connected.');
  }

  // Ensure format is e.g., 595981123456@s.whatsapp.net
  const formattedPhone = phone.includes('@s.whatsapp.net') ? phone : `${phone}@s.whatsapp.net`;
  
  await sock.sendMessage(formattedPhone, { text });
};

module.exports = {
  startWhatsApp,
  getStatus,
  sendMessage
};
