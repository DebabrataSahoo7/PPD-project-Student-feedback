import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler } from './middleware/errorHandler.js';
import pool from './db/pool.js';

import authRoutes          from './routes/auth.routes.js';
import usersRoutes         from './routes/users.routes.js';
import programmesRoutes    from './routes/programmes.routes.js';
import branchesRoutes      from './routes/branches.routes.js';
import subjectsRoutes      from './routes/subjects.routes.js';
import cosRoutes           from './routes/cos.routes.js';
import formsRoutes         from './routes/forms.routes.js';
import questionsRoutes     from './routes/questions.routes.js';
import publicRoutes        from './routes/public.routes.js';
import analyticsRoutes     from './routes/analytics.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';

const app = express();

// ── Core middleware ───────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : true,
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────
app.use('/api/v1/auth',          authRoutes);
app.use('/api/v1/users',         usersRoutes);
app.use('/api/v1/programmes',    programmesRoutes);
app.use('/api/v1/branches',      branchesRoutes);
app.use('/api/v1/subjects',      subjectsRoutes);
app.use('/api/v1/cos',           cosRoutes);
app.use('/api/v1/forms',         formsRoutes);
app.use('/api/v1/forms',         analyticsRoutes);
app.use('/api/v1/questions',     questionsRoutes);
app.use('/api/v1/public/forms',  publicRoutes);
app.use('/api/v1/notifications', notificationsRoutes);

// ── Global error handler (must be last) ───────────────────────
app.use(errorHandler);

// ── Start server only when run directly (not on Vercel serverless) ────
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 3000;
  pool.query('SELECT 1').then(() => {
    console.log('✔  PostgreSQL connected');
    app.listen(PORT, () => console.log(`FormBit API running on port ${PORT}`));
  }).catch((err) => {
    console.error('✖  PostgreSQL connection failed:', err.message);
    process.exit(1);
  });
}

export default app;
