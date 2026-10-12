export type Question = {
  questionId: string;
  position: number;
  prompt: string;
  startedAt: string | null;
  deadline: string | null;
  options: { id: string; label: string; text: string }[];
  selectedOptionId: string | null;
  answeredAt: string | null;
};
export type Attempt = {
  attemptId: string;
  attemptToken: string;
  participantName: string;
  participantId: string;
  status: string;
  deadline: string;
  activeQuestionId: string | null;
  activeQuestionDeadline: string | null;
  questions: Question[];
};
