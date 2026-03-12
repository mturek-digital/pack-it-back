import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';
import returnsRoutes from './modules/returns/returns.routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/returns', returnsRoutes);

export default app;