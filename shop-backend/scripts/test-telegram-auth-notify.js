require('dotenv').config();

const axios = require('axios');

const parseCsv = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const mask = (value) => {
  const raw = String(value || '');
  if (raw.length <= 8) return raw ? '***' : '(missing)';
  return `${raw.slice(0, 4)}...${raw.slice(-4)}`;
};

const main = async () => {
  const token = process.env.TELEGRAM_USER_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = parseCsv(
    process.env.TELEGRAM_USER_CHAT_IDS ||
      process.env.TELEGRAM_USER_CHAT_ID ||
      process.env.TELEGRAM_CHAT_IDS ||
      process.env.TELEGRAM_CHAT_ID
  );

  if (!token || chatIds.length === 0) {
    console.error('Telegram auth notification env is missing.');
    console.error('Set TELEGRAM_USER_BOT_TOKEN and TELEGRAM_USER_CHAT_ID, or TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.');
    process.exit(1);
  }

  console.log(`Using bot token: ${mask(token)}`);
  console.log(`Sending to chat IDs: ${chatIds.map(mask).join(', ')}`);

  const text = [
    '✅ SH Shop auth Telegram test',
    'Login/register notification config is working.',
    `Time: ${new Date().toISOString()}`,
  ].join('\n');

  for (const chatId of chatIds) {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
    });
  }

  console.log('Telegram test message sent successfully.');
};

main().catch((error) => {
  const data = error?.response?.data;
  console.error('Telegram test failed.');
  if (data) console.error(data);
  else console.error(error);
  process.exit(1);
});
