import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log('Backend dziala na porcie 3000'));
  } catch (err) {
    console.error('Blad polaczenia z baza danych:', err);
  }
};

startServer();