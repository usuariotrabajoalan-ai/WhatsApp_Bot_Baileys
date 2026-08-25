const { initAuthCreds, BufferJSON } = require('@whiskeysockets/baileys');
const { pool } = require('./db');

/**
 * Custom auth state that saves everything into PostgreSQL
 */
const usePostgresAuthState = async () => {
  const readData = async (key) => {
    try {
      const res = await pool.query('SELECT value FROM whatsapp_auth WHERE key = $1', [key]);
      if (res.rows.length > 0) {
        const value = res.rows[0].value;
        return JSON.parse(JSON.stringify(value), BufferJSON.reviver);
      }
      return null;
    } catch (error) {
      console.error('Error reading from PostgreSQL:', error);
      return null;
    }
  };

  const writeData = async (data, key) => {
    try {
      const value = JSON.stringify(data, BufferJSON.replacer);
      await pool.query(
        'INSERT INTO whatsapp_auth (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
        [key, value]
      );
    } catch (error) {
      console.error('Error writing to PostgreSQL:', error);
    }
  };

  const removeData = async (key) => {
    try {
      await pool.query('DELETE FROM whatsapp_auth WHERE key = $1', [key]);
    } catch (error) {
      console.error('Error removing from PostgreSQL:', error);
    }
  };

  const clearAuth = async () => {
    try {
      await pool.query('TRUNCATE TABLE whatsapp_auth');
      console.log('WhatsApp Auth Table cleared.');
    } catch (error) {
      console.error('Error truncating PostgreSQL:', error);
    }
  };

  const creds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = require('@whiskeysockets/baileys').proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData(creds, 'creds'),
    clearAuth,
  };
};

module.exports = { usePostgresAuthState };
