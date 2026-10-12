import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { requireAdmin, type AdminRequest } from '../middleware/auth.js';
import { HttpError } from '../utils/errors.js';
import { loginSchema, publishSchema } from '../validation.js';

export const adminRouter = Router();

adminRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const admin = await prisma.adminUser.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!admin || !(await bcrypt.compare(input.password, admin.passwordHash))) throw new HttpError(401, 'Invalid email or password');
    res.json({ token: jwt.sign({ adminId: admin.id }, config.jwtSecret, { expiresIn: '8h' }) });
  } catch (error) { next(error); }
});

adminRouter.use(requireAdmin);

adminRouter.get('/quiz', async (_req, res, next) => {
  try {
    const quiz = await prisma.quiz.findUnique({ where: { slug: 'data-structures' }, select: { id: true, title: true, durationMinutes: true, reviewEnabled: true, publishedVersionId: true } });
    if (!quiz) throw new HttpError(404, 'Quiz not found');
    res.json(quiz);
  } catch (error) { next(error); }
});

adminRouter.get('/questions', async (_req, res, next) => {
  try {
    const questions = await prisma.question.findMany({ include: { options: { orderBy: { label: 'asc' } } }, orderBy: { id: 'asc' } });
    res.json(questions);
  } catch (error) { next(error); }
});

adminRouter.post('/quizzes/:quizId/publish', async (req, res, next) => {
  try {
    const input = publishSchema.parse(req.body);
    const quiz = await prisma.quiz.findUnique({ where: { id: req.params.quizId } });
    if (!quiz) throw new HttpError(404, 'Quiz not found');
    const questions = await prisma.question.findMany({ where: { id: { in: input.questionIds } }, include: { options: true } });
    if (questions.length !== 15 || questions.some((question) => question.options.length !== 4 || question.options.filter((option) => option.isCorrect).length !== 1)) throw new HttpError(400, 'Exactly 15 valid four-option questions are required');
    const version = await prisma.$transaction(async (tx) => {
      const last = await tx.quizVersion.findFirst({ where: { quizId: quiz.id }, orderBy: { version: 'desc' } });
      const created = await tx.quizVersion.create({ data: { quizId: quiz.id, version: (last?.version ?? 0) + 1, isPublished: true, questions: { create: input.questionIds.map((questionId, position) => ({ questionId, position })) } } });
      await tx.quizVersion.updateMany({ where: { quizId: quiz.id, id: { not: created.id } }, data: { isPublished: false } });
      await tx.quiz.update({ where: { id: quiz.id }, data: { publishedVersionId: created.id, durationMinutes: input.durationMinutes, reviewEnabled: input.reviewEnabled } });
      return created;
    });
    res.status(201).json({ versionId: version.id });
  } catch (error) { next(error); }
});

adminRouter.get('/results', async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' && ['IN_PROGRESS', 'SUBMITTED', 'EXPIRED'].includes(req.query.status) ? req.query.status as 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' : undefined;
    const participant = typeof req.query.participant === 'string' ? req.query.participant : undefined;
    const results = await prisma.quizAttempt.findMany({ where: { status, ...(participant ? { OR: [{ participantName: { contains: participant, mode: 'insensitive' } }, { participantId: { contains: participant, mode: 'insensitive' } }] } : {}) }, select: { id: true, participantName: true, participantId: true, status: true, score: true, submittedAt: true, startedAt: true }, orderBy: { startedAt: 'desc' } });
    const completed = results.filter((item) => item.score !== null);
    res.json({ results, averageScore: completed.length ? Math.round((completed.reduce((sum, item) => sum + (item.score ?? 0), 0) / completed.length) * 100) / 100 : 0, highestScore: Math.max(0, ...completed.map((item) => item.score ?? 0)) });
  } catch (error) { next(error); }
});

adminRouter.get('/results/export', async (_req, res, next) => {
  try {
    const results = await prisma.quizAttempt.findMany({ select: { participantName: true, participantId: true, status: true, score: true, submittedAt: true } });
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = ['Participant name,Participant ID,Status,Score,Submitted at', ...results.map((item) => [item.participantName, item.participantId, item.status, item.score, item.submittedAt?.toISOString()].map(escape).join(','))].join('\n');
    res.type('text/csv').attachment('quiz-results.csv').send(csv);
  } catch (error) { next(error); }
});

adminRouter.post('/logout', (_req, res) => res.status(204).send());
