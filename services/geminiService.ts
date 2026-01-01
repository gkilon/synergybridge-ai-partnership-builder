
import { GoogleGenAI } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";
import { PARTNERSHIP_METHODOLOGY } from "../constants";

// Reverting to the requested pattern for API Key retrieval
const getApiKey = (): string => {
  try {
    // @ts-ignore
    return import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY || "";
  } catch {
    return "";
  }
};

export const analyzePartnership = async (session: PartnershipSession, aggregatedData: any): Promise<AIAnalysis> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    תפקיד: יועץ אסטרטגי בכיר לממשקים ארגוניים.
    משימה: קח את ניתוח התוצאות הקיימות לרמה פרגמטית ועמוקה יותר.
    
    מתודולוגיה: ${PARTNERSHIP_METHODOLOGY}
    
    ניתוח הנתונים המצטבר:
    - מדד שביעות רצון ואפקטיביות: ${aggregatedData.satisfactionScore}%
    - ביצועי דרייברים (1-7): ${JSON.stringify(aggregatedData.driverData)}
    - פער התפיסה הכי גדול: ${aggregatedData.biggestGap ? `${aggregatedData.biggestGap.label} בפער של ${aggregatedData.biggestGap.value} נקודות` : 'אין פערים משמעותיים'}
    - הקשר הממשק: ${session.context || 'לא צוין'}

    הנחיות לביצוע (פרגמטיות):
    1. אל תציין "שאלה x" או נתונים מספריים יבשים - המשתמש כבר רואה אותם בגרף.
    2. נתח מה "מעכב" את הממשק מלהגיע ל-100% שביעות רצון על בסיס פערים ודרייברים חלשים.
    3. תן המלצות אופרטיביות שניתן לבצע בפגישת העבודה הבאה בין הצדדים.

    החזר JSON:
    {
      "strengths": { "systemic": [], "relational": [] },
      "weaknesses": { "systemic": [], "relational": [] },
      "recommendations": { "systemic": [], "relational": [] },
      "summary": "סיכום אסטרטגי נוקב ופרגמטי על הבעיה המבנית והפתרון המוצע."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Analysis failed:", error);
    throw new Error("המערכת נכשלה ביצירת תובנות. וודא שמפתח ה-API תקין.");
  }
};
