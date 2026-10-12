import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { Prisma, type AttemptQuestion, type QuizAttempt } from '@prisma/client';
import { prisma } from '../db.js';
import { HttpError } from '../utils/errors.js';
import { secureShuffle } from '../utils/shuffle.js';
import { elapsedMilliseconds, isBeforeDeadline, questionDeadline } from '../utils/timing.js';
import { answerSchema, startSchema } from '../validation.js';

type TransactionClient = Prisma.TransactionClient;

async function markUnansweredTimedOut(tx: TransactionClient, attemptId: string, now: Date) {
  const questions = await tx.attemptQuestion.findMany({
    where: { attemptId, timedOutAt: null },
    include: { answer: true },
  });

  await Promise.all(
    questions
      .filter((question) => !question.answer)
      .map((question) => tx.attemptQuestion.update({
        where: { id: question.id },
        data: { timedOutAt: now },
      })),
  );
}
type AttemptWithQuestions = QuizAttempt & {
  questions: Array<AttemptQuestion & { answer: { optionId: string | null; isCorrect: boolean | null; answeredAt: Date; timeTakenMs: number | null } | null }>;
};

async function loadAttempt(tx: TransactionClient, id: string): Promise<AttemptWithQuestions | null> {
  return tx.quizAttempt.findUnique({
    where: { id },
    include: { questions: { include: { answer: true }, orderBy: { position: 'asc' } } },
  }) as Promise<AttemptWithQuestions | null>;
}

async function activateNextQuestion(tx: TransactionClient, attemptId: string, now: Date): Promise<AttemptWithQuestions | null> {
  let attempt = await loadAttempt(tx, attemptId);
  if (!attempt) return null;

  for (;;) {
    const current = attempt.questions.find((question) => !question.answer && !question.timedOutAt);
    if (!current) return attempt;
    if (!current.startedAt) {
      await tx.attemptQuestion.update({
        where: { id: current.id },
        data: { startedAt: now, deadline: questionDeadline(now) },
      });
      return loadAttempt(tx, attemptId);
    }
    if (current.deadline && isBeforeDeadline(now, current.deadline)) return attempt;
    await tx.attemptQuestion.update({
      where: { id: current.id },
      data: { timedOutAt: now },
    });
    attempt = await loadAttempt(tx, attemptId);
    if (!attempt) return null;
  }
}

function currentQuestion(attempt: AttemptWithQuestions): AttemptWithQuestions['questions'][number] | undefined {
  return attempt.questions.find((question) => !question.answer && !question.timedOutAt);
}

function resultCounts(attempt: AttemptWithQuestions) {
  const correctCount = attempt.questions.filter((question) => question.answer?.isCorrect === true).length;
  const answeredCount = attempt.questions.filter((question) => question.answer).length;
  return {
    score: correctCount,
    correctCount,
    incorrectCount: answeredCount - correctCount,
    unansweredCount: attempt.questions.length - answeredCount,
  };
}

export const quizRouter = Router();

quizRouter.get('/', async (_req, res, next) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { slug: 'data-structures' },
      select: { title: true, durationMinutes: true, publishedVersionId: true },
    });
    if (!quiz || !quiz.publishedVersionId) throw new HttpError(404, 'No published quiz is available');
    res.json({ title: quiz.title, durationMinutes: quiz.durationMinutes, totalQuestions: 15 });
  } catch (error) { next(error); }
});

