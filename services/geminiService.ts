
import { GoogleGenAI } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";

export const analyzePartnership = async (session: PartnershipSession, aggregatedData: any): Promise<AIAnalysis> => {
  // Ensure we use process.env.API_KEY directly as required by the environment
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("מפתח API חסר במערכת. אנא וודא שההגדרות תקינות.");
  
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    תפקיד: יועץ ניהולי בכיר המומחה בממשקי עבודה.
    משימה: אבחון חד ופרקטי של ממשק עבודה ארגוני על בסיס נתונים.
    
    נתונים גולמיים:
    - מדד בריאות הממשק: ${aggregatedData.satisfactionScore}%
    - ביצועי דרייברים (תהליכים ויחסים): ${JSON.stringify(aggregatedData.driverData)}
    - פער תפיסה מקסימלי: ${aggregatedData.biggestGap ? `${aggregatedData.biggestGap.label} (פער של ${aggregatedData.biggestGap.value} נקודות)` : 'תיאום גבוה בין הצדדים'}

    הנחיות קריטיות:
    1. דבר בגובה העיניים למנהלים. אל תשתמש במונחים אקדמיים או תיאורטיים.
    2. השתמש במושגים ניהוליים: "זרימת מידע", "מנגנוני החלטה", "חיכוך תפעולי", "אמון מקצועי", "סנכרון מטרות".
    3. תן ערך מוסף מעבר לגרף: הסבר *למה* הפערים קיימים ואיך הם משפיעים על השורה התחתונה.
    4. ההמלצות חייבות להיות ברות ביצוע.

    החזר JSON בלבד במבנה הבא:
    {
      "summary": "אבחון המצב ב-3 משפטים חדים ומנהליים.",
      "recommendations": {
        "systemic": ["המלצה מבנית/תהליכית 1", "המלצה מבנית/תהליכית 2"],
        "relational": ["המלצה בתחום התקשורת/אמון 1", "המלצה בתחום התקשורת/אמון 2"]
      },
      "strengths": { "systemic": [], "relational": [] },
      "weaknesses": { "systemic": [], "relational": [] }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        temperature: 0.4
      }
    });
    return JSON.parse(response.text?.trim() || "{}");
  } catch (error) {
    console.error("Gemini analyzePartnership Error:", error);
    throw new Error("ניתוח AI נכשל. וודא שמפתח ה-API מוגדר כראוי.");
  }
};

export const expandRecommendation = async (recommendation: string, context: string): Promise<string[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return ["לא ניתן לפרט המלצה ללא מפתח API תקין."];
  
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    הפוך את ההמלצה הניהולית הבאה לתכנית עבודה קונקרטית של "צעדים בשטח":
    המלצה: "${recommendation}"
    הקשר הממשק: "${context}"
    
    דרישות:
    - 3-4 צעדים אופרטיביים בלבד.
    - שפה של פעולה (עשה/בצע/קבע).
    
    החזר רשימת JSON של מחרוזות (strings).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });
    return JSON.parse(response.text?.trim() || "[]");
  } catch (error) {
    console.error("Gemini expandRecommendation Error:", error);
    return ["ודאו קיום פגישת סנכרון שבועית קבועה", "הגדירו מחדש את סמכויות קבלת ההחלטות", "צרו ערוץ תקשורת ישיר לפתרון בעיות"];
  }
};
