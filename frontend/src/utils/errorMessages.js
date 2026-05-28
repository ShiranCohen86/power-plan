const ERROR_MAP = [
  [/network error/i,              'בעיית חיבור לאינטרנט — בדוק את החיבור שלך'],
  [/pipeline already running/i,   'הפייפליין כבר רץ — המתן לסיומו'],
  [/quota|credit|billing/i,       'חרגת ממגבלת השימוש — נסה שוב בעוד שעה'],
  [/invalid credentials/i,        'אימייל או סיסמה שגויים'],
  [/account locked|נעול/i,        'החשבון נעול זמנית עקב ניסיונות כניסה רבים'],
  [/too many requests/i,          'יותר מדי בקשות — נסה שוב בעוד דקה'],
  [/not found/i,                  'הפריט לא נמצא'],
  [/forbidden/i,                  'אין לך הרשאה לפעולה זו'],
  [/unauthorized/i,               'נדרשת התחברות מחדש'],
  [/timeout/i,                    'הפעולה ארכה זמן רב מדי — נסה שוב'],
  [/anthropic|api key/i,          'שגיאה בתקשורת עם Claude — בדוק את מפתח ה-API'],
];

export function friendlyError(err) {
  const raw = err?.response?.data?.error || err?.message || '';
  for (const [pattern, friendly] of ERROR_MAP) {
    if (pattern.test(raw)) return friendly;
  }
  return raw || 'אירעה שגיאה — נסה שוב';
}
