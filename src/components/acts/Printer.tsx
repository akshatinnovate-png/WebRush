import { useCallback, useEffect, useMemo, useState } from 'react';
import { useData, useDay, useDayIndex } from '../../hooks';
import { useReducedMotion } from '../../hooks';
import { clockTime, hash01, longDate, num, rupees, secs, shortDate } from '../../utils/format';
import type { Core, Moment } from '../../types';

/**
 * One day, printed.
 *
 * This is the literal reading of the brief: a receipt. Everything else in the
 * project aggregates, so one pass is reserved for the opposite move — the
 * grain of a single Tuesday, with the songs in clock order and the ₹56 of milk
 * sitting under them.
 */

interface Props {
  core: Core;
  day: string | null;
  onDay: (iso: string) => void;
}

const PLATFORM = ['', 'android', 'iOS', 'windows', 'mac', 'web player', 'cast to device'];

/** Pass 04 — any single day, printed as a receipt. */
export default function Printer({ core, day, onDay }: Props) {
  const { days, moments } = useData();
  const index = useDayIndex();
  const reduced = useReducedMotion();
  const [copied, setCopied] = useState(false);

  /** The day with the most plays is a 1,816-track skipping spree — fascinating,
      but a bad first impression. Open on the fullest *balanced* day instead. */
  const loudest = useMemo(
    () => (days ? days.reduce((a, b) => (b.plays > a.plays ? b : a)) : null),
    [days],
  );
  const richest = useMemo(() => {
    if (!days) return null;
    const score = (d: (typeof days)[number]) => d.minutes + (d.ledgerN + d.cardN) * 40;
    return days.reduce((a, b) => (score(b) > score(a) ? b : a)).date;
  }, [days]);

  useEffect(() => {
    if (!day && richest) onDay(richest);
  }, [day, richest, onDay]);

  const date = day ?? richest ?? core.meta.from;
  const items = useDay(date);
  const row = index.get(date);

  const shift = useCallback(
    (delta: number) => {
      const d = new Date(`${date}T12:00:00`);
      d.setDate(d.getDate() + delta);
      const iso = d.toISOString().slice(0, 10);
      if (iso >= core.meta.from && iso <= core.meta.to) onDay(iso);
    },
    [date, core.meta, onDay],
  );

  const wander = useCallback(() => {
    if (!days) return;
    const busy = days.filter((d) => d.plays + d.ledgerN + d.cardN > 3);
    onDay(busy[Math.floor(Math.random() * busy.length)].date);
  }, [days, onDay]);

  const music = items.filter((m) => m.stream === 0);
  const ledger = items.filter((m) => m.stream === 1);
  const card = items.filter((m) => m.stream === 2);
  const spend = (row?.ledgerAmt ?? 0) + (row?.cardAmt ?? 0);
  const era = core.eras.find((e) => date >= e.from && date <= e.to);
  const rand = useMemo(() => hash01(date), [date]);
  const bars = useMemo(() => Array.from({ length: 52 }, () => 1 + Math.round(rand() * 3)), [rand]);
  const serial = useMemo(() => `CC-${date.replace(/-/g, '')}-${Math.floor(rand() * 9000) + 1000}`, [date, rand]);

  const asText = useCallback(() => {
    const L: string[] = [
      'CARBON COPY — DAILY RECORD',
      longDate(date).toUpperCase(),
      era ? `ERA: ${era.name}` : '',
      '',
    ];
    if (music.length) {
      L.push('MUSIC');
      music.forEach((m) => L.push(`  ${clockTime(m.hour).padEnd(6)} ${m.title} — ${m.sub} (${secs(m.value)})`));
      if (row && row.plays > music.length) L.push(`  + ${row.plays - music.length} more plays`);
      L.push('');
    }
    if (ledger.length) {
      L.push('HOUSEHOLD LEDGER');
      ledger.forEach((m) => L.push(`  ${m.title} — ${m.sub} ₹${m.value}${m.meta ? ` (${m.meta})` : ''}`));
      L.push('');
    }
    if (card.length) {
      L.push('CARD');
      card.forEach((m) =>
        L.push(`  ${m.title} — ${m.sub} ₹${num(m.value)}${m.flag === 1 ? '  ** DISPUTED **' : ''}`),
      );
      L.push('');
    }
    L.push(`PLAYS      ${row?.plays ?? 0}`);
    L.push(`MINUTES    ${row?.minutes ?? 0}`);
    L.push(`SPENT      ₹${num(spend)}`);
    L.push(serial);
    return L.filter((l) => l !== undefined).join('\n');
  }, [card, date, era, ledger, music, row, serial, spend]);

  const download = () => {
    const blob = new Blob([asText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carbon-copy-${date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2400);
  };

  if (!moments) {
    return (
      <article className="act act--pad">
        <p className="loading" role="status">
          Warming the print head…
        </p>
      </article>
    );
  }

  // The print head works top to bottom. Delays are derived from each line's
  // position rather than a mutable counter, because the blocks render after
  // their parent and a counter would scramble the order.
  const at = (i: number) => (reduced ? 0 : i * 0.028);
  const musicAt = 3;
  const ledgerAt = musicAt + (music.length ? music.length + 2 : 0);
  const cardAt = ledgerAt + (ledger.length ? ledger.length + 1 : 0);
  const totalsAt = cardAt + (card.length ? card.length + 1 : 0);

  return (
    <article className="act act--pad act--printer">
      <header className="act__head">
        <h2 className="h-act">
          <span className="h-act__n">04</span> One day, printed
        </h2>
        <p className="h-act__sub">
          {num(core.meta.spanDays)} days are on file and {num(core.meta.activeDays)} of them have
          music on them. Pick any one.
        </p>
      </header>

      <div className="printer">
        <div className="printer__controls">
          <div className="ctl">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={date}
              min={core.meta.from}
              max={core.meta.to}
              onChange={(e) => e.target.value && onDay(e.target.value)}
            />
          </div>
          <div className="ctl__row">
            <button className="btn btn--small btn--quiet" onClick={() => shift(-1)}>
              ← day
            </button>
            <button className="btn btn--small btn--quiet" onClick={() => shift(1)}>
              day →
            </button>
          </div>
          <button className="btn btn--small" onClick={wander}>
            Somewhere random
          </button>
          {loudest && (
            <button className="btn btn--small btn--quiet" onClick={() => onDay(loudest.date)}>
              The day of {num(loudest.plays)} songs
            </button>
          )}
          <button className="btn btn--small btn--quiet" onClick={() => onDay('2014-06-15')}>
            A day inside the silent year
          </button>
          <button className="btn btn--small btn--quiet" onClick={download}>
            {copied ? 'Saved to your machine' : 'Download this receipt'}
          </button>
          {era && (
            <p className="printer__era">
              <span>{era.name}</span>
              {era.blurb}
            </p>
          )}
        </div>

        <div className="receipt-shell">
          <section className="receipt paper" key={date} aria-label={`Receipt for ${longDate(date)}`}>
            <header className="receipt__head" style={{ '--d': `${at(0)}s` } as React.CSSProperties}>
              <h3>Carbon Copy</h3>
              <p>daily record · no refunds · no returns</p>
            </header>

            <p className="receipt__date" style={{ '--d': `${at(1)}s` } as React.CSSProperties}>
              {longDate(date)}
            </p>

            <dl className="receipt__meta" style={{ '--d': `${at(2)}s` } as React.CSSProperties}>
              <div>
                <dt>terminal</dt>
                <dd>{PLATFORM[music[0]?.flag ?? 0] || '—'}</dd>
              </div>
              <div>
                <dt>era</dt>
                <dd>{era?.name ?? '—'}</dd>
              </div>
            </dl>

            {items.length === 0 ? (
              <p className="receipt__empty" style={{ '--d': `${at(3)}s` } as React.CSSProperties}>
                Nothing was itemised on this day. There are 1,041 such days, and 363 of them —
                every single one — fall inside 2014, the year this life left no trace at all.
              </p>
            ) : (
              <>
                {music.length > 0 && (
                  <Block
                    title="Music"
                    ink="var(--music)"
                    items={music}
                    start={musicAt}
                    at={at}
                    render={(m) => (
                      <>
                        <span className="receipt__time">{clockTime(m.hour)}</span>
                        <span className="receipt__name">
                          {m.title}
                          <small>{m.sub}</small>
                        </span>
                        <span className="receipt__amt">{secs(m.value)}</span>
                      </>
                    )}
                    footer={
                      row && row.plays > music.length
                        ? `+ ${num(row.plays - music.length)} more plays this day, not itemised`
                        : undefined
                    }
                  />
                )}

                {ledger.length > 0 && (
                  <Block
                    title="Household ledger"
                    ink="var(--ledger)"
                    items={ledger}
                    start={ledgerAt}
                    at={at}
                    render={(m) => (
                      <>
                        <span className="receipt__time">{m.flag === 1 ? 'in' : m.flag === 2 ? 'mv' : 'ex'}</span>
                        <span className="receipt__name">
                          {m.title}
                          <small>{m.meta || m.sub}</small>
                        </span>
                        <span className="receipt__amt">{rupees(m.value)}</span>
                      </>
                    )}
                  />
                )}

                {card.length > 0 && (
                  <Block
                    title="Card"
                    ink="var(--place)"
                    items={card}
                    start={cardAt}
                    at={at}
                    render={(m) => (
                      <>
                        <span className="receipt__time">{clockTime(m.hour)}</span>
                        <span className="receipt__name">
                          {m.title}
                          <small>
                            {m.sub.replace(/_/g, ' ')}
                            {m.meta ? ` · ${m.meta}` : ''}
                          </small>
                        </span>
                        <span className={`receipt__amt${m.flag === 1 ? ' is-ghost' : ''}`}>
                          {rupees(m.value)}
                          {m.flag === 1 && <em>disputed</em>}
                        </span>
                      </>
                    )}
                  />
                )}
              </>
            )}

            <dl className="receipt__totals" style={{ '--d': `${at(totalsAt)}s` } as React.CSSProperties}>
              <div>
                <dt>plays</dt>
                <dd>{num(row?.plays ?? 0)}</dd>
              </div>
              <div>
                <dt>minutes</dt>
                <dd>{num(row?.minutes ?? 0)}</dd>
              </div>
              <div>
                <dt>after midnight</dt>
                <dd>{num(row?.night ?? 0)}</dd>
              </div>
              <div>
                <dt>top of the day</dt>
                <dd>{row?.topArtist ?? '—'}</dd>
              </div>
              <div className="receipt__grand">
                <dt>total</dt>
                <dd>{rupees(spend)}</dd>
              </div>
            </dl>

            <div className="receipt__foot" style={{ '--d': `${at(totalsAt + 1)}s` } as React.CSSProperties}>
              <svg className="barcode" viewBox={`0 0 ${bars.length * 4} 34`} aria-hidden="true">
                {bars.map((w, i) => (
                  <rect key={`${i}-${w}`} x={i * 4} y="0" width={w} height="34" fill="#241c18" />
                ))}
              </svg>
              <p className="receipt__serial">{serial}</p>
              <p className="receipt__thanks">this copy retained for the record</p>
            </div>
          </section>
        </div>
      </div>

      <p className="fine fine--center">
        Currently showing {shortDate(date)}. The printer respects reduced-motion settings — if
        you have them on, the page arrives all at once.
      </p>
    </article>
  );
}

function Block({
  title,
  ink,
  items,
  render,
  start,
  at,
  footer,
}: {
  title: string;
  ink: string;
  items: Moment[];
  render: (m: Moment) => React.ReactNode;
  /** Line number this block starts on, so the stagger stays in reading order. */
  start: number;
  at: (i: number) => number;
  footer?: string;
}) {
  return (
    <section className="receipt__block" style={{ '--ink': ink } as React.CSSProperties}>
      <h4 style={{ '--d': `${at(start)}s` } as React.CSSProperties}>{title}</h4>
      <ul>
        {items.map((m, i) => (
          <li
            key={`${m.title}-${m.hour}-${i}`}
            style={{ '--d': `${at(start + 1 + i)}s` } as React.CSSProperties}
          >
            {render(m)}
          </li>
        ))}
      </ul>
      {footer && (
        <p
          className="receipt__more"
          style={{ '--d': `${at(start + 1 + items.length)}s` } as React.CSSProperties}
        >
          {footer}
        </p>
      )}
    </section>
  );
}
