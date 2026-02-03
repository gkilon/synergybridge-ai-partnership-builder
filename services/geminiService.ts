
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
    תפקיד: יועץ אסטרטגי בכיר לפיתוח ארגוני המומחה בניהול קונפליקטים ושיפור ממשקי עבודה.
    משימה: אבחון עומק פסיכולוגי ואסטרטגי של ממשק עבודה בין שתי יחידות ארגוניות: "${session.title}".
    
    הקשר ארגוני רחב: ${session.context || 'לא צוין'}
    
    נתונים כמותיים לניתוח (סקאלה 1-7):
    1. ציון בריאות כללי: ${aggregatedData.satisfactionScore}%
    2. עוצמת השפעה של כל דרייבר (Impact): ${JSON.stringify(aggregatedData.impactData)}
    3. ציונים מפוצלים לפי צדדים (קריטי לניתוח פערים): ${JSON.stringify(sidesData)}
    
    מתודולוגיית אבחון נדרשת (תהיה נוקב, מעמיק ומקצועי):
    א. ניתוח פערי תפיסה (Perceptual Gaps): זהה דרייברים שבהם יש פער של מעל נקודה אחת בין הצדדים. הסבר מה זה אומר על התקשורת ביניהם. האם צד אחד "חי בסרט" בעוד השני סובל?
    ב. ניתוח רבעונים (Impact vs Performance): 
       - אימפקט גבוה + ביצועים נמוכים = "צוואר בקבוק אסטרטגי".
       - פער גדול + אימפקט גבוה = "נקודת פיצוץ פוטנציאלית".
    ג. ניתוח שורש: אל תכתוב רק מה רואים בגרפים, תסיק מה הבעיה האמיתית (למשל: "יש כאן בעיית אמון שמתחפשת לבעיית תהליכים").
    
    דרישות פלט:
    1. הניתוח חייב להיות ארוך, מפורט ומנומק.
    2. summary: סקירה מעמיקה של 5-8 משפטים המנתחת את הדינמיקה האמיתית בממשק.
    3. gapInsights: לפחות 3-5 תובנות חדות על הפערים בין הצדדים. היה ספציפי לגבי מי מרגיש מה.
    4. recommendations: המלצות קונקרטיות שאינן גנריות.
    
    שפת פלט: עברית (Hebrew).
    פורמט: החזר אך ורק אובייקט JSON תקין לפי הסכימה.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8000,
        // Pro models require thinking to be active or omitted correctly. 
        // Setting a positive budget allows for the requested deeper reasoning.
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
  const prompt = `הפוך את ההמלצה הכללית הבאה ל-4 צעדים אופרטיביים וקונקרטיים ליישום בממשק ארגוני: "${recommendation}". הקשר: "${context}". השב ב-JSON (מערך של מחרוזות). עברית.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 1000,
        thinkingConfig: { thinkingBudget: 500 }, // Use a valid positive budget
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
