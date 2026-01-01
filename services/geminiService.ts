
import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";
import { PARTNERSHIP_METHODOLOGY } from "../constants";

/**
 * Analyzes the partnership data using the Gemini AI model.
 * Behaves as a world-class organizational consultant.
 */
export const analyzePartnership = async (session: PartnershipSession): Promise<AIAnalysis> => {
  // Always use process.env.API_KEY directly when initializing.
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
    תפקיד: יועץ ארגוני בכיר ומומחה בינלאומי בבניית ממשקים ושותפויות.
    מתודולוגיית עבודה (KNOWLEDGE BASE):
    ${PARTNERSHIP_METHODOLOGY}

    ---
    
    נתוני הממשק והקשר ארגוני לניתוח:
    ${JSON.stringify(formattedData, null, 2)}

    הנחיות קריטיות לניתוח מעמיק: 
    1. איסור אזכור מזהים טכניים: בשום פנים ואופן אין לציין מספרי שאלות (כמו q1, q2 וכו') או שמות משתנים טכניים בדוח. השתמש בשפה עסקית/ייעוצית בלבד.
    2. ניתוח דמוי רגרסיה: השתמש במדדי התוצאה כציר הייחוס. זהה איזה מבין 6 האשכולות (אג'נדה, תפקידים, החלטות, תהליכים, כבוד, תקשורת) הוא ה-Influencer המובהק ביותר.
    3. "היישות השלישית": נתח את הדינמיקה שנוצרת בין הצדדים כמרחב נפרד.
    4. חלוקת המלצות: חלק את ההמלצות באופן ברור ל"צד מערכתי" (תהליכים, הגדרות, מנגנונים) ול"ציר היחסים" (אמון, תקשורת, כבוד).

    דרישות הפלט (JSON בלבד):
    {
      "strengths": { "systemic": ["..."], "relational": ["..."] },
      "weaknesses": { "systemic": ["..."], "relational": ["..."] },
      "recommendations": {
         "systemic": ["3-4 המלצות קונקרטיות לצד המערכתי"],
         "relational": ["3-4 המלצות קונקרטיות לציר היחסים"]
      },
      "summary": "סיכום אסטרטגי עמוק ומקיף הכולל זיהוי ה-Key Driver (ללא אזכור q1/q2)."
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