quizRouter.post('/start', async (req, res, next) => {
  try {
    const input = startSchema.parse(req.body);
    const result = await prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.findUnique({ where: { slug: 'data-structures' } });
      if (!quiz?.publishedVersionId) throw new HttpError(404, 'No published quiz is available');

      const existing = await tx.quizAttempt.findFirst({
        where: { quizId: quiz.id, participantId: input.participantId, status: 'IN_PROGRESS' },
        orderBy: { startedAt: 'desc' },
      });
      if (existing && existing.deadline > new Date()) return existing;

      const version = await tx.quizVersion.findUnique({
        where: { id: quiz.publishedVersionId },
        include: { questions: { include: { question: { include: { options: true } } } } },
      });
      if (!version || version.questions.length !== 15) throw new HttpError(409, 'Published quiz is invalid');

      const startedAt = new Date();
      const questionOrder = secureShuffle(version.questions.map((item) => item.questionId));
      return tx.quizAttempt.create({
        data: {
          token: randomBytes(32).toString('hex'),
          quizId: quiz.id,
          versionId: version.id,
          participantName: input.participantName,
          participantId: input.participantId,
          deadline: new Date(startedAt.getTime() + quiz.durationMinutes * 60_000),
          startedAt,
          questionOrder,
          questions: {
            create: questionOrder.map((questionId, position) => {
              const item = version.questions.find((candidate) => candidate.questionId === questionId)!;
              const questionStartedAt = position === 0 ? startedAt : undefined;
              return {
                questionId,
                position,
                optionOrder: secureShuffle(item.question.options.map((option) => option.id)),
                startedAt: questionStartedAt,
                deadline: questionStartedAt ? questionDeadline(questionStartedAt) : undefined,
              };
            }),
          },
        },
      });
    });
    res.status(201).json({ attemptToken: result.token, attemptId: result.id });
  } catch (error) { next(error); }
});

quizRouter.get('/attempts/:token', async (req, res, next) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const found = await tx.quizAttempt.findUnique({ where: { token: req.params.token } });
      if (!found) throw new HttpError(404, 'Attempt not found');
      if (found.status === 'IN_PROGRESS' && found.deadline <= new Date()) {
        const now = new Date();
        await markUnansweredTimedOut(tx, found.id, now);
        return tx.quizAttempt.update({ where: { id: found.id }, data: { status: 'EXPIRED', submittedAt: now } });
      }
      return activateNextQuestion(tx, found.id, new Date());
    });
    if (!result) throw new HttpError(404, 'Attempt not found');
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: result.id },
      include: { questions: { include: { question: { include: { options: true } }, answer: true }, orderBy: { position: 'asc' } } },
    });
    if (!attempt) throw new HttpError(404, 'Attempt not found');
    const active = attempt.questions.find((item) => !item.answer && !item.timedOutAt);
    const questions = attempt.questions.map((item) => ({
      questionId: item.questionId,
      position: item.position,
      prompt: item.question.prompt,
      startedAt: item.startedAt,
      deadline: item.deadline,
      options: item.optionOrder.map((id) => {
        const option = item.question.options.find((candidate) => candidate.id === id);
        if (!option) throw new HttpError(500, 'Attempt contains an invalid option order');
        return { id: option.id, label: option.label, text: option.text };
      }),
      selectedOptionId: item.answer?.optionId ?? null,
      answeredAt: item.answer?.answeredAt ?? null,
    }));
    res.json({
      attemptId: attempt.id,
      participantName: attempt.participantName,
      participantId: attempt.participantId,
      status: attempt.status,
      deadline: attempt.deadline,
      activeQuestionId: active?.questionId ?? null,
      activeQuestionDeadline: active?.deadline ?? null,
      questions,
    });
  } catch (error) { next(error); }
});

