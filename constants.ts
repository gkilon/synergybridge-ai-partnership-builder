
import { Category, Question } from './types';

export const PARTNERSHIP_METHODOLOGY = `
גישת "השותפות האקטיבית" (Active Partnership):
1. הרעיון המארגן: "היישות השלישית" (The Third Entity)
2. מודל 5 התנאים הקריטיים: אג'נדה, תפקידים, החלטות, שגרות, יחסים.
3. ניתוח השפעה (Key Driver Analysis): זיהוי הקשר בין דרייברים (תהליכים/יחסים) לבין התוצאה (שביעות רצון).
`;

export const DEFAULT_QUESTIONS: Question[] = [
  // --- צד המערכתי (דרייברים) ---
  { id: 'q1', category: Category.SYSTEMIC, text: 'המטרות המשותפות ברורות', shortLabel: 'אג\'נדה' },
  { id: 'q2', category: Category.SYSTEMIC, text: 'יש הסכמה על סדרי העדיפויות', shortLabel: 'אג\'נדה' },
  { id: 'q5', category: Category.SYSTEMIC, text: 'התפקידים ותחומי האחריות ברורים', shortLabel: 'תפקידים' },
  { id: 'q6', category: Category.SYSTEMIC, text: 'לכל אחד ברור מה מצופה ממנו', shortLabel: 'תפקידים' },
  { id: 'q8', category: Category.SYSTEMIC, text: 'ברור מי ואיך צריך לקבל החלטות', shortLabel: 'החלטות' },
  { id: 'q10', category: Category.SYSTEMIC, text: 'חברי השותפות מחויבים להחלטות', shortLabel: 'החלטות' },
  { id: 'q12', category: Category.SYSTEMIC, text: 'תהליכי העבודה המשותפים איכותיים', shortLabel: 'תהליכים' },
  { id: 'q13', category: Category.SYSTEMIC, text: 'קיימות שגרות עבודה מספקות', shortLabel: 'תהליכים' },

  // --- צד היחסים (דרייברים) ---
  { id: 'q15', category: Category.RELATIONAL, text: 'חברי השותפות מכבדים את הזמן אחד של השני', shortLabel: 'כבוד' },
  { id: 'q16', category: Category.RELATIONAL, text: 'קיימת הערכה לשונות ולערך המוסף', shortLabel: 'כבוד' },
  { id: 'q19', category: Category.RELATIONAL, text: 'המידע שאני צריך זמין עבורי', shortLabel: 'תקשורת' },
  { id: 'q20', category: Category.RELATIONAL, text: 'שמים דברים על השולחן ללא רתיעה', shortLabel: 'תקשורת' },

  // --- משתנים תלויים (Outcome) - לא יוצגו בגרף הדרייברים ---
  { id: 'q23', category: Category.SYSTEMIC, text: 'מהי מידת האפקטיביות של השותפות לדעתך?', shortLabel: 'OUTCOME_SATISFACTION' },
  { id: 'q24', category: Category.RELATIONAL, text: 'עד כמה אתה שבע רצון מהממשק?', shortLabel: 'OUTCOME_SATISFACTION' },
];
