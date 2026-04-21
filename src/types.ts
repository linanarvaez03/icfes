export interface Question {
  id: number;
  materia: string;
  tipo: string;
  contexto: string | null;
  imagen_contexto: string | null;
  pregunta: string | number | null;
  imagen_pregunta: string | null;
  opciones: {
    [key: string]: { texto: string | null; imagen: string | null };
  };
  respuesta_correcta: string | null;
  grupo_id: number | null;
}

export type Screen = 'home' | 'selection' | 'simulation' | 'results' | 'dashboard';

export interface HistoryItem {
  id: string;
  date: string;
  subject: string;
  correctCount: number;
  totalQuestions: number;
  timeSpent: number;
  errors: {
    category: string;
    questionId: number;
  }[];
}

export interface SmartReport {
  resumen: string;
  debilidades: string[];
  recomendaciones: string[];
}

export interface AIFeedback {
  diagnostico: {
    categoria: string;
    explicacion: string;
  };
  explicacionCorrecta: string;
  recomendacion: string;
}
