
import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";
import { PARTNERSHIP_METHODOLOGY } from "../constants";

const getApiKey = () => {
  try {
    // @ts-ignore
    const viteKey = import.meta.env?.VITE_GEMINI_API_KEY;
    if (viteKey) return viteKey;
    return process.env.API_KEY || '';
  } catch {
    return process.env.API_KEY || '';
  }
};

export const analyzePartnership = async (session: PartnershipSession): Promise<AIAnalysis> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
    throw new Error("AUTH_ERROR");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const formattedData = {
    title: session.title,
    context: session.context || "לא הוגדר הקשר ספציפי",
    sides: session.sides,
    totalResponses: session.responses.length,
    responses: session.responses.map(r => ({
      side: r.side,
      role: r.role,
      scores: r.scores,
      comments: r.comments
    }))
  };

  const prompt = `
    תפקיד: סוכן בינה מלאכותית בכיר המשמש כ"מוח" של הממשק הארגוני.
    מטרה: להפיק תובנות אסטרטגיות עמוקות ותוכנית יישום אופרטיבית מבוססת נתונים.
    
    מתודולוגיה:
    ${PARTNERSHIP_METHODOLOGY}

    נתונים לניתוח:
    ${JSON.stringify(formattedData, null, 2)}

    הנחיות לניתוח (תהיה חד, ביקורתי ומכוון תוצאות):
    1. אל תחזור על הממוצעים שהמשתמש כבר רואה בגרפים. תן פרשנות ל"למה" - למה יש פערים? מה הדינמיקה הסמויה?
    2. זהה את ה-Key Driver: מהו המשתנה האחד שאם נטפל בו, השותפות תזנק קדימה?
    3. תן המלצות קונקרטיות לשלבי יישום (טווח קצר וטווח ארוך).
    4. השתמש בשפה של יועץ אסטרטגי בכיר - מקצועית, נועזת ומניעה לפעולה.
    5. חלק את ההמלצות ל"צד מערכתי" (מנגנונים) ול"ציר היחסים" (אמון ותרבות).

    פלט נדרש (JSON בלבד):
    {
      "strengths": { "systemic": ["..."], "relational": ["..."] },
      "weaknesses": { "systemic": ["..."], "relational": ["..."] },
      "recommendations": {
         "systemic": ["המלצה אופרטיבית למנגנון"],
         "relational": ["המלצה אופרטיבית ליחסים"]
      },
      "summary": "סיכום אסטרטגי המהווה את ה'שכל' מאחורי הנתונים, כולל הנחיה ברורה לשלבי היישום הבאים."
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
    throw new Error("מערכת ה-AI לא הצליחה לגבש המלצות כרגע.");
  }
};
