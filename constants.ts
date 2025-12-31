
import { Category, Question } from './types';

export const DEFAULT_QUESTIONS: Question[] = [
  { id: 'sys1', category: Category.SYSTEMIC, text: 'מטרה משותפת וסדרי עדיפויות מסונכרנים' },
  { id: 'sys2', category: Category.SYSTEMIC, text: 'בהירות בתפקידים ובגבולות הגזרה' },
  { id: 'sys3', category: Category.SYSTEMIC, text: 'שגרות עבודה אפקטיביות ומובנות' },
  { id: 'rel1', category: Category.RELATIONAL, text: 'כבוד הדדי והערכה מקצועית' },
  { id: 'rel2', category: Category.RELATIONAL, text: 'מחויבות הדדית להצלחת הממשק' },
  { id: 'rel3', category: Category.RELATIONAL, text: 'שקיפות ופתיחות בשיתוף מידע' },
  { id: 'rel4', category: Category.RELATIONAL, text: 'קולגיאליות ותמיכה ברגעי משבר' },
  { id: 'rel5', category: Category.RELATIONAL, text: 'תקשורת חלקה ופתרון קונפליקטים ענייני' },
];

export const ANALYSIS_PROMPT_TEMPLATE = `
כמערכת AI מומחית לייעוץ ארגוני וניהול ממשקים, נתח את הנתונים של השותפות שלפניך.
השותפות הוערכה על ידי המשתתפים בשני צירים:
1. צד מערכתי (מנגנוני עבודה, מטרות, סדרי עדיפויות, תפקידים).
2. צד היחסים (אמון, כבוד, שקיפות, תקשורת, קולגיאליות).

עליך לספק ניתוח מעמיק הכולל:
- סיכום תמציתי ומנהלי של תמונת המצב.
- זיהוי חוזקות (Systemic ו-Relational בנפרד).
- זיהוי פערים/חולשות (Systemic ו-Relational בנפרד).
- 5 המלצות אופרטיביות "Quick Wins" לשיפור הממשק כבר מחר.

החזר את התשובה בפורמט JSON בלבד, בעברית תקנית ומקצועית:
{
  "strengths": { "systemic": ["חוזקה 1", "חוזקה 2"], "relational": ["חוזקה 1"] },
  "weaknesses": { "systemic": ["חולשה 1"], "relational": ["חולשה 1"] },
  "operationalRecommendations": ["המלצה 1", "המלצה 2", "המלצה 3", "המלצה 4", "המלצה 5"],
  "summary": "סיכום תמונת המצב..."
}
`;
