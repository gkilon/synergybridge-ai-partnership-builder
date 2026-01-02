import { GoogleGenerativeAI } from "@google/generative-ai";
import { PartnershipSession, AIAnalysis } from "../types";

const getApiKey = (): string => {
  // גישה נכונה למשתנה סביבה ב-Vite
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("מפתח API חסר. וודא שהגדרת VITE_GEMINI_API_KEY ב-Netlify");
  }
  
  return apiKey;
};

export const analyzePartnership = async (
  session: PartnershipSession, 
  aggregatedData: any
): Promise<AIAnalysis> => {
  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  
  const prompt = `
תפקיד: יועץ ניהולי בכיר המומחה בממשקי עבודה ארגוניים.
משימה: אבחון חד ומונחה נתונים של ממשק עבודה.
הקשר: ${session.context || 'ממשק ארגוני כללי'}

נתונים גולמיים:
- ציון בריאות הממשק: ${aggregatedData.satisfactionScore}%
- ביצועי דרייברים (מערכתי מול יחסי): ${JSON.stringify(aggregatedData.driverData)}
- פער תפיסה מקסימלי: ${aggregatedData.biggestGap ? `${aggregatedData.biggestGap.label} (פער של ${aggregatedData.biggestGap.value} נקודות)` : 'תיאום גבוה בין הצדדים'}

החזר JSON בלבד במבנה הבא:
{
  "summary": "אבחון המצב ב-2-3 משפטים חדים",
  "recommendations": {
    "systemic": ["המלצה מערכתית 1", "המלצה מערכתית 2"],
    "relational": ["המלצה יחסית 1", "המלצה יחסית 2"]
  },
  "strengths": {
    "systemic": ["חוזקה מערכתית 1", "חוזקה מערכתית 2"],
    "relational": ["חוזקה יחסית 1", "חוזקה יחסית 2"]
  },
  "weaknesses": {
    "systemic": ["חולשה מערכתית 1", "חולשה מערכתית 2"],
    "relational": ["חולשה יחסית 1", "חולשה יחסית 2"]
  }
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // ניקוי מ-markdown backticks
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
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
הפוך את ההמלצה הבאה ל-4-5 צעדים אופרטיביים קונקרטיים בעברית:

המלצה: "${recommendation}"
הקשר: "${context}"

החזר רק מערך JSON של מחרוזות, ללא טקסט נוסף:
["צעד 1", "צעד 2", "צעד 3", "צעד 4"]`;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // ניקוי מ-markdown backticks
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Gemini Expansion Error:", error);
    return [
      "קבע פגישת סנכרון בין הצדדים",
      "הגדר יעדים משותפים ומדידים",
      "תעד את ההסכמות בכתב",
      "קבע נקודות ביקורת תקופתיות"
    ];
  }
};