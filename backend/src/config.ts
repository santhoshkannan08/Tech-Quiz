import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
});

export const config = {
  port: Number(process.env.PORT ?? 4000),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? 'development-only-change-me',
};
