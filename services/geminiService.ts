
import { GoogleGenAI } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";

// Standardizing API key retrieval to strictly follow system requirements
const getApiKey = (): string => {
  return process.env.API_KEY || "";
};

export const analyzePartnership = async (session: PartnershipSession, aggregatedData: any): Promise<AIAnalysis> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key is missing. Please ensure the environment is correctly configured.");
  
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    תפקיד: יועץ ניהולי בכיר המומחה בממשקי עבודה.
    משימה: אבחון חד ופרקטי של ממשק עבודה ארגוני על בסיס נתונים.
    
    נתונים:
    - מדד בריאות הממשק: ${aggregatedData.satisfactionScore}%
    - ביצועי דרייברים: ${JSON.stringify(aggregatedData.driverData)}
    - פער תפיסה מקסימלי: ${aggregatedData.biggestGap ? `${aggregatedData.biggestGap.label} (פער של ${aggregatedData.biggestGap.value})` : 'תיאום גבוה'}

    הנחיות:
    1. שפה ניהולית, "מגובה העיניים". ללא מושגים תיאורטיים (כמו "היישות השלישית").
    2. השתמש במושגים: "זרימת מידע", "מנגנוני החלטה", "חיכוך", "סנכרון מטרות".
    3. התמקד בסיבות לפערים ובהמלצות אופרטיביות.

    החזר JSON בלבד:
    {
      "summary": "אבחון ב-3 משפטים.",
      "recommendations": {
        "systemic": ["המלצה 1", "המלצה 2"],
        "relational": ["המלצה 1", "המלצה 2"]
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
    console.error("AI Analysis Error:", error);
    throw new Error("ניתוח ה-AI נכשל. נסה שוב בעוד רגע.");
  }
};

export const expandRecommendation = async (recommendation: string, context: string): Promise<string[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return ["לא ניתן לפרט המלצה ללא מפתח API"];
  
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    הפוך להמלצה אופרטיבית בשטח (3-4 צעדים):
    המלצה: "${recommendation}"
    הקשר: "${context}"
    החזר רשימת JSON של מחרוזות.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text?.trim() || "[]");
  } catch {
    return ["בצעו פגישת סנכרון", "הגדירו תחומי אחריות", "קבעו שגרת עבודה"];
  }
};
