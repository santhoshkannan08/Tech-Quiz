import './config.js';
import bcrypt from 'bcryptjs';
import { prisma } from './db.js';

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD before creating an administrator');
const passwordHash = await bcrypt.hash(password, 12);
await prisma.adminUser.upsert({ where: { email: email.toLowerCase() }, update: { passwordHash }, create: { email: email.toLowerCase(), passwordHash } });
console.log(`Administrator ${email} is ready.`);
await prisma.$disconnect();
