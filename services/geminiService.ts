
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
    תפקיד: יועץ אסטרטגי בכיר לפיתוח ארגוני ומנהל דאטה.
    משימה: אבחון עומק של ממשק עבודה בין שתי יחידות ארגוניות: "${session.title}".
    
    הקשר ארגוני: ${session.context || 'לא צוין'}
    
    נתונים כמותיים לניתוח:
    1. ציון בריאות כללי: ${aggregatedData.satisfactionScore}%
    2. עוצמת השפעה של כל דרייבר (Impact): ${JSON.stringify(aggregatedData.impactData)}
    3. ציונים מפוצלים לפי צדדים (הכי חשוב!): ${JSON.stringify(sidesData)}
    
    מתודולוגיית אבחון נדרשת:
    א. ניתוח פערים (Gap Analysis): זהה דרייברים שבהם יש פער גדול (>1.5 נקודות) בין הצדדים. פער כזה מעיד על חוסר סנכרון או "עיוורון" של אחד הצדדים למציאות של השני.
    ב. ניתוח משולב (Quadrant Analysis): 
       - אימפקט גבוה + ציון נמוך אצל כולם = משבר מערכתי דחוף.
       - אימפקט גבוה + פער גדול בין הצדדים = משבר אמון או אי-הבנה תהליכית עמוקה.
    ג. הבחנה בין מערכתי (Systemic) ליחסי (Relational).
    
    דרישות פלט:
    1. הניתוח חייב להיות מקיף, בוגר ונטול קלישאות.
    2. סעיף ה-summary צריך להיות באורך של 4-5 משפטים המאבחנים את ה"שורש" של המצב.
    3. ב-gapInsights, ציין ספציפית איזה צד מרגיש מה (למשל: "צד א' חווה חוסר בבהירות תפקידית בעוד שצד ב' בטוח שהדברים ברורים").
    
    שפת פלט: עברית (Hebrew).
    פורמט: החזר אך ורק אובייקט JSON תקין.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgraded for deeper reasoning
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 3500,
        thinkingConfig: { thinkingBudget: 0 },
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
  const prompt = `הפוך את ההמלצה הכללית הבאה ל-4 צעדים אופרטיביים וקונקרטיים ליישום בממשק ארגוני: "${recommendation}". הקשר: "${context}". השב ב-JSON (מערך של מחרוזות). עברית.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 1000,
        thinkingConfig: { thinkingBudget: 0 },
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
