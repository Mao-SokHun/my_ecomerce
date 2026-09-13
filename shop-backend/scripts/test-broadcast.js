const axios = require('axios');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN || '8616756630:AAHSoeWM_-V8gmUAoDtMTGbyyoT29roSfDk';
const chatId = '@shshopbylyhour';

async function test() {
  try {
    const res = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: `<b>📢 ការជូនដំណឹង (ដំណឹងពីហាង) - SH-Shop</b>\n<b>ចំណងជើង:</b> Testing on Bot Channel\n\nTest សេចក្តីជូនដំណឹងពី Admin ចូលក្នុង Telegram Channel @shshopbylyhour ដោយជោគជ័យ! 🎉\n\n🌐 <i>ផ្ញើជូនអតិថិជនទាំងអស់</i>\n👉 <a href="https://shonlineshop.vercel.app/products">ចុចទីនេះដើម្បីមើលព័ត៌មានលម្អិត</a>`,
      parse_mode: 'HTML',
    });
    console.log('✅ TELEGRAM DELIVERED SUCCESSFULLY:', res.data.ok);
  } catch (err) {
    console.error('❌ TELEGRAM ERROR:', err.response?.data || err.message);
  }
}

test();
