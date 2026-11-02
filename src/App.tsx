import React, { useState, useEffect, useCallback, useRef, Component, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  BookOpen, 
  Trophy, 
  RotateCcw, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Play,
  History,
  TrendingUp,
  LogIn,
  LogOut,
  Send,
  Sparkles,
  MessageSquare,
  Loader2,
  Trash2,
  Eye,
  ArrowRight
} from 'lucide-react';
import { GRADE_1_VOCABULARY, GRADE_5_VOCABULARY, Word } from './constants/vocabulary';
import { getPronunciationFeedback, getDetailedPronunciationAnalysis, generateExamSentences, generateVocabPracticeData, generateTranslationsOnly } from './services/gemini';
import { useSpeech } from './hooks/useSpeech';
import { 
  auth, 
  db, 
  signInWithPopup, 
  googleProvider, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  arrayUnion, 
  arrayRemove,
  handleFirestoreError,
  OperationType,
  query,
  collection,
  orderBy,
  getDocs,
  deleteDoc
} from './firebase';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) errorMessage = `Firebase Error: ${parsed.error}`;
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-red-50">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center space-y-4">
            <AlertCircle className="mx-auto text-red-500" size={48} />
            <h2 className="text-2xl font-bold text-red-900">Oops!</h2>
            <p className="text-red-700">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-500 text-white rounded-full font-bold hover:bg-red-600 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface UserData {
  uid: string;
  email: string;
  totalScore: number;
  dailyScore: number;
  dailyPracticeCount: number;
  allTimePracticeCount: number;
  struggledWords: string[];
  lastSessionDate: string;
  lastPracticeDate: string;
}

interface Exam {
  id: string;
  title: string;
  words: string[];
  createdAt: string;
}

interface VocabList {
  id: string;
  title: string;
  words: string[];
  createdAt: string;
}

interface ExamQuestion {
  word: string;
  sentence: string;
}

const ALLOWED_EMAILS = [
  'zigman.tal@gmail.com',
  'noamzigman7@gmail.com',
  'nirhoffman@gmail.com',
  'danielle.zigman@gmail.com',
  'yafitz583@gmail.com',
  'oshimron@gmail.com'
];

const ADMIN_EMAIL = 'zigman.tal@gmail.com';

