
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
    תפקיד: סוכן בינה מלאכותית בכיר (Strategic Implementation Agent).
    אתה ה"מוח" המנתח של הממשק הארגוני הזה. תפקידך להסיק מסקנות אופרטיביות חדות, לזהות פערים סמויים ולכוון לשלבי יישום מעשיים.
    
    מתודולוגיה:
    ${PARTNERSHIP_METHODOLOGY}

    נתונים לניתוח:
    ${JSON.stringify(formattedData, null, 2)}

    הנחיות לניתוח (תהיה השכל שמאחורי המספרים):
    1. תובנות עומק: אל תחזור על הממוצעים. תסביר את המשמעות האסטרטגית שלהם.
    2. זיהוי ה-Key Driver: מהי הנקודה האחת שתשנה את הכל?
    3. שלבי יישום (Roadmap): חלק את ההמלצות למהלכים מיידיים (Quick Wins) ולבניית תשתית ארוכת טווח.
    4. יישות שלישית: נתח את הדינמיקה בין הצדדים כיישות אחת שזקוקה לריפוי או שכלול.
    5. טון: סמכותי, חכם, מניע לפעולה.

    פלט נדרש (JSON בלבד):
    {
      "strengths": { "systemic": ["..."], "relational": ["..."] },
      "weaknesses": { "systemic": ["..."], "relational": ["..."] },
      "recommendations": {
         "systemic": ["המלצה למנגנון עבודה חדש/משופר"],
         "relational": ["המלצה לשיפור התקשורת או האמון"]
      },
      "summary": "סיכום אסטרטגי דחוס וחד - 'השכל המנתח'. עליך להציג כאן את המסקנה המרכזית ואת מפת הדרכים ליישום."
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
