export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  userId: string;
  subjectName: string;
  createdAt: string;
}

export interface Document {
  id: string;
  userId: string;
  subjectId: string;
  fileName: string;
  fileUrl: string;
  totalPages: number;
  content: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  role: "user" | "model";
  content: string;
  createdAt: string;
}

export interface Flashcard {
  id: string;
  subjectId: string;
  question: string;
  answer: string;
  learned: boolean;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  type: "mcq" | "tf" | "short";
  userAnswer?: string;
}

export interface Quiz {
  id: string;
  subjectId: string;
  difficulty: "easy" | "medium" | "hard";
  title: string;
  totalQuestions: number;
  score?: number;
  completed: boolean;
  createdAt: string;
  questions?: QuizQuestion[];
}

export interface DashboardStats {
  totalSubjects: number;
  totalDocuments: number;
  totalFlashcards: number;
  learnedFlashcards: number;
  totalQuizzes: number;
  completedQuizzes: number;
  totalChats: number;
  subjectStats: {
    name: string;
    fullName: string;
    documents: number;
    flashcards: number;
    quizzes: number;
    completedQuizzes: number;
  }[];
}
