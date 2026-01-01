
import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";
import { ANALYSIS_PROMPT_TEMPLATE, PARTNERSHIP_METHODOLOGY } from "../constants";

/**
 * Analyzes the partnership data using the Gemini AI model.
 * Strictly follows the @google/genai coding guidelines.
 */
export const analyzePartnership = async (session: PartnershipSession): Promise<AIAnalysis> => {
  const apiKey = process.env.API_KEY;
  
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
    מתודולוגיית עבודה (KNOWLEDGE BASE):
    ${PARTNERSHIP_METHODOLOGY}

    ---
    
    ${ANALYSIS_PROMPT_TEMPLATE}
    
    נתוני הממשק והקשר ארגוני לניתוח:
    ${JSON.stringify(formattedData, null, 2)}

    שים לב במיוחד: 
    - השתמש בשאלות 23 (אפקטיביות) ו-24 (שביעות רצון) כמשתני מטרה (Outcome).
    - זהה איזה מבין 6 האשכולות (אג'נדה, תפקידים, החלטות, תהליכים, כבוד, תקשורת) הוא המשפיע החזק ביותר על התוצאות (The Key Driver).
    - ציין במפורש בסיכום מהו ה-Key Driver שזיהית.
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
            summary: { type: Type.STRING }
          },
          required: ['strengths', 'weaknesses', 'operationalRecommendations', 'summary']
        }
      }
    });

    // Directly access .text property from GenerateContentResponse
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
