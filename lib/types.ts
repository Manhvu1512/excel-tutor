export type Exercise = {
  id: string;
  number: number;
  title: string;
  difficulty: number;
  concept?: string;
  scenario: string;
  controllerAsk: string;
  tutorFocus?: string;
  expectedBehavior?: string;
  answerCell: string;
  expectedValue: number;
  tolerance: number;
  xpReward: number;
};

export type LessonConfig = {
  topic: string;
  topicLongName: string;
  departmentContext: string;
  datasetFile: string;
  schema?: string;
  exercises: Exercise[];
  gamification: {
    levelThresholds: number[];
    comboMultiplier: number;
    comboThreshold: number;
  };
};

export type DatasetRow = Record<string, string | number>;

export type GradeResult = {
  correct: boolean;
  computedValue: number | null;
  expectedValue: number;
  feedback: string;
  xpEarned: number;
};

export type MCQOption = {
  label: string;
  value: string;
};

export type TutorMCQ = {
  question: string;
  options: MCQOption[];
  correctIndex: number;
};

export type TutorMessage = {
  role: "user" | "assistant";
  content: string;
  mcq?: TutorMCQ;
  tone?: "hype" | "warm" | "professional";
  followUp?: string;
};

export type CelebrationData = {
  message: string;
  tone: "hype" | "warm" | "professional";
  followUp: string;
};

export type SessionMistake = {
  exerciseNumber: number;
  title: string;
  formula: string;
};
