import { GoogleGenerativeAI } from "@google/generative-ai";
import { PartnershipSession, AIAnalysis } from "../types";

export const analyzePartnership = async (session: PartnershipSession, aggregatedData: any): Promise<AIAnalysis> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Gemini API Key is missing");
    throw new Error("מפתח API חסר במערכת");
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  
  const prompt = `
    תפקיד: יועץ ניהולי בכיר המומחה בממשקי עבודה.
    משימה: אבחון חד ופרקטי של ממשק עבודה ארגוני על בסיס נתונים.
    נתונים גולמיים:
    - מדד בריאות הממשק: ${aggregatedData.satisfactionScore}%
    - ביצועי דרייברים (תהליכים ויחסים): ${JSON.stringify(aggregatedData.driverData)}
    - פער תפיסה מקסימלי: ${aggregatedData.biggestGap ? `${aggregatedData.biggestGap.label} (פער של ${aggregatedData.biggestGap.value} נקודות)` : 'תיאום גבוה בין הצדדים'}
    החזר JSON בלבד במבנה הבא:
    {
      "summary": "אבחון המצב ב-3 משפטים.",
      "recommendations": { "systemic": [], "relational": [] },
      "strengths": { "systemic": [], "relational": [] },
      "weaknesses": { "systemic": [], "relational": [] }
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const expandRecommendation = async (recommendation: string, context: string): Promise<string[]> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return ["לא ניתן לפרט המלצה"];
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `הפוך את ההמלצה הבאה לצעדים אופרטיביים: "${recommendation}". הקשר: "${context}". החזר רשימת JSON של מחרוזות.`;
  
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return ["בצע פגישת סנכרון", "הגדר תחומי אחריות"];
  }
};