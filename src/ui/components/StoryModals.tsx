// Các cửa sổ của lớp câu chuyện: thẻ kết quả sau quyết định, giấy khai sinh, mốc suy ngẫm, nút lưu/chia sẻ ảnh thẻ
import { useState } from 'react';
import type { BirthCardView, LifeCardView, Resolution } from '@core/index';
import { num, signed, useUi } from '../context';
import { cardFileName, drawBirthCard, drawLifeCard, downloadCanvas, shareCanvas } from './lifeCardImage';

/** Thẻ kết quả: hiện ngay sau khi chọn, ghi rõ được/mất gì — đọc xong mới cho thời gian chạy tiếp. */
export function ResultCard({ result }: { result: Resolution }) {
  const { store, t } = useUi();
  const items = Object.entries(result.deltas).filter(([, v]) => Math.abs(v) >= 0.05);
  return (
    <div className="modal-backdrop">
      <div className="event-card panel result-card">
        <div className="event-kicker">
          {t('result.kicker')}
          {result.success !== null && (
            <span className={`tag ${result.success ? 'good' : 'bad'}`}>{t(result.success ? 'result.success' : 'result.failure')}</span>
          )}
        </div>
        <h2 className="event-title">{result.title}</h2>
        <p className="muted small">{t('result.you_chose', { option: result.optionText })}</p>
        <p className="event-text">{result.resultText}</p>
        {items.length > 0 ? (
          <div className="result-deltas">
            {items.map(([k, v]) => {
              const good = k === 'debt' || k === 'stress' ? v < 0 : v > 0;
              return (
                <div key={k} className={`result-delta ${good ? 'up' : 'down'}`}>
                  <span>{t(`delta.${k}`)}</span>
                  <b>{signed(v)}</b>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted small">{t('result.no_change')}</p>
        )}
        <button className="primary wide" autoFocus onClick={() => store.dismissResult()}>
          {t('result.continue')}
        </button>
      </div>
    </div>
  );
}

/** Nút lưu ảnh / chia sẻ cho một thẻ đã vẽ. */
export function CardActions({ draw, fileName, title }: { draw: () => HTMLCanvasElement; fileName: string; title: string }) {
  const { t } = useUi();
  return (
    <div className="row card-actions">
      <button onClick={() => downloadCanvas(draw(), fileName)}>{t('card.save')}</button>
      <button onClick={() => void shareCanvas(draw(), fileName, title)}>{t('card.share')}</button>
    </div>
  );
}

export function BirthCardModal({ card }: { card: BirthCardView }) {
  const { store, t } = useUi();
  const style = store.content.balance.display.life_card;
  const yearLabel = card.birthYear < 0 ? t('year.bce', { year: Math.abs(card.birthYear) }) : String(card.birthYear);
  return (
    <div className="modal-backdrop">
      <div className="summary panel birth-card">
        <div className="event-kicker">
          {t('birth.kicker')}
          {card.eraName ? ` · ${card.eraName}` : ''}
        </div>
        <h2>{card.name}</h2>
        <p className="muted">
          {t(`birth.sex.${card.sex}`)}
          {card.polityName ? ` · ${card.polityName} (${card.regionLabel})` : ''}
        </p>
        <p className="event-text">
          {t('birth.born', { can: t(`canchi.can.${card.can}`), chi: t(`canchi.chi.${card.chi}`), year: yearLabel, village: card.settlementName })}
        </p>
        {card.polityName && (
          <p className="birth-origin">
            {t('birth.world_share', {
              polity: card.polityName,
              region: card.regionLabel,
              pct: card.worldPopSharePct,
            })}
          </p>
        )}
        <p className="birth-origin">{t('birth.origin', { origin: card.originName.toLowerCase(), pct: card.originSharePct })}</p>
        {card.historicalFact && <p className="muted small">{card.historicalFact}</p>}
        <ul className="highlights">
          {card.parents.map((p) => (
            <li key={p.relation}>{t(`birth.parent.${p.relation}`, { name: p.name, age: p.age })}</li>
          ))}
          {card.siblings > 0 && <li>{t('birth.siblings', { n: card.siblings })}</li>}
          <li>{t('birth.wealth', { farmland: card.farmland, money: num(card.money) })}</li>
          <li>{t('birth.expectancy', { n: card.lifeExpectancy })}</li>
          <li>{t('birth.demographics', { survival: card.childSurvivalPct, literacy: card.literacyPct })}</li>
        </ul>
        {card.peers.length > 0 && (
          <>
            <h4>{t('birth.peers_title')}</h4>
            <ul className="highlights">
              {card.peers.map((p) => (
                <li key={p.id}>
                  <b>{p.name}</b> <span className="muted">— {p.label}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <CardActions draw={() => drawBirthCard(card, style, t)} fileName={cardFileName('khai-sinh', card.name)} title={t('card.birth_title')} />
        <button className="primary wide" autoFocus onClick={() => store.closeBirthCard()}>
          {t('birth.begin')}
        </button>
      </div>
    </div>
  );
}

/** Mốc suy ngẫm: thời gian dừng lại, người chơi viết một dòng (cuối đời đọc lại). */
export function ReflectionModal({ due }: { due: { age: number; question: string } }) {
  const { store, t } = useUi();
  const [text, setText] = useState('');
  const max = store.content.balance.display.reflection_max_length;
  const submit = (value: string) => store.dispatch({ type: 'answerReflection', text: value });
  return (
    <div className="modal-backdrop">
      <div className="event-card panel reflection-card">
        <div className="event-kicker">{t('reflection.kicker')} · {t('reflection.age', { age: due.age })}</div>
        <h2 className="event-title reflection-question">{due.question}</h2>
        <textarea
          className="reflection-input"
          autoFocus
          maxLength={max}
          rows={3}
          value={text}
          placeholder={t('reflection.placeholder')}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="row">
          <button className="primary" disabled={!text.trim()} onClick={() => submit(text)}>
            {t('reflection.save')}
          </button>
          <button onClick={() => submit('')}>{t('reflection.skip')}</button>
        </div>
      </div>
    </div>
  );
}

/** Phần câu chuyện trong bản tổng kết đời: văn bia, bạn cùng lứa, những dòng đã viết, nút chia sẻ thẻ đời. */
export function LifeCardSection({ card }: { card: LifeCardView }) {
  const { store, t } = useUi();
  const style = store.content.balance.display.life_card;
  return (
    <div className="life-card-section">
      {card.epitaph && (
        <blockquote className="epitaph">
          <span className="muted small">{t('summary.epitaph')}</span>
          <p>“{card.epitaph}”</p>
        </blockquote>
      )}
      {card.peers.length > 0 && (
        <>
          <h4>{t('summary.peers_title')}</h4>
          <ul className="highlights">
            {card.peers.map((p) => (
              <li key={p.id} className={p.alive ? '' : 'muted'}>
                <b>{p.name}</b> <span className="muted">({p.label})</span> —{' '}
                {p.alive ? t('summary.peer_alive', { age: p.age }) : t('summary.peer_dead', { age: p.age, cause: p.causeName ?? '' })}
              </li>
            ))}
          </ul>
        </>
      )}
      {card.reflections.length > 0 && (
        <>
          <h4>{t('summary.reflections_title')}</h4>
          <ul className="highlights">
            {card.reflections.map((r) => (
              <li key={r.age}>
                <span className="muted">{t('reflection.age', { age: r.age })} · {r.question}</span>
                <div>{r.answer || <span className="muted">{t('summary.reflection_skipped')}</span>}</div>
              </li>
            ))}
          </ul>
        </>
      )}
      <CardActions draw={() => drawLifeCard(card, style, t)} fileName={cardFileName('mot-doi', card.name)} title={t('card.life_title')} />
    </div>
  );
}
