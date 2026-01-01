
import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";
import { PARTNERSHIP_METHODOLOGY } from "../constants";

export const analyzePartnership = async (session: PartnershipSession): Promise<AIAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const formattedData = {
    title: session.title,
    sides: session.sides,
    responses: session.responses.map(r => ({
      side: r.side,
      scores: r.scores, // q23-q24 are the target variables
      comments: r.comments
    }))
  };

  const prompt = `
    משימה: בצע "ניתוח השפעה אסטרטגי" (Key Driver Analysis) לממשק הארגוני.
    
    מתודולוגיה: ${PARTNERSHIP_METHODOLOGY}
    
    נתונים: ${JSON.stringify(formattedData)}

    שלבי הניתוח הנדרשים:
    1. Key Driver: זהה איזו קטגוריה (אג'נדה/תפקידים/החלטות/תהליכים/כבוד/תקשורת) היא בעלת המתאם הגבוה ביותר לשביעות הרצון (q23, q24). מה "מפיל" או "מרים" את הממשק הזה?
    2. Side Gap Detection: האם יש פער תפיסתי מהותי בין הצדדים? (למשל צד א' מרגיש שהאג'נדה ברורה וצד ב' מרגיש אבוד).
    3. יישות שלישית: הגדר את מצב "בריאות" השותפות כיישות עצמאית.
    4. המלצות: ספק 3 המלצות מערכתיות ו-3 המלצות יחסים, מדורגות לפי אימפקט על שביעות הרצון.

    החזר JSON במבנה הבא:
    {
      "strengths": { "systemic": [], "relational": [] },
      "weaknesses": { "systemic": [], "relational": [] },
      "recommendations": { "systemic": [], "relational": [] },
      "summary": "פתח ב'תובנת המפתח' (The Game Changer) - מהו המשתנה שהכי משפיע כאן על שביעות הרצון. המשך בניתוח הפערים בין הצדדים וסיים במפת הדרכים."
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
    throw new Error("המערכת נכשלה בניתוח הנתונים.");
  }
};
