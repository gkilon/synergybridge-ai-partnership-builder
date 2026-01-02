import { GoogleGenerativeAI } from "@google/generative-ai";
import { PartnershipSession, AIAnalysis } from "../types";

// פונקציית עזר לקבלת API Key
const getApiKey = (): string => {
  // נסה קודם את Vite
  const viteKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (viteKey) return viteKey;
  
  // fallback למקרה של runtime injection
  if (typeof window !== 'undefined' && (window as any).VITE_GEMINI_API_KEY) {
    return (window as any).VITE_GEMINI_API_KEY;
  }
  
  throw new Error("מפתח API חסר. אנא הגדר VITE_GEMINI_API_KEY");
};

export const analyzePartnership = async (
  session: PartnershipSession, 
  aggregatedData: any
): Promise<AIAnalysis> => {
  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  
  const prompt = `
תפקיד: יועץ ניהולי בכיר המומחה בממשקי עבודה.
משימה: אבחון חד ופרקטי של ממשק עבודה ארגוני על בסיס נתונים.

נתונים גולמיים:
- מדד בריאות הממשק: ${aggregatedData.satisfactionScore}%
- ביצועי דרייברים (תהליכים ויחסים): ${JSON.stringify(aggregatedData.driverData)}
- פער תפיסה מקסימלי: ${aggregatedData.biggestGap ? `${aggregatedData.biggestGap.label} (פער של ${aggregatedData.biggestGap.value} נקודות)` : 'תיאום גבוה בין הצדדים'}

החזר JSON בלבד במבנה הבא (ללא טקסט נוסף):
{
  "summary": "אבחון המצב ב-2-3 משפטים.",
  "recommendations": {
    "systemic": ["המלצה 1", "המלצה 2"],
    "relational": ["המלצה 1", "המלצה 2"]
  },
  "strengths": {
    "systemic": ["חוזקה 1", "חוזקה 2"],
    "relational": ["חוזקה 1", "חוזקה 2"]
  },
  "weaknesses": {
    "systemic": ["חולשה 1", "חולשה 2"],
    "relational": ["חולשה 1", "חולשה 2"]
  }
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // ניקוי הטקסט מ-markdown backticks אם קיימים
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Gemini analyzePartnership Error:", error);
    throw new Error("שגיאה בניתוח הממשק. אנא נסה שוב.");
  }
};

export const expandRecommendation = async (
  recommendation: string, 
  context: string
): Promise<string[]> => {
  try {
    const apiKey = getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
הפוך את ההמלצה הבאה לצעדים אופרטיביים מעשיים:

המלצה: "${recommendation}"
הקשר: "${context}"

החזר רשימת JSON של 3-5 צעדים קונקרטיים (ללא טקסט נוסף):
["צעד 1", "צעד 2", "צעד 3"]`;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // ניקוי הטקסט מ-markdown backticks אם קיימים
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Gemini expandRecommendation Error:", error);
    // fallback למקרה של שגיאה
    return [
      "בצע פגישת סנכרון בין הצדדים",
      "הגדר תחומי אחריות ברורים",
      "קבע מדדי הצלחה משותפים"
    ];
  }
};