import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, ChevronRight, CheckCircle2, XCircle, RefreshCcw, BookOpen, BrainCircuit, Globe, FlaskConical, Languages, Sparkles, Loader2, LayoutDashboard, TrendingUp, AlertTriangle, Trophy, Clock, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import questionsData from './data/questions.json';
import { Question, Screen, AIFeedback, HistoryItem, SmartReport } from './types';
import { generateFeedback, generateSmartReport } from './services/aiService';

const SUBJECTS = [
  { name: 'Matemáticas', icon: BrainCircuit, color: 'text-blue-400', glow: 'shadow-blue-500/20' },
  { name: 'Lectura Crítica', icon: BookOpen, color: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  { name: 'Sociales', icon: Globe, color: 'text-amber-400', glow: 'shadow-amber-500/20' },
  { name: 'Ciencias Naturales', icon: FlaskConical, color: 'text-rose-400', glow: 'shadow-rose-500/20' },
  { name: 'Inglés', icon: Languages, color: 'text-indigo-400', glow: 'shadow-indigo-500/20' }
];

const TOTAL_TIME = 30 * 60; // 30 minutes in seconds

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [aiFeedbacks, setAiFeedbacks] = useState<{ [key: number]: AIFeedback }>({});
  const [loadingFeedbacks, setLoadingFeedbacks] = useState<{ [key: number]: boolean }>({});
  
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('simulationHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [smartReport, setSmartReport] = useState<SmartReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const getOptionContent = (option: any) => {
    if (!option) return { texto: '', imagen: null };
    if (typeof option === 'string') return { texto: option, imagen: null };
    return {
      texto: option.texto || '',
      imagen: option.imagen || null
    };
  };

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      handleFinish();
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSimulation = (subject: string) => {
    const filtered = (questionsData as Question[]).filter(q => q.materia === subject);
    
    // Grouping logic
    const groups: { [key: number]: Question[] } = {};
    const individuals: Question[] = [];
    
    filtered.forEach(q => {
      if (q.grupo_id !== null) {
        if (!groups[q.grupo_id]) groups[q.grupo_id] = [];
        groups[q.grupo_id].push(q);
      } else {
        individuals.push(q);
      }
    });

    // Selection logic
    let selected: Question[] = [];
    const groupIds = Object.keys(groups).map(Number).filter(id => !isNaN(id)).sort(() => Math.random() - 0.5);
    const shuffledIndividuals = [...individuals].sort(() => Math.random() - 0.5);

    // Try to pick groups first
    for (const gid of groupIds) {
      if (selected.length >= 10) break;
      const groupQuestions = groups[gid];
      if (!groupQuestions) continue;
      
      const shuffledGroup = [...groupQuestions].sort(() => Math.random() - 0.5);
      const countToPick = Math.min(shuffledGroup.length, 3, 10 - selected.length);
      
      if (countToPick >= 2 || (countToPick === 1 && selected.length === 9)) {
        selected = [...selected, ...shuffledGroup.slice(0, countToPick)];
      }
    }

    // Fill with individuals if needed
    while (selected.length < 10 && shuffledIndividuals.length > 0) {
      selected.push(shuffledIndividuals.pop()!);
    }

    // Final check: if we have less than 10, we just take what we have (though we should have enough)
    // But the requirement says "exactly 10". If we don't have 10, we might need to repeat or just warn.
    // For this demo, we assume we have enough.
    setQuestions(selected.slice(0, 10));
    setSelectedSubject(subject);
    setCurrentIndex(0);
    setUserAnswers({});
    setTimeLeft(TOTAL_TIME);
    setIsTimerActive(true);
    setScreen('simulation');
  };

  const handleAnswer = (answer: string) => {
    setUserAnswers(prev => ({ ...prev, [currentIndex]: answer }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    setIsTimerActive(false);
    
    // Save to history
    const correctCount = questions.reduce((acc, q, idx) => {
      return acc + (userAnswers[idx] === q.respuesta_correcta ? 1 : 0);
    }, 0);

    const errors = questions
      .map((q, idx) => ({
        questionId: q.id,
        category: aiFeedbacks[idx]?.diagnostico.categoria || 'Sin diagnosticar',
        isCorrect: userAnswers[idx] === q.respuesta_correcta
      }))
      .filter(e => !e.isCorrect)
      .map(e => ({ questionId: e.questionId, category: e.category }));

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      subject: selectedSubject!,
      correctCount,
      totalQuestions: questions.length,
      timeSpent: TOTAL_TIME - timeLeft,
      errors
    };

    const newHistory = [...history, newItem];
    setHistory(newHistory);
    localStorage.setItem('simulationHistory', JSON.stringify(newHistory));
    
    setScreen('results');
  };

  const reset = () => {
    setScreen('home');
    setSelectedSubject(null);
    setQuestions([]);
    setCurrentIndex(0);
    setUserAnswers({});
    setTimeLeft(TOTAL_TIME);
    setAiFeedbacks({});
    setLoadingFeedbacks({});
  };

  const getDashboardStats = () => {
    if (history.length === 0) return null;

    const subjects = SUBJECTS.map(s => s.name);
    const subjectStats = subjects.map(name => {
      const subjectHistory = history.filter(h => h.subject === name);
      if (subjectHistory.length === 0) return { name, value: 0, count: 0 };
      const totalCorrect = subjectHistory.reduce((acc, h) => acc + h.correctCount, 0);
      const totalQuestions = subjectHistory.reduce((acc, h) => acc + h.totalQuestions, 0);
      return { name, value: Math.round((totalCorrect / totalQuestions) * 100), count: subjectHistory.length };
    }).filter(s => s.count > 0);

    const errorCounts: { [key: string]: number } = {};
    history.forEach(h => {
      h.errors.forEach(e => {
        errorCounts[e.category] = (errorCounts[e.category] || 0) + 1;
      });
    });

    const categories = Object.keys(errorCounts);
    const mostFrequentError = categories.length > 0 
      ? [...categories].sort((a, b) => errorCounts[b] - errorCounts[a])[0] 
      : 'Ninguno';

    const totalTime = history.reduce((acc, h) => acc + h.timeSpent, 0);
    const totalQuestions = history.reduce((acc, h) => acc + h.totalQuestions, 0);
    const avgTimePerQuestion = Math.round(totalTime / totalQuestions);

    const materiaFuerte = [...subjectStats].sort((a, b) => b.value - a.value)[0]?.name || 'Practica más';
    const materiaDebil = [...subjectStats].sort((a, b) => a.value - b.value)[0]?.name || 'Practica más';

    const progressData = history.slice(-10).map(h => ({
      date: new Date(h.date).toLocaleDateString(),
      percent: Math.round((h.correctCount / h.totalQuestions) * 100)
    }));

    return {
      subjectStats,
      mostFrequentError,
      avgTimePerQuestion,
      materiaFuerte,
      materiaDebil,
      progressData,
      promedioAciertos: Math.round((history.reduce((acc, h) => acc + h.correctCount, 0) / totalQuestions) * 100)
    };
  };

  const fetchSmartReport = async () => {
    const stats = getDashboardStats();
    if (!stats || loadingReport) return;

    setLoadingReport(true);
    try {
      const report = await generateSmartReport(history, {
        materiaFuerte: stats.materiaFuerte,
        materiaDebil: stats.materiaDebil,
        errorMasFrecuente: stats.mostFrequentError,
        promedioAciertos: stats.promedioAciertos,
        tiempoPromedioPregunta: stats.avgTimePerQuestion
      });
      setSmartReport(report);
    } catch (error) {
      console.error("Error generating smart report:", error);
    } finally {
      setLoadingReport(false);
    }
  };

  const generateAllFeedbacks = async () => {
    // We'll generate feedback for all questions that don't have it yet
    const indicesToFetch = questions
      .map((_, i) => i)
      .filter(i => !aiFeedbacks[i] && !loadingFeedbacks[i]);

    // We fetch them sequentially to avoid rate limits and keep it smooth
    for (const index of indicesToFetch) {
      await fetchFeedback(index);
    }
  };

  const fetchFeedback = async (index: number) => {
    if (aiFeedbacks[index] || loadingFeedbacks[index]) return;

    setLoadingFeedbacks(prev => ({ ...prev, [index]: true }));
    try {
      const feedback = await generateFeedback(
        questions[index],
        userAnswers[index],
        questions[index].respuesta_correcta!
      );
      setAiFeedbacks(prev => ({ ...prev, [index]: feedback }));
    } catch (error) {
      console.error("Error fetching feedback:", error);
    } finally {
      setLoadingFeedbacks(prev => ({ ...prev, [index]: false }));
    }
  };

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full bg-white/5 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-10 border border-white/10 relative overflow-hidden"
      >
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 blur-[80px] rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 blur-[80px] rounded-full" />
        
        <motion.div 
          initial={{ rotate: -10, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/40 relative z-10"
        >
          <BrainCircuit className="text-white w-14 h-14" />
        </motion.div>

        <h1 className="text-5xl font-black text-white mb-4 tracking-tighter relative z-10">
          Simulador <span className="text-blue-400">ICFES</span>
        </h1>
        
        <p className="text-slate-400 mb-10 text-lg font-medium leading-relaxed relative z-10">
          Pon a prueba tus conocimientos con nuestro simulacro controlado de 10 preguntas.
        </p>

        <motion.button 
          whileHover={{ scale: 1.02, backgroundColor: '#ffffff', color: '#000000' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setScreen('selection')}
          className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-xl transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 relative z-10"
        >
          Iniciar simulacro
          <ChevronRight className="w-6 h-6" />
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setScreen('dashboard')}
          className="w-full py-4 mt-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-lg transition-all border border-white/10 flex items-center justify-center gap-3 relative z-10"
        >
          <LayoutDashboard className="w-5 h-5" />
          Dashboard Inteligente
        </motion.button>

        <div className="mt-8 flex items-center justify-center gap-6 opacity-30 relative z-10">
          <BookOpen className="w-5 h-5 text-white" />
          <Globe className="w-5 h-5 text-white" />
          <FlaskConical className="w-5 h-5 text-white" />
        </div>
      </motion.div>
    </div>
  );

  const renderSelection = () => (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6 flex flex-col items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl w-full"
      >
        <div className="text-center mb-12">
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight"
          >
            Entrena tu mente
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-xl font-medium"
          >
            Selecciona una materia y mide tu nivel ICFES
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SUBJECTS.map((subject, index) => (
            <motion.button
              key={subject.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => startSimulation(subject.name)}
              className="flex flex-col items-center gap-6 p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 transition-all group text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${subject.color} bg-white/5 shadow-lg ${subject.glow} group-hover:scale-110 transition-transform duration-300`}>
                <subject.icon className="w-10 h-10" />
              </div>
              <span className="text-2xl font-bold text-white relative z-10">{subject.name}</span>
            </motion.button>
          ))}
        </div>

        <motion.button 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          onClick={() => setScreen('home')}
          className="mt-12 text-slate-500 hover:text-white font-medium flex items-center gap-2 mx-auto transition-colors"
        >
          Volver al inicio
        </motion.button>
      </motion.div>
    </div>
  );

  const renderSimulation = () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
        {/* Header */}
        <div className="bg-white/5 backdrop-blur-md border-b border-white/10 p-4 sticky top-0 z-20">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-500/30">
                {selectedSubject}
              </span>
              <span className="text-slate-400 text-sm font-medium">
                Pregunta <span className="text-white font-bold">{currentIndex + 1}</span> de {questions.length}
              </span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold border transition-all duration-500 ${
              timeLeft <= 60 
                ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-500/40 animate-pulse scale-110' 
                : timeLeft <= 300
                ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/30'
                : timeLeft <= 600
                ? 'bg-amber-400 text-slate-900 border-amber-300 shadow-lg shadow-amber-400/20'
                : 'bg-white/5 text-slate-300 border-white/10'
            }`}>
              <Timer className={`w-5 h-5 ${timeLeft <= 60 ? 'animate-spin-slow' : 'animate-pulse'}`} />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800/50">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden flex items-center justify-center">
          <div className="max-w-[1700px] w-full h-[calc(100vh-180px)] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Block 1: Context Area */}
            <div className="h-full flex flex-col min-h-0">
              {currentQuestion.contexto ? (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-slate-50 rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative flex flex-col h-full"
                >
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 z-10" />
                  <div className="p-5 border-b border-slate-100 bg-white flex-shrink-0">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      CONTEXTO DE LECTURA
                    </h3>
                  </div>
                  <div className="p-8 overflow-y-auto flex-1 custom-scrollbar scroll-smooth bg-slate-50">
                    <p className="text-slate-800 leading-relaxed text-xl font-medium mb-8">
                      {currentQuestion.contexto}
                    </p>
                    {currentQuestion.imagen_contexto && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group mb-4"
                      >
                        <img 
                          src={currentQuestion.imagen_contexto} 
                          alt="Contexto" 
                          className="rounded-2xl w-full object-contain border-4 border-white shadow-lg bg-white"
                          referrerPolicy="no-referrer"
                        />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="hidden lg:flex items-center justify-center h-full opacity-10 bg-white/5 rounded-3xl border border-white/5">
                  <BrainCircuit className="w-48 h-48 text-slate-300" />
                </div>
              )}
            </div>

            {/* Block 2: Question Area */}
            <div className="h-full flex flex-col min-h-0">
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-800/40 backdrop-blur-sm rounded-3xl border border-white/10 shadow-xl flex flex-col h-full overflow-hidden"
              >
                <div className="p-5 border-b border-white/5 bg-white/5 flex-shrink-0">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-1.5 h-3.5 bg-purple-500 rounded-full" />
                    LA PREGUNTA
                  </h3>
                </div>
                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                  <h2 className="text-2xl font-bold text-white leading-tight mb-8">
                    {currentQuestion.pregunta}
                  </h2>
                  {currentQuestion.imagen_pregunta && (
                    <img 
                      src={currentQuestion.imagen_pregunta} 
                      alt="Pregunta" 
                      className="rounded-2xl w-full object-contain border border-white/10 bg-white/5 p-4"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
              </motion.div>
            </div>

            {/* Block 3: Options Area */}
            <div className="h-full flex flex-col min-h-0">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-slate-800/40 backdrop-blur-sm rounded-3xl border border-white/10 shadow-xl flex flex-col h-full overflow-hidden"
              >
                <div className="p-5 border-b border-white/5 bg-white/5 flex-shrink-0">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-1.5 h-3.5 bg-emerald-500 rounded-full" />
                    RESPUESTAS
                  </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                  {Object.entries(currentQuestion.opciones).map(([key, value], idx) => (
                    <motion.button
                      key={key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => handleAnswer(key)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 group relative overflow-hidden ${
                        userAnswers[currentIndex] === key
                          ? 'border-blue-500 bg-blue-500/10 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                          : 'border-white/5 hover:border-white/20 bg-white/5 text-slate-300 hover:text-white'
                      }`}
                    >
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base transition-all flex-shrink-0 ${
                        userAnswers[currentIndex] === key 
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50' 
                          : 'bg-white/10 text-slate-400 group-hover:bg-white/20 group-hover:text-white'
                      }`}>
                        {key}
                      </span>
                      <div className="flex flex-col gap-2 relative z-10 w-full min-w-0">
                        {getOptionContent(value).imagen && (
                          <img 
                            src={getOptionContent(value).imagen} 
                            alt={`Opción ${key}`}
                            className="max-h-24 object-contain rounded-lg mb-1"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        {getOptionContent(value).texto && (
                          <span className="font-medium text-lg leading-tight break-words">{getOptionContent(value).texto}</span>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="p-6 bg-white/5 border-t border-white/5 flex-shrink-0">
                  <motion.button
                    whileHover={userAnswers[currentIndex] ? { scale: 1.02 } : {}}
                    whileTap={userAnswers[currentIndex] ? { scale: 0.98 } : {}}
                    onClick={handleNext}
                    disabled={!userAnswers[currentIndex]}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-2xl ${
                      userAnswers[currentIndex]
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-blue-500/25 hover:shadow-blue-500/40'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    {currentIndex === questions.length - 1 ? 'Finalizar Simulacro' : 'Siguiente pregunta'}
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    const correctCount = questions.reduce((acc, q, idx) => {
      return acc + (userAnswers[idx] === q.respuesta_correcta ? 1 : 0);
    }, 0);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-10 mb-12 text-center shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-4xl font-black text-white mb-3 tracking-tight">Simulacro Finalizado</h2>
              <p className="text-slate-400 mb-10 text-lg">Resultados para <span className="text-blue-400 font-bold">{selectedSubject}</span></p>
            </motion.div>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-12 mb-12">
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.4 }}
                className="text-center"
              >
                <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-600 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  {correctCount}/10
                </div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">Correctas</div>
              </motion.div>

              <div className="hidden md:block w-px h-20 bg-white/10" />

              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.6 }}
                className="text-center"
              >
                <div className="text-7xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  {Math.round((correctCount / 10) * 100)}%
                </div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">Puntaje Total</div>
              </motion.div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button 
                onClick={reset}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-lg transition-all flex items-center gap-3 backdrop-blur-sm"
              >
                <RefreshCcw className="w-5 h-5" />
                Nuevo Simulacro
              </button>
              
              <button 
                onClick={generateAllFeedbacks}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(147,51,234,0.4)] transition-all flex items-center gap-3 shadow-xl"
              >
                <Sparkles className="w-5 h-5" />
                Generar Toda la Retroalimentación (IA)
              </button>
            </div>
          </motion.div>

          <div className="space-y-6 pb-20">
            <div className="flex items-center gap-3 px-2 mb-8">
              <div className="w-2 h-8 bg-blue-500 rounded-full" />
              <h3 className="text-2xl font-bold text-white">Revisión de respuestas</h3>
            </div>
            
            {questions.map((q, idx) => {
              const isCorrect = userAnswers[idx] === q.respuesta_correcta;
              return (
                <motion.div 
                  key={q.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white/5 backdrop-blur-sm p-8 rounded-3xl border border-white/10 shadow-xl flex flex-col gap-6 relative overflow-hidden group hover:bg-white/[0.07] transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pregunta {idx + 1}</span>
                      {isCorrect ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correcta
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 uppercase tracking-wider">
                          <XCircle className="w-3.5 h-3.5" /> Incorrecta
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xl font-bold text-white leading-tight">{q.pregunta}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`p-5 rounded-2xl border ${
                      isCorrect 
                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                        : 'bg-rose-500/5 border-rose-500/20'
                    }`}>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tu respuesta</div>
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                          isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                        }`}>
                          {userAnswers[idx] || '?'}
                        </span>
                        <div className="flex flex-col">
                          {getOptionContent(q.opciones[userAnswers[idx]]).imagen && (
                            <img 
                              src={getOptionContent(q.opciones[userAnswers[idx]]).imagen} 
                              alt="Tu respuesta" 
                              className="max-h-20 object-contain rounded-md mb-1"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <span className="font-medium text-slate-200">
                            {getOptionContent(q.opciones[userAnswers[idx]]).texto || 'Sin responder'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isCorrect && (
                      <div className={`p-5 rounded-2xl border ${
                        q.respuesta_correcta 
                          ? 'bg-emerald-500/5 border-emerald-500/20' 
                          : 'bg-slate-500/5 border-slate-500/20'
                      }`}>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Respuesta correcta</div>
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                            q.respuesta_correcta ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 italic'
                          }`}>
                            {q.respuesta_correcta || '?'}
                          </span>
                          {q.respuesta_correcta ? (
                            <div className="flex flex-col">
                              {getOptionContent(q.opciones[q.respuesta_correcta]).imagen && (
                                <img 
                                  src={getOptionContent(q.opciones[q.respuesta_correcta]).imagen} 
                                  alt="Respuesta correcta" 
                                  className="max-h-20 object-contain rounded-md mb-1"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <span className="font-medium text-slate-200">
                                {getOptionContent(q.opciones[q.respuesta_correcta]).texto}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500">No definida en los datos</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Feedback Section */}
                  <div className="mt-4 pt-6 border-t border-white/5">
                    {!aiFeedbacks[idx] ? (
                      <button
                        onClick={() => fetchFeedback(idx)}
                        disabled={loadingFeedbacks[idx]}
                        className="flex items-center gap-2 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                      >
                        {loadingFeedbacks[idx] ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generando retroalimentación...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Ver retroalimentación con IA
                          </>
                        )}
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                            <h4 className="text-sm font-black text-purple-300 uppercase tracking-wider">Retroalimentación IA</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Diagnosis */}
                            <div className="space-y-2">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">1. DIAGNÓSTICO DEL ERROR</div>
                              <div className="inline-block px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-300 mb-2">
                                {aiFeedbacks[idx].diagnostico.categoria}
                              </div>
                              <p className="text-sm text-slate-300 leading-relaxed italic">
                                "{aiFeedbacks[idx].diagnostico.explicacion}"
                              </p>
                            </div>

                            {/* Correct Explanation */}
                            <div className="space-y-2">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">2. EXPLICACIÓN CORRECTA</div>
                              <p className="text-sm text-slate-300 leading-relaxed">
                                {aiFeedbacks[idx].explicacionCorrecta}
                              </p>
                            </div>

                            {/* Recommendation */}
                            <div className="space-y-2">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">3. RECOMENDACIÓN PRÁCTICA</div>
                              <p className="text-sm text-emerald-400 font-medium leading-relaxed bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                                {aiFeedbacks[idx].recomendacion}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const stats = getDashboardStats();

    if (!stats) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white/5 backdrop-blur-2xl rounded-3xl p-10 border border-white/10"
          >
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
            <h2 className="text-3xl font-black mb-4">Sin datos suficientes</h2>
            <p className="text-slate-400 mb-8">Realiza al menos un simulacro para activar tu Dashboard Inteligente.</p>
            <button
              onClick={() => setScreen('home')}
              className="w-full py-4 bg-blue-600 rounded-2xl font-bold text-lg"
            >
              Volver al inicio
            </button>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <button 
                onClick={() => setScreen('home')}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Volver
              </button>
              <h1 className="text-5xl font-black tracking-tight">Dashboard Inteligente</h1>
              <p className="text-slate-400 text-lg">Analizando cada paso de tu camino al éxito</p>
            </div>
            {!smartReport ? (
              <button 
                onClick={fetchSmartReport}
                disabled={loadingReport}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl font-bold text-lg flex items-center gap-3 shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 transition-all disabled:opacity-50"
              >
                {loadingReport ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {loadingReport ? 'Generando Reporte...' : 'Generar Reporte IA'}
              </button>
            ) : (
              <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-bold text-purple-300 uppercase tracking-wider">Reporte IA Actualizado</span>
              </div>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { label: 'Promedio General', value: `${stats.promedioAciertos}%`, icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-400/10' },
              { label: 'Tiempo / Pregunta', value: `${stats.avgTimePerQuestion}s`, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
              { label: 'Materia Fuerte', value: stats.materiaFuerte, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
              { label: 'Materia Débil', value: stats.materiaDebil, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-400/10' }
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10"
              >
                <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</div>
                <div className="text-2xl font-black">{stat.value}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* AI Report Section */}
            <div className="xl:col-span-2 space-y-8">
              {smartReport && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-purple-500/20"
                >
                  <div className="flex items-center gap-3 mb-8">
                    <Sparkles className="w-8 h-8 text-purple-400" />
                    <h2 className="text-3xl font-black">Resumen del Tutor IA</h2>
                  </div>
                  
                  <div className="prose prose-invert max-w-none mb-10">
                    <p className="text-slate-200 text-lg leading-relaxed whitespace-pre-wrap">{smartReport.resumen}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-rose-400">
                        <AlertTriangle className="w-5 h-5" /> Debilidades
                      </h3>
                      <ul className="space-y-3">
                        {smartReport.debilidades.map((d, i) => (
                          <li key={i} className="text-slate-400 text-sm flex gap-2">
                            <span className="text-rose-500">•</span> {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-emerald-400">
                        <TrendingUp className="w-5 h-5" /> Recomendaciones
                      </h3>
                      <ul className="space-y-3">
                        {smartReport.recomendaciones.map((r, i) => (
                          <li key={i} className="text-slate-400 text-sm flex gap-2">
                            <span className="text-emerald-500">•</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Performance Chart */}
                <div className="bg-white/5 p-8 rounded-3xl border border-white/10 h-[400px]">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" /> % Aciertos por Materia
                  </h3>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.subjectStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tick={{ fill: '#64748b' }} />
                        <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {stats.subjectStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#8b5cf6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Progress Chart */}
                <div className="bg-white/5 p-8 rounded-3xl border border-white/10 h-[400px]">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" /> Progreso en el tiempo
                  </h3>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.progressData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                        <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                        <Line type="monotone" dataKey="percent" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar / Error Info */}
            <div className="space-y-8">
              <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400" /> Tipo de error frecuente
                </h3>
                <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center">
                  <div className="text-rose-400 font-black text-2xl mb-1">{stats.mostFrequentError}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-widest">Identificado por IA</div>
                </div>
                <p className="mt-4 text-sm text-slate-400 leading-relaxed">
                  Este patrón sugiere que necesitas enfocarte en mejorar tu {stats.mostFrequentError.toLowerCase()} durante la lectura de enunciados.
                </p>
              </div>

              <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                <h3 className="text-xl font-bold mb-6">Materia por Materia</h3>
                <div className="space-y-4">
                  {stats.subjectStats.map(s => (
                    <div key={s.name} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">{s.name}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${s.value}%` }} />
                        </div>
                        <span className="text-xs font-bold w-8">{s.value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="font-sans antialiased text-white">
      <AnimatePresence mode="wait">
        {screen === 'home' && renderHome()}
        {screen === 'selection' && renderSelection()}
        {screen === 'simulation' && renderSimulation()}
        {screen === 'results' && renderResults()}
        {screen === 'dashboard' && renderDashboard()}
      </AnimatePresence>
    </div>
  );
}