quizRouter.put('/attempts/:token/answers', async (req, res, next) => {
  try {
    const input = answerSchema.parse(req.body);
    await prisma.$transaction(async (tx) => {
      const found = await tx.quizAttempt.findUnique({
        where: { token: req.params.token },
        include: { questions: { include: { answer: true, question: { include: { options: true } } }, orderBy: { position: 'asc' } } },
      });
      if (!found) throw new HttpError(404, 'Attempt not found');
      if (found.status !== 'IN_PROGRESS' || found.deadline <= new Date()) throw new HttpError(410, 'Attempt can no longer be changed');

      const advanced = await activateNextQuestion(tx, found.id, new Date());
      if (!advanced || advanced.status !== 'IN_PROGRESS') throw new HttpError(410, 'Attempt can no longer be changed');
      const question = currentQuestion(advanced);
      if (!question || question.questionId !== input.questionId) throw new HttpError(409, 'Question is not currently active');
      const questionContent = await tx.attemptQuestion.findUnique({
        where: { id: question.id },
        include: { question: { include: { options: true } } },
      });
      if (!questionContent) throw new HttpError(404, 'Question not found in this attempt');
      const now = new Date();
      if (!question.deadline || !isBeforeDeadline(now, question.deadline)) throw new HttpError(410, 'Question time has expired');
      if (input.optionId && !question.optionOrder.includes(input.optionId)) throw new HttpError(400, 'Option does not belong to this question');

      const selected = questionContent.question.options.find((option) => option.id === input.optionId);
      try {
        await tx.participantAnswer.create({
          data: {
            attemptId: advanced.id,
            questionId: question.questionId,
            optionId: input.optionId,
            isCorrect: selected?.isCorrect === true,
            timeTakenMs: elapsedMilliseconds(question.startedAt ?? now, now),
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new HttpError(409, 'An answer has already been accepted for this question');
        }
        throw error;
      }
      await activateNextQuestion(tx, advanced.id, now);
    });
    res.status(204).send();
  } catch (error) { next(error); }
});

quizRouter.post('/attempts/:token/submit', async (req, res, next) => {
  try {
    const attempt = await prisma.$transaction(async (tx) => {
      const found = await tx.quizAttempt.findUnique({
        where: { token: req.params.token },
        include: { answers: true, questions: { include: { answer: true, question: { include: { options: true } } }, orderBy: { position: 'asc' } } },
      });
      if (!found) throw new HttpError(404, 'Attempt not found');
      if (found.status !== 'IN_PROGRESS') return found;
      const advanced = await activateNextQuestion(tx, found.id, new Date());
      if (!advanced) throw new HttpError(404, 'Attempt not found');
      const refreshed = await tx.quizAttempt.findUnique({
        where: { id: advanced.id },
        include: { answers: true, questions: { include: { answer: true, question: { include: { options: true } } }, orderBy: { position: 'asc' } } },
      });
      if (!refreshed) throw new HttpError(404, 'Attempt not found');
      const answers = refreshed.answers;
      for (const answer of answers) {
        const question = refreshed.questions.find((item) => item.questionId === answer.questionId)!;
        const correct = question.question.options.some((option) => option.id === answer.optionId && option.isCorrect);
        if (answer.isCorrect !== correct) {
          await tx.participantAnswer.update({ where: { id: answer.id }, data: { isCorrect: correct } });
        }
      }
      const finalAttempt = await tx.quizAttempt.findUnique({
        where: { id: refreshed.id },
        include: { answers: true, questions: { include: { answer: true } }, },
      });
      if (!finalAttempt) throw new HttpError(404, 'Attempt not found');
      const counts = resultCounts(finalAttempt as AttemptWithQuestions);
      return tx.quizAttempt.update({
        where: { id: finalAttempt.id },
        data: { status: finalAttempt.questions.some((question) => question.timedOutAt) ? 'EXPIRED' : 'SUBMITTED', submittedAt: finalAttempt.submittedAt ?? new Date(), ...counts },
      });
    });
    res.json({ status: attempt.status, score: attempt.score, correctCount: attempt.correctCount, incorrectCount: attempt.incorrectCount, unansweredCount: attempt.unansweredCount, submittedAt: attempt.submittedAt });
  } catch (error) { next(error); }
});

quizRouter.get('/attempts/:token/results', async (req, res, next) => {
  try {
    const attempt = await prisma.quizAttempt.findUnique({ where: { token: req.params.token }, include: { quiz: true, questions: { include: { question: { include: { options: true } }, answer: true }, orderBy: { position: 'asc' } } } });
    if (!attempt || attempt.status === 'IN_PROGRESS') throw new HttpError(404, 'Results are not available');
    const review = attempt.quiz.reviewEnabled ? attempt.questions.map((item) => ({ prompt: item.question.prompt, selectedOptionId: item.answer?.optionId ?? null, options: item.question.options.map((option) => ({ id: option.id, label: option.label, text: option.text, isCorrect: option.isCorrect })) })) : undefined;
    res.json({ participantName: attempt.participantName, participantId: attempt.participantId, score: attempt.score, percentage: Math.round(((attempt.score ?? 0) / attempt.questions.length) * 100), correctCount: attempt.correctCount, incorrectCount: attempt.incorrectCount, unansweredCount: attempt.unansweredCount, submittedAt: attempt.submittedAt, review });
  } catch (error) { next(error); }
});
