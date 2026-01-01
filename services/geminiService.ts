
import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";
import { ANALYSIS_PROMPT_TEMPLATE, PARTNERSHIP_METHODOLOGY } from "../constants";

/**
 * Analyzes the partnership data using the Gemini AI model.
 * Strictly follows the @google/genai coding guidelines.
 */
export const analyzePartnership = async (session: PartnershipSession): Promise<AIAnalysis> => {
  // CRITICAL: Always create a new GoogleGenAI instance right before making an API call 
  // to ensure it always uses the most up-to-date API key.
  // The API key must be obtained exclusively from process.env.API_KEY.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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

    שים לב במיוחד (דרישת ניתוח השפעה): 
    - השתמש בשאלות 23 (אפקטיביות) ו-24 (שביעות רצון) כמשתני מטרה. 
    - בצע ניתוח דמוי רגרסיה לינארית כדי לזהות איזה מבין 6 האשכולות (אג'נדה, תפקידים, החלטות, תהליכים, כבוד, תקשורת) הוא המשפיע (Influencer) החזק ביותר על שביעות הרצון והאפקטיביות בממשק זה.
    - ציין במפורש בסיכום המנהלים מהו ה-Key Driver שזיהית.
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
            summary: { type: Type.STRING, description: "סיכום אסטרטגי הכולל זיהוי הגורם המשפיע ביותר (Key Driver) על הצלחת השותפות." }
          },
          required: ['strengths', 'weaknesses', 'operationalRecommendations', 'summary']
        }
      }
    });

    // Directly access .text property from the response (it's a property, not a method).
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI Analysis failed:", error);
    
    // If the request fails with an error message containing "Requested entity was not found.", 
    // it often indicates an API key selection issue in specific environments.
    if (error?.message?.includes("Requested entity was not found") || error?.message?.includes("API Key")) {
      throw new Error("AUTH_ERROR");
    }
    
    throw new Error("מערכת ה-AI לא הצליחה לגבש המלצות כרגע. וודא שהגדרת מפתח API תקין ונסה שוב.");
  }
};
