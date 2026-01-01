
import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";
import { PARTNERSHIP_METHODOLOGY } from "../constants";

export const analyzePartnership = async (session: PartnershipSession): Promise<AIAnalysis> => {
  // @ts-ignore
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || process.env.API_KEY || "";
  const ai = new GoogleGenAI({ apiKey });
  
  const formattedData = {
    title: session.title,
    context: session.context,
    sides: session.sides,
    responses: session.responses.map(r => ({
      side: r.side,
      scores: r.scores,
      comments: r.comments
    }))
  };

  const prompt = `
    משימה: בצע ניתוח אסטרטגי עמוק לממשק ארגוני.
    
    מתודולוגיה מחייבת: ${PARTNERSHIP_METHODOLOGY}
    
    נתונים גולמיים: ${JSON.stringify(formattedData)}

    הנחיות לניתוח:
    1. השתמש במודל 5 התנאים (אג'נדה, תפקידים, החלטות, שגרות, יחסים).
    2. זהה חוזקות וחולשות בכל צד (מערכתי ויחסים).
    3. בצע "ניתוח השפעה" - איך הדרייברים משפיעים על שביעות הרצון (q23, q24).
    4. זהה פערי תפיסה (Gaps) בין הצדדים - איפה יש חוסר הלימה?

    החזר JSON במבנה המדויק הבא:
    {
      "strengths": { "systemic": ["חוזקה 1", "..."], "relational": ["חוזקה 1", "..."] },
      "weaknesses": { "systemic": ["חולשה 1", "..."], "relational": ["חולשה 1", "..."] },
      "recommendations": { "systemic": ["המלצה 1", "..."], "relational": ["המלצה 1", "..."] },
      "summary": "סיכום אסטרטגי קצר (עד 4 שורות) על מצב 'היישות השלישית' והמשתנה שהכי משפיע כרגע."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        temperature: 0.7
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Analysis failed:", error);
    throw new Error("המערכת נכשלה בניתוח הנתונים. וודא שמפתח ה-API תקין.");
  }
};
