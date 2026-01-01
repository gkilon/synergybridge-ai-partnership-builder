
import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";
import { PARTNERSHIP_METHODOLOGY } from "../constants";

/**
 * Helper to get API key from environment, supporting both Vite and process.env
 */
const getApiKey = () => {
  try {
    // Check for Vite-specific environment variable first as requested by user
    // @ts-ignore
    const viteKey = import.meta.env?.VITE_GEMINI_API_KEY;
    if (viteKey) return viteKey;
    
    // Fallback to process.env.API_KEY
    return process.env.API_KEY || '';
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
    
    נתוני הממשק והקשר ארגוני לניתוח:
    ${JSON.stringify(formattedData, null, 2)}

    הנחיות קריטיות לניתוח מעמיק ואוטוריטטיבי: 
    1. איסור מוחלט על אזכור מזהים טכניים: אל תציין "שאלה 1" או "q1". השתמש במושגים מקצועיים (למשל: "בהירות בתפיסת התפקיד", "סנכרון מטרות").
    2. ניתוח דמוי רגרסיה: זהה מהו ה-Key Driver - הפרמטר היחיד שאם ישתפר, יזניק את כלל הממשק קדימה.
    3. היישות השלישית: נתח את ה"מרחב שביניהם". אל תתמקד רק בתלונות של צד אחד, אלא בדפוס המערכתי שנוצר.
    4. חלוקה קטגורית: חלק את ההמלצות ל"צד מערכתי" (תהליכים, מבנה, הגדרות) ול"ציר היחסים" (אמון, תקשורת, כבוד).
    5. שפה: השתמש בשפה של דוח אסטרטגי בכיר. בלי מספרים בציון הכללי, רק תיאור איכותני עמוק.

    דרישות הפלט (JSON בלבד):
    {
      "strengths": { "systemic": ["..."], "relational": ["..."] },
      "weaknesses": { "systemic": ["..."], "relational": ["..."] },
      "recommendations": {
         "systemic": ["3-4 המלצות אופרטיביות לצד המערכתי"],
         "relational": ["3-4 המלצות אופרטיביות לציר היחסים"]
      },
      "summary": "ניתוח אסטרטגי מעמיק הכולל את זיהוי ה-Key Driver והערכת הדינמיקה הבין-ממשקית."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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
            recommendations: {
              type: Type.OBJECT,
              properties: {
                systemic: { type: Type.ARRAY, items: { type: Type.STRING } },
                relational: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['systemic', 'relational']
            },
            summary: { type: Type.STRING }
          },
          required: ['strengths', 'weaknesses', 'recommendations', 'summary']
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
