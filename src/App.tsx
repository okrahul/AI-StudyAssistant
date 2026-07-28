import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Upload,
  MessageSquare,
  FileText,
  Bookmark,
  Award,
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  FileUp,
  ExternalLink,
  ChevronRight,
  LogOut,
  BrainCircuit,
  HelpCircle,
  Clock,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Send,
  User,
  GraduationCap,
  Layers,
  ArrowRight,
  Menu,
  AlertCircle
} from "lucide-react";
import {
  Subject,
  Document,
  Chat,
  Message,
  Flashcard,
  Quiz,
  DashboardStats
} from "./types";
import { auth, signInWithGoogle, logoutUser, onAuthStateChanged } from "./firebase";

export default function App() {
  // Session State
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string; avatarUrl: string } | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Subject State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [subjectError, setSubjectError] = useState("");
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingSubjectName, setEditingSubjectName] = useState("");
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [isSeedingSampleData, setIsSeedingSampleData] = useState(false);

  // Demo user authorization check
  const demoEmail = (((import.meta as any).env?.VITE_DEMO_USER_EMAIL as string) || "rs253230demo@gmail.com").trim().toLowerCase();
  const isDemoUser = (currentUser?.email || "").trim().toLowerCase() === demoEmail;

  // Navigation State
  const [activeTab, setActiveTab] = useState<"dashboard" | "materials" | "chat" | "summary" | "flashcards" | "quiz" | "settings">("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Dashboard Stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Documents State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [pastedTitle, setPastedTitle] = useState("");
  const [pastedContent, setPastedContent] = useState("");
  const [isPasting, setIsPasting] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Chat State
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isTutorMode, setIsTutorMode] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // Summary State
  const [summaryFormat, setSummaryFormat] = useState<"short" | "detailed" | "exam">("detailed");
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Flashcards State
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [flashcardFilter, setFlashcardFilter] = useState<"all" | "review">("all");
  const [manualQuestion, setManualQuestion] = useState("");
  const [manualAnswer, setManualAnswer] = useState("");
  const [isCreatingCard, setIsCreatingCard] = useState(false);

  // Quizzes State
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizDifficulty, setQuizDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [quizAnswers, setQuizAnswers] = useState<{ [key: string]: string }>({});
  const [quizResult, setQuizResult] = useState<{ quiz: Quiz; score: number } | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  // Scroll ref for chat messages
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Trigger temporary notification toast
  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Firebase Auth State Listener & User Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const userObj = {
          id: fbUser.uid,
          email: fbUser.email || "student@google.com",
          name: fbUser.displayName || fbUser.email?.split("@")[0] || "Google Student",
          avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fbUser.email || "Student")}`,
        };
        try {
          await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userObj),
          });
        } catch (err) {
          console.error("User sync error:", err);
        }
        setCurrentUser(userObj);
        showToast(`Welcome, ${userObj.name}!`, "success");
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch subjects whenever user changes
  useEffect(() => {
    if (currentUser) {
      setSubjects([]);
      setSelectedSubject(null);
      setDocuments([]);
      setStats(null);
      setFlashcards([]);
      setQuizzes([]);
      fetchSubjects();
      fetchDashboardStats();
    } else {
      setSubjects([]);
      setSelectedSubject(null);
      setDocuments([]);
      setStats(null);
      setFlashcards([]);
      setQuizzes([]);
    }
  }, [currentUser?.id]);

  // Fetch subject-specific dependencies when selected subject or tab changes
  useEffect(() => {
    if (currentUser && selectedSubject) {
      if (activeTab === "materials") fetchDocuments();
      if (activeTab === "chat") {
        fetchChats();
        setMessages([]);
        setActiveChat(null);
      }
      if (activeTab === "flashcards") fetchFlashcards();
      if (activeTab === "quiz") {
        fetchQuizzes();
        setActiveQuiz(null);
        setQuizResult(null);
        setQuizAnswers({});
      }
      if (activeTab === "dashboard") fetchDashboardStats();
    }
  }, [selectedSubject, activeTab]);

  // Auto scroll chat
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Google Authentication Handler ---
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      showToast(err.message || "Google Sign-In failed", "error");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      setSubjects([]);
      setSelectedSubject(null);
      showToast("Signed out successfully", "info");
    } catch (err) {
      showToast("Failed to sign out", "error");
    }
  };

  const fetchSubjects = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/subjects?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
        if (data.length > 0) {
          setSelectedSubject(data[0]);
        } else {
          setSelectedSubject(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !currentUser) return;
    setSubjectError("");
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, subjectName: newSubjectName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubjects((prev) => [...prev, data]);
        setSelectedSubject(data);
        setNewSubjectName("");
        setSubjectError("");
        setIsCreatingSubject(false);
        showToast(`Subject "${data.subjectName}" created successfully!`, "success");
        fetchDashboardStats();
      } else {
        let msg = "Failed to create subject. Please try again.";
        try {
          const text = await res.text();
          if (text) {
            const errData = JSON.parse(text);
            if (errData?.error) msg = errData.error;
          }
        } catch {
          // Fallback message if response is non-JSON
        }
        setSubjectError(msg);
        showToast(msg, "error");
      }
    } catch (err: any) {
      let msg = "Failed to create subject. Please check your network connection and try again.";
      if (typeof err === "string" && !err.toLowerCase().includes("json")) {
        msg = err;
      } else if (
        err?.message &&
        typeof err.message === "string" &&
        !err.message.toLowerCase().includes("json") &&
        !err.message.toLowerCase().includes("unexpected character")
      ) {
        msg = err.message;
      }
      setSubjectError(msg);
      showToast(msg, "error");
    }
  };

  const handleLoadSampleData = async () => {
    if (!currentUser) return;
    setIsSeedingSampleData(true);
    try {
      const res = await fetch("/api/seed-sample-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      if (res.ok) {
        showToast("Sample demo course data loaded successfully!", "success");
        await fetchSubjects();
        await fetchDashboardStats();
      } else {
        showToast("Failed to load sample demo data.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error loading sample demo data.", "error");
    } finally {
      setIsSeedingSampleData(false);
    }
  };

  const handleRenameSubject = async (id: string) => {
    if (!editingSubjectName.trim()) return;
    try {
      const res = await fetch(`/api/subjects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectName: editingSubjectName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubjects(subjects.map(s => s.id === id ? data : s));
        if (selectedSubject?.id === id) {
          setSelectedSubject(data);
        }
        setEditingSubjectId(null);
        setEditingSubjectName("");
        showToast("Subject renamed!", "success");
      }
    } catch (err) {
      showToast("Failed to rename", "error");
    }
  };

  const handleDeleteSubject = (sub: Subject) => {
    setSubjectToDelete(sub);
  };

  const confirmDeleteSubject = async () => {
    if (!subjectToDelete) return;
    const { id, subjectName } = subjectToDelete;
    setDeletingSubjectId(id);
    setSubjectToDelete(null);

    try {
      const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      if (res.ok) {
        const remaining = subjects.filter(s => s.id !== id);
        setSubjects(remaining);
        if (selectedSubject?.id === id) {
          setSelectedSubject(remaining.length > 0 ? remaining[0] : null);
        }
        showToast(`Subject "${subjectName}" deleted.`, "info");
        fetchDashboardStats();
      } else {
        showToast("Failed to delete subject", "error");
      }
    } catch (err) {
      showToast("Failed to delete subject", "error");
    } finally {
      setDeletingSubjectId(null);
    }
  };

  const fetchDashboardStats = async () => {
    if (!currentUser) return;
    setIsLoadingStats(true);
    try {
      const res = await fetch(`/api/dashboard-stats?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchDocuments = async () => {
    if (!selectedSubject) return;
    setIsLoadingDocs(true);
    try {
      const res = await fetch(`/api/documents?subjectId=${selectedSubject.id}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handlePasteNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedTitle.trim() || !pastedContent.trim() || !currentUser || !selectedSubject) {
      return showToast("Please enter both a title and study content.", "error");
    }
    try {
      const res = await fetch("/api/documents/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          subjectId: selectedSubject.id,
          fileName: pastedTitle.endsWith(".pdf") ? pastedTitle : `${pastedTitle}.txt`,
          content: pastedContent,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments([...documents, data]);
        setPastedTitle("");
        setPastedContent("");
        setIsPasting(false);
        showToast("Study notes pasted and cataloged successfully!", "success");
        fetchDashboardStats();
      }
    } catch (err) {
      showToast("Failed to save pasted notes", "error");
    }
  };

  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !currentUser || !selectedSubject) {
      return showToast("Please select a PDF file first.", "error");
    }
    setIsUploadingPdf(true);
    setUploadError("");
    const formData = new FormData();
    formData.append("file", pdfFile);
    formData.append("userId", currentUser.id);
    formData.append("subjectId", selectedSubject.id);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments([...documents, data]);
        setPdfFile(null);
        showToast(`Successfully uploaded and parsed "${data.fileName}"!`, "success");
        fetchDashboardStats();
      } else {
        const errJson = await res.json();
        setUploadError(errJson.error || "Failed to process PDF file.");
      }
    } catch (err: any) {
      setUploadError("Network error. Make sure server is running.");
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const promptDeleteDocument = (doc: Document) => {
    setDocToDelete(doc);
  };

  const confirmDeleteDocument = async () => {
    if (!docToDelete) return;
    const { id, fileName } = docToDelete;
    setDeletingDocId(id);
    setDocToDelete(null);

    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== id));
        showToast(`Document "${fileName}" deleted.`, "info");
        fetchDashboardStats();
      } else {
        showToast("Failed to delete document", "error");
      }
    } catch (err) {
      showToast("Failed to delete document", "error");
    } finally {
      setDeletingDocId(null);
    }
  };

  const fetchChats = async () => {
    if (!currentUser || !selectedSubject) return;
    setIsLoadingChats(true);
    try {
      const res = await fetch(`/api/chats?userId=${currentUser.id}&subjectId=${selectedSubject.id}`);
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingChats(false);
    }
  };

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatTitle.trim() || !currentUser || !selectedSubject) return;
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          subjectId: selectedSubject.id,
          title: newChatTitle.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setChats([data, ...chats]);
        setActiveChat(data);
        setMessages([]);
        setNewChatTitle("");
        setIsCreatingChat(false);
        showToast(`New chat "${data.title}" started!`, "success");
      }
    } catch (err) {
      showToast("Failed to start chat", "error");
    }
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation history?")) return;
    try {
      const res = await fetch(`/api/chats/${id}`, { method: "DELETE" });
      if (res.ok) {
        setChats(chats.filter(c => c.id !== id));
        if (activeChat?.id === id) {
          setActiveChat(null);
          setMessages([]);
        }
        showToast("Conversation deleted.", "info");
        fetchDashboardStats();
      }
    } catch (err) {
      showToast("Failed to delete chat", "error");
    }
  };

  const handleSelectChat = async (chat: Chat) => {
    setActiveChat(chat);
    try {
      const res = await fetch(`/api/chats/${chat.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedSubject || !currentUser) return;

    let targetChat = activeChat;
    // Auto-create chat if none is active
    if (!targetChat) {
      try {
        const shortTitle = inputMessage.slice(0, 30) + (inputMessage.length > 30 ? "..." : "");
        const res = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            subjectId: selectedSubject.id,
            title: shortTitle,
          }),
        });
        if (res.ok) {
          targetChat = await res.json();
          setChats([targetChat!, ...chats]);
          setActiveChat(targetChat);
        } else {
          showToast("Failed to initiate automated chat thread", "error");
          return;
        }
      } catch (err) {
        return;
      }
    }

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      chatId: targetChat!.id,
      role: "user",
      content: inputMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempUserMsg]);
    setInputMessage("");
    setIsSendingMessage(true);

    try {
      const res = await fetch(`/api/chats/${targetChat!.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: tempUserMsg.content,
          subjectId: selectedSubject.id,
          tutorMode: isTutorMode,
        }),
      });

      if (res.ok) {
        const { aiMsg } = await res.json();
        setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id).concat(tempUserMsg, aiMsg));
        fetchDashboardStats();
      } else {
        showToast("Error processing response. Check connection.", "error");
      }
    } catch (err) {
      showToast("Failed to send message", "error");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedSubject) return;
    setIsGeneratingSummary(true);
    setGeneratedSummary("");
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedSubject.id,
          format: summaryFormat,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedSummary(data.summary);
        showToast("Summary generated successfully!", "success");
      } else {
        const errJson = await res.json();
        showToast(errJson.error || "Failed to generate summary", "error");
      }
    } catch (err) {
      showToast("Error communicating with AI model server", "error");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const fetchFlashcards = async () => {
    if (!selectedSubject) return;
    setIsLoadingCards(true);
    try {
      const res = await fetch(`/api/flashcards?subjectId=${selectedSubject.id}`);
      if (res.ok) {
        const data = await res.json();
        setFlashcards(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCards(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!selectedSubject) return;
    setIsGeneratingCards(true);
    try {
      const res = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: selectedSubject.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setFlashcards(data);
        showToast(`Generated ${data.length} flashcards based on your notes!`, "success");
        fetchDashboardStats();
      } else {
        const errJson = await res.json();
        showToast(errJson.error || "Fail to generate flashcards", "error");
      }
    } catch (err) {
      showToast("AI failed to extract cards.", "error");
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const handleToggleLearned = async (id: string) => {
    try {
      const res = await fetch(`/api/flashcards/${id}/toggle`, { method: "PUT" });
      if (res.ok) {
        const updated = await res.json();
        setFlashcards(flashcards.map(f => f.id === id ? updated : f));
        fetchDashboardStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateManualCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuestion.trim() || !manualAnswer.trim() || !selectedSubject) return;
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedSubject.id,
          question: manualQuestion.trim(),
          answer: manualAnswer.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFlashcards([...flashcards, data]);
        setManualQuestion("");
        setManualAnswer("");
        setIsCreatingCard(false);
        showToast("Manual flashcard added!", "success");
        fetchDashboardStats();
      }
    } catch (err) {
      showToast("Failed to create flashcard", "error");
    }
  };

  const handleDeleteFlashcard = async (id: string) => {
    try {
      const res = await fetch(`/api/flashcards/${id}`, { method: "DELETE" });
      if (res.ok) {
        setFlashcards(flashcards.filter(f => f.id !== id));
        showToast("Card removed.", "info");
        fetchDashboardStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQuizzes = async () => {
    if (!selectedSubject) return;
    setIsLoadingQuizzes(true);
    try {
      const res = await fetch(`/api/quizzes?subjectId=${selectedSubject.id}`);
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!selectedSubject) return;
    setIsGeneratingQuiz(true);
    try {
      const title = `${selectedSubject.subjectName.split("&")[0]} - ${quizDifficulty.toUpperCase()} Quiz`;
      const res = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedSubject.id,
          difficulty: quizDifficulty,
          title,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuizzes([data, ...quizzes]);
        handleSelectQuiz(data);
        showToast(`AI generated a new ${quizDifficulty} quiz!`, "success");
        fetchDashboardStats();
      } else {
        const errJson = await res.json();
        showToast(errJson.error || "Failed to generate quiz", "error");
      }
    } catch (err) {
      showToast("Error communicating with AI quiz server", "error");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSelectQuiz = async (quiz: Quiz) => {
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}`);
      if (res.ok) {
        const detailedQuiz = await res.json();
        setActiveQuiz(detailedQuiz);
        setQuizAnswers({});
        setQuizResult(null);

        // Pre-fill answers if already completed
        if (detailedQuiz.completed && detailedQuiz.questions) {
          const loadedAns: { [key: string]: string } = {};
          detailedQuiz.questions.forEach((q: any) => {
            if (q.userAnswer) loadedAns[q.id] = q.userAnswer;
          });
          setQuizAnswers(loadedAns);
          setQuizResult({ quiz: detailedQuiz, score: detailedQuiz.score || 0 });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setIsSubmittingQuiz(true);
    try {
      const res = await fetch(`/api/quizzes/${activeQuiz.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: quizAnswers }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuizResult(data);
        showToast(`Quiz completed! You scored ${data.score}%`, "success");
        fetchDashboardStats();
        // Update quizzes list item as well
        setQuizzes(quizzes.map(q => q.id === activeQuiz.id ? { ...q, completed: true, score: data.score } : q));
      }
    } catch (err) {
      showToast("Failed to submit answers", "error");
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  // Render Login page if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between" id="auth-page">
        {/* Header decoration */}
        <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />

        <header className="container mx-auto px-6 py-6 flex justify-between items-center z-10">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Gemini Study AI
            </span>
          </div>
          <div className="text-sm text-slate-400 font-mono">
            Platform Ready ● v1.0.0
          </div>
        </header>

        <main className="container mx-auto px-6 flex-grow flex items-center justify-center z-10 py-12">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl w-full">
            {/* Left pitch section */}
            <div className="space-y-6 text-left">
              <div className="inline-flex items-center space-x-2 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border border-indigo-500/20">
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Personalized AI Learning
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-white">
                Learn smarter, faster, from your <span className="text-indigo-400 underline decoration-indigo-500 decoration-wavy">own materials</span>.
              </h1>
              <p className="text-slate-300 text-lg leading-relaxed">
                Upload lectures, notes, or textbooks as PDFs. Instantly chat with Gemma to extract concepts, generate summaries, and take custom quiz reviews.
              </p>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-start space-x-3">
                  <div className="bg-indigo-500/10 p-1.5 rounded-lg text-indigo-400 mt-0.5">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">RAG-Powered Custom Chat</h3>
                    <p className="text-slate-400 text-sm">Gemma analyzes and cites excerpts from your uploaded materials to answer questions.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-indigo-500/10 p-1.5 rounded-lg text-indigo-400 mt-0.5">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Interactive Assessment Engines</h3>
                    <p className="text-slate-400 text-sm">Generate targeted flashcard reviews and graded test prep questions with a single click.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right login container */}
            <div className="bg-slate-800/80 border border-slate-700/60 p-8 rounded-2xl shadow-2xl backdrop-blur-md max-w-md w-full mx-auto" id="auth-card">
              <h2 className="text-2xl font-bold text-white mb-2">Student Portal Login</h2>
              <p className="text-slate-400 text-sm mb-6">Sign in with your Google Account to access your personal study subjects, notes, and AI flashcards.</p>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  id="google-login-btn"
                  className="w-full bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 px-4 rounded-xl shadow-lg flex justify-center items-center space-x-3 transition-all active:scale-[0.98] border border-slate-200"
                >
                  {isSigningIn ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
                      <span>Connecting to Google Auth...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Sign in with Google</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700/60 text-center">
                <span className="text-xs text-slate-400 block leading-relaxed">
                  Authentication is powered by <strong className="text-slate-300">Firebase Auth</strong> with single-option Google Email Login. All study notes, flashcards, and quiz records are saved directly to your cloud <strong className="text-slate-300">Firestore Database</strong>.
                </span>
              </div>
            </div>
          </div>
        </main>

        <footer className="py-6 border-t border-slate-800 text-center text-xs text-slate-500 z-10">
          AI Study Assistant &copy; 2026. Powered securely by Gemini 3.5 Flash server-side.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row" id="app-shell">
      {/* Dynamic Toast System */}
      {toastMessage && (
        <div
          id="toast-notification"
          className={`fixed top-4 right-4 z-[100] flex items-center space-x-2.5 px-4 py-3 rounded-xl border shadow-2xl transition-all duration-300 transform translate-y-0 ${
            toastType === "success"
              ? "bg-slate-800/95 border-emerald-500 text-emerald-400"
              : toastType === "error"
              ? "bg-slate-800/95 border-rose-500 text-rose-400"
              : "bg-slate-800/95 border-indigo-500 text-indigo-400"
          }`}
        >
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span className="text-sm font-medium text-slate-200">{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Subject & Navigation Panel */}
      <aside className="w-full md:w-80 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0" id="sidebar-panel">
        {/* Header with Mobile Menu Toggle */}
        <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="bg-indigo-500 p-1.5 rounded-lg">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              StudyAssistant AI
            </span>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 shadow-md"
            id="mobile-menu-toggle"
            aria-label="Toggle Navigation Tools"
          >
            {isMobileMenuOpen ? (
              <>
                <X className="h-4 w-4 text-rose-400" />
                <span className="text-xs font-semibold">Close</span>
              </>
            ) : (
              <>
                <Menu className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-semibold">Tools & Subjects</span>
              </>
            )}
          </button>
        </div>

        {/* Collapsible Content Area for Mobile, Always Visible on Desktop */}
        <div className={`${isMobileMenuOpen ? "block" : "hidden md:flex md:flex-col md:justify-between flex-1"}`}>
          <div>
            {/* User Profile Summary */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between" id="sidebar-profile">
              <div className="flex items-center space-x-3">
                <img
                  src={currentUser.avatarUrl}
                  alt="Avatar"
                  className="h-10 w-10 rounded-full border border-slate-700 bg-slate-800 p-0.5"
                />
                <div className="text-left overflow-hidden">
                  <p className="text-sm font-semibold text-white truncate">{currentUser.name}</p>
                  <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            {/* Catalog Subjects List */}
            <div className="p-4 border-b border-slate-800">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Subjects Catalog ({subjects.length})
                </span>
                <button
                  onClick={() => {
                    setIsCreatingSubject(true);
                    setSubjectError("");
                  }}
                  className="text-indigo-400 hover:text-indigo-300 p-1 rounded hover:bg-slate-800 transition-colors"
                  title="Create New Subject"
                  id="create-subject-btn"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Create Subject Button in Catalog Header */}

              {/* List of Cataloged Subjects */}
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1" id="subject-list">
                {subjects.length === 0 ? (
                  <div className="text-xs text-slate-500 py-3 text-center space-y-2">
                    <p>No subjects created yet.</p>
                    {isDemoUser && (
                      <button
                        onClick={handleLoadSampleData}
                        disabled={isSeedingSampleData}
                        className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium disabled:opacity-50"
                      >
                        {isSeedingSampleData ? "Loading..." : "Load Demo Data"}
                      </button>
                    )}
                  </div>
                ) : (
                  subjects.map((sub) => {
                    const isSelected = selectedSubject?.id === sub.id;
                    const isEditing = editingSubjectId === sub.id;
                    const isDeleting = deletingSubjectId === sub.id;

                    return (
                      <div
                        key={sub.id}
                        onClick={() => {
                          if (!isEditing && !isDeleting) {
                            setSelectedSubject(sub);
                            setIsMobileMenuOpen(false);
                          }
                        }}
                        className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-all relative ${
                          isDeleting
                            ? "opacity-50 blur-[1px] bg-rose-950/20 border border-rose-500/30 pointer-events-none"
                            : isSelected
                            ? "bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500"
                            : "text-slate-300 hover:bg-slate-900 hover:text-white"
                        }`}
                      >
                        {isDeleting ? (
                          <div className="flex items-center justify-between w-full text-rose-400 text-xs py-0.5">
                            <span className="truncate font-medium text-rose-300 pr-2">{sub.subjectName}</span>
                            <div className="flex items-center space-x-1 shrink-0 bg-rose-900/40 px-1.5 py-0.5 rounded text-[10px] font-semibold text-rose-300 border border-rose-500/30">
                              <RefreshCw className="h-2.5 w-2.5 animate-spin text-rose-400" />
                              <span>Deleting...</span>
                            </div>
                          </div>
                        ) : isEditing ? (
                          <div className="flex items-center space-x-1 w-full" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingSubjectName}
                              onChange={(e) => setEditingSubjectName(e.target.value)}
                              className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white w-full"
                            />
                            <button
                              onClick={() => handleRenameSubject(sub.id)}
                              className="p-1 text-emerald-400 hover:text-emerald-300"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => setEditingSubjectId(null)}
                              className="p-1 text-slate-400 hover:text-slate-300"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="truncate pr-2">{sub.subjectName}</span>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  setEditingSubjectId(sub.id);
                                  setEditingSubjectName(sub.subjectName);
                                }}
                                className="p-0.5 text-slate-400 hover:text-indigo-400 rounded hover:bg-slate-800"
                                title="Rename"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteSubject(sub)}
                                className="p-0.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                                title="Delete Subject"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="p-4 space-y-1.5" id="nav-tabs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-3 mb-2">
                Study Tools
              </span>

              <button
                onClick={() => {
                  setActiveTab("dashboard");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "dashboard"
                    ? "bg-slate-800 text-white border-l-2 border-indigo-400"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
                id="tab-dashboard"
              >
                <Layers className="h-4 w-4" />
                <span>Dashboard Stats</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("materials");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "materials"
                    ? "bg-slate-800 text-white border-l-2 border-indigo-400"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
                id="tab-materials"
              >
                <Upload className="h-4 w-4" />
                <span>PDFs & Notes</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("chat");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "chat"
                    ? "bg-slate-800 text-white border-l-2 border-indigo-400"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
                id="tab-chat"
              >
                <MessageSquare className="h-4 w-4" />
                <span>AI Chat with PDF</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("summary");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "summary"
                    ? "bg-slate-800 text-white border-l-2 border-indigo-400"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
                id="tab-summary"
              >
                <FileText className="h-4 w-4" />
                <span>AI Chapter Summarizer</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("flashcards");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "flashcards"
                    ? "bg-slate-800 text-white border-l-2 border-indigo-400"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
                id="tab-flashcards"
              >
                <Bookmark className="h-4 w-4" />
                <span>Flashcard Generator</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("quiz");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "quiz"
                    ? "bg-slate-800 text-white border-l-2 border-indigo-400"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
                id="tab-quiz"
              >
                <Award className="h-4 w-4" />
                <span>Quiz Generator</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("settings");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "settings"
                    ? "bg-slate-800 text-white border-l-2 border-indigo-400"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
                id="tab-settings"
              >
                <SettingsIcon className="h-4 w-4" />
                <span>Settings</span>
              </button>
            </nav>
          </div>

          {/* Footer info banner */}
          <div className="p-4 bg-slate-900/20 border-t border-slate-800/80">
            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Gemini 3.5 Flash server-side</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-grow flex flex-col min-w-0" id="workspace-container">
        {/* Top Sticky Header */}
        <header className="bg-slate-950/70 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between backdrop-blur-md sticky top-0 z-20">
          <div className="text-left">
            <span className="text-xs text-indigo-400 font-semibold tracking-wider uppercase block">
              Active Subject
            </span>
            <h1 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>{selectedSubject?.subjectName || "No Subject Selected"}</span>
              <span className="text-xs font-normal text-slate-500">
                (ID: {selectedSubject?.id || "N/A"})
              </span>
            </h1>
          </div>

          {/* Quick Stats Summary Pills */}
          <div className="flex items-center space-x-4 mt-3 sm:mt-0 text-xs text-slate-400 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-1">
              <FileUp className="h-3.5 w-3.5 text-indigo-400" />
              <span>PDFs: <strong className="text-slate-200">{stats?.totalDocuments ?? 0}</strong></span>
            </div>
            <div className="flex items-center space-x-1">
              <Bookmark className="h-3.5 w-3.5 text-indigo-400" />
              <span>Cards: <strong className="text-slate-200">{stats?.totalFlashcards ?? 0}</strong></span>
            </div>
            <div className="flex items-center space-x-1">
              <Award className="h-3.5 w-3.5 text-indigo-400" />
              <span>Quiz Rate: <strong className="text-slate-200">{stats?.completedQuizzes ?? 0}/{stats?.totalQuizzes ?? 0}</strong></span>
            </div>
          </div>
        </header>

        {/* Dynamic Tab Body Render */}
        <section className="flex-grow p-6 overflow-y-auto bg-slate-900/40" id="tab-body">
          {/* No Subject Guard */}
          {!selectedSubject && activeTab !== "settings" ? (
            <div className="h-full flex flex-col justify-center items-center text-center p-8">
              <div className="bg-indigo-500/10 p-4 rounded-full text-indigo-400 mb-4 animate-bounce">
                <BookOpen className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Initialize Your Study Catalog</h2>
              <p className="text-slate-400 max-w-md mb-6">
                Please create a Subject in the sidebar to begin uploading study materials, studying flashcards, or taking quizzes.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => setIsCreatingSubject(true)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create First Subject</span>
                </button>
                {isDemoUser && (
                  <button
                    onClick={handleLoadSampleData}
                    disabled={isSeedingSampleData}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 font-semibold px-5 py-2.5 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                    <span>{isSeedingSampleData ? "Populating Demo..." : "Load Sample Demo Data"}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: DASHBOARD STATS */}
              {activeTab === "dashboard" && (
                <div className="space-y-6" id="dashboard-tab">
                  {/* Stats Cards Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-left">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Total Subjects</p>
                      <h3 className="text-3xl font-extrabold text-white mt-1">{stats?.totalSubjects ?? 0}</h3>
                      <p className="text-[10px] text-slate-400 mt-2">Active syllabus courses</p>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-left">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Study PDFs</p>
                      <h3 className="text-3xl font-extrabold text-white mt-1">{stats?.totalDocuments ?? 0}</h3>
                      <p className="text-[10px] text-indigo-400 mt-2">Indexed text resources</p>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-left">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Flashcards</p>
                      <h3 className="text-3xl font-extrabold text-white mt-1">{stats?.totalFlashcards ?? 0}</h3>
                      <p className="text-[10px] text-emerald-400 mt-2">
                        {stats?.learnedFlashcards ?? 0} marked as learned
                      </p>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-left">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Completed Quizzes</p>
                      <h3 className="text-3xl font-extrabold text-white mt-1">
                        {stats?.completedQuizzes ?? 0}
                        <span className="text-slate-500 text-lg font-normal">/{stats?.totalQuizzes ?? 0}</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-2">Self-evaluations made</p>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl col-span-2 lg:col-span-1 text-left">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Chat History</p>
                      <h3 className="text-3xl font-extrabold text-white mt-1">{stats?.totalChats ?? 0}</h3>
                      <p className="text-[10px] text-indigo-400 mt-2">Previous tutor logs</p>
                    </div>
                  </div>

                  {/* Syllabus Coverage & Study Charts */}
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Catalog Progress List */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 md:col-span-2 text-left">
                      <h3 className="font-bold text-white mb-4 text-base flex items-center space-x-2">
                        <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
                        <span>Syllabus Resources Distribution</span>
                      </h3>

                      {isLoadingStats ? (
                        <div className="py-12 flex justify-center items-center">
                          <RefreshCw className="h-6 w-6 animate-spin text-slate-500" />
                        </div>
                      ) : !stats || stats.subjectStats.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 text-sm">No study activity generated yet. Try pasting lecture slides or PDFs!</div>
                      ) : (
                        <div className="space-y-4">
                          {stats.subjectStats.map((sub: any, idx: number) => {
                            const isDeleting = deletingSubjectId === (sub.id || sub.subjectId);
                            return (
                              <div
                                key={idx}
                                className={`p-4 rounded-xl transition-all relative overflow-hidden ${
                                  isDeleting
                                    ? "bg-rose-950/20 border border-rose-500/30 opacity-50 blur-[1px] pointer-events-none"
                                    : "bg-slate-900/60 border border-slate-800/80"
                                }`}
                              >
                                {isDeleting && (
                                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-10 space-x-2 text-rose-400 font-medium text-xs">
                                    <RefreshCw className="h-4 w-4 animate-spin text-rose-400" />
                                    <span>Deleting "{sub.fullName}"...</span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-white text-sm">{sub.fullName}</span>
                                <span className="text-xs text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded">
                                  {sub.documents} PDFs / {sub.quizzes} Quiz Prep
                                </span>
                              </div>
                              {/* progress representation bar */}
                              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      ((sub.documents * 2 + sub.flashcards + sub.completedQuizzes * 3) / 10) * 100 || 10
                                    )}%`,
                                  }}
                                />
                              </div>
                              <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400">
                                <span>Core Notes, Flashcards & Quiz Performance Metrics</span>
                                <span>{sub.flashcards} Memory Cards</span>
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      )}
                    </div>

                    {/* Quick Access Box */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 text-left flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-white mb-2 text-base">Quick-Start AI Tutor</h3>
                        <p className="text-slate-400 text-xs leading-relaxed mb-4">
                          Gemma is ready to help you analyze your current notes on <strong className="text-slate-200">"{selectedSubject?.subjectName}"</strong>. Ask detailed questions, clarify exam notes, or create custom revision flashcards.
                        </p>

                        <div className="space-y-2.5">
                          <button
                            onClick={() => setActiveTab("chat")}
                            className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-lg p-2.5 text-xs font-semibold flex items-center justify-between"
                          >
                            <span>Open PDF Chat Engine</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => setActiveTab("quiz")}
                            className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-lg p-2.5 text-xs font-semibold flex items-center justify-between"
                          >
                            <span>Generate Exam Practice Test</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => setActiveTab("summary")}
                            className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 rounded-lg p-2.5 text-xs font-semibold flex items-center justify-between"
                          >
                            <span>Create Fast Lecture Summary</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-slate-800/80 pt-4 mt-4 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Database synchronized</span>
                        <span>v1.0.0</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PDFs & MATERIALS */}
              {activeTab === "materials" && (
                <div className="space-y-6 text-left" id="materials-tab">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">Study Materials & Notes</h2>
                      <p className="text-xs text-slate-400 mt-1">Upload lecture notes, assignments, textbooks, or write plain text chapters below.</p>
                    </div>

                    <div className="flex space-x-2 mt-4 md:mt-0">
                      <button
                        onClick={() => setIsPasting(!isPasting)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 transition-colors ${
                          isPasting
                            ? "bg-indigo-600 border-indigo-500 text-white"
                            : "bg-slate-950 border-slate-850 text-slate-300 hover:bg-slate-900"
                        }`}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Paste Plain Text Notes</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Add Document Box */}
                    <div className="space-y-4">
                      {/* PDF Upload Card */}
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                        <h3 className="font-bold text-white mb-2 text-sm">Upload Textbook PDF</h3>
                        <p className="text-slate-400 text-xs mb-4">Gemma parses pages in real-time, splits text into overlapping vectors, and triggers RAG search.</p>

                        <form onSubmit={handlePdfUpload} className="space-y-3">
                          <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-6 text-center cursor-pointer transition-colors relative">
                            <input
                              type="file"
                              accept=".pdf"
                              required
                              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="space-y-2">
                              <FileUp className="h-8 w-8 text-indigo-400 mx-auto" />
                              <p className="text-xs font-semibold text-slate-300">
                                {pdfFile ? pdfFile.name : "Select or Drop PDF here"}
                              </p>
                              <p className="text-[10px] text-slate-500">PDF documents up to 10MB</p>
                            </div>
                          </div>

                          {uploadError && (
                            <p className="text-xs text-rose-400 text-center font-semibold bg-rose-950/20 p-2 rounded border border-rose-900/50">
                              {uploadError}
                            </p>
                          )}

                          <button
                            type="submit"
                            disabled={isUploadingPdf || !pdfFile}
                            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors flex justify-center items-center"
                          >
                            {isUploadingPdf ? (
                              <>
                                <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                                Extracting syllabus texts...
                              </>
                            ) : (
                              "Upload & Extract Text"
                            )}
                          </button>
                        </form>
                      </div>

                      {/* Paste Lecture Notes Card */}
                      {isPasting && (
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                          <h3 className="font-bold text-white mb-2 text-sm">Write / Paste lecture slides</h3>
                          <form onSubmit={handlePasteNotes} className="space-y-3">
                            <input
                              type="text"
                              required
                              placeholder="Title (e.g. Chapter 4 - Photosynthesis)"
                              value={pastedTitle}
                              onChange={(e) => setPastedTitle(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                            />
                            <textarea
                              required
                              rows={6}
                              placeholder="Paste study material text, lecture outputs, custom book transcripts here..."
                              value={pastedContent}
                              onChange={(e) => setPastedContent(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                            />
                            <button
                              type="submit"
                              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold py-2 rounded-lg"
                            >
                              Catalog Plain Text
                            </button>
                          </form>
                        </div>
                      )}
                    </div>

                    {/* Catalog Listing */}
                    <div className="md:col-span-2 space-y-3">
                      <h3 className="font-bold text-white text-sm">Indexed Materials Catalog</h3>

                      {isLoadingDocs ? (
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-12 text-center flex justify-center">
                          <RefreshCw className="h-6 w-6 animate-spin text-slate-500" />
                        </div>
                      ) : documents.length === 0 ? (
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
                          <p className="font-semibold mb-2 text-sm text-slate-400">No Materials Yet</p>
                          Upload a lecture PDF or paste slides in the left panel to populate Gemma's vector memory.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {documents.map((doc) => {
                            const isDeleting = deletingDocId === doc.id;
                            return (
                              <div
                                key={doc.id}
                                className={`bg-slate-950 border border-slate-800 rounded-xl p-4 flex justify-between items-start transition-all relative overflow-hidden ${
                                  isDeleting ? "opacity-50 blur-[1px] bg-rose-950/20 border-rose-500/30 pointer-events-none" : ""
                                }`}
                              >
                                {isDeleting && (
                                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-10 space-x-2 text-rose-400 font-medium text-xs">
                                    <RefreshCw className="h-4 w-4 animate-spin text-rose-400" />
                                    <span>Deleting material...</span>
                                  </div>
                                )}
                                <div className="flex items-start space-x-3 overflow-hidden">
                                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                                    <FileText className="h-5 w-5" />
                                  </div>
                                  <div className="text-left overflow-hidden">
                                    <h4 className="font-semibold text-white text-sm truncate">{doc.fileName}</h4>
                                    <p className="text-xs text-slate-400 mt-1 flex items-center space-x-3">
                                      <span>Pages: {doc.totalPages}</span>
                                      <span>●</span>
                                      <span>Words: {doc.content.split(/\s+/).length}</span>
                                      <span>●</span>
                                      <span>Cataloged: {new Date(doc.createdAt).toLocaleDateString()}</span>
                                    </p>
                                    {/* Collapsible extracted preview snippet */}
                                    <div className="mt-3 bg-slate-900 rounded p-2.5 border border-slate-800 max-h-16 overflow-hidden text-[11px] text-slate-500 font-mono leading-relaxed truncate">
                                      {doc.content}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={() => promptDeleteDocument(doc)}
                                  disabled={isDeleting}
                                  className="text-slate-400 hover:text-rose-400 p-1.5 rounded hover:bg-slate-900 transition-colors shrink-0 disabled:opacity-50"
                                  title="Delete document"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: AI CHAT WITH PDF (RAG) */}
              {activeTab === "chat" && (
                <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-4" id="chat-tab">
                  {/* Left Column: Chat lists / threads */}
                  <div className="w-full md:w-64 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shrink-0 text-left">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Chats History ({chats.length})
                        </span>
                        <button
                          onClick={() => setIsCreatingChat(true)}
                          className="text-indigo-400 hover:text-indigo-300 p-1 rounded hover:bg-slate-900 transition-colors"
                          title="New Chat Session"
                          id="new-chat-btn"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {isCreatingChat && (
                        <form onSubmit={handleCreateChat} className="mb-4 space-y-2 p-2 bg-slate-900 rounded-lg border border-slate-800">
                          <input
                            type="text"
                            required
                            placeholder="Chat title (e.g., Photosynthesis)..."
                            value={newChatTitle}
                            onChange={(e) => setNewChatTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500"
                          />
                          <div className="flex justify-end space-x-1">
                            <button
                              type="button"
                              onClick={() => setIsCreatingChat(false)}
                              className="px-2 py-1 text-[10px] text-slate-400 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-2.5 py-1 text-[10px] bg-indigo-500 hover:bg-indigo-600 rounded text-white"
                            >
                              Start
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Chat log List */}
                      <div className="space-y-1 overflow-y-auto max-h-[220px] pr-1">
                        {isLoadingChats ? (
                          <div className="py-4 text-center">
                            <RefreshCw className="h-4 w-4 animate-spin text-slate-500 mx-auto" />
                          </div>
                        ) : chats.length === 0 ? (
                          <div className="text-xs text-slate-500 py-3 text-center">No chats. Type below to auto-start one!</div>
                        ) : (
                          chats.map((chat) => (
                            <div
                              key={chat.id}
                              onClick={() => handleSelectChat(chat)}
                              className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                                activeChat?.id === chat.id
                                  ? "bg-slate-850 text-indigo-300 font-semibold"
                                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center space-x-1.5 overflow-hidden">
                                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate pr-1">{chat.title}</span>
                              </div>
                              <button
                                onClick={(e) => handleDeleteChat(chat.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-400 transition-opacity rounded hover:bg-slate-800"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Mode Toggle Controls */}
                    <div className="border-t border-slate-800 pt-4 mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-semibold">Tutor Mode</span>
                        <button
                          onClick={() => setIsTutorMode(!isTutorMode)}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                            isTutorMode ? "bg-indigo-500" : "bg-slate-800"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white transition-transform ${
                              isTutorMode ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        {isTutorMode
                          ? "Experienced AI Tutor Mode: Walks through step-by-step with analogies and tests you with friendly queries."
                          : "Standard Study Mode: Gives clean bullet summaries, highlights, and instant concise references."}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Active Chat Feed */}
                  <div className="flex-grow bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between overflow-hidden">
                    {/* Chat Feed Header */}
                    <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center text-left">
                      <div>
                        <h4 className="font-semibold text-white text-sm">
                          {activeChat ? activeChat.title : "New Question Session"}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          RAG system retrieves top 5 relevant document chunks automatically to grounding Gemma's answers.
                        </p>
                      </div>

                      {isTutorMode && (
                        <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center space-x-1 uppercase animate-pulse">
                          <BrainCircuit className="h-3 w-3" />
                          <span>AI Tutor Active</span>
                        </div>
                      )}
                    </div>

                    {/* Messages List Area */}
                    <div className="flex-grow p-4 overflow-y-auto space-y-4">
                      {messages.length === 0 ? (
                        <div className="h-full flex flex-col justify-center items-center text-center max-w-md mx-auto p-4 py-12">
                          <div className="bg-indigo-500/10 p-3 rounded-xl text-indigo-400 mb-3 animate-pulse">
                            <Sparkles className="h-6 w-6" />
                          </div>
                          <h5 className="font-bold text-white text-sm">Ask anything about your syllabus</h5>
                          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                            Type a question. Gemma will automatically perform keyword proximity scans across all uploaded files and reference those text pieces first!
                          </p>

                          <div className="mt-4 grid grid-cols-2 gap-2 w-full text-left text-[10px]">
                            <button
                              onClick={() => setInputMessage("Can you summarize the most important points in my notes?")}
                              className="p-2 border border-slate-850 rounded-lg hover:bg-slate-900 hover:text-white transition-colors"
                            >
                              "Summarize most important notes points"
                            </button>
                            <button
                              onClick={() => setInputMessage("Explain the central mechanism step-by-step.")}
                              className="p-2 border border-slate-850 rounded-lg hover:bg-slate-900 hover:text-white transition-colors"
                            >
                              "Explain central concept step-by-step"
                            </button>
                          </div>
                        </div>
                      ) : (
                        messages.map((m) => {
                          const isUser = m.role === "user";
                          return (
                            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"} text-left`}>
                              <div className={`max-w-[85%] rounded-xl p-3.5 ${
                                isUser
                                  ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/5"
                                  : "bg-slate-900 text-slate-200 border border-slate-805"
                              }`}>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-mono">
                                  {isUser ? "STUDENT" : "GEMMA AI"} ● {new Date(m.createdAt).toLocaleTimeString()}
                                </p>
                                <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                                  {m.content}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {isSendingMessage && (
                        <div className="flex justify-start text-left">
                          <div className="bg-slate-900 text-slate-200 border border-slate-805 max-w-[85%] rounded-xl p-3.5">
                            <p className="text-[10px] text-indigo-400 uppercase tracking-wider mb-1.5 font-mono flex items-center">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                              Scanning vector chunks & answering...
                            </p>
                            <div className="flex space-x-1.5 py-1">
                              <div className="w-2.5 h-2.5 bg-slate-600 rounded-full animate-bounce" />
                              <div className="w-2.5 h-2.5 bg-slate-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                              <div className="w-2.5 h-2.5 bg-slate-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messageEndRef} />
                    </div>

                    {/* Chat Input form */}
                    <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex space-x-2">
                      <input
                        type="text"
                        required
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder={`Ask Gemma about "${selectedSubject?.subjectName}" notes...`}
                        className="flex-grow bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={isSendingMessage || !inputMessage.trim()}
                        className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 text-white px-4 rounded-lg flex items-center justify-center transition-colors"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 4: AI CHAPTER SUMMARIZER */}
              {activeTab === "summary" && (
                <div className="space-y-6 text-left" id="summarizer-tab">
                  <div className="border-b border-slate-800 pb-4">
                    <h2 className="text-xl font-bold text-white">AI Chapter Summarizer</h2>
                    <p className="text-xs text-slate-400 mt-1">Convert your entire documents list into exam revision summaries with Gemma instantly.</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Format controls */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 h-fit space-y-4">
                      <h3 className="font-bold text-white text-sm">Select Summary Type</h3>

                      <div className="space-y-2">
                        <button
                          onClick={() => setSummaryFormat("short")}
                          className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                            summaryFormat === "short"
                              ? "bg-indigo-500/10 border-indigo-500 text-indigo-300 font-semibold"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          <h4 className="font-bold text-slate-200">Short Summary (&lt; 150 words)</h4>
                          <p className="text-[10px] text-slate-400 mt-1">Core formulas, definitions, and essential terms for immediate retention.</p>
                        </button>

                        <button
                          onClick={() => setSummaryFormat("detailed")}
                          className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                            summaryFormat === "detailed"
                              ? "bg-indigo-500/10 border-indigo-500 text-indigo-300 font-semibold"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          <h4 className="font-bold text-slate-200">Detailed Summary (500 words)</h4>
                          <p className="text-[10px] text-slate-400 mt-1">Syllabus concepts categorized neatly with detailed subsection outlines.</p>
                        </button>

                        <button
                          onClick={() => setSummaryFormat("exam")}
                          className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                            summaryFormat === "exam"
                              ? "bg-indigo-500/10 border-indigo-500 text-indigo-300 font-semibold"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          <h4 className="font-bold text-slate-200">Exam Revision Notes</h4>
                          <p className="text-[10px] text-slate-400 mt-1">Structured definitions, mock exam prompts, and a handy memory acronym trick.</p>
                        </button>
                      </div>

                      <button
                        onClick={handleGenerateSummary}
                        disabled={isGeneratingSummary}
                        className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold py-2.5 rounded-lg flex justify-center items-center"
                      >
                        {isGeneratingSummary ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" />
                            Gemma generating markdown...
                          </>
                        ) : (
                          "Generate Chapter Summary"
                        )}
                      </button>
                    </div>

                    {/* Results Display */}
                    <div className="md:col-span-2 space-y-3">
                      <h3 className="font-bold text-white text-sm">Active Revision Sheet</h3>

                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 min-h-[300px]">
                        {isGeneratingSummary ? (
                          <div className="h-64 flex flex-col justify-center items-center text-center">
                            <RefreshCw className="h-8 w-8 animate-spin text-indigo-400 mb-2" />
                            <p className="text-sm text-slate-400 font-semibold">Generating complete educational overview...</p>
                          </div>
                        ) : generatedSummary ? (
                          <div className="prose prose-invert max-w-none text-slate-300">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                              <span className="text-xs font-mono text-indigo-400 uppercase font-semibold">
                                Summary: {summaryFormat.toUpperCase()} SHEET
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Words: {generatedSummary.split(/\s+/).length}
                              </span>
                            </div>
                            {/* Simple render of response */}
                            <div className="text-sm whitespace-pre-wrap leading-relaxed space-y-3 font-sans">
                              {generatedSummary}
                            </div>
                          </div>
                        ) : (
                          <div className="h-64 flex flex-col justify-center items-center text-center text-slate-500">
                            <FileText className="h-10 w-10 text-slate-600 mb-2 animate-pulse" />
                            <p className="text-sm font-semibold text-slate-400">No Summary Generated</p>
                            <p className="text-xs text-slate-600 mt-1 max-w-sm">
                              Click the left action button to prompt Gemma. It reads all files cataloged in this subject instantly.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: FLASHCARD GENERATOR */}
              {activeTab === "flashcards" && (
                <div className="space-y-6 text-left" id="flashcards-tab">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">Interactive Flashcards</h2>
                      <p className="text-xs text-slate-400 mt-1">Review core formulas, memorize definitions, and mark cards as learned to track study progress.</p>
                    </div>

                    <div className="flex space-x-2 mt-3 sm:mt-0">
                      <button
                        onClick={handleGenerateFlashcards}
                        disabled={isGeneratingCards}
                        className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{isGeneratingCards ? "Extracting..." : "Auto-Generate via AI"}</span>
                      </button>

                      <button
                        onClick={() => setIsCreatingCard(!isCreatingCard)}
                        className="bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-300 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Manually</span>
                      </button>
                    </div>
                  </div>

                  {/* Manual Creation Form */}
                  {isCreatingCard && (
                    <form onSubmit={handleCreateManualCard} className="bg-slate-950 border border-slate-800 p-5 rounded-xl max-w-lg space-y-3">
                      <h3 className="font-bold text-white text-sm">Add New Card</h3>
                      <div className="space-y-2">
                        <input
                          type="text"
                          required
                          placeholder="Front Side Question (e.g., What is Polymorphism?)"
                          value={manualQuestion}
                          onChange={(e) => setManualQuestion(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-white"
                        />
                        <textarea
                          required
                          rows={2}
                          placeholder="Back Side Answer"
                          value={manualAnswer}
                          onChange={(e) => setManualAnswer(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setIsCreatingCard(false)}
                          className="text-xs text-slate-400 hover:text-white px-3 py-1.5"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold px-4 py-1.5 rounded"
                        >
                          Create Flashcard
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Filter tabs */}
                  <div className="flex space-x-2 border-b border-slate-850 pb-2">
                    <button
                      onClick={() => setFlashcardFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        flashcardFilter === "all" ? "bg-slate-805 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      All Cards ({flashcards.length})
                    </button>
                    <button
                      onClick={() => setFlashcardFilter("review")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        flashcardFilter === "review" ? "bg-slate-805 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Needs Review ({flashcards.filter(f => !f.learned).length})
                    </button>
                  </div>

                  {/* Render Flashcards Grid */}
                  {isLoadingCards ? (
                    <div className="py-12 text-center flex justify-center">
                      <RefreshCw className="h-6 w-6 animate-spin text-slate-500" />
                    </div>
                  ) : flashcards.length === 0 ? (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                      <Bookmark className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                      <p className="font-semibold text-sm text-slate-400">No Flashcards Cataloged</p>
                      <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                        Click "Auto-Generate via AI" above. Gemma will scan your uploaded study files and build detailed review cards in seconds.
                      </p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" id="flashcards-grid">
                      {flashcards
                        .filter(f => flashcardFilter === "all" ? true : !f.learned)
                        .map((card) => {
                          const isFlipped = flippedCardId === card.id;

                          return (
                            <div
                              key={card.id}
                              className={`relative h-56 rounded-2xl cursor-pointer transition-all duration-300 border ${
                                card.learned
                                  ? "border-emerald-950 bg-emerald-950/10"
                                  : "border-slate-800 bg-slate-950 hover:border-slate-700"
                              }`}
                              onClick={() => setFlippedCardId(isFlipped ? null : card.id)}
                            >
                              {/* Learned Status Pin */}
                              <div className="absolute top-3 left-3 z-10 flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleToggleLearned(card.id)}
                                  className={`p-1 rounded-md border text-[10px] font-semibold transition-colors flex items-center space-x-1 ${
                                    card.learned
                                      ? "bg-emerald-500 border-emerald-400 text-white"
                                      : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                                  }`}
                                >
                                  <Check className="h-3 w-3" />
                                  <span>{card.learned ? "Learned" : "Mark Learned"}</span>
                                </button>
                              </div>

                              {/* Delete button */}
                              <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleDeleteFlashcard(card.id)}
                                  className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-900 transition-colors"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {/* Card face content */}
                              <div className="h-full w-full flex flex-col justify-between p-6 pt-14 text-center">
                                {!isFlipped ? (
                                  <div className="flex-grow flex flex-col justify-center">
                                    <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-2 font-mono">Question Front</p>
                                    <h4 className="font-bold text-white text-sm line-clamp-4">{card.question}</h4>
                                  </div>
                                ) : (
                                  <div className="flex-grow flex flex-col justify-center">
                                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-2 font-mono text-left">Correct Answer Back</p>
                                    <p className="text-slate-300 text-xs leading-relaxed text-left line-clamp-5 overflow-y-auto pr-1">
                                      {card.answer}
                                    </p>
                                  </div>
                                )}

                                <span className="text-[10px] text-slate-500 mt-2">
                                  {isFlipped ? "Click to view Question" : "Click card to flip"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: QUIZ GENERATOR */}
              {activeTab === "quiz" && (
                <div className="space-y-6 text-left" id="quiz-tab">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">Revision Assessment Engine</h2>
                      <p className="text-xs text-slate-400 mt-1">Generate diagnostic MCQs, True/False, and short questions based directly on your notes.</p>
                    </div>

                    <div className="flex space-x-2 mt-3 sm:mt-0">
                      <select
                        value={quizDifficulty}
                        onChange={(e) => setQuizDifficulty(e.target.value as any)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white font-semibold focus:outline-none"
                      >
                        <option value="easy">Easy Difficulty</option>
                        <option value="medium">Medium Difficulty</option>
                        <option value="hard">Hard Difficulty</option>
                      </select>

                      <button
                        onClick={handleGenerateQuiz}
                        disabled={isGeneratingQuiz}
                        className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{isGeneratingQuiz ? "Assembling Quiz..." : "Assemble New Quiz"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Left panel: Quiz list */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 h-fit">
                      <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-3 text-slate-400">Available Quizzes</h3>

                      {isLoadingQuizzes ? (
                        <div className="py-4 text-center">
                          <RefreshCw className="h-4 w-4 animate-spin text-slate-500 mx-auto" />
                        </div>
                      ) : quizzes.length === 0 ? (
                        <div className="text-xs text-slate-500 py-6 text-center">No assessments saved. Select a difficulty level and click 'Assemble New Quiz'!</div>
                      ) : (
                        <div className="space-y-2">
                          {quizzes.map((q) => (
                            <div
                              key={q.id}
                              onClick={() => handleSelectQuiz(q)}
                              className={`p-3 rounded-lg border text-xs cursor-pointer text-left transition-colors ${
                                activeQuiz?.id === q.id
                                  ? "bg-slate-900 border-indigo-500 text-indigo-300 font-semibold"
                                  : "bg-slate-950 border-slate-850 hover:border-slate-750 text-slate-300"
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                                  q.difficulty === "easy"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : q.difficulty === "medium"
                                    ? "bg-amber-500/10 text-amber-400"
                                    : "bg-rose-500/10 text-rose-400"
                                }`}>
                                  {q.difficulty}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {q.completed ? "Graded" : "Pending"}
                                </span>
                              </div>
                              <h4 className="font-bold text-white text-sm line-clamp-1">{q.title}</h4>
                              <div className="flex justify-between items-center mt-2.5 text-[10px] text-slate-500">
                                <span>{q.totalQuestions} Questions</span>
                                {q.completed && q.score !== undefined && (
                                  <span className="font-bold text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded">
                                    Grade: {q.score}%
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Panel: Interactive quiz runner */}
                    <div className="md:col-span-2 space-y-4">
                      {activeQuiz ? (
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-5">
                            <div>
                              <h3 className="font-bold text-white text-base">{activeQuiz.title}</h3>
                              <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-mono">
                                LEVEL: {activeQuiz.difficulty} ● COMPLETE AND SECURE PREP
                              </p>
                            </div>

                            {activeQuiz.completed && (
                              <div className="bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-lg text-xs font-bold">
                                FINAL SCORE: {activeQuiz.score}%
                              </div>
                            )}
                          </div>

                          {/* Loop through questions */}
                          <div className="space-y-6">
                            {activeQuiz.questions?.map((q, idx) => {
                              const isCorrect = q.userAnswer?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase() ||
                                (q.type === 'short' && q.correctAnswer.trim().toLowerCase().includes(q.userAnswer?.trim().toLowerCase() || "@"));

                              return (
                                <div key={q.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-left">
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 font-mono">
                                    QUESTION {idx + 1} ● {q.type.toUpperCase()}
                                  </p>
                                  <h4 className="font-semibold text-white text-sm mb-4 leading-relaxed">{q.question}</h4>

                                  {/* Rendering MCQ */}
                                  {q.type === "mcq" && q.options && (
                                    <div className="grid gap-2">
                                      {q.options.map((opt, oIdx) => {
                                        const isSelected = quizAnswers[q.id] === opt;
                                        const isCorrectOpt = opt === q.correctAnswer;
                                        const showWrongSelected = activeQuiz.completed && isSelected && !isCorrectOpt;

                                        return (
                                          <label
                                            key={oIdx}
                                            className={`flex items-center space-x-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                                              activeQuiz.completed
                                                ? isCorrectOpt
                                                  ? "bg-emerald-950/20 border-emerald-500/50 text-emerald-400"
                                                  : showWrongSelected
                                                  ? "bg-rose-950/20 border-rose-500/50 text-rose-400"
                                                  : "bg-slate-950 border-slate-850 text-slate-400"
                                                : isSelected
                                                ? "bg-indigo-900/20 border-indigo-500 text-indigo-300"
                                                : "bg-slate-950 border-slate-850 text-slate-300 hover:border-slate-750"
                                            }`}
                                          >
                                            <input
                                              type="radio"
                                              name={q.id}
                                              value={opt}
                                              disabled={activeQuiz.completed}
                                              checked={isSelected}
                                              onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: opt })}
                                              className="accent-indigo-500 shrink-0"
                                            />
                                            <span className="leading-tight">{opt}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Rendering True/False */}
                                  {q.type === "tf" && (
                                    <div className="flex space-x-3">
                                      {["True", "False"].map((val) => {
                                        const isSelected = quizAnswers[q.id] === val;
                                        const isCorrectOpt = val === q.correctAnswer;
                                        const showWrongSelected = activeQuiz.completed && isSelected && !isCorrectOpt;

                                        return (
                                          <button
                                            key={val}
                                            type="button"
                                            disabled={activeQuiz.completed}
                                            onClick={() => setQuizAnswers({ ...quizAnswers, [q.id]: val })}
                                            className={`flex-1 p-2.5 text-xs rounded-lg border font-semibold transition-all ${
                                              activeQuiz.completed
                                                ? isCorrectOpt
                                                  ? "bg-emerald-950/20 border-emerald-500/50 text-emerald-400"
                                                  : showWrongSelected
                                                  ? "bg-rose-950/20 border-rose-500/50 text-rose-400"
                                                  : "bg-slate-950 border-slate-850 text-slate-400"
                                                : isSelected
                                                ? "bg-indigo-900/20 border-indigo-500 text-indigo-300"
                                                : "bg-slate-950 border-slate-850 text-slate-300 hover:border-slate-750"
                                            }`}
                                          >
                                            {val}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Rendering Short text answer */}
                                  {q.type === "short" && (
                                    <div className="space-y-2">
                                      <input
                                        type="text"
                                        placeholder="Type key term or brief answer here..."
                                        disabled={activeQuiz.completed}
                                        value={quizAnswers[q.id] || ""}
                                        onChange={(e) => setQuizAnswers({ ...quizAnswers, [q.id]: e.target.value })}
                                        className={`w-full text-xs rounded-lg p-3 bg-slate-950 border focus:outline-none ${
                                          activeQuiz.completed
                                            ? isCorrect
                                              ? "border-emerald-500/50 text-emerald-400"
                                              : "border-rose-500/50 text-rose-400"
                                            : "border-slate-700 focus:border-indigo-500 text-white"
                                        }`}
                                      />
                                      {activeQuiz.completed && (
                                        <p className="text-[11px] text-slate-400">
                                          Expected Answer: <strong className="text-white">{q.correctAnswer}</strong>
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Graded Details / Explanation */}
                                  {activeQuiz.completed && (
                                    <div className="mt-3 bg-slate-950 p-3 rounded-lg border border-slate-805 text-xs leading-relaxed text-slate-400">
                                      <div className="flex items-center space-x-1.5 mb-1 text-[10px] uppercase font-bold text-indigo-400 font-mono">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        <span>Gemma Rationale Summary</span>
                                      </div>
                                      {q.explanation}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Submission Trigger */}
                          {!activeQuiz.completed && (
                            <div className="mt-8 pt-4 border-t border-slate-850 text-right">
                              <button
                                onClick={handleSubmitQuiz}
                                disabled={isSubmittingQuiz}
                                className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-850 text-white font-semibold px-6 py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center ml-auto"
                              >
                                {isSubmittingQuiz ? (
                                  <>
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" />
                                    Grading exam paper...
                                  </>
                                ) : (
                                  "Submit Quiz For Grading"
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                          <Award className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                          <p className="font-semibold text-sm text-slate-400">No Active Quiz Selected</p>
                          <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                            Select an assessment from the left panel, or pick a difficulty level above to let Gemma synthesize a new mock test sheet!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: SETTINGS */}
              {activeTab === "settings" && (
                <div className="space-y-6 text-left" id="settings-tab">
                  <div className="border-b border-slate-800 pb-4">
                    <h2 className="text-xl font-bold text-white">System Settings & Status</h2>
                    <p className="text-xs text-slate-400 mt-1">Configure your study workspace environment parameters and credentials securely.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* User Profile info */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                      <h3 className="font-bold text-white text-sm">Active User profile</h3>

                      <div className="flex items-center space-x-4">
                        <img
                          src={currentUser.avatarUrl}
                          alt="Avatar"
                          className="h-14 w-14 rounded-full border border-indigo-500 bg-slate-800 p-0.5"
                        />
                        <div>
                          <h4 className="font-bold text-white text-base">{currentUser.name}</h4>
                          <p className="text-xs text-indigo-400">{currentUser.email}</p>
                          <p className="text-[10px] text-slate-500 mt-1">UUID: {currentUser.id}</p>
                        </div>
                      </div>

                      <div className="border-t border-slate-850 pt-4 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Platform Environment:</span>
                          <span className="text-slate-200 font-mono">Google AI Studio</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Database Engine:</span>
                          <span className="text-slate-200 font-mono">Persistent JSON-DB</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Study Materials Size Limit:</span>
                          <span className="text-slate-200 font-mono">10 MB PDF/TXT</span>
                        </div>
                      </div>

                      <button
                        onClick={handleSignOut}
                        className="w-full bg-slate-900 border border-slate-800 text-rose-400 hover:bg-slate-850 py-2 rounded-lg text-xs font-semibold transition-all flex justify-center items-center space-x-1"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out of active session</span>
                      </button>
                    </div>

                    {/* API Integrations */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                      <h3 className="font-bold text-white text-sm">LLM API Credentials Indicator</h3>

                      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5 text-xs text-indigo-400 font-bold">
                            <Sparkles className="h-4 w-4" />
                            <span>GEMINI_API_KEY</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-400 uppercase font-extrabold font-mono tracking-wider animate-pulse">
                            ACTIVE ● SECURE
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          The backend server is using the secure server-side Gemini 3.5 Flash model client. This keeps secrets safe from client-side network inspectors.
                        </p>
                      </div>

                      <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
                        <p className="font-semibold text-slate-200">How to manage variables:</p>
                        <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                          <li>To update credentials, use the <strong className="text-slate-200">Secrets panel</strong> in the AI Studio sidebar.</li>
                          <li>Avoid hardcoding keys directly in the codebase.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* Create Subject Modal Popup (Responsive for Mobile, Tablet, and Desktop) */}
      {isCreatingSubject && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsCreatingSubject(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 transform transition-all scale-100 text-left"
            onClick={(e) => e.stopPropagation()}
            id="create-subject-modal"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-500/20 p-2.5 rounded-xl border border-indigo-500/30 text-indigo-400">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Create New Subject</h3>
                  <p className="text-xs text-slate-400">Add a topic to categorize your study materials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingSubject(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Banner inside Modal */}
            {subjectError && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-start space-x-2.5 text-rose-300 text-xs animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-rose-200">Unable to create subject</p>
                  <p className="text-rose-300/90 mt-0.5">{subjectError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubjectError("")}
                  className="text-rose-400 hover:text-rose-200 p-0.5 rounded transition-colors"
                  aria-label="Dismiss error"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Data Structures & Algorithms, Quantum Physics..."
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              {/* Quick Suggestions */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-2">
                  Quick Subject Suggestions:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Computer Science",
                    "Biology & Genetics",
                    "Machine Learning",
                    "Organic Chemistry",
                    "Operating Systems",
                    "Linear Algebra"
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNewSubjectName(tag)}
                      className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingSubject(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 flex items-center space-x-1.5 transition-all active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Subject</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Subject Confirmation Modal */}
      {subjectToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 rounded-lg">
                <Trash2 className="h-6 w-6 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Subject</h3>
            </div>
            <p className="text-sm text-slate-300">
              Are you sure you want to delete <span className="font-semibold text-white">"{subjectToDelete.subjectName}"</span>? This will permanently remove all associated study documents, summaries, quizzes, flashcards, and chat history.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setSubjectToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSubject}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-lg shadow-rose-900/30 transition-colors"
              >
                Delete Subject
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Document Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 rounded-lg">
                <Trash2 className="h-6 w-6 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Material</h3>
            </div>
            <p className="text-sm text-slate-300">
              Are you sure you want to delete <span className="font-semibold text-white">"{docToDelete.fileName}"</span>? This will permanently remove this material from vector search memory.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteDocument}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-lg shadow-rose-900/30 transition-colors"
              >
                Delete Material
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
