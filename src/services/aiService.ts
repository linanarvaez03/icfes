import { GoogleGenAI, Type } from "@google/genai";
import { AIFeedback, Question, HistoryItem, SmartReport } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function generateFeedback(
  question: Question,
  userAnswer: string,
  correctAnswer: string
): Promise<AIFeedback> {
  const optionsText = Object.entries(question.opciones)
    .map(([key, val]) => `${key}: ${val.texto || "Imagen"}`)
    .join("\n");

  const prompt = `
    Actúa como un tutor experto del examen ICFES de Colombia.
    Analiza la siguiente pregunta y la respuesta del estudiante para proporcionar retroalimentación constructiva.

    CONTEXTO: ${question.contexto || "No se proporciona contexto adicional."}
    PREGUNTA: ${question.pregunta}
    OPCIONES:
    ${optionsText}
    
    RESPUESTA DEL ESTUDIANTE: ${userAnswer} (Opción ${userAnswer})
    RESPUESTA CORRECTA: ${correctAnswer || "NO DEFINIDA EXPLICITAMENTE EN LOS DATOS. Por favor, determina cuál es la respuesta correcta basándote en el contexto y la pregunta proporcionada."} (Opción ${correctAnswer || "?"})

    Tu tarea es generar un objeto JSON con la siguiente estructura:
    1. DIAGNÓSTICO DEL ERROR: Identifica por qué el estudiante se equivocó. Clasifica el error en una de estas categorías: 'Interpretación del texto', 'Falta de atención al enunciado', 'Confusión conceptual', 'Análisis incompleto', 'Inferencia incorrecta'. Explica brevemente el error.
    2. EXPLICACIÓN CORRECTA: Explica por qué la respuesta correcta es la adecuada, usando el contexto del texto.
    3. RECOMENDACIÓN PRÁCTICA: Dale un consejo concreto para mejorar en este tipo de preguntas.

    IMPORTANTE: 
    - Si el estudiante acertó (${userAnswer} === ${correctAnswer}), el diagnóstico debe resaltar el acierto y la categoría debe ser 'Análisis correcto'.
    - La explicación debe ser clara y educativa.
    - El tono debe ser motivador.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diagnostico: {
              type: Type.OBJECT,
              properties: {
                categoria: { type: Type.STRING },
                explicacion: { type: Type.STRING },
              },
              required: ["categoria", "explicacion"],
            },
            explicacionCorrecta: { type: Type.STRING },
            recomendacion: { type: Type.STRING },
          },
          required: ["diagnostico", "explicacionCorrecta", "recomendacion"],
        },
      },
    });

    return JSON.parse(response.text || "{}") as AIFeedback;
  } catch (error) {
    console.error("Error generating AI feedback:", error);
    return {
      diagnostico: {
        categoria: "Error de sistema",
        explicacion: "No se pudo generar el diagnóstico en este momento.",
      },
      explicacionCorrecta: "La respuesta correcta es " + correctAnswer,
      recomendacion: "Sigue practicando con otros ejercicios.",
    };
  }
}

export async function generateSmartReport(
  history: any[],
  stats: any
): Promise<SmartReport> {
  const prompt = `
    Actúa como un tutor experto y analista de datos del examen ICFES.
    Analiza el historial de desempeño del estudiante y genera un reporte inteligente.

    ESTADÍSTICAS GENERALES:
    - Materia Fuerte: ${stats.materiaFuerte}
    - Materia Débil: ${stats.materiaDebil}
    - Error más frecuente: ${stats.errorMasFrecuente}
    - Promedio de aciertos: ${stats.promedioAciertos}%
    - Tiempo promedio por pregunta: ${stats.tiempoPromedioPregunta}s

    HISTORIAL RECIENTE:
    ${JSON.stringify(history.slice(-5), null, 2)}

    Tu tarea es generar un objeto JSON con la siguiente estructura:
    1. resumen: Un resumen del desempeño del estudiante (máximo 3 párrafos).
    2. debilidades: Una lista de sus 3 principales debilidades basadas en los datos.
    3. recomendaciones: Una lista de 3 recomendaciones específicas para mejorar.

    IMPORTANTE:
    - El tono debe ser profesional, motivador y orientado a resultados.
    - Asegúrate de que las recomendaciones sean prácticas y aplicables al contexto del ICFES.
    - Personaliza el mensaje según las materias fuertes y débiles.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            resumen: { type: Type.STRING },
            debilidades: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            recomendaciones: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
          },
          required: ["resumen", "debilidades", "recomendaciones"],
        },
      },
    });

    return JSON.parse(response.text || "{}") as SmartReport;
  } catch (error) {
    console.error("Error generating smart report:", error);
    return {
      resumen: "Sigue practicando para que la IA pueda generar un reporte más detallado de tu progreso.",
      debilidades: ["Falta de datos suficientes", "Necesidad de mayor práctica"],
      recomendaciones: ["Realiza al menos 3 simulacros completos", "Revisa tus retroalimentaciones individuales"]
    };
  }
}
