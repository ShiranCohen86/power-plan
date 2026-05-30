import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { safeRequest } from '../../api/request';

async function fetchSetupStatus() {
  return safeRequest({ method: 'get', url: '/admin/setup-status' });
}

// ── Step component ────────────────────────────────────────────────────────────

function Step({ number, text, code, link, linkLabel }) {
  return (
    <div className="setup-step">
      <span className="setup-step__num">{number}</span>
      <div className="setup-step__body">
        <p className="setup-step__text" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text, { ALLOWED_TAGS: ['strong', 'code', 'a'], ALLOWED_ATTR: ['href', 'target', 'rel'] }) }} />
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="setup-step__link">
            → {linkLabel || link}
          </a>
        )}
        {code && (
          <div className="setup-step__code">{code}</div>
        )}
      </div>
    </div>
  );
}

// ── Service card ──────────────────────────────────────────────────────────────

function ServiceCard({ emoji, name, tagline, configured, required, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen || !configured);

  return (
    <div className={`setup-service ${configured ? 'setup-service--ok' : required ? 'setup-service--required' : 'setup-service--optional'}`}>
      <button className="setup-service__header" onClick={() => setOpen((o) => !o)}>
        <span className="setup-service__emoji">{emoji}</span>
        <div className="setup-service__info">
          <span className="setup-service__name">{name}</span>
          <span className="setup-service__tagline">{tagline}</span>
        </div>
        <div className="setup-service__badges">
          {required && !configured && <span className="setup-badge setup-badge--required">חובה</span>}
          {!required && !configured && <span className="setup-badge setup-badge--optional">אופציונלי</span>}
          {configured
            ? <span className="setup-badge setup-badge--ok">✓ מחובר</span>
            : <span className="setup-badge setup-badge--missing">לא מוגדר</span>
          }
        </div>
        <span className="setup-service__chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="setup-service__body">
          {children}
          {configured && (
            <div className="setup-service__ok-note">✅ השירות מחובר ופועל</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Env snippet helper ────────────────────────────────────────────────────────

function EnvNote({ vars }) {
  return (
    <div className="setup-env-note">
      <div className="setup-env-note__label">הוסף ל-<code>backend/.env</code>:</div>
      <div className="setup-env-note__code">
        {vars.map((v) => <div key={v}>{v}</div>)}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PlatformSetup() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setStatus(await fetchSetupStatus());
      } catch {
        setStatus(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      setStatus(await fetchSetupStatus());
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={{ padding: 24 }}><div className="pwa-spinner" /></div>;
  if (!status)  return <div style={{ padding: 24, color: 'var(--danger)' }}>נכשל לטעון סטטוס</div>;

  const s = status.services;

  return (
    <div className="platform-setup">
      {/* Header status bar */}
      <div className={`setup-status-bar ${status.allConfigured ? 'setup-status-bar--ok' : status.pipelineReady ? 'setup-status-bar--partial' : 'setup-status-bar--missing'}`}>
        <div className="setup-status-bar__icon">
          {status.allConfigured ? '🟢' : status.pipelineReady ? '🟡' : '🔴'}
        </div>
        <div className="setup-status-bar__text">
          {status.allConfigured
            ? 'כל השירותים מחוברים — הפלטפורמה מוכנה לשימוש מלא'
            : status.pipelineReady
            ? 'הפייפליין עובד · שלב הדיפלוי עדיין לא מוגדר'
            : 'Anthropic API key חסר — הפלטפורמה לא תפעל עד שתגדיר אותו'}
        </div>
        <button className="btn btn--secondary" style={{ minHeight: 32, padding: '4px 16px', fontSize: 12 }} onClick={refresh}>
          רענן
        </button>
      </div>

      <div className="setup-intro">
        <p>כאן תגדיר את כל השירותים שPower Plan צריך. כל שירות מגיע עם הסברים מפורטים.</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          אחרי כל שינוי ב-<code>.env</code> — הפעל מחדש את השרת (<code>npm run dev</code>) ולחץ "רענן" כאן.
        </p>
      </div>

      {/* ── 1. Anthropic ───────────────────────────────────────────────────── */}
      <ServiceCard
        emoji="🧠"
        name="Anthropic — מנוע ה-AI"
        tagline="חובה · בלעדיו אין AI, אין pipeline, אין כלום"
        configured={s.anthropic.configured}
        required={true}
        defaultOpen={!s.anthropic.configured}
      >
        <div className="setup-service__desc">
          זהו ה-API של Claude — כל 12 שלבי התכנון, הישיבות, וה-code generation רצים דרכו.
        </div>
        <Step number="1" text="לך לאתר Anthropic Console" link="https://console.anthropic.com" linkLabel="console.anthropic.com" />
        <Step number="2" text='הירשם עם האימייל שלך ← לחץ "Create account"' />
        <Step number="3" text='בתפריט השמאלי לחץ על <strong>"API Keys"</strong>' />
        <Step number="4" text='לחץ <strong>"+ Create Key"</strong> ← תן לו שם כמו "power-plan" ← לחץ Create' />
        <Step number="5" text='העתק את ה-key (מתחיל ב-<code>sk-ant-api03-...</code>) — תראה אותו רק פעם אחת!' />
        <Step number="6" text="הוסף ל-.env:" code="ANTHROPIC_API_KEY=sk-ant-api03-..." />
        <Step number="7" text='<strong>טען קרדיט</strong> ← "Billing" ← "Add credits" ← $5 מספיקים להתחלה' link="https://console.anthropic.com/settings/billing" linkLabel="console.anthropic.com/settings/billing" />
        <EnvNote vars={['ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE']} />
      </ServiceCard>

      {/* ── 2. Encryption key ──────────────────────────────────────────────── */}
      <ServiceCard
        emoji="🔐"
        name="Encryption Key — הצפנת נתונים"
        tagline="חובה · מצפין API keys של משתמשים ב-DB"
        configured={s.encryption.configured}
        required={true}
      >
        <div className="setup-service__desc">
          מפתח אקראי בן 32+ תווים שמצפין את ה-Anthropic API keys שמשתמשי Starter מכניסים.
          בלעדיו, הגדרת API key תיכשל.
        </div>
        <Step number="1" text="הרץ בטרמינל כדי לייצר מפתח אקראי:" code="node -e &quot;console.log(require('crypto').randomBytes(32).toString('hex'))&quot;" />
        <Step number="2" text="העתק את הפלט (64 תווים hex) והוסף ל-.env:" />
        <EnvNote vars={['ENCRYPTION_KEY=a1b2c3d4e5f6...  (64 תווים hex)']} />
      </ServiceCard>

      {/* ── 3. GitHub ──────────────────────────────────────────────────────── */}
      <ServiceCard
        emoji="🐙"
        name="GitHub — אחסון קוד"
        tagline="נדרש לדיפלוי · Power Plan יוצר repo לכל אפליקציה"
        configured={s.github.configured}
        required={false}
      >
        <div className="setup-service__desc">
          Power Plan יוצר GitHub repo חדש לכל אפליקציה שמשתמש בונה, ומעלה אליו את הקוד שנוצר.
          ה-repo הוא שמאפשר ל-Render לעשות deploy.
        </div>
        <Step number="1" text="היכנס ל-GitHub עם החשבון שלך" link="https://github.com" linkLabel="github.com" />
        <Step number="2" text='לך ל: <strong>Settings ← Developer Settings ← Personal access tokens ← Tokens (classic)</strong>' link="https://github.com/settings/tokens" linkLabel="github.com/settings/tokens" />
        <Step number="3" text='לחץ <strong>"Generate new token (classic)"</strong>' />
        <Step number="4" text='שם: "power-plan-deploy" ← Expiration: "No expiration" ← סמן:' code="✅ repo  (כולל כל ה-sub-items)&#10;✅ delete_repo" />
        <Step number="5" text='לחץ <strong>"Generate token"</strong> ← העתק (מתחיל ב-ghp_...)' />
        <Step number="6" text='(אופציונלי) צור Organization: "power-plan-apps" ← כל ה-repos יהיו שם' link="https://github.com/organizations/new" linkLabel="צור Organization" />
        <EnvNote vars={[
          'GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE',
          'GITHUB_ORG=power-plan-apps  # שם ה-Organization (או שם המשתמש שלך)',
        ]} />
      </ServiceCard>

      {/* ── 4. Render ──────────────────────────────────────────────────────── */}
      <ServiceCard
        emoji="🚀"
        name="Render — הפעלת האפליקציות"
        tagline="נדרש לדיפלוי · כל אפליקציה רצה ב-Render"
        configured={s.render.configured}
        required={false}
      >
        <div className="setup-service__desc">
          Render הוא הענן שעל גביו רצות האפליקציות שמשתמשים מייצרים.
          Power Plan יוצר שירות חדש ב-Render לכל לקוח — אוטומטית.
        </div>
        <Step number="1" text="היכנס ל-Render" link="https://render.com" linkLabel="render.com" />
        <Step number="2" text='לחץ "Get started for free" ← הירשם עם GitHub' />
        <Step number="3" text='לך ל: <strong>Account Settings ← API Keys ← Create API Key</strong>' link="https://dashboard.render.com/u/settings#api-keys" linkLabel="dashboard.render.com ← Settings ← API Keys" />
        <Step number="4" text='תן שם "power-plan" ← לחץ Create ← העתק את ה-key' />
        <Step number="5" text='מצא את ה-Owner ID שלך: ב-URL של ה-dashboard יופיע <code>usr-XXXXX</code> או <code>tea-XXXXX</code>' />
        <EnvNote vars={[
          'RENDER_API_KEY=rnd_YOUR_KEY_HERE',
          'RENDER_OWNER_ID=usr_XXXXX  # מה-URL ב-Render dashboard',
        ]} />
      </ServiceCard>

      {/* ── 5. MongoDB Atlas ───────────────────────────────────────────────── */}
      <ServiceCard
        emoji="🍃"
        name="MongoDB Atlas — מסד נתונים לאפליקציות"
        tagline="נדרש לדיפלוי · כל אפליקציה מקבלת DB נפרד"
        configured={s.atlas.configured}
        required={false}
      >
        <div className="setup-service__desc">
          כשמשתמש מייצר אפליקציה, Power Plan יוצר עבורה DB נפרד ב-Atlas — אוטומטית, ללא מגע אנושי.
          (זה שונה מה-MongoDB של Power Plan עצמה — זה של האפליקציות שנוצרות)
        </div>
        <Step number="1" text="היכנס ל-MongoDB Atlas" link="https://cloud.mongodb.com" linkLabel="cloud.mongodb.com" />
        <Step number="2" text='הירשם ← צור Organization ← צור Project (שם: "power-plan-apps")' />
        <Step number="3" text='צור Cluster: <strong>Build a Database ← Free (M0)</strong> ← בחר אזור קרוב ← "Create"' />
        <Step number="4" text='<strong>Project Settings ← Access Manager ← API Keys ← Create API Key</strong>' link="https://cloud.mongodb.com" linkLabel="cloud.mongodb.com ← Project Settings" />
        <Step number="5" text='הרשאה: <strong>Project Owner</strong> ← צור ← שמור Public Key + Private Key' />
        <Step number="6" text='מצא Project ID: ב-URL תופיע <code>/project/XXXXXXXXXXXXXXXX/</code>' />
        <Step number="7" text='מצא Cluster Host: ב-Atlas ← Databases ← Connect ← ה-hostname (כמו <code>cluster0.abc12.mongodb.net</code>)' />
        <EnvNote vars={[
          'ATLAS_PUBLIC_KEY=abcdefgh',
          'ATLAS_PRIVATE_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          'ATLAS_PROJECT_ID=64a1b2c3d4e5f6a7b8c9d0e1',
          'ATLAS_CLUSTER_NAME=powerplan-cluster',
          'ATLAS_CLUSTER_HOST=cluster0.abc12.mongodb.net',
        ]} />
      </ServiceCard>

      {/* ── 6. Cloudinary ──────────────────────────────────────────────────── */}
      <ServiceCard
        emoji="🖼️"
        name="Cloudinary — מדיה ותמונות"
        tagline="אופציונלי · אם האפליקציה שנוצרת צריכה העלאת תמונות"
        configured={s.cloudinary.configured}
        required={false}
      >
        <div className="setup-service__desc">
          Power Plan מגדיר upload preset ב-Cloudinary לכל אפליקציה שנוצרת.
          ללא זה — האפליקציות יפעלו אבל לא יתמכו בהעלאת תמונות.
        </div>
        <Step number="1" text="הירשם ל-Cloudinary (חינמי)" link="https://cloudinary.com/users/register/free" linkLabel="cloudinary.com ← Sign Up Free" />
        <Step number="2" text='ב-Dashboard ← פתח "API Keys" ← תראה Cloud Name, API Key, API Secret' link="https://console.cloudinary.com/settings/api-keys" linkLabel="console.cloudinary.com ← Settings ← API Keys" />
        <EnvNote vars={[
          'CLOUDINARY_CLOUD_NAME=your-cloud-name',
          'CLOUDINARY_API_KEY=123456789012345',
          'CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz',
        ]} />
      </ServiceCard>

      {/* ── 7. Resend ──────────────────────────────────────────────────────── */}
      <ServiceCard
        emoji="📧"
        name="Resend — שליחת אימיילים"
        tagline="אופציונלי · אימייל 'האפליקציה שלך חיה!' ללקוח"
        configured={s.resend.configured}
        required={false}
      >
        <div className="setup-service__desc">
          כשאפליקציה עולה לאוויר, Power Plan שולח אימייל חגיגי ללקוח עם הלינק.
          ללא זה — הכל עובד, רק אין אימייל.
        </div>
        <Step number="1" text="הירשם ל-Resend (חינמי — 3,000 מיילים/חודש)" link="https://resend.com/signup" linkLabel="resend.com ← Sign Up" />
        <Step number="2" text='ב-Dashboard: <strong>API Keys ← Add API Key</strong> ← שם: "power-plan" ← Create' link="https://resend.com/api-keys" linkLabel="resend.com/api-keys" />
        <Step number="3" text='(מומלץ) הוסף דומיין: <strong>Domains ← Add Domain</strong> ← הוסף DNS records ב-registrar שלך' />
        <Step number="4" text='בלי דומיין: השתמש ב-<code>onboarding@resend.dev</code> (מוגבל ל-100 מיילים/יום)' />
        <EnvNote vars={[
          'RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx',
          'RESEND_FROM=hello@powerplan.app  # כתובת השולח (הדומיין חייב להיות מאומת)',
        ]} />
      </ServiceCard>

      {/* ── Summary ────────────────────────────────────────────────────────── */}
      <div className="setup-summary">
        <h3 className="setup-summary__title">סיכום — סדר עדיפויות</h3>
        <div className="setup-priority-list">
          <div className="setup-priority-item">
            <span className="setup-priority-item__badge setup-priority-item__badge--1">1</span>
            <div>
              <strong>Anthropic API Key</strong> — בלעדיו הפלטפורמה לא תפעל כלל
            </div>
          </div>
          <div className="setup-priority-item">
            <span className="setup-priority-item__badge setup-priority-item__badge--2">2</span>
            <div>
              <strong>Encryption Key</strong> — נדרש לתמיכה במשתמשי Starter עם מפתח אישי
            </div>
          </div>
          <div className="setup-priority-item">
            <span className="setup-priority-item__badge setup-priority-item__badge--3">3</span>
            <div>
              <strong>GitHub + Render + Atlas</strong> — נדרשים כדי שהאפליקציה שנוצרת תעלה לאוויר
            </div>
          </div>
          <div className="setup-priority-item">
            <span className="setup-priority-item__badge setup-priority-item__badge--4">4</span>
            <div>
              <strong>Cloudinary + Resend</strong> — אופציונלי, ניתן להוסיף בהמשך
            </div>
          </div>
        </div>
        <p className="setup-summary__note">
          💡 לבדיקת ה-pipeline המלא (12 שלבים + יועצים + code gen) דרוש רק שלב 1.
          שלב הדיפלוי (GitHub/Render/Atlas) ניתן להוסיף מאוחר יותר.
        </p>
      </div>
    </div>
  );
}
