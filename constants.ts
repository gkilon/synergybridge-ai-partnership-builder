
import { Category, Question } from './types';

export const DEFAULT_QUESTIONS: Question[] = [
  // מנגנון (Systemic)
  { id: 'goal_1', category: Category.SYSTEMIC, text: 'המידה בה המטרה של הממשק ברורה ומוסכמת על שני הצדדים', shortLabel: 'מטרה' },
  { id: 'goal_2', category: Category.SYSTEMIC, text: 'המידה בה סדרי העדיפויות מסונכרנים בין היחידות', shortLabel: 'מטרה' },
  
  { id: 'roles_1', category: Category.SYSTEMIC, text: 'בהירות חלוקת האחריות וגבולות הגזרה בין הצוותים', shortLabel: 'תפקידים' },
  { id: 'roles_2', category: Category.SYSTEMIC, text: 'המידה בה אין כפילויות או "שטחים מתים" בביצוע המשימות', shortLabel: 'תפקידים' },
  
  { id: 'decisions_1', category: Category.SYSTEMIC, text: 'המידה בה תהליכי קבלת ההחלטות בממשק מהירים וענייניים', shortLabel: 'החלטות' },
  { id: 'decisions_2', category: Category.SYSTEMIC, text: 'בהירות לגבי מי מחליט מה ובאיזה פורום', shortLabel: 'החלטות' },
  
  { id: 'routines_1', category: Category.SYSTEMIC, text: 'קיומן של פגישות ושגרות עבודה קבועות שמקדמות את המטרות', shortLabel: 'שגרות' },
  { id: 'routines_2', category: Category.SYSTEMIC, text: 'האפקטיביות של שגרות העבודה הקיימות (ניהול זמן ותוצרים)', shortLabel: 'שגרות' },

  // יחסים (Relational)
  { id: 'transparency_1', category: Category.RELATIONAL, text: 'המידה בה מידע רלוונטי זורם בחופשיות בין הצדדים', shortLabel: 'שקיפות' },
  { id: 'transparency_2', category: Category.RELATIONAL, text: 'רמת הכנות והפתיחות בדיווח על תקלות או אתגרים', shortLabel: 'שקיפות' },
  
  { id: 'respect_1', category: Category.RELATIONAL, text: 'המידה בה יש הערכה מקצועית הדדית בין בעלי התפקידים', shortLabel: 'כבוד' },
  { id: 'respect_2', category: Category.RELATIONAL, text: 'שמירה על שיח מכבד גם במצבי לחץ או אי-הסכמה', shortLabel: 'כבוד' },
  
  { id: 'commitment_1', category: Category.RELATIONAL, text: 'רמת הגיוס והנרתמות של הצד השני להצלחת המשימות שלי', shortLabel: 'מחויבות' },
  { id: 'commitment_2', category: Category.RELATIONAL, text: 'המידה בה הצדדים מרגישים "באותה סירה" מול המשימה', shortLabel: 'מחויבות' },
  
  { id: 'comm_1', category: Category.RELATIONAL, text: 'זמינות ונגישות של השותפים בצד השני כשיש צורך', shortLabel: 'תקשורת' },
  { id: 'comm_2', category: Category.RELATIONAL, text: 'היכולת לפתור קונפליקטים בצורה ישירה וללא משקעים', shortLabel: 'תקשורת' },
];

export const ANALYSIS_PROMPT_TEMPLATE = `
כמערכת AI מומחית לייעוץ ארגוני וניהול ממשקים, נתח את הנתונים של השותפות שלפניך.
השותפות הוערכה על ידי המשתתפים בשני צירים (בסקאלה של 1 עד 7):
1. צד מערכתי (מנגנוני עבודה, מטרות, סדרי עדיפויות, תפקידים).
2. צד היחסים (אמון, כבוד, שקיפות, תקשורת, קולגיאליות).

הנתונים מוצגים לפי 8 פרמטרים מרכזיים (מטרה, תפקידים, החלטות, שגרות, שקיפות, כבוד, מחויבות, תקשורת).

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
