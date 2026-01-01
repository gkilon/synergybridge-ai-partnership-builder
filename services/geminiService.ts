
import { GoogleGenAI } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";
import { PARTNERSHIP_METHODOLOGY } from "../constants";

const getApiKey = (): string => {
  try {
    // @ts-ignore
    return import.meta.env.VITE_GEMINI_API_KEY || "";
  } catch {
    return "";
  }
};

export const analyzePartnership = async (session: PartnershipSession, aggregatedData: any): Promise<AIAnalysis> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("מפתח API חסר. וודא הגדרות VITE_GEMINI_API_KEY.");
  
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    תפקיד: יועץ אסטרטגי בכיר המתמחה בממשקים ארגוניים.
    משימה: ניתוח נוקב ופרגמטי של ממשק עבודה על בסיס נתונים קיימים.
    
    מתודולוגיה: ${PARTNERSHIP_METHODOLOGY}
    
    נתוני הניתוח המצטברים:
    - סטטוס הממשק (שביעות רצון ואפקטיביות): ${aggregatedData.satisfactionScore}%
    - ביצועי דרייברים (1-7): ${JSON.stringify(aggregatedData.driverData)}
    - פער תפיסה מקסימלי: ${aggregatedData.biggestGap ? `${aggregatedData.biggestGap.label} (${aggregatedData.biggestGap.value} נקודות)` : 'אין פערים מהותיים'}
    - הקשר הממשק: ${session.context || 'לא צוין'}

    הנחיות קשיחות:
    1. אל תחזור על המספרים. המשתמש כבר רואה אותם בגרפים.
    2. אל תשתמש במזהי שאלות (q1, q2...).
    3. תן את ה"שורה התחתונה" (The Bottom Line) - מה הבעיה השורשית ואיך פותרים אותה.
    4. המלצות צריכות להיות כאלו שניתן לבצע בפגישה הקרובה בין הצדדים.

    החזר JSON במבנה:
    {
      "strengths": { "systemic": [], "relational": [] },
      "weaknesses": { "systemic": [], "relational": [] },
      "recommendations": { "systemic": [], "relational": [] },
      "summary": "ניתוח קצר (עד 4 שורות) המזהה את החסם המרכזי ונותן כיוון פעולה אסטרטגי."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        temperature: 0.5
      }
    });
    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Analysis failed:", error);
    throw new Error("המערכת נכשלה ביצירת התובנות. וודא שמפתח ה-API תקין ופעיל.");
  }
};
