import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { quizRouter } from './routes/quiz.js';
import { adminRouter } from './routes/admin.js';
import { errorHandler } from './utils/errors.js';

const app = express();
const allowedOrigins = [
  config.frontendUrl,
  config.frontendUrl.replace('localhost', '127.0.0.1'),
];
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Attempt-Token'],
}));
app.use(express.json({ limit: '20kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/quiz', quizRouter);
app.use('/api/admin', adminRouter);
app.use(errorHandler);

app.listen(config.port, () => console.log(`Quiz API listening on port ${config.port}`));
