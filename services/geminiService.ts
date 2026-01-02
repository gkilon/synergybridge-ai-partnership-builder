import { GoogleGenerativeAI } from "@google/generative-ai";
import { PartnershipSession, AIAnalysis } from "../types";

export const analyzePartnership = async (
  session: PartnershipSession, 
  aggregatedData: any
): Promise<AIAnalysis> => {
  // גישה נכונה למשתנה סביבה ב-Vite
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Gemini API Key is missing");
    throw new Error("מפתח API חסר במערכת. אנא וודא שהגדרות VITE_GEMINI_API_KEY תקינות.");
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-pro",
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json"
    }
  });
  
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
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini analyzePartnership Error:", error);
    throw error;
  }
};

export const expandRecommendation = async (
  recommendation: string, 
  context: string
): Promise<string[]> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return ["לא ניתן לפרט המלצה ללא מפתח API."];
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json"
    }
  });
  
  const prompt = `הפוך את ההמלצה הבאה לצעדים אופרטיביים: "${recommendation}". הקשר: "${context}". החזר רשימת JSON של מחרוזות.`;
  
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini expandRecommendation Error:", error);
    return ["בצע פגישת סנכרון", "הגדר תחומי אחריות"];
  }
};