import { z } from 'zod';

export const startSchema = z.object({
  participantName: z.string().trim().min(2).max(100),
  participantId: z.string().trim().min(2).max(50),
});

export const answerSchema = z.object({
  questionId: z.string().min(1),
  optionId: z.string().min(1).nullable(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export const publishSchema = z.object({
  questionIds: z.array(z.string()).length(15),
  durationMinutes: z.number().int().min(1).max(180).default(15),
  reviewEnabled: z.boolean().default(false),
});
