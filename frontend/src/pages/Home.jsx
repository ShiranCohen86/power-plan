import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectCurrentUser } from '../store/slices/authSlice';
import { selectLanguage, toggleLanguage } from '../store/slices/uiSlice';
import { ALL_PHASES } from '../utils/phaseConfig';

const MOCKUP_PHASES = ALL_PHASES.slice(0, 7).map((p) => ({
  icon: p.icon,
  nameHe: p.nameHe,
  name: p.name,
}));

const PIPELINE_STRIP = [
  ...ALL_PHASES.map((p) => ({ icon: p.icon, nameHe: p.nameHe, name: p.name })),
  { icon: '☁️', nameHe: 'פריסה חיה', name: 'Live Deploy' },
];

const TECH_LOGOS = ['React', 'Node.js', 'MongoDB', 'GitHub', 'Render'];

const CHECKLIST_COUNT = 10;

function HomeChecklist() {
  const { t } = useTranslation();
  const items = Array.from({ length: CHECKLIST_COUNT }, (_, i) => ({
    title: t(`home.check${i + 1}Title`),
    sub:   t(`home.check${i + 1}Sub`),
  }));
  return (
    <section className="home-checklist home-reveal" aria-label="mobile quality checklist">
      <div className="home-checklist__inner">
        <div className="home-section-hd">
          <div className="home-tag">{t('home.checklistTag')}</div>
          <h2 className="home-section-title">{t('home.checklistTitle')}</h2>
          <p className="home-checklist__sub">{t('home.checklistSub')}</p>
        </div>
        <div className="home-checklist__grid">
          {items.map((item, i) => (
            <div
              key={i}
              className="home-checklist__item home-reveal"
              style={{ transitionDelay: `${(i % 5) * 0.07}s` }}
            >
              <span className="home-checklist__check" aria-hidden="true">✅</span>
              <div>
                <div className="home-checklist__item-title">{item.title}</div>
                <div className="home-checklist__item-sub">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.home-reveal');
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('is-visible'); }),
      { threshold: 0.1 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

export default function Home() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const lang = useSelector(selectLanguage);
  const [openFaq, setOpenFaq] = useState(null);

  useScrollReveal();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const features = [
    { icon: '🤖', title: t('home.feat1Title'), sub: t('home.feat1Sub') },
    { icon: '⚡', title: t('home.feat2Title'), sub: t('home.feat2Sub') },
    { icon: '🚀', title: t('home.feat3Title'), sub: t('home.feat3Sub') },
  ];

  const steps = [
    { num: '01', icon: '💡', title: t('home.step1Title'), sub: t('home.step1Sub') },
    { num: '02', icon: '🤖', title: t('home.step2Title'), sub: t('home.step2Sub') },
    { num: '03', icon: '🎉', title: t('home.step3Title'), sub: t('home.step3Sub') },
  ];

  const faqs = [
    { q: t('home.faq1Q'), a: t('home.faq1A') },
    { q: t('home.faq2Q'), a: t('home.faq2A') },
    { q: t('home.faq3Q'), a: t('home.faq3A') },
  ];

  return (
    <div className="home">

      {/* ── Navigation ──────────────────────────────────── */}
      <nav className="home-nav">
        <Link to="/" className="home-nav__brand">
          <span className="home-nav__logo">⚡</span>
          <span className="home-nav__name">Power Plan</span>
        </Link>
        <div className="home-nav__actions">
          <button className="btn-ghost home-nav__lang" onClick={() => dispatch(toggleLanguage())}>
            {lang === 'he' ? 'EN' : 'עב'}
          </button>
          <Link to="/login" className="btn-ghost home-nav__login">{t('home.signIn')}</Link>
          <Link to="/login" className="btn btn--primary home-nav__cta">{t('home.signIn')}</Link>
        </div>
      </nav>

      <main>

        {/* ── Hero ────────────────────────────────────────── */}
        <section className="home-hero" aria-label="hero">
          <div className="home-hero__glow" aria-hidden="true" />
          <div className="home-hero__grid" aria-hidden="true" />

          <div className="home-hero__inner">
            <div className="home-hero__left">
              <div className="home-hero__badge">✦ Powered by Claude Sonnet</div>
              <h1 className="home-hero__headline">
                {t('home.heroLine1')}<br />
                <span className="home-hero__accent">{t('home.heroLine2')}</span>
              </h1>
              <p className="home-hero__sub">{t('home.heroSub')}</p>
              <div className="home-hero__ctas">
                <Link to="/login?register=1" className="btn btn--primary home-hero__btn-primary">
                  {t('home.heroCTA')} →
                </Link>
                <Link to="/login" className="btn-ghost">
                  {t('home.heroSecondary')}
                </Link>
              </div>
            </div>

            <div className="home-hero__right" aria-hidden="true">
              <div className="home-hero__mockup">
                <div className="home-hero__mockup-bar">
                  <span className="home-hero__dot" />
                  <span className="home-hero__dot" />
                  <span className="home-hero__dot home-hero__dot--green" />
                  <span className="home-hero__mockup-title">⚡ Power Plan</span>
                </div>
                <div className="home-hero__phases">
                  {MOCKUP_PHASES.map((p, i) => (
                    <div
                      key={i}
                      className={`home-hero__phase home-hero__phase--${i < 3 ? 'done' : i === 3 ? 'active' : 'pending'}`}
                      style={{ animationDelay: `${i * 0.25}s` }}
                    >
                      <span className="home-hero__phase-icon">{p.icon}</span>
                      <span className="home-hero__phase-name">{lang === 'he' ? p.nameHe : p.name}</span>
                      <span className="home-hero__phase-status">
                        {i < 3 ? '✅' : i === 3 ? <span className="typing-dots"><span /><span /><span /></span> : '·'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pipeline strip ──────────────────────────────── */}
        <section className="home-pipeline home-reveal" aria-label="pipeline phases">
          <div className="home-pipeline__label">{t('home.pipelineLabel')}</div>
          <div className="home-pipeline__track">
            {PIPELINE_STRIP.map((p, i) => (
              <div key={i} className="home-pipeline__chip">
                <span>{p.icon}</span>
                <span className="home-pipeline__chip-name">{lang === 'he' ? p.nameHe : p.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ────────────────────────────────── */}
        <section className="home-how" aria-label="how it works">
          <div className="home-section-hd home-reveal">
            <div className="home-tag">{t('home.howTag')}</div>
            <h2 className="home-section-title">{t('home.howTitle')}</h2>
          </div>
          <div className="home-how__steps">
            {steps.map((s, i) => (
              <div key={i} className="home-how__step home-reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="home-how__num" aria-hidden="true">{s.num}</div>
                <div className="home-how__icon">{s.icon}</div>
                <h3 className="home-how__title">{s.title}</h3>
                <p className="home-how__sub">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ────────────────────────────────────── */}
        <section className="home-features" aria-label="features">
          <div className="home-section-hd home-reveal">
            <div className="home-tag">{t('home.featTag')}</div>
            <h2 className="home-section-title">{t('home.featTitle')}</h2>
          </div>
          <div className="home-features__grid">
            {features.map((f, i) => (
              <div key={i} className="home-feat-card home-reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="home-feat-card__header">
                  <h3 className="home-feat-card__title">{f.title}</h3>
                  <span className="home-feat-card__icon" aria-hidden="true">{f.icon}</span>
                </div>
                <p className="home-feat-card__sub">{f.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Trust ───────────────────────────────────────── */}
        <section className="home-trust home-reveal" aria-label="trust signals">
          <div className="home-trust__proof">🚀 127 {t('home.trustProof')}</div>
          <div className="home-trust__badge">✦ Powered by Claude Sonnet</div>
          <p className="home-trust__tagline">{t('home.trustTagline')}</p>
          <div className="home-trust__logos">
            {TECH_LOGOS.map((tech) => (
              <span key={tech} className="home-trust__chip">{tech}</span>
            ))}
          </div>
        </section>

        {/* ── CTA strip ───────────────────────────────────── */}
        <section className="home-cta home-reveal" aria-label="call to action">
          <p className="home-cta__pain">{t('home.ctaPain')}</p>
          <h2 className="home-cta__title">{t('home.ctaTitle')}</h2>
          <p className="home-cta__sub">{t('home.ctaSub')}</p>
          <Link to="/login?register=1" className="btn home-cta__btn">
            {t('home.ctaBtn')} →
          </Link>
        </section>

        {/* ── Mobile Gotchas Checklist ────────────────────── */}
        <HomeChecklist />

        {/* ── FAQ ─────────────────────────────────────────── */}
        <section className="home-faq home-reveal" aria-label="FAQ">
          <div className="home-section-hd">
            <h2 className="home-section-title">{t('home.faqTitle')}</h2>
          </div>
          <div className="home-faq__list">
            {faqs.map((faq, i) => (
              <div key={i} className={`home-faq__item${openFaq === i ? ' home-faq__item--open' : ''}`}>
                <button className="home-faq__q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <span className="home-faq__arrow">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && <div className="home-faq__a">{faq.a}</div>}
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="home-footer">
        <span className="home-footer__brand">⚡ Power Plan</span>
        <span className="home-footer__copy">© 2025</span>
        <div className="home-footer__links">
          <Link to="/login" className="home-footer__link">{t('home.signIn')}</Link>
          <Link to="/status" className="home-footer__link">Status</Link>
        </div>
      </footer>

    </div>
  );
}
