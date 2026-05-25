import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { discoveryNextSSE } from '../../api/projects.api';

export default function DiscoveryChat({ projectId, onComplete }) {
  const { t } = useTranslation();

  const [messages, setMessages]   = useState([]);
  const [answers, setAnswers]     = useState([]);
  const [input, setInput]         = useState('');
  const [streaming, setStreaming] = useState(false);
  const [currentQ, setCurrentQ]   = useState('');
  const [finished, setFinished]   = useState(false);

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const abortRef    = useRef(null);

  useEffect(() => {
    fetchNextQuestion([]);
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentQ]);

  function fetchNextQuestion(currentAnswers) {
    setStreaming(true);
    setCurrentQ('');

    abortRef.current = discoveryNextSSE(projectId, currentAnswers, {
      onChunk(text) {
        setCurrentQ((prev) => prev + text);
      },
      onDone({ finished: done }) {
        setStreaming(false);
        setCurrentQ((prev) => {
          const question = prev.trim();
          if (question && question !== 'DISCOVERY_COMPLETE') {
            setMessages((m) => [...m, { role: 'assistant', text: question }]);
          }
          return '';
        });
        if (done) setFinished(true);
        else inputRef.current?.focus();
      },
      onError(err) {
        setStreaming(false);
        setCurrentQ('');
        setMessages((m) => [...m, { role: 'error', text: err.message }]);
      },
    });
  }

  function handleSend(e) {
    e.preventDefault();
    const answer = input.trim();
    if (!answer || streaming || finished) return;

    const lastQ = messages.filter((m) => m.role === 'assistant').slice(-1)[0]?.text || '';
    const newAnswers = [...answers, { question: lastQ, answer }];

    setAnswers(newAnswers);
    setMessages((m) => [...m, { role: 'user', text: answer }]);
    setInput('');
    fetchNextQuestion(newAnswers);
  }

  function handleFinish() {
    onComplete(answers);
  }

  return (
    <div className="discovery-chat">
      <div className="discovery-chat__header">
        <span className="discovery-chat__icon">🤖</span>
        <div>
          <h2 className="discovery-chat__title">{t('discovery.title')}</h2>
          <p className="discovery-chat__subtitle">{t('discovery.subtitle')}</p>
        </div>
      </div>

      <div className="discovery-chat__messages">
        {messages.map((msg, i) => (
          <div key={i} className={`discovery-msg discovery-msg--${msg.role}`}>
            {msg.role === 'assistant' && (
              <span className="discovery-msg__avatar">🤖</span>
            )}
            <div className="discovery-msg__bubble">{msg.text}</div>
            {msg.role === 'user' && (
              <span className="discovery-msg__avatar discovery-msg__avatar--user">👤</span>
            )}
          </div>
        ))}

        {(streaming || currentQ) && (
          <div className="discovery-msg discovery-msg--assistant">
            <span className="discovery-msg__avatar">🤖</span>
            <div className="discovery-msg__bubble discovery-msg__bubble--streaming">
              {currentQ || <span className="typing-dots"><span /><span /><span /></span>}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {finished ? (
        <div className="discovery-chat__finish">
          <p className="discovery-chat__finish-text">{t('discovery.allDone')}</p>
          <button className="btn btn--primary btn--full" onClick={handleFinish}>
            {t('discovery.startPipeline')} →
          </button>
        </div>
      ) : (
        <form className="discovery-chat__input-row" onSubmit={handleSend}>
          <input
            ref={inputRef}
            className="form-input discovery-chat__input"
            type="text"
            placeholder={streaming ? t('discovery.claudeTyping') : t('discovery.answerPlaceholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming || finished}
          />
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!input.trim() || streaming || finished}
          >
            {t('common.send')}
          </button>
        </form>
      )}
    </div>
  );
}