function AdminDashboard({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('totalScore', 'desc'));
        const querySnapshot = await getDocs(q);
        const usersData = querySnapshot.docs.map(doc => doc.data() as UserData);
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllUsers();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 py-12"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-black/5 rounded-full">
            <X size={24} />
          </button>
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
        </div>
        <div className="bg-emerald-100 text-emerald-700 px-4 py-1 rounded-full text-sm font-bold">
          {users.length} Users
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-black/20" size={48} />
          </div>
        ) : (
          users.map((u) => (
            <div key={u.uid} className="bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{u.email}</h3>
                  <p className="text-xs text-black/40 font-mono uppercase tracking-widest">ID: {u.uid}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-black/40 uppercase tracking-widest">Total Score</span>
                  <p className="text-2xl font-black text-emerald-600 leading-none">{u.totalScore}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-black/5">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest block">Daily Score</span>
                  <p className="font-bold text-blue-600">{u.dailyScore || 0}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest block">Daily Practice</span>
                  <p className="font-bold text-blue-600">{u.dailyPracticeCount || 0} words</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest block">All-Time Practice</span>
                  <p className="font-bold text-purple-600">{u.allTimePracticeCount || 0} words</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest block">Struggled</span>
                  <p className="font-bold text-red-500">{u.struggledWords?.length || 0} words</p>
                </div>
              </div>

              <div className="text-[10px] text-black/30 flex justify-between pt-2">
                <span>Last Practice: {u.lastPracticeDate || 'Never'}</span>
                <span>Last Session: {u.lastSessionDate ? new Date(u.lastSessionDate).toLocaleDateString() : 'Never'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function BYOSetup({ 
  onStart, 
  onBack, 
  items, 
  onSelectItem,
  onDeleteItem,
  type
}: { 
  onStart: (title: string, words: string) => void, 
  onBack: () => void, 
  items: (Exam | VocabList)[], 
  onSelectItem: (item: any) => void,
  onDeleteItem: (id: string) => void,
  type: 'Exam' | 'Vocab' | 'Words'
}) {
  const [title, setTitle] = useState('');
  const [words, setWords] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewingBank, setViewingBank] = useState<string[] | null>(null);

  const titleText = type === 'Exam' ? 'Build Your Own Exam' : type === 'Words' ? 'BYO Words Practice – Translate' : 'BYO Vocabulary Practice';
  const subText = type === 'Exam' ? 'Create a new exam by giving it a title and a list of words separated by commas.' : type === 'Words' ? 'Create a custom list to practice translating words into Hebrew.' : 'Create a custom vocabulary practice list for 5th grade.';
  const btnText = type === 'Exam' ? 'Generate & Start Exam' : 'Generate & Start Practice';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 py-12"
    >
      <AnimatePresence>
        {viewingBank && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setViewingBank(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">Word Bank</h3>
                <button onClick={() => setViewingBank(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-[60vh] overflow-y-auto pr-2">
                {viewingBank.map((w, i) => (
                  <span key={i} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold border border-emerald-100 italic">
                    {w}
                  </span>
                ))}
              </div>
              <button 
                onClick={() => setViewingBank(null)}
                className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-black/80 transition-all"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-black/5 rounded-full">
          <X size={24} />
        </button>
        <h2 className="text-3xl font-bold tracking-tight">{titleText}</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-xl space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold">New {type === 'Exam' ? 'Exam' : 'List'}</h3>
            <p className="text-sm text-black/40 text-balance">{subText}</p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-black/40 uppercase tracking-widest ml-1">{type === 'Exam' ? 'Exam' : 'List'} Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === 'Exam' ? "e.g., Weekly Vocabulary" : "e.g., Animal Words"}
                className="w-full px-5 py-3.5 bg-black/5 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-black/40 uppercase tracking-widest ml-1">Word List (Comma Separated)</label>
              <textarea 
                value={words}
                onChange={(e) => setWords(e.target.value)}
                placeholder="apple, banana, cherry..."
                rows={4}
                className="w-full px-5 py-3.5 bg-black/5 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium resize-none"
              />
            </div>
          </div>

          <button 
            onClick={() => {
              if (title && words) {
                setLoading(true);
                onStart(title, words);
              }
            }}
            disabled={!title || !words || loading}
            className="w-full bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
            <span>{btnText}</span>
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Previous {type === 'Exam' ? 'Exams' : 'Lists'}</h3>
            <p className="text-sm text-black/40">Choose from an item you've already created.</p>
          </div>

          <div className="grid gap-3">
            {items.length === 0 ? (
              <div className="bg-white p-12 rounded-[2.5rem] border border-black/5 flex flex-col items-center text-center space-y-3 opacity-50">
                <History size={32} />
                <p className="text-sm font-medium italic">No previous {type === 'Exam' ? 'exams' : 'lists'} found.</p>
              </div>
            ) : (
              items.map(item => (
                <div key={item.id} className="relative group">
                  <button 
                    onClick={() => onSelectItem(item)}
                    className="w-full bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between pl-8 pr-28"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{item.title}</h4>
                      <p className="text-[10px] text-black/40 font-bold uppercase tracking-widest">{item.words.length} words • {new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Play size={18} className="text-emerald-500/40 group-hover:text-emerald-600 transition-colors shrink-0" fill="currentColor" />
                  </button>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingBank(item.words);
                      }}
                      className="p-3 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors active:scale-95"
                      title="View Words"
                    >
                      <Eye size={20} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete this ${type.toLowerCase()}?`)) {
                          onDeleteItem(item.id);
                        }
                      }}
                      className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors active:scale-95"
                      title={`Delete ${type}`}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BYOExam({ exam, questions: initialQuestions, onComplete, onBack }: { exam: Exam, questions: ExamQuestion[], onComplete: (score: number, total: number) => void, onBack: () => void }) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [firstTryScore, setFirstTryScore] = useState(0);
  const [hasFailedCurrent, setHasFailedCurrent] = useState(false);
  const [isSummary, setIsSummary] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'testing' | 'correct' | 'wrong'>('testing');
  const [successFeedback, setSuccessFeedback] = useState({ msg: 'Correct!', emoji: '✅' });
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState<{ word: string, correct: boolean }[]>([]);

  const current = questions[index];

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (status !== 'testing') return;

    if (input.trim().toLowerCase() === current.word.toLowerCase()) {
      const emojis = ['🎉', '✨', '🌟', '🏆', '🔥', '👏', '🥳', '🙌'];
      const messages = ['Excellent!', 'Amazing!', 'Great job!', 'Perfect!', 'Well done!', 'You got it!', 'Superb!', 'Fantastic!'];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      setSuccessFeedback({ msg: randomMsg, emoji: randomEmoji });

      setStatus('correct');
      if (!showAnswer) {
        setScore(s => s + 1);
        if (!hasFailedCurrent) {
          setFirstTryScore(s => s + 1);
        }
        setResults([...results, { word: current.word, correct: true }]);
      } else {
        setResults([...results, { word: current.word, correct: false }]);
      }
    } else {
      setStatus('wrong');
      setHasFailedCurrent(true);
    }
  };

  const nextQuestion = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setInput('');
      setStatus('testing');
      setShowAnswer(false);
      setHasFailedCurrent(false);
    } else {
      setIsSummary(true);
    }
  };

  const handleSkip = () => {
    if (status !== 'testing') return;
    
    // Append current question to the end
    const updatedQuestions = [...questions, current];
    setQuestions(updatedQuestions);
    
    // Move to next immediately
    if (index + 1 < updatedQuestions.length) {
      setIndex(index + 1);
      setInput('');
      setStatus('testing');
      setShowAnswer(false);
      setHasFailedCurrent(false);
    }
  };

  const handleContinue = () => {
    setShowAnswer(true);
    setHasFailedCurrent(true);
    setStatus('correct'); // Treat as "done" with this question
    setResults([...results, { word: current.word, correct: false }]);
  };

  if (isSummary) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl mx-auto py-12 text-center space-y-8"
      >
        <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-lg mx-auto mb-8">
          <Trophy size={48} />
        </div>
        
        <div className="space-y-4">
          <h2 className="text-4xl font-bold tracking-tight">Exam Complete!</h2>
          <p className="text-xl text-black/60">
            You got <span className="font-extrabold text-emerald-600">{firstTryScore}</span> / {questions.length} correct on the first try.
          </p>
          <div className="text-sm text-black/40">
            Final Score: {score * 10} points • Overall Correct: {score} of {questions.length}
          </div>
        </div>

        <div className="max-w-md mx-auto bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-black/30 uppercase tracking-[0.2em]">Quick Review</h4>
          <div className="grid grid-cols-2 gap-2">
            {results.map((r, i) => (
              <div key={i} className={`px-3 py-1.5 rounded-xl text-sm font-medium border ${
                r.correct ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
              }`}>
                {r.word} {r.correct ? '✅' : '❌'}
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={() => onComplete(score, questions.length)}
          className="bg-black text-white px-10 py-4 rounded-2xl font-bold hover:bg-black/80 transition-all shadow-xl text-lg inline-flex items-center gap-2"
        >
          <span>Done</span>
          <CheckCircle2 size={20} />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto py-12 space-y-12"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-black/5 rounded-full">
            <X size={24} />
          </button>
          <div>
            <h3 className="font-bold text-xl">{exam.title}</h3>
            <p className="text-xs font-bold text-black/40 uppercase tracking-widest">Question {index + 1} of {questions.length}</p>
          </div>
        </div>
        <div className="bg-emerald-100 px-6 py-2 rounded-full text-emerald-700 font-bold text-lg">
          Score: {score}
        </div>
      </div>

      <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-black/5 space-y-12 relative overflow-hidden">
        <div className="space-y-8 text-center">
          <h2 className="text-4xl font-bold leading-relaxed tracking-tight text-emerald-950">
            {current.sentence.split('____').map((part, i, arr) => (
              <React.Fragment key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className="inline-block min-w-[120px] border-b-4 border-emerald-500 mx-2 text-emerald-600">
                    {status === 'correct' || showAnswer ? current.word : '____'}
                  </span>
                )}
              </React.Fragment>
            ))}
          </h2>
          
          <div className="flex flex-wrap justify-center gap-2">
            <p className="w-full text-xs font-bold text-black/30 uppercase tracking-[0.2em] mb-2">Word Bank</p>
            {exam.words.map(w => {
              const result = results.find(r => r.word === w);
              return (
                <span 
                  key={w} 
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center gap-2 ${
                    current.word === w ? 'bg-emerald-500 text-white border-emerald-600 scale-110 shadow-lg z-10' :
                    result?.correct ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    result && !result.correct ? 'bg-red-50 text-red-600 border-red-100' :
                    'bg-black/5 text-black/60 border-transparent opacity-60'
                  }`}
                >
                  {w} {result?.correct && '✅'} {result && !result.correct && '❌'}
                </span>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
          <div className="space-y-4">
            <input 
              autoFocus
              disabled={status === 'correct'}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type the missing word..."
              className={`w-full px-8 py-5 rounded-2xl text-center text-2xl font-bold focus:ring-4 transition-all outline-none ${
                status === 'correct' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 ring-emerald-100' :
                status === 'wrong' ? 'bg-red-50 border-red-200 text-red-600 ring-red-100' :
                'bg-black/5 border-transparent focus:bg-white focus:border-emerald-500/20 ring-emerald-500/10'
              }`}
            />
            
            <AnimatePresence mode="wait">
              {status === 'correct' ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
                  <p className="text-emerald-600 font-black text-2xl flex items-center gap-3 animate-bounce">
                    {successFeedback.emoji} {successFeedback.msg}
                  </p>
                  <button 
                    onClick={nextQuestion}
                    className="w-full bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-100"
                  >
                    Next Sentence
                  </button>
                </motion.div>
              ) : status === 'wrong' ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                  <p className="text-red-600 font-bold text-center">❌ Not quite right.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setStatus('testing')}
                      className="px-6 py-3 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-all"
                    >
                      Try Again
                    </button>
                    <button 
                      onClick={handleContinue}
                      className="px-6 py-3 bg-black/5 text-black/60 rounded-xl font-bold hover:bg-black/10 transition-all"
                    >
                      Continue
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-5 gap-3">
                  <button 
                    type="submit"
                    className="col-span-4 bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-black/80 transition-all shadow-xl"
                  >
                    Submit Answer
                  </button>
                  <button 
                    type="button"
                    onClick={handleSkip}
                    className="col-span-1 bg-black/5 text-black/40 px-4 py-4 rounded-2xl font-bold hover:bg-black/10 transition-all flex items-center justify-center"
                    title="Skip for later"
                  >
                    <ArrowRight size={20} />
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </form>

        {showAnswer && status === 'correct' && (
          <div className="text-center bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <p className="text-blue-700 font-medium">The correct word was: <span className="font-bold">{current.word}</span></p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function BYOWords({ 
  vocabList, 
  words: initialWords, 
  onComplete, 
  onBack,
  speak
}: { 
  vocabList: VocabList, 
  words: Word[], 
  onComplete: (score: number, total: number) => void, 
  onBack: () => void,
  speak: (text: string) => void
}) {
  const [words, setWords] = useState(initialWords);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [firstTryScore, setFirstTryScore] = useState(0);
  const [hasFailedCurrent, setHasFailedCurrent] = useState(false);
  const [isSummary, setIsSummary] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'testing' | 'correct' | 'wrong'>('testing');
  const [successFeedback, setSuccessFeedback] = useState({ msg: 'Correct!', emoji: '✅' });
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState<{ word: string, correct: boolean }[]>([]);
  const [consecutiveFailedCount, setConsecutiveFailedCount] = useState(0);
  const [showSolutionPopup, setShowSolutionPopup] = useState(false);

  const current = words[index];

  // Auto-speak English word on load
  useEffect(() => {
    if (current && status === 'testing') {
      speak(current.word);
    }
  }, [index, current]);

  const cleanHebrew = (str: string) => str.trim().toLowerCase()
    .replace(/[\u0591-\u05C7]/g, "") // remove Niqqud
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "") // remove punctuation
    .replace(/\s+/g, " ");

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (status !== 'testing') return;

    const userInput = cleanHebrew(input);
    const targetInput = cleanHebrew(current.translation);

    // split matching so we can match any option separated by comma/slash/semicolon
    const isCorrect = targetInput.split(/[,;|\/]/).some(opt => cleanHebrew(opt) === userInput) || userInput === targetInput;

    if (isCorrect) {
      const emojis = ['🎉', '✨', '🌟', '🏆', '🔥', '👏', '🥳', '🙌'];
      const messages = ['Excellent!', 'Amazing!', 'Great job!', 'Perfect!', 'Well done!', 'You got it!', 'Superb!', 'Fantastic!'];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      setSuccessFeedback({ msg: randomMsg, emoji: randomEmoji });

      setStatus('correct');
      setConsecutiveFailedCount(0);
      if (!showAnswer) {
        setScore(s => s + 1);
        if (!hasFailedCurrent) {
          setFirstTryScore(s => s + 1);
        }
        setResults([...results, { word: current.word, correct: true }]);
      } else {
        setResults([...results, { word: current.word, correct: false }]);
      }
    } else {
      setStatus('wrong');
      setHasFailedCurrent(true);
      setConsecutiveFailedCount(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (index + 1 < words.length) {
      setIndex(index + 1);
      setInput('');
      setStatus('testing');
      setShowAnswer(false);
      setHasFailedCurrent(false);
      setConsecutiveFailedCount(0);
    } else {
      setIsSummary(true);
    }
  };

  const handleSkip = () => {
    if (status !== 'testing') return;
    
    // Append current word to the end
    const updatedWords = [...words, current];
    setWords(updatedWords);
    
    // Move to next immediately
    if (index + 1 < updatedWords.length) {
      setIndex(index + 1);
      setInput('');
      setStatus('testing');
      setShowAnswer(false);
      setHasFailedCurrent(false);
      setConsecutiveFailedCount(0);
    }
  };

  const handleContinue = () => {
    setShowAnswer(true);
    setHasFailedCurrent(true);
    setStatus('correct'); // Treat as "done" with this word
    setResults([...results, { word: current.word, correct: false }]);
    setConsecutiveFailedCount(0);
  };

  if (isSummary) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl mx-auto py-12 text-center space-y-8"
      >
        <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-lg mx-auto mb-8">
          <Trophy size={48} />
        </div>
        
        <div className="space-y-4">
          <h2 className="text-4xl font-bold tracking-tight">Practice Complete!</h2>
          <p className="text-xl text-black/60">
            You got <span className="font-extrabold text-emerald-600">{firstTryScore}</span> / {initialWords.length} correct on the first try.
          </p>
          <div className="text-sm text-black/40">
            Final Score: {score * 10} points • Overall Correct: {score} of {initialWords.length}
          </div>
        </div>

        <div className="max-w-md mx-auto bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-black/30 uppercase tracking-[0.2em]">Quick Review</h4>
          <div className="grid grid-cols-2 gap-2">
            {initialWords.map((wordObj) => {
              const res = results.find(r => r.word === wordObj.word);
              return (
                <div key={wordObj.word} className={`px-3 py-1.5 rounded-xl text-sm font-medium border flex flex-col items-center justify-center ${
                  res?.correct ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
                }`}>
                  <span className="font-bold">{wordObj.word}</span>
                  <span className="text-xs opacity-75">{wordObj.translation}</span>
                </div>
              );
            })}
          </div>
        </div>

        <button 
          onClick={() => onComplete(score, initialWords.length)}
          className="bg-black text-white px-10 py-4 rounded-2xl font-bold hover:bg-black/80 transition-all shadow-xl text-lg inline-flex items-center gap-2"
        >
          <span>Done</span>
          <CheckCircle2 size={20} />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto py-12 space-y-12"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-black/5 rounded-full">
            <X size={24} />
          </button>
          <div>
            <h3 className="font-bold text-xl">{vocabList.title}</h3>
            <p className="text-xs font-bold text-black/40 uppercase tracking-widest">Question {index + 1} of {words.length}</p>
          </div>
        </div>
        <div className="bg-emerald-100 px-6 py-2 rounded-full text-emerald-700 font-bold text-lg">
          Score: {score}
        </div>
      </div>

      <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-black/5 space-y-12 relative overflow-hidden">
        <div className="space-y-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <p className="text-xs font-black text-black/30 uppercase tracking-[0.25em]">Listen and Translate</p>
            
            <button 
              onClick={() => speak(current.word)}
              className="w-20 h-20 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center transition-all animate-pulse hover:scale-105 active:scale-95 shadow-md border border-indigo-100"
              title="Listen again"
            >
              <Volume2 size={36} />
            </button>
            
            <h2 className="text-4xl font-extrabold tracking-tight text-indigo-950 uppercase">
              {current.word}
            </h2>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            <p className="w-full text-xs font-bold text-black/30 uppercase tracking-[0.2em] mb-2">Word Bank</p>
            {vocabList.words.map(w => {
              const result = results.find(r => r.word === w);
              return (
                <span 
                  key={w} 
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center gap-2 ${
                    current.word === w ? 'bg-indigo-500 text-white border-indigo-600 scale-110 shadow-lg z-10' :
                    result?.correct ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    result && !result.correct ? 'bg-red-50 text-red-600 border-red-100' :
                    'bg-black/5 text-black/60 border-transparent opacity-60'
                  }`}
                >
                  {w} {result?.correct && '✅'} {result && !result.correct && '❌'}
                </span>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
          <div className="space-y-4">
            <input 
              autoFocus
              disabled={status === 'correct'}
              type="text"
              dir="rtl"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="הקלד תרגום לעברית..."
              className={`w-full px-8 py-5 rounded-2xl text-center text-2xl font-bold focus:ring-4 transition-all outline-none ${
                status === 'correct' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 ring-emerald-100' :
                status === 'wrong' ? 'bg-red-50 border-red-200 text-red-600 ring-red-100' :
                'bg-black/5 border-transparent focus:bg-white focus:border-indigo-500/20 ring-indigo-500/10'
              }`}
            />
            
            <AnimatePresence mode="wait">
              {status === 'correct' ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
                  <p className="text-emerald-600 font-black text-2xl flex items-center gap-3 animate-bounce">
                    {successFeedback.emoji} {successFeedback.msg}
                  </p>
                  <button 
                    onClick={nextQuestion}
                    className="w-full bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-100"
                  >
                    Next Word
                  </button>
                </motion.div>
              ) : status === 'wrong' ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                  <p className="text-red-600 font-bold text-center">❌ Not quite right.</p>

                  {consecutiveFailedCount >= 3 && (
                    <motion.button 
                      type="button"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setShowSolutionPopup(true)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white px-6 py-3.5 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 animate-bounce"
                    >
                      <Sparkles size={18} />
                      <span>Reveal Solution (3+ Strikes)</span>
                    </motion.button>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setStatus('testing')}
                      className="px-6 py-3 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-all"
                    >
                      Try Again
                    </button>
                    <button 
                      onClick={handleContinue}
                      className="px-6 py-3 bg-black/5 text-black/60 rounded-xl font-bold hover:bg-black/10 transition-all"
                    >
                      Continue
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-5 gap-3">
                  <button 
                    type="submit"
                    className="col-span-4 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-750 transition-all shadow-xl shadow-indigo-100 hover:shadow-indigo-200"
                  >
                    Submit Translation
                  </button>
                  <button 
                    type="button"
                    onClick={handleSkip}
                    className="col-span-1 bg-black/5 text-black/40 px-4 py-4 rounded-2xl font-bold hover:bg-black/10 transition-all flex items-center justify-center active:scale-95"
                    title="Skip for later"
                  >
                    <ArrowRight size={20} />
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </form>

        {showAnswer && status === 'correct' && (
          <div className="text-center bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <p className="text-blue-700 font-medium">The correct translation was: <span className="font-bold">{current.translation}</span></p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSolutionPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white rounded-[2.5rem] max-w-md w-full p-8 text-center space-y-6 shadow-2xl border border-black/5 relative"
            >
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto animate-bounce">
                <Sparkles size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-black tracking-tight">Solution Revealed</h3>
                <p className="text-black/50 text-sm">Here is the correct Hebrew translation for:</p>
                <div className="text-xl font-bold uppercase tracking-wide text-indigo-950 mt-1">{current.word}</div>
              </div>

              <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100/50 flex flex-col items-center gap-2">
                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Translation</span>
                <span className="text-4xl font-black text-indigo-700 select-all" dir="rtl">
                  {current.translation}
                </span>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSolutionPopup(false);
                    handleContinue();
                  }}
                  className="w-full bg-indigo-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-indigo-770 transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
                >
                  <CheckCircle2 size={16} />
                  <span>I understand (Next)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSolutionPopup(false);
                  }}
                  className="w-full bg-black/5 text-black/60 px-6 py-3 rounded-xl font-bold hover:bg-black/10 transition-all text-xs"
                >
                  Let me write it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [level, setLevel] = useState<'1st' | '5th' | 'byo' | 'byo-vocab' | 'byo-words' | null>(null);
  const [view, setView] = useState<'home' | 'learning' | 'stats' | 'admin' | 'byo-setup' | 'byo-exam' | 'byo-vocab-setup' | 'byo-words-setup' | 'byo-words' | 'practice-summary'>('home');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // BYO Exam States
  const [exams, setExams] = useState<Exam[]>([]);
  const [vocabLists, setVocabLists] = useState<VocabList[]>([]);
  const [byoTitle, setByoTitle] = useState('');
  const [byoWords, setByoWords] = useState('');
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [currentVocabList, setCurrentVocabList] = useState<VocabList | null>(null);
  const [byoVocabCurrentWords, setByoVocabCurrentWords] = useState<Word[]>([]);
  const [practiceResults, setPracticeResults] = useState<{ word: string, correct: boolean }[]>([]);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [currentExamIndex, setCurrentExamIndex] = useState(0);
  const [examScore, setExamScore] = useState(0);
  const [examStatus, setExamStatus] = useState<'testing' | 'correct' | 'wrong' | 'summary'>('testing');
  const [examInput, setExamInput] = useState('');
  const [showRevealedAnswer, setShowRevealedAnswer] = useState(false);
  const [examLoading, setExamLoading] = useState(false);

  const [sessionScore, setSessionScore] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [lastFeedback, setLastFeedback] = useState<{ text: string, type: 'success' | 'error' | 'info', analysis?: any } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [customWord, setCustomWord] = useState('');
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const { isListening, speak, listen, transcript: hookTranscript } = useSpeech();

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email && ALLOWED_EMAILS.includes(currentUser.email)) {
        setUser(currentUser);
        setLoginError(null);
        await fetchUserData(currentUser.uid, currentUser.email);
        await fetchExams(currentUser.uid);
        await fetchVocabLists(currentUser.uid);
      } else if (currentUser) {
        // Logged in but not allowed
        await signOut(auth);
        setUser(null);
        setUserData(null);
        setLoginError("Sorry, this email is not authorized to access English Buddy.");
      } else {
        setUser(null);
        setUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserData = async (uid: string, email: string) => {
    const path = `users/${uid}`;
    const today = new Date().toISOString().split('T')[0];
    try {
      const userDoc = doc(db, 'users', uid);
      const docSnap = await getDoc(userDoc);

      if (docSnap.exists()) {
        let data = docSnap.data() as UserData;
        if (data.lastPracticeDate !== today) {
          // Reset daily stats and ensure all-time count exists
          const allTimeCount = data.allTimePracticeCount ?? Math.floor((data.totalScore || 0) / 10);
          const updatedData = {
            ...data,
            dailyScore: 0,
            dailyPracticeCount: 0,
            allTimePracticeCount: allTimeCount,
            lastPracticeDate: today
          };
          await updateDoc(userDoc, {
            dailyScore: 0,
            dailyPracticeCount: 0,
            allTimePracticeCount: allTimeCount,
            lastPracticeDate: today
          });
          setUserData(updatedData);
        } else {
          setUserData(data);
        }
      } else {
        const newData: UserData = {
          uid,
          email,
          totalScore: 0,
          dailyScore: 0,
          dailyPracticeCount: 0,
          allTimePracticeCount: 0,
          struggledWords: [],
          lastSessionDate: new Date().toISOString(),
          lastPracticeDate: today
        };
        await setDoc(userDoc, newData);
        setUserData(newData);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  };

  const fetchExams = async (uid: string) => {
    try {
      const q = query(collection(db, 'users', uid, 'exams'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const examsData = querySnapshot.docs.map(doc => doc.data() as Exam);
      setExams(examsData);
    } catch (error) {
      console.error("Error fetching exams:", error);
    }
  };

  const fetchVocabLists = async (uid: string) => {
    try {
      const q = query(collection(db, 'users', uid, 'vocabLists'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const lists = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VocabList));
      setVocabLists(lists);
    } catch (error) {
      console.error("Error fetching vocab lists:", error);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('home');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const startSession = (selectedLevel: '1st' | '5th' | 'byo-vocab', customWords?: Word[]) => {
    setLevel(selectedLevel);
    setPracticeResults([]);
    if (selectedLevel === 'byo-vocab' && customWords) {
      setByoVocabCurrentWords(customWords);
    }
    const baseVocab = selectedLevel === '1st' ? GRADE_1_VOCABULARY : GRADE_5_VOCABULARY;
    
    // Truly random shuffle of the entire vocabulary
    const selected = customWords ? [...customWords].sort(() => Math.random() - 0.5) : [...baseVocab].sort(() => Math.random() - 0.5);
    
    setSessionWords(selected);
    setCurrentWordIndex(0);
    setSessionScore(0);
    setAttempts(0);
    setLastFeedback(null);
    setView('learning');
    
    const firstWord = selected[0];
    if (selectedLevel === '1st') {
      speak(`Let's start! The first word is: ${firstWord.word}. Please repeat it.`);
    } else {
      speak(`Let's start! The first sentence is: ${firstWord.example}. Please repeat the whole sentence.`);
    }
  };

  const startBYOSetup = () => {
    setView('byo-setup');
  };

  const handleStartBYOExam = async (title: string, wordList: string) => {
    const words = wordList.split(',').map(w => w.trim()).filter(w => w.length > 0);
    if (!user || words.length === 0) return;

    try {
      const examId = Math.random().toString(36).substring(7);
      const newExam: Exam = {
        id: examId,
        title,
        words,
        createdAt: new Date().toISOString()
      };

      // Save to Firestore
      await setDoc(doc(db, 'users', user.uid, 'exams', examId), newExam);
      setExams([newExam, ...exams]);

      // Generate Questions
      const questions = await generateExamSentences(words);
      const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);
      
      setCurrentExam(newExam);
      setExamQuestions(shuffledQuestions);
      setCurrentExamIndex(0);
      setExamScore(0);
      setExamStatus('testing');
      setExamInput('');
      setShowRevealedAnswer(false);
      setView('byo-exam');
    } catch (error) {
      console.error("Error starting BYO exam:", error);
    }
  };

  const handleSelectExam = async (exam: Exam) => {
    try {
      setExamLoading(true);
      const questions = await generateExamSentences(exam.words);
      const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);
      
      setCurrentExam(exam);
      setExamQuestions(shuffledQuestions);
      setCurrentExamIndex(0);
      setExamScore(0);
      setExamStatus('testing');
      setExamInput('');
      setShowRevealedAnswer(false);
      setView('byo-exam');
    } catch (error) {
      console.error("Error selecting exam:", error);
    } finally {
      setExamLoading(false);
    }
  };

  const handleStartBYOVocab = async (title: string, wordList: string) => {
    const words = wordList.split(',').map(w => w.trim()).filter(w => w.length > 0);
    if (!user || words.length === 0) return;

    try {
      const listId = Math.random().toString(36).substring(7);
      const newList: VocabList = {
        id: listId,
        title,
        words,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid, 'vocabLists', listId), newList);
      setVocabLists([newList, ...vocabLists]);

      setIsProcessing(true);
      const vocabData = await generateVocabPracticeData(words);
      setCurrentVocabList(newList);
      startSession('byo-vocab', vocabData);
      setIsProcessing(false);
    } catch (error) {
      console.error("Error starting BYO vocab:", error);
      setIsProcessing(false);
    }
  };

  const handleSelectVocabList = async (list: VocabList) => {
    if (!user) return;
    try {
      setIsProcessing(true);
      const vocabData = await generateVocabPracticeData(list.words);
      setCurrentVocabList(list);
      startSession('byo-vocab', vocabData);
      setIsProcessing(false);
    } catch (error) {
      console.error("Error selecting vocab list:", error);
      setIsProcessing(false);
    }
  };

  const handleStartBYOWords = async (title: string, wordList: string) => {
    const words = wordList.split(',').map(w => w.trim()).filter(w => w.length > 0);
    if (!user || words.length === 0) return;

    try {
      const listId = Math.random().toString(36).substring(7);
      const newList: VocabList = {
        id: listId,
        title,
        words,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid, 'vocabLists', listId), newList);
      setVocabLists([newList, ...vocabLists]);

      setIsProcessing(true);
      const vocabData = await generateTranslationsOnly(words);
      const shuffledData = [...vocabData].sort(() => Math.random() - 0.5);
      setCurrentVocabList(newList);
      setByoVocabCurrentWords(shuffledData);
      setView('byo-words');
      setIsProcessing(false);
    } catch (error) {
      console.error("Error starting BYO words:", error);
      setIsProcessing(false);
    }
  };

  const handleSelectWordsList = async (list: VocabList) => {
    if (!user) return;
    try {
      setIsProcessing(true);
      const vocabData = await generateTranslationsOnly(list.words);
      const shuffledData = [...vocabData].sort(() => Math.random() - 0.5);
      setCurrentVocabList(list);
      setByoVocabCurrentWords(shuffledData);
      setView('byo-words');
      setIsProcessing(false);
    } catch (error) {
      console.error("Error selecting words list:", error);
      setIsProcessing(false);
    }
  };

  const handleDeleteVocabList = async (listId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'vocabLists', listId));
      setVocabLists(prev => prev.filter(l => l.id !== listId));
    } catch (error) {
      console.error("Error deleting vocab list:", error);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'exams', examId));
      setExams(prev => prev.filter(e => e.id !== examId));
    } catch (error) {
      console.error("Error deleting exam:", error);
    }
  };

  const skipWord = () => {
    const currentWord = sessionWords[currentWordIndex];
    setPracticeResults(prev => [...prev, { word: currentWord.word, correct: false }]);
    
    if (level === 'byo-vocab') {
      const updatedSession = [...sessionWords, currentWord];
      setSessionWords(updatedSession);
      
      // Move to next
      const nextWord = updatedSession[currentWordIndex + 1];
      if (nextWord) {
        setCurrentWordIndex(currentWordIndex + 1);
        setAttempts(0);
        setLastFeedback(null);
        speak(`Skipped for now! Next sentence is: ${nextWord.example}. Please repeat it.`);
      } else {
        // Technically this shouldn't happen because we just appended, but safe check
        setView('practice-summary');
      }
      return;
    }

    const nextIndex = currentWordIndex + 1;
    if (nextIndex < sessionWords.length) {
      setCurrentWordIndex(nextIndex);
      setAttempts(0);
      setLastFeedback(null);
      const nextWord = sessionWords[nextIndex];
      if (level === '1st') {
        speak(`Skipped! Next word is: ${nextWord.word}. Say: ${nextWord.word}`);
      } else {
        speak(`Skipped! Next sentence is: ${nextWord.example}. Please repeat it.`);
      }
    } else {
      // If we reach the end, reshuffle and continue
      let reshuffled: Word[] = [];
      const baseVocab = level === '1st' ? GRADE_1_VOCABULARY : GRADE_5_VOCABULARY;
      reshuffled = [...baseVocab].sort(() => Math.random() - 0.5);
      
      setSessionWords(reshuffled);
      setCurrentWordIndex(0);
      setAttempts(0);
      setLastFeedback(null);
      const firstWord = reshuffled[0];
      if (level === '1st') {
        speak(`Reshuffling! Next word is: ${firstWord.word}. Say: ${firstWord.word}`);
      } else {
        speak(`Reshuffling! Next sentence is: ${firstWord.example}. Please repeat it.`);
      }
    }
  };

  const handleCustomWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customWord.trim()) return;
    
    const newWord: Word = {
      word: customWord.trim().toLowerCase(),
      translation: "Custom Word",
      category: "Custom",
      example: `Let's practice the word ${customWord}`,
      exampleTranslation: `בואו נתרגל את המילה ${customWord}`
    };
    
    setSessionWords(prev => [newWord, ...prev]);
    setCurrentWordIndex(0);
    setAttempts(0);
    setLastFeedback(null);
    setCustomWord('');
    // Custom words default to sentence practice if they have one, but here we'll use the word for simplicity or sentence if it's 5th grade style
    speak(`Okay, let's practice your word: ${newWord.word}. Repeat after me: ${newWord.word}`);
  };

  const handlePronunciation = async () => {
    if (isProcessing || isListening) return;
    
    setLastFeedback(null);
    setLastTranscript(null);
    
    try {
      const spoken = await listen();
      if (!spoken) {
        setLastFeedback({ text: "I didn't hear anything. Try again!", type: 'info' });
        speak("I didn't hear anything. Try again!");
        return;
      }
      
      setLastTranscript(spoken);
      setIsProcessing(true);
      
      const currentWord = sessionWords[currentWordIndex];
      const targetText = level === '1st' ? currentWord.word : currentWord.example;
      const result = await getPronunciationFeedback(targetText, spoken, attempts >= 2, level || '5th');
      
      if (result.isCorrect) {
        const successEmojis = ["✨", "🌟", "🎉", "👏", "🔥", "🚀", "🌈", "🎈", "🎊", "🥳"];
        const randomEmoji = successEmojis[Math.floor(Math.random() * successEmojis.length)];
        
        const successPhrases = [
          "Excellent! You said it perfectly!",
          "Great job! That was spot on!",
          "Amazing! You're doing great!",
          "Fantastic! Keep it up!",
          "Wonderful! You're a pro!",
          "Brilliant! Perfect pronunciation!",
          "Superb! You nailed it!",
          "Awesome! That was clear and correct!"
        ];
        const randomPhrase = successPhrases[Math.floor(Math.random() * successPhrases.length)];

        setSessionScore(s => s + 10);
        setLastFeedback({ 
          text: `${randomPhrase} ${randomEmoji}`, 
          type: 'success' 
        });
        setAttempts(0);
        setPracticeResults(prev => [...prev, { word: currentWord.word, correct: true }]);
        
        // Remove from struggled words if it was there
        if (userData && user) {
          const path = `users/${user.uid}`;
          try {
            await updateDoc(doc(db, 'users', user.uid), {
              struggledWords: arrayRemove(currentWord.word),
              totalScore: increment(10),
              dailyScore: increment(10),
              dailyPracticeCount: increment(1),
              allTimePracticeCount: increment(1),
              lastSessionDate: new Date().toISOString()
            });
            setUserData(prev => prev ? {
              ...prev,
              totalScore: prev.totalScore + 10,
              dailyScore: (prev.dailyScore || 0) + 10,
              dailyPracticeCount: (prev.dailyPracticeCount || 0) + 1,
              allTimePracticeCount: (prev.allTimePracticeCount || 0) + 1,
              struggledWords: prev.struggledWords.filter(w => w !== currentWord.word),
              lastSessionDate: new Date().toISOString()
            } : null);
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, path);
          }
        }

        // Move to next word after a short delay
        setTimeout(() => {
          const nextIndex = currentWordIndex + 1;
          if (nextIndex < sessionWords.length) {
            setCurrentWordIndex(nextIndex);
            setLastFeedback(null);
            const nextWord = sessionWords[nextIndex];
            if (level === '1st') {
              speak(`${randomPhrase} Next word is: ${nextWord.word}. Say: ${nextWord.word}`);
            } else {
              speak(`${randomPhrase} Next sentence is: ${nextWord.example}. Please repeat it.`);
            }
          } else {
            if (level === 'byo-vocab') {
              setView('practice-summary');
              return;
            }
            
            // If we reach the end, reshuffle and continue
            let reshuffled: Word[] = [];
            const baseVocab = level === '1st' ? GRADE_1_VOCABULARY : GRADE_5_VOCABULARY;
            reshuffled = [...baseVocab].sort(() => Math.random() - 0.5);
            
            setSessionWords(reshuffled);
            setCurrentWordIndex(0);
            setLastFeedback(null);
            const firstWord = reshuffled[0];
            if (level === '1st') {
              speak(`${randomPhrase} Reshuffling! Next word is: ${firstWord.word}. Say: ${firstWord.word}`);
            } else {
              speak(`${randomPhrase} Reshuffling! Next sentence is: ${firstWord.example}. Please repeat it.`);
            }
          }
        }, 2000);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          const targetText = level === '1st' ? currentWord.word : currentWord.example;
          const analysis = await getDetailedPronunciationAnalysis(targetText, spoken, level || '5th');
          setLastFeedback({ 
            text: level === '1st' ? "בוא נראה איך להגיד את זה טוב יותר..." : "Let's practice this sentence together...", 
            type: 'info',
            analysis 
          });
          
          // Add to struggled words
          if (userData && user && !userData.struggledWords.includes(currentWord.word)) {
            const path = `users/${user.uid}`;
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                struggledWords: arrayUnion(currentWord.word)
              });
              setUserData(prev => prev ? {
                ...prev,
                struggledWords: [...prev.struggledWords, currentWord.word]
              } : null);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, path);
            }
          }

          if (level === '1st') {
            speak("Together!");
          } else {
            // User requested to keep only written Hebrew explanation and no verbal English explanation
            // We speak nothing or just a very brief cue
          }
        } else {
          setLastFeedback({ text: result.feedback, type: 'error' });
          // Only speak if feedback is in English (not for 1st grade Hebrew feedback)
          if (level !== '1st') {
            speak(result.feedback);
          } else {
            speak("Try again!");
          }
        }
      }
    } catch (error: any) {
      console.error(error);
      if (error === 'no-speech') {
        setLastFeedback({ text: "I didn't hear anything. Try again!", type: 'info' });
        speak("I didn't hear anything. Try again!");
      } else if (error === 'not-allowed') {
        setLastFeedback({ text: "Microphone access denied. Please check your settings.", type: 'error' });
      } else {
        setLastFeedback({ text: "Something went wrong. Let's try again!", type: 'error' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const endSession = () => {
    speak("Great job today! You finished your session. See you next time!");
    setView('home');
    setLevel(null);
  };

  if (!user) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-[#FDFCF0] text-[#141414] font-sans selection:bg-emerald-200 flex flex-col items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-2xl border border-black/5 text-center space-y-8"
          >
            <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white shadow-lg shadow-emerald-100 mx-auto">
              <BookOpen size={48} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">English Buddy</h1>
              <p className="text-black/60">Your personal AI English tutor</p>
            </div>

            {loginError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm font-medium">
                {loginError}
              </div>
            )}

            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-100 text-lg"
            >
              <LogIn size={24} />
              <span>Sign in with Google</span>
            </button>

            <p className="text-xs text-black/40">
              Only authorized students can access this application.
            </p>
          </motion.div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FDFCF0] text-[#141414] font-sans selection:bg-emerald-200">
      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b border-black/5">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-sm">
            <BookOpen size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">English Buddy</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {user?.email === ADMIN_EMAIL && (
            <button 
              onClick={() => setView('admin')}
              className="p-2 hover:bg-black/5 rounded-full transition-colors text-emerald-600"
              title="Admin Dashboard"
            >
              <Trophy size={20} />
            </button>
          )}
          <button 
            onClick={() => setView('stats')}
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
            title="Progress"
          >
            <TrendingUp size={20} />
          </button>
          <div className="flex items-center gap-2 bg-white border border-black/5 px-3 py-1.5 rounded-full shadow-sm">
            <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
            <span className="text-sm font-medium hidden sm:inline">{user.displayName}</span>
            <button onClick={handleLogout} className="p-1 hover:text-red-500 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <AnimatePresence>
          {isProcessing && (view === 'byo-words-setup' || view === 'byo-vocab-setup' || view === 'byo-setup' || view === 'byo-exam') && (
            <motion.div 
              key="byo-loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-white/70 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 space-y-6"
            >
              <div className="w-20 h-20 bg-indigo-50 text-indigo-650 rounded-[2.5rem] flex items-center justify-center shadow-lg border border-indigo-100 animate-pulse">
                <Loader2 className="animate-spin" size={36} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold tracking-tight text-indigo-950">Buddy is loading... 🪄</h3>
                <p className="text-black/55 text-sm max-w-xs font-medium">Preparing practice components and translating words.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 py-12"
            >
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-bold tracking-tight">Hi Buddy! 👋</h2>
                <p className="text-xl text-black/60">Ready to learn some new words today?</p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <button 
                  onClick={() => startSession('1st')}
                  className="group p-8 bg-white border-4 border-blue-400 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto group-hover:rotate-12 transition-transform">
                    <Play size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-blue-600">1st Grade</h3>
                    <p className="text-black/50">Simple words for beginners!</p>
                  </div>
                </button>

                <button 
                  onClick={() => startSession('5th')}
                  className="group p-8 bg-white border-4 border-emerald-500 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto group-hover:rotate-12 transition-transform">
                    <Mic size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-emerald-600">5th Grade</h3>
                    <p className="text-black/50">Expand your vocabulary!</p>
                  </div>
                </button>

                <button 
                  onClick={startBYOSetup}
                  className="group p-8 bg-white border-4 border-purple-500 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto group-hover:rotate-12 transition-transform">
                    <Sparkles size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-purple-600">BYO Exam</h3>
                    <p className="text-black/50">Custom quiz!</p>
                  </div>
                </button>

                <button 
                  onClick={() => setView('byo-vocab-setup')}
                  className="group p-8 bg-white border-4 border-orange-500 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto group-hover:rotate-12 transition-transform">
                    <BookOpen size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-orange-600">BYO Vocab</h3>
                    <p className="text-black/50">Practice any words!</p>
                  </div>
                </button>

                <button 
                  onClick={() => setView('byo-words-setup')}
                  className="group p-8 bg-white border-4 border-indigo-500 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 text-center space-y-4 lg:col-span-1 sm:col-span-2 lg:col-start-auto"
                >
                  <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto group-hover:rotate-12 transition-transform">
                    <Volume2 size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-indigo-600">BYO Words</h3>
                    <p className="text-black/50">Translate words to Hebrew!</p>
                  </div>
                </button>
              </div>

              {userData && userData.struggledWords.length > 0 && (
                <div className="bg-orange-50 border border-orange-100 rounded-3xl p-6 space-y-4 max-w-2xl mx-auto">
                  <h4 className="font-bold flex items-center gap-2 text-orange-800">
                    <RotateCcw size={18} /> Words to practice again:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {userData.struggledWords.map(word => (
                      <span key={word} className="px-3 py-1 bg-white border border-orange-200 rounded-full text-sm font-medium text-orange-700">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'learning' && sessionWords.length > 0 && (
            <motion.div 
              key="learning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto flex flex-col h-[85vh]"
            >
              <div className="flex justify-between items-center p-4">
                <button onClick={() => setView('home')} className="p-2 hover:bg-black/5 rounded-full">
                  <X size={24} />
                </button>
                <div className="text-center">
                  <span className="text-xs font-bold text-black/40 uppercase tracking-widest">
                    {level === 'byo-vocab' ? 'Custom' : level} Grade
                  </span>
                  <h3 className="font-bold text-emerald-600">Vocabulary Practice</h3>
                </div>
                <div className="flex items-center gap-2 bg-emerald-100 px-4 py-1 rounded-full text-emerald-700 font-bold">
                  <Trophy size={18} /> {sessionScore}
                </div>
              </div>

              <div className="px-4 py-2 flex items-center gap-2">
                <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: `${((currentWordIndex + 1) / sessionWords.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-black/40">{currentWordIndex + 1}/{sessionWords.length}</span>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
                <motion.div 
                  key={sessionWords[currentWordIndex].word}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-7xl font-bold tracking-tight text-emerald-600">
                      {sessionWords[currentWordIndex].word}
                    </h2>
                    <p className="text-3xl font-medium text-black/40" dir="rtl">
                      {level === '1st' ? sessionWords[currentWordIndex].translation : sessionWords[currentWordIndex].exampleTranslation}
                    </p>
                  </div>
                  
                  <div className="bg-white border border-black/5 p-6 rounded-3xl shadow-sm max-w-md mx-auto italic text-lg text-black/60">
                    "{sessionWords[currentWordIndex].example}"
                  </div>

                  {level === 'byo-vocab' && (currentVocabList || sessionWords.length > 0) && (
                    <div className="w-full max-w-lg mx-auto bg-black/5 p-4 rounded-3xl space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">
                          Word Bank
                        </p>
                        <p className="text-[10px] font-bold text-emerald-600/60 uppercase">
                          {currentVocabList?.title || 'Custom List'}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {(currentVocabList?.words || Array.from(new Set(sessionWords.map(s => s.word)))).map(w => (
                          <span 
                            key={w} 
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              sessionWords[currentWordIndex].word === w 
                                ? 'bg-emerald-500 text-white border-emerald-600 scale-110 shadow-lg shadow-emerald-200 z-10' 
                                : practiceResults.some(r => r.word === w && r.correct)
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 opacity-80'
                                : 'bg-white text-black/40 border-black/5'
                            }`}
                          >
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => {
                        const current = sessionWords[currentWordIndex];
                        speak(level === '1st' ? current.word : current.example);
                      }}
                      className="p-4 bg-emerald-100 text-emerald-600 rounded-full hover:bg-emerald-200 transition-colors"
                      title="Hear it"
                    >
                      <Volume2 size={32} />
                    </button>

                    <div className="relative">
                      {isProcessing && (
                        <motion.div 
                          className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        />
                      )}
                      <button 
                        disabled={isListening || isProcessing}
                        onClick={handlePronunciation}
                        className={`w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all relative z-10 ${
                          isListening ? 'bg-red-500 scale-110 shadow-2xl shadow-red-200' : 
                          isProcessing ? 'bg-emerald-100 text-emerald-400' :
                          'bg-emerald-500 hover:scale-105 shadow-2xl shadow-emerald-200 text-white'
                        }`}
                      >
                        {isListening ? (
                          <div className="flex flex-col items-center gap-1">
                            <MicOff size={36} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Stop</span>
                          </div>
                        ) : isProcessing ? (
                          <Loader2 className="animate-spin" size={36} />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Mic size={36} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              {level === '1st' ? "Speak" : "Repeat Sentence"}
                            </span>
                          </div>
                        )}
                      </button>
                    </div>

                    <button 
                      onClick={skipWord}
                      disabled={isListening || isProcessing}
                      className="p-4 bg-black/5 text-black/40 rounded-full hover:bg-black/10 transition-colors flex flex-col items-center gap-1 min-w-[80px]"
                      title="Skip for later"
                    >
                      <ArrowRight size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Skip</span>
                    </button>
                  </div>
                </motion.div>

                {/* Custom Word Input */}
                <form onSubmit={handleCustomWordSubmit} className="w-full max-w-sm flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="text"
                      value={customWord}
                      onChange={(e) => setCustomWord(e.target.value)}
                      placeholder="Type a word to practice..."
                      className="w-full px-4 py-3 bg-white border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all pr-12"
                    />
                    <MessageSquare className="absolute right-4 top-1/2 -translate-y-1/2 text-black/20" size={20} />
                  </div>
                  <button 
                    type="submit"
                    className="p-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-100"
                  >
                    <Send size={20} />
                  </button>
                </form>
              </div>

              {/* Feedback Overlay */}
              <div className="h-32 px-4">
                <AnimatePresence mode="wait">
                  {isListening && (
                    <motion.div 
                      key="listening"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-6 rounded-3xl border border-red-100 bg-red-50 text-red-800 shadow-sm flex items-center gap-4"
                    >
                      <div className="relative w-6 h-6">
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20" />
                        <Mic className="text-red-500 relative z-10" size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">I'm listening, Buddy! 👋</p>
                        <p className="text-sm opacity-70">
                          {level === '1st' ? "Speak the word clearly now..." : "Repeat the whole sentence clearly now..."}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {isProcessing && (
                    <motion.div 
                      key="processing"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-6 rounded-3xl border border-blue-100 bg-blue-50 text-blue-800 shadow-sm flex items-center gap-4"
                    >
                      <Loader2 className="animate-spin text-blue-500" size={24} />
                      <div className="flex-1">
                        <p className="font-bold">Analyzing your pronunciation...</p>
                        <p className="text-sm opacity-70">Just a second, Buddy is thinking!</p>
                      </div>
                    </motion.div>
                  )}

                  {lastFeedback && !isProcessing && (
                    <motion.div 
                      key="feedback"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`p-6 rounded-3xl border shadow-sm space-y-3 ${
                        lastFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                        lastFeedback.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
                        'bg-blue-50 border-blue-100 text-blue-800'
                      }`}
                    >
                      <div className="flex gap-3 items-start">
                        {lastFeedback.type === 'success' ? <CheckCircle2 className="text-emerald-500" size={24} /> : <AlertCircle className={lastFeedback.type === 'error' ? "text-red-500" : "text-blue-500"} size={24} />}
                        <div className="flex-1 space-y-2">
                          <p className="text-lg font-bold">{lastFeedback.text}</p>
                          {lastFeedback.analysis && (
                            <div className="space-y-2 text-sm bg-white/50 p-3 rounded-xl border border-black/5">
                              <p className="italic text-black/70">"{lastFeedback.analysis.analysis}"</p>
                              <div className="flex flex-col gap-1">
                                <p className="font-bold text-blue-700">💡 {lastFeedback.analysis.tip}</p>
                                <p className="font-bold text-blue-700" dir="rtl">💡 {lastFeedback.analysis.hebrewTip}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <button onClick={() => setLastFeedback(null)} className="p-1 hover:bg-black/5 rounded-full">
                          <X size={18} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-8 flex flex-col items-center gap-4">
                {(hookTranscript || lastTranscript) && (
                  <div className="text-xs font-bold text-black/40 bg-black/5 px-4 py-1.5 rounded-full border border-black/5 animate-in fade-in slide-in-from-bottom-2">
                    {isListening ? "I'm hearing: " : "I heard: "}
                    <span className="text-black/80">"{isListening ? hookTranscript : lastTranscript}"</span>
                  </div>
                )}
                
                <p className={`text-lg font-black tracking-tight transition-colors ${
                  isListening ? "text-red-500 animate-pulse" : 
                  isProcessing ? "text-blue-500" : 
                  "text-emerald-600"
                }`}>
                  {isListening ? "Listening..." : isProcessing ? "Buddy is thinking..." : "Tap to speak"}
                </p>
                
                <button 
                  onClick={endSession}
                  className="text-black/40 text-sm font-medium hover:text-black/60 transition-colors"
                >
                  Finish session
                </button>
              </div>
            </motion.div>
          )}

          {view === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 py-12"
            >
              <div className="flex items-center gap-4">
                <button onClick={() => setView('home')} className="p-2 hover:bg-black/5 rounded-full">
                  <X size={24} />
                </button>
                <h2 className="text-3xl font-bold tracking-tight">Your Progress</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-2">
                  <span className="text-black/40 text-sm font-bold uppercase tracking-widest">Total Points</span>
                  <p className="text-5xl font-bold text-emerald-600">
                    {userData?.totalScore || 0}
                  </p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-2">
                  <span className="text-black/40 text-sm font-bold uppercase tracking-widest">Words Mastered</span>
                  <p className="text-5xl font-bold text-blue-600">
                    {(GRADE_1_VOCABULARY.length + GRADE_5_VOCABULARY.length) - (userData?.struggledWords.length || 0)}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-2">
                  <span className="text-black/40 text-sm font-bold uppercase tracking-widest">Today's Practice</span>
                  <p className="text-3xl font-bold text-blue-500">
                    {userData?.dailyPracticeCount || 0} <span className="text-lg text-black/40">words</span>
                  </p>
                  <p className="text-sm text-black/40">Daily Score: {userData?.dailyScore || 0}</p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-2">
                  <span className="text-black/40 text-sm font-bold uppercase tracking-widest">All-Time Practice</span>
                  <p className="text-3xl font-bold text-purple-500">
                    {userData?.allTimePracticeCount || 0} <span className="text-lg text-black/40">words</span>
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <RotateCcw size={24} /> Struggled Words
                </h3>
                <div className="flex flex-wrap gap-3">
                  {userData?.struggledWords.length === 0 ? (
                    <p className="text-black/40 italic text-lg">No words in your practice list yet!</p>
                  ) : (
                    userData?.struggledWords.map(word => (
                      <div key={word} className="px-4 py-2 bg-white border border-black/5 rounded-2xl shadow-sm font-medium">
                        {word}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'admin' && user?.email === ADMIN_EMAIL && (
            <AdminDashboard onBack={() => setView('home')} />
          )}

          {view === 'byo-setup' && (
            <BYOSetup 
              items={exams} 
              onBack={() => setView('home')} 
              onStart={handleStartBYOExam}
              onSelectItem={handleSelectExam}
              onDeleteItem={handleDeleteExam}
              type="Exam"
            />
          )}

          {view === 'byo-vocab-setup' && (
            <BYOSetup 
              items={vocabLists} 
              onBack={() => setView('home')} 
              onStart={handleStartBYOVocab}
              onSelectItem={handleSelectVocabList}
              onDeleteItem={handleDeleteVocabList}
              type="Vocab"
            />
          )}

          {view === 'byo-words-setup' && (
            <BYOSetup 
              items={vocabLists} 
              onBack={() => setView('home')} 
              onStart={handleStartBYOWords}
              onSelectItem={handleSelectWordsList}
              onDeleteItem={handleDeleteVocabList}
              type="Words"
            />
          )}

          {view === 'byo-words' && currentVocabList && byoVocabCurrentWords.length > 0 && (
            <BYOWords 
              vocabList={currentVocabList}
              words={byoVocabCurrentWords}
              speak={speak}
              onBack={() => setView('home')}
              onComplete={async (score, total) => {
                if (userData) {
                  const path = `users/${userData.uid}`;
                  try {
                    await updateDoc(doc(db, path), {
                      totalScore: increment(score * 10),
                      dailyScore: increment(score * 10),
                      dailyPracticeCount: increment(total),
                      allTimePracticeCount: increment(total),
                    });
                    setUserData(prev => prev ? {
                      ...prev,
                      totalScore: prev.totalScore + (score * 10),
                      dailyScore: prev.dailyScore + (score * 10),
                      dailyPracticeCount: prev.dailyPracticeCount + total,
                      allTimePracticeCount: prev.allTimePracticeCount + total,
                    } : null);
                  } catch (error) {
                    console.error("Error updating score after BYO words:", error);
                  }
                }
                setView('home');
              }}
            />
          )}

          {view === 'byo-exam' && currentExam && (
            <BYOExam 
              exam={currentExam} 
              questions={examQuestions} 
              onBack={() => setView('home')}
              onComplete={async (score, total) => {
                if (userData) {
                  const path = `users/${userData.uid}`;
                  try {
                    await updateDoc(doc(db, path), {
                      totalScore: increment(score * 10),
                      dailyScore: increment(score * 10),
                      dailyPracticeCount: increment(total),
                      allTimePracticeCount: increment(total),
                    });
                    setUserData(prev => prev ? {
                      ...prev,
                      totalScore: prev.totalScore + (score * 10),
                      dailyScore: prev.dailyScore + (score * 10),
                      dailyPracticeCount: prev.dailyPracticeCount + total,
                      allTimePracticeCount: prev.allTimePracticeCount + total,
                    } : null);
                  } catch (error) {
                    console.error("Error updating score after BYO exam:", error);
                  }
                }
                setView('home');
              }}
            />
          )}

          {view === 'practice-summary' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-3xl mx-auto py-12 text-center space-y-8"
            >
              <div className="w-24 h-24 bg-orange-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-lg mx-auto mb-8">
                <Trophy size={48} />
              </div>
              
              <div className="space-y-4">
                <h2 className="text-4xl font-bold tracking-tight">Practice Complete!</h2>
                <p className="text-xl text-black/60">
                  Great job! You finished practicing your custom list.
                </p>
                <div className="text-sm text-black/40">
                  Total Session Score: {sessionScore} points • Words Practiced: {sessionWords.length}
                </div>
              </div>

              <div className="max-w-md mx-auto bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-black/30 uppercase tracking-[0.2em]">Practice Review</h4>
                <div className="grid grid-cols-2 gap-2">
                  {practiceResults.map((r, i) => (
                    <div key={i} className={`px-3 py-1.5 rounded-xl text-sm font-medium border ${
                      r.correct ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
                    }`}>
                      {r.word} {r.correct ? '✅' : '❌'}
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => {
                  setView('home');
                  setLevel(null);
                }}
                className="bg-black text-white px-10 py-4 rounded-2xl font-bold hover:bg-black/80 transition-all shadow-xl text-lg inline-flex items-center gap-2"
              >
                <span>Done</span>
                <CheckCircle2 size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
    </ErrorBoundary>
  );
}
