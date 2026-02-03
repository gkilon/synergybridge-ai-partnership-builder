
import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";

const cleanJSONResponse = (text: string): string => {
  if (!text) return "";
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    const match = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }
  }
  return cleaned;
};

const DEFAULT_ANALYSIS: AIAnalysis = {
  summary: "לא ניתן היה להפיק ניתוח מלא ברגע זה. מומלץ לבדוק את נתוני המענים ולנסות שוב.",
  recommendations: { systemic: ["בדוק הגדרות ממשק"], relational: ["קיים פגישת סנכרון"] },
  strengths: { systemic: [], relational: [] },
  weaknesses: { systemic: [], relational: [] },
  gapInsights: []
};

export const analyzePartnership = async (session: PartnershipSession, aggregatedData: any): Promise<AIAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prepare a highly detailed data context for the AI
  const sidesData = aggregatedData.driverData.map((d: any) => {
    const { subject, ...sideScores } = d;
    return { driver: subject, sideScores };
  });

  const prompt = `
    תפקיד: מאמן אסטרטגי בכיר לפיתוח שותפויות ארגוניות.
    משימה: אבחון והדרכה לשיפור ממשק עבודה בין שתי יחידות: "${session.title}".
    
    טון והנחיות סגנון:
    - היה ענייני, ישיר ומקצועי מאוד, אך שמור על שפה מכבדת, מאפשרת ומעודדת צמיחה.
    - הימנע משימוש במילים קשות או שיפוטיות מדי (כמו "קורבן", "קטסטרופה", "כישלון חרוץ").
    - במקום "פער קריטי", השתמש במושגים כמו "הזדמנות לסנכרון" או "הבדל משמעותי בתפיסה".
    - התמקד בבניית גשרים ולא בסימון אשמים.
    
    הקשר ארגוני: ${session.context || 'לא צוין'}
    
    נתונים כמותיים (סקאלה 1-7):
    1. ציון בריאות כללי (מבוסס שביעות רצון ותוצאה): ${aggregatedData.satisfactionScore}%
    2. עוצמת השפעה של כל דרייבר (Impact): ${JSON.stringify(aggregatedData.impactData)}
    3. ציונים מפוצלים לפי צדדים: ${JSON.stringify(sidesData)}
    
    מתודולוגיה:
    א. ניתוח הבדלי גישה: זהה היכן צד אחד חווה את המציאות בצורה שונה מהותית מהשני.
    ב. תיעדוף פעולה: המלץ על דברים שיביאו לשיפור המרבי בשותפות (Impact vs Score).
    ג. ראייה מערכתית: הבחן בין חסמים תהליכיים (Systemic) לדינמיקה בינאישית (Relational).
    
    דרישות פלט:
    1. summary: ניתוח של 5-8 משפטים המציע זווית ראייה חדשה ומקדמת על הממשק.
    2. gapInsights: 3-5 תובנות על הבדלי התפיסה, בניסוח המאפשר דיאלוג בין הצדדים.
    3. recommendations: צעדים מעשיים ליישום מיידי.
    
    שפת פלט: עברית (Hebrew).
    פורמט: החזר אך ורק אובייקט JSON תקין.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8000,
        thinkingConfig: { thinkingBudget: 4000 }, 
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            gapInsights: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: {
              type: Type.OBJECT,
              properties: {
                systemic: { type: Type.ARRAY, items: { type: Type.STRING } },
                relational: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['systemic', 'relational']
            },
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
            }
          },
          required: ['summary', 'recommendations', 'strengths', 'weaknesses', 'gapInsights']
        }
      }
    });

    const text = response.text;
    if (!text) return DEFAULT_ANALYSIS;
    
    return JSON.parse(cleanJSONResponse(text));
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const expandRecommendation = async (recommendation: string, context: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `הפוך את ההמלצה הבאה ל-4 צעדים אופרטיביים ליישום. שמור על שפה מקצועית ומכבדת: "${recommendation}". הקשר: "${context}". השב ב-JSON (מערך של מחרוזות). עברית.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 1000,
        thinkingConfig: { thinkingBudget: 500 },
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });
    const text = response.text;
    if (!text) return ["בצע הערכה"];
    return JSON.parse(cleanJSONResponse(text));
  } catch (error) {
    return ["קבע פגישה", "הגדר יעדים", "תעד הסכמות"];
  }
};
