# Power Plan — AI Software Factory

> מרעיון לאפליקציה חיה ב-45 דקות, מופעל על ידי Claude AI

---

## הרצה מקומית

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (terminal נפרד)
cd frontend && npm install && npm run dev
```

העתק `backend/.env.example` → `backend/.env` ומלא את הערכים.

---

## Auto-Deploy — GitHub → Render

כל push ל-`main` מפעיל דיפלוי אוטומטי לRender דרך GitHub Actions.

### הגדרה חד-פעמית (נדרש רק פעם אחת)

1. עבור אל: **https://github.com/ShiranCohen86/power-plan/settings/secrets/actions/new**

2. הוסף שני secrets:

| שם ה-Secret | ערך |
|------------|-----|
| `RENDER_API_KEY` | מפתח ה-API מ-Render Dashboard → Account Settings → API Keys |
| `RENDER_SERVICE_ID` | `srv-d8abt928qa3s73encebg` |

3. לאחר ההוספה — כל `git push origin main` יפעיל דיפלוי אוטומטי.

### בדיקת סטטוס דיפלוי

- **GitHub Actions**: https://github.com/ShiranCohen86/power-plan/actions
- **Render Dashboard**: https://dashboard.render.com/web/srv-d8abt928qa3s73encebg

---

## Stack

| שכבה | טכנולוגיה |
|------|-----------|
| Backend | Node.js + Express + MongoDB + Mongoose |
| Frontend | React 18 + Vite + Redux Toolkit + SASS |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Real-time | Socket.io |
| Hosting | Render (backend) |
| Email | Resend |

---

## משתני סביבה (production — Render Dashboard)

| משתנה | תיאור |
|-------|-------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | סוד JWT (64 תווים רנדומליים) |
| `JWT_REFRESH_SECRET` | סוד refresh שונה מ-JWT_SECRET |
| `ANTHROPIC_API_KEY` | מפתח Anthropic של הפלטפורמה |
| `ENCRYPTION_KEY` | AES-256 key להצפנת keys של משתמשים (32 תווים) |
| `FRONTEND_URL` | URL של הפרונטאנד (ל-CORS) |
| `RESEND_API_KEY` | מפתח Resend לשליחת emails |
| `RENDER_API_KEY` | מפתח Render API לדיפלוי |
| `RENDER_OWNER_ID` | Owner ID ב-Render |

---

## Pipeline Phases

| # | שלב | Agent |
|---|-----|-------|
| 0 | הבנת הרעיון | IdeaAnalystAgent |
| 1 | גילוי מוצרי (PRD) | ProductDiscoveryAgent |
| 2 | ניתוח שוק | MarketAnalystAgent |
| 3 | ארכיטקטורת UX | UXArchitectAgent |
| 4 | ארכיטקטורה טכנית | TechArchitectAgent |
| 5 | עיצוב מערכת | SystemDesignAgent |
| 6 | עיצוב DB | DatabaseAgent |
| 7 | מערכת AI agents | AIAgentSystemAgent |
| 8 | תזמור | OrchestrationAgent |
| 9 | תכנון פיתוח | DevPlannerAgent |
| 10 | אסטרטגיית QA | QAAgent |
| 11 | אסטרטגיית DevOps | DevOpsAgent |
