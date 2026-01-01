
import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";
import { ANALYSIS_PROMPT_TEMPLATE, PARTNERSHIP_METHODOLOGY } from "../constants";

/**
 * Helper to get API key from available environment providers
 */
const getApiKey = () => {
  try {
    // Attempt to use the user's specific Vite environment variable first
    // as requested to fix their specific environment access issue.
    // @ts-ignore
    return import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY || '';
  } catch {
    return process.env.API_KEY || '';
  }
};

/**
 * Analyzes the partnership data using the Gemini AI model.
 * Behaves as a world-class organizational consultant.
 */
export const analyzePartnership = async (session: PartnershipSession): Promise<AIAnalysis> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
    throw new Error("AUTH_ERROR");
  }

  // Always create a new instance inside the function call
  const ai = new GoogleGenAI({ apiKey });
  
  const formattedData = {
    title: session.title,
    context: session.context || "לא הוגדר הקשר ספציפי",
    sidesDefined: session.sides,
    responses: session.responses.map(r => ({
      sideRepresented: r.side,
      role: r.role,
      scores: r.scores,
      comments: r.comments
    }))
  };

  const prompt = `
    תפקיד: יועץ ארגוני בכיר ומומחה בינלאומי בבניית ממשקים ושותפויות.
    מתודולוגיית עבודה (KNOWLEDGE BASE):
    ${PARTNERSHIP_METHODOLOGY}

    ---
    
    ${ANALYSIS_PROMPT_TEMPLATE}
    
    נתוני הממשק והקשר ארגוני לניתוח:
    ${JSON.stringify(formattedData, null, 2)}

    הנחיות קריטיות לניתוח מעמיק: 
    1. ניתוח דמוי רגרסיה: השתמש בשאלות 23-24 (אפקטיביות ושביעות רצון) כציר הייחוס. זהה איזה מבין 6 האשכולות (אג'נדה, תפקידים, החלטות, תהליכים, כבוד, תקשורת) הוא ה-Influencer המובהק ביותר על הצלחת הממשק הזה.
    2. "היישות השלישית": אל תסתפק בניתוח צד א' וצד ב'. נתח את הדינמיקה שנוצרת ביניהם כמרחב נפרד.
    3. עומק אסטרטגי: ספק תובנות שנוגעות למבנה הכוח, פערים בתפיסת התפקיד והשפעת היחסים על השגת המשימה.
    4. זיהוי ה-Key Driver: בסיכום המנהלים, ציין במפורש מהו "המפתח" (הגורם היחיד שאם נזיז אותו, כל השאר ישתפר).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strengths: {
              type: Type.OBJECT,
              properties: {
                systemic: { type: Type.ARRAY, items: { type: Type.STRING } },
                relational: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['systemic', 'relational']
            },
            weaknesses: {
              type: Type.OBJECT,
              properties: {
                systemic: { type: Type.ARRAY, items: { type: Type.STRING } },
                relational: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['systemic', 'relational']
            },
            operationalRecommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            summary: { type: Type.STRING, description: "ניתוח אסטרטגי עמוק ומקיף הכולל זיהוי ה-Key Driver." }
          },
          required: ['strengths', 'weaknesses', 'operationalRecommendations', 'summary']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI Analysis failed:", error);
    if (error?.message?.includes("entity was not found") || error?.status === 404 || error?.status === 401) {
      throw new Error("AUTH_ERROR");
    }
    throw new Error("מערכת ה-AI לא הצליחה לגבש המלצות כרגע. וודא שהגדרת מפתח API תקין.");
  }
};
