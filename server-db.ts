import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";

let importedConfig: Record<string, any> = {};
try {
  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    importedConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (e) {
  console.warn("Could not read firebase-applet-config.json:", e);
}

const firebaseConfig = {
  projectId:
    importedConfig?.projectId ||
    process.env.FIREBASE_PROJECT_ID ||
    "aistudyassistant-c1926",
  appId:
    importedConfig?.appId ||
    process.env.FIREBASE_APP_ID ||
    "1:224295091251:web:aa4e8b6a0fd5cac1c6b746",
  apiKey:
    importedConfig?.apiKey ||
    process.env.FIREBASE_API_KEY ||
    "AIzaSyBVh6urcnr5MRFCvcOIi6A-gvT7l-LMYmA",
  authDomain:
    importedConfig?.authDomain ||
    process.env.FIREBASE_AUTH_DOMAIN ||
    "aistudyassistant-c1926.firebaseapp.com",
  storageBucket:
    importedConfig?.storageBucket ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    "aistudyassistant-c1926.firebasestorage.app",
  messagingSenderId:
    importedConfig?.messagingSenderId ||
    process.env.FIREBASE_MESSAGING_SENDER_ID ||
    "224295091251",
  firestoreDatabaseId:
    importedConfig?.firestoreDatabaseId ||
    process.env.FIREBASE_DATABASE_ID ||
    "(default)",
};

// Initialize Firebase App for backend
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const rawDbId = firebaseConfig.firestoreDatabaseId;
const dbId = rawDbId && rawDbId !== "(default)" ? rawDbId : undefined;
const firestoreDb = dbId ? getFirestore(app, dbId) : getFirestore(app);

// Interfaces
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

export interface DocumentChunk {
  id: string;
  documentId: string;
  subjectId: string;
  text: string;
  pageNumber: number;
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

class FirestoreDatabaseService {
  // Users
  async getUsers(): Promise<User[]> {
    const snap = await getDocs(collection(firestoreDb, "users"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as User);
  }

  async createUser(
    id: string,
    email: string,
    name: string,
    avatarUrl?: string,
  ): Promise<User> {
    const userRef = doc(firestoreDb, "users", id);
    const existingSnap = await getDoc(userRef);
    if (existingSnap.exists()) {
      return { id: existingSnap.id, ...existingSnap.data() } as User;
    }

    const newUser: User = {
      id,
      email,
      name,
      avatarUrl:
        avatarUrl ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      createdAt: new Date().toISOString(),
    };
    await setDoc(userRef, newUser);
    return newUser;
  }

  // Subjects
  async getSubjects(userId: string): Promise<Subject[]> {
    const q = query(
      collection(firestoreDb, "subjects"),
      where("userId", "==", userId),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Subject);
  }

  async createSubject(userId: string, subjectName: string): Promise<Subject> {
    const subRef = doc(collection(firestoreDb, "subjects"));
    const newSub: Subject = {
      id: subRef.id,
      userId,
      subjectName,
      createdAt: new Date().toISOString(),
    };
    await setDoc(subRef, newSub);
    return newSub;
  }

  async renameSubject(
    id: string,
    subjectName: string,
  ): Promise<Subject | null> {
    const subRef = doc(firestoreDb, "subjects", id);
    const snap = await getDoc(subRef);
    if (!snap.exists()) return null;
    await updateDoc(subRef, { subjectName });
    const updated = await getDoc(subRef);
    return { id: updated.id, ...updated.data() } as Subject;
  }

  async deleteSubject(id: string): Promise<void> {
    await deleteDoc(doc(firestoreDb, "subjects", id));

    // Cleanup related sub-collections
    const docsSnap = await getDocs(
      query(collection(firestoreDb, "documents"), where("subjectId", "==", id)),
    );
    for (const d of docsSnap.docs) {
      await deleteDoc(d.ref);
    }

    const chunksSnap = await getDocs(
      query(
        collection(firestoreDb, "documentChunks"),
        where("subjectId", "==", id),
      ),
    );
    for (const c of chunksSnap.docs) {
      await deleteDoc(c.ref);
    }

    const chatsSnap = await getDocs(
      query(collection(firestoreDb, "chats"), where("subjectId", "==", id)),
    );
    for (const c of chatsSnap.docs) {
      await deleteDoc(c.ref);
    }

    const cardsSnap = await getDocs(
      query(
        collection(firestoreDb, "flashcards"),
        where("subjectId", "==", id),
      ),
    );
    for (const fc of cardsSnap.docs) {
      await deleteDoc(fc.ref);
    }

    const quizzesSnap = await getDocs(
      query(collection(firestoreDb, "quizzes"), where("subjectId", "==", id)),
    );
    for (const q of quizzesSnap.docs) {
      await deleteDoc(q.ref);
    }
  }

  // Documents
  async getDocuments(subjectId: string): Promise<Document[]> {
    const q = query(
      collection(firestoreDb, "documents"),
      where("subjectId", "==", subjectId),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Document);
  }

  async createDocument(
    userId: string,
    subjectId: string,
    fileName: string,
    content: string,
    totalPages: number = 1,
  ): Promise<Document> {
    const docRef = doc(collection(firestoreDb, "documents"));
    const newDoc: Document = {
      id: docRef.id,
      userId,
      subjectId,
      fileName,
      fileUrl: "",
      totalPages,
      content,
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, newDoc);
    await this.chunkAndSaveDocument(newDoc);
    return newDoc;
  }

  async deleteDocument(id: string): Promise<void> {
    await deleteDoc(doc(firestoreDb, "documents", id));
    const chunksSnap = await getDocs(
      query(
        collection(firestoreDb, "documentChunks"),
        where("documentId", "==", id),
      ),
    );
    for (const c of chunksSnap.docs) {
      await deleteDoc(c.ref);
    }
  }

  // Document Chunks & RAG Engine
  async chunkAndSaveDocument(documentItem: Document): Promise<void> {
    const text = documentItem.content;
    const words = text.split(/\s+/);
    const chunkSize = 150;
    const overlap = 30;

    let idCounter = 1;
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunkWords = words.slice(i, i + chunkSize);
      if (chunkWords.length === 0) break;
      const chunkText = chunkWords.join(" ");

      const chunkRef = doc(collection(firestoreDb, "documentChunks"));
      const chunk: DocumentChunk = {
        id: chunkRef.id,
        documentId: documentItem.id,
        subjectId: documentItem.subjectId,
        text: chunkText,
        pageNumber: 1,
      };
      await setDoc(chunkRef, chunk);

      if (i + chunkSize >= words.length) break;
    }
  }

  async searchChunks(
    subjectId: string,
    queryStr: string,
    limit: number = 5,
  ): Promise<DocumentChunk[]> {
    const q = query(
      collection(firestoreDb, "documentChunks"),
      where("subjectId", "==", subjectId),
    );
    const snap = await getDocs(q);
    const chunks = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as DocumentChunk,
    );

    if (chunks.length === 0) return [];

    const queryTerms = queryStr
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);
    if (queryTerms.length === 0) return chunks.slice(0, limit);

    const scored = chunks.map((chunk) => {
      const textLower = chunk.text.toLowerCase();
      let score = 0;
      queryTerms.forEach((term) => {
        if (textLower.includes(term)) {
          score += 1.0;
          const matches = textLower.match(new RegExp(term, "g"));
          if (matches) score += matches.length * 0.1;
        }
      });
      return { chunk, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.chunk)
      .slice(0, limit);
  }

  // Chats
  async getChats(userId: string, subjectId: string): Promise<Chat[]> {
    const q = query(
      collection(firestoreDb, "chats"),
      where("userId", "==", userId),
      where("subjectId", "==", subjectId),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Chat);
  }

  async createChat(
    userId: string,
    subjectId: string,
    title: string,
  ): Promise<Chat> {
    const chatRef = doc(collection(firestoreDb, "chats"));
    const newChat: Chat = {
      id: chatRef.id,
      userId,
      subjectId,
      title,
      createdAt: new Date().toISOString(),
    };
    await setDoc(chatRef, newChat);
    return newChat;
  }

  async deleteChat(id: string): Promise<void> {
    await deleteDoc(doc(firestoreDb, "chats", id));
    const msgSnap = await getDocs(
      query(collection(firestoreDb, "messages"), where("chatId", "==", id)),
    );
    for (const m of msgSnap.docs) {
      await deleteDoc(m.ref);
    }
  }

  // Messages
  async getMessages(chatId: string): Promise<Message[]> {
    const q = query(
      collection(firestoreDb, "messages"),
      where("chatId", "==", chatId),
    );
    const snap = await getDocs(q);
    const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message);
    return msgs.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  async addMessage(
    chatId: string,
    role: "user" | "model",
    content: string,
  ): Promise<Message> {
    const msgRef = doc(collection(firestoreDb, "messages"));
    const newMsg: Message = {
      id: msgRef.id,
      chatId,
      role,
      content,
      createdAt: new Date().toISOString(),
    };
    await setDoc(msgRef, newMsg);
    return newMsg;
  }

  // Flashcards
  async getFlashcards(subjectId: string): Promise<Flashcard[]> {
    const q = query(
      collection(firestoreDb, "flashcards"),
      where("subjectId", "==", subjectId),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Flashcard);
  }

  async createFlashcard(
    subjectId: string,
    question: string,
    answer: string,
  ): Promise<Flashcard> {
    const cardRef = doc(collection(firestoreDb, "flashcards"));
    const newCard: Flashcard = {
      id: cardRef.id,
      subjectId,
      question,
      answer,
      learned: false,
      createdAt: new Date().toISOString(),
    };
    await setDoc(cardRef, newCard);
    return newCard;
  }

  async setFlashcards(
    subjectId: string,
    cards: { question: string; answer: string }[],
  ): Promise<Flashcard[]> {
    const existingSnap = await getDocs(
      query(
        collection(firestoreDb, "flashcards"),
        where("subjectId", "==", subjectId),
      ),
    );
    for (const c of existingSnap.docs) {
      await deleteDoc(c.ref);
    }

    const created: Flashcard[] = [];
    for (const c of cards) {
      const cardRef = doc(collection(firestoreDb, "flashcards"));
      const cardItem: Flashcard = {
        id: cardRef.id,
        subjectId,
        question: c.question,
        answer: c.answer,
        learned: false,
        createdAt: new Date().toISOString(),
      };
      await setDoc(cardRef, cardItem);
      created.push(cardItem);
    }
    return created;
  }

  async toggleFlashcardLearned(id: string): Promise<Flashcard | null> {
    const cardRef = doc(firestoreDb, "flashcards", id);
    const snap = await getDoc(cardRef);
    if (!snap.exists()) return null;
    const current = snap.data() as Flashcard;
    await updateDoc(cardRef, { learned: !current.learned });
    const updated = await getDoc(cardRef);
    return { id: updated.id, ...updated.data() } as Flashcard;
  }

  async deleteFlashcard(id: string): Promise<void> {
    await deleteDoc(doc(firestoreDb, "flashcards", id));
  }

  // Quizzes
  async getQuizzes(subjectId: string): Promise<Quiz[]> {
    const q = query(
      collection(firestoreDb, "quizzes"),
      where("subjectId", "==", subjectId),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Quiz);
  }

  async getQuizDetails(id: string): Promise<Quiz | null> {
    const qSnap = await getDoc(doc(firestoreDb, "quizzes", id));
    if (!qSnap.exists()) return null;
    const quiz = { id: qSnap.id, ...qSnap.data() } as Quiz;

    const qqSnap = await getDocs(
      query(
        collection(firestoreDb, "quizQuestions"),
        where("quizId", "==", id),
      ),
    );
    const questions = qqSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as QuizQuestion,
    );
    return { ...quiz, questions };
  }

  async createQuiz(
    subjectId: string,
    title: string,
    difficulty: "easy" | "medium" | "hard",
    questions: Omit<QuizQuestion, "id" | "quizId">[],
  ): Promise<Quiz> {
    const quizRef = doc(collection(firestoreDb, "quizzes"));
    const quizId = quizRef.id;

    const newQuiz: Quiz = {
      id: quizId,
      subjectId,
      difficulty,
      title,
      totalQuestions: questions.length,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    await setDoc(quizRef, newQuiz);

    const savedQuestions: QuizQuestion[] = [];
    for (const q of questions) {
      const qqRef = doc(collection(firestoreDb, "quizQuestions"));
      const questionObj: QuizQuestion = {
        ...q,
        id: qqRef.id,
        quizId,
      };
      await setDoc(qqRef, questionObj);
      savedQuestions.push(questionObj);
    }

    return { ...newQuiz, questions: savedQuestions };
  }

  async submitQuizAnswers(
    quizId: string,
    answers: { [questionId: string]: string },
  ): Promise<{ quiz: Quiz; score: number } | null> {
    const quizRef = doc(firestoreDb, "quizzes", quizId);
    const qSnap = await getDoc(quizRef);
    if (!qSnap.exists()) return null;
    const quiz = { id: qSnap.id, ...qSnap.data() } as Quiz;

    const qqSnap = await getDocs(
      query(
        collection(firestoreDb, "quizQuestions"),
        where("quizId", "==", quizId),
      ),
    );
    const questions = qqSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as QuizQuestion,
    );

    let correctCount = 0;
    for (const q of questions) {
      const uAnswer = answers[q.id] || "";
      const formattedCorrect = q.correctAnswer.trim().toLowerCase();
      const formattedUser = uAnswer.trim().toLowerCase();

      if (formattedCorrect === formattedUser) {
        correctCount++;
      } else if (
        q.type === "short" &&
        formattedCorrect.includes(formattedUser) &&
        formattedUser.length > 2
      ) {
        correctCount++;
      }
      await updateDoc(doc(firestoreDb, "quizQuestions", q.id), {
        userAnswer: uAnswer,
      });
    }

    const scorePercent = Math.round(
      (correctCount / (questions.length || 1)) * 100,
    );
    await updateDoc(quizRef, { completed: true, score: scorePercent });

    const updatedQuizSnap = await getDoc(quizRef);
    return {
      quiz: { id: updatedQuizSnap.id, ...updatedQuizSnap.data() } as Quiz,
      score: scorePercent,
    };
  }

  // Dashboard Stats
  async getDashboardStats(userId: string) {
    const userSubjects = await this.getSubjects(userId);
    const subjectIds = userSubjects.map((s) => s.id);

    const docsSnap = await getDocs(
      query(
        collection(firestoreDb, "documents"),
        where("userId", "==", userId),
      ),
    );
    const totalDocuments = docsSnap.docs.length;

    const fcSnap = await getDocs(collection(firestoreDb, "flashcards"));
    const allCards = fcSnap.docs
      .map((d) => d.data() as Flashcard)
      .filter((f) => subjectIds.includes(f.subjectId));
    const totalFlashcards = allCards.length;
    const learnedFlashcards = allCards.filter((f) => f.learned).length;

    const qSnap = await getDocs(collection(firestoreDb, "quizzes"));
    const allQuizzes = qSnap.docs
      .map((d) => d.data() as Quiz)
      .filter((q) => subjectIds.includes(q.subjectId));
    const totalQuizzes = allQuizzes.length;
    const completedQuizzes = allQuizzes.filter((q) => q.completed).length;

    const chatsSnap = await getDocs(
      query(collection(firestoreDb, "chats"), where("userId", "==", userId)),
    );
    const totalChats = chatsSnap.docs.length;

    const subjectStats = userSubjects.map((s) => {
      const sDocs = docsSnap.docs.filter(
        (d) => d.data().subjectId === s.id,
      ).length;
      const sCards = allCards.filter((f) => f.subjectId === s.id).length;
      const sQuizzes = allQuizzes.filter((q) => q.subjectId === s.id).length;
      const sCompleted = allQuizzes.filter(
        (q) => q.subjectId === s.id && q.completed,
      ).length;

      return {
        id: s.id,
        subjectId: s.id,
        name: s.subjectName.split(" ")[0] || s.subjectName,
        fullName: s.subjectName,
        documents: sDocs,
        flashcards: sCards,
        quizzes: sQuizzes,
        completedQuizzes: sCompleted,
      };
    });

    return {
      totalSubjects: userSubjects.length,
      totalDocuments,
      totalFlashcards,
      learnedFlashcards,
      totalQuizzes,
      completedQuizzes,
      totalChats,
      subjectStats,
    };
  }

  // Public method to seed sample demo data for a user on-demand
  async seedSampleData(userId: string) {
    const subReact = await this.createSubject(
      userId,
      "React & Modern Web Development",
    );
    const subOS = await this.createSubject(
      userId,
      "Operating Systems Principles",
    );

    const docReactText = `React is a JavaScript library for building user interfaces, developed by Meta. It allows developers to create SPAs using reusable components and the Virtual DOM. React Hooks such as useState and useEffect manage state and lifecycle effects effortlessly.`;
    await this.createDocument(
      userId,
      subReact.id,
      "React_Core_Principles.pdf",
      docReactText,
      1,
    );

    const docOSText = `An Operating System acts as an intermediary between user and hardware. Key concepts include Processes, Threads, CPU Scheduling (FCFS, SJF, Round Robin), and Deadlocks (Coffman conditions: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait).`;
    await this.createDocument(
      userId,
      subOS.id,
      "OS_Concepts.pdf",
      docOSText,
      1,
    );

    await this.createFlashcard(
      subReact.id,
      "What is the primary function of the Virtual DOM?",
      "It minimizes real DOM manipulation by diffing state changes in memory.",
    );
    await this.createFlashcard(
      subReact.id,
      "When does useEffect run if given an empty dependency array []?",
      "It runs once when the component mounts.",
    );
    await this.createFlashcard(
      subOS.id,
      "What are the 4 Coffman conditions for a Deadlock?",
      "Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait.",
    );

    await this.createQuiz(subReact.id, "React Fundamentals Quiz", "medium", [
      {
        question: "Which hook is used to cache computed values?",
        options: ["useCallback", "useMemo", "useState", "useRef"],
        correctAnswer: "useMemo",
        explanation:
          "useMemo caches the result of a calculation between re-renders.",
        type: "mcq",
      },
      {
        question: "React functional components can store state using useState.",
        options: ["True", "False"],
        correctAnswer: "True",
        explanation:
          "useState is the primary hook for functional component state.",
        type: "tf",
      },
    ]);
  }
}

export const db = new FirestoreDatabaseService();
