import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';
import returnsRoutes from './modules/returns/returns.routes.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:5001',
  process.env.PANEL_ORIGIN,
  process.env.FORM_ORIGIN,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} nie jest dozwolony.`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/returns', returnsRoutes);

export default app;