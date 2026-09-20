import { useEffect, useRef } from 'react';
import { num, pct, rupees, shortDate } from '../../utils/format';
import type { NodeKind, Selection } from '../../types';

const KIND_LABEL: Record<NodeKind, string> = {
  artist: 'band',
  ledger: 'ledger line',
  place: 'town',
  spend: 'merchant class',
};

interface Props {
  selection: Selection;
  onClose: () => void;
  onOpenDay: (iso: string) => void;
}

/** A drawer for whatever was last clicked. Escape closes it; focus lands inside. */
export default function Inspector({ selection, onClose, onOpenDay }: Props) {
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!selection) return;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection, onClose]);

  if (!selection) return null;

  return (
    <aside className="drawer" role="dialog" aria-modal="false" aria-label="Details">
      <button className="drawer__close" onClick={onClose} ref={close}>
        Close<span aria-hidden="true"> ×</span>
      </button>

      {selection.kind === 'node' && (
        <>
          <p className="drawer__kind">{KIND_LABEL[selection.node.k]}</p>
          <h3 className="drawer__title">{selection.node.l}</h3>
          <p className="drawer__meta">
            {selection.node.t} · {selection.node.d}
          </p>
          <h4 className="drawer__h">Turns up alongside</h4>
          {selection.neighbours.length === 0 ? (
            <p className="fine">Nothing else shares its days often enough to count.</p>
          ) : (
            <ul className="drawer__list">
              {selection.neighbours.map((n) => (
                <li key={n.node.id}>
                  <span className={`dot dot--${n.node.k}`} aria-hidden="true" />
                  <span className="drawer__n">{n.node.l}</span>
                  <span className="drawer__v">
                    {n.shared} shared days
                    <small>{n.lift.toFixed(1)}× chance</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {selection.kind === 'city' && (
        <>
          <p className="drawer__kind">town</p>
          <h3 className="drawer__title">{selection.city.name}</h3>
          <p className="drawer__meta">
            {selection.city.state || 'unrecorded state'} · mostly{' '}
            {selection.city.topCategory.replace(/_/g, ' ')}
          </p>
          <dl className="drawer__stats">
            <div>
              <dt>swipes</dt>
              <dd>{num(selection.city.swipes)}</dd>
            </div>
            <div>
              <dt>disputed</dt>
              <dd style={{ color: 'var(--ghost)' }}>{num(selection.city.disputed)}</dd>
            </div>
            <div>
              <dt>share disputed</dt>
              <dd>{pct(selection.city.disputed / selection.city.swipes, 0)}</dd>
            </div>
            <div>
              <dt>total charged</dt>
              <dd>{rupees(selection.city.amount, true)}</dd>
            </div>
          </dl>
        </>
      )}

      {selection.kind === 'era' && (
        <>
          <p className="drawer__kind">era</p>
          <h3 className="drawer__title">{selection.era.name}</h3>
          <p className="drawer__meta">
            {shortDate(selection.era.from)} → {shortDate(selection.era.to)}
          </p>
          <p className="drawer__blurb">{selection.era.blurb}</p>
          <dl className="drawer__stats">
            <div>
              <dt>plays</dt>
              <dd>{num(selection.era.plays)}</dd>
            </div>
            <div>
              <dt>hours listened</dt>
              <dd>{num(selection.era.hours)}</dd>
            </div>
            <div>
              <dt>artists</dt>
              <dd>{num(selection.era.artists)}</dd>
            </div>
            <div>
              <dt>spent</dt>
              <dd>{rupees(selection.era.spend, true)}</dd>
            </div>
            {selection.era.skipRate !== null && (
              <div>
                <dt>skipped</dt>
                <dd>{pct(selection.era.skipRate, 0)}</dd>
              </div>
            )}
            {selection.era.device && (
              <div>
                <dt>mostly on</dt>
                <dd>{selection.era.device}</dd>
              </div>
            )}
          </dl>
          {selection.era.topArtist && (
            <p className="drawer__blurb">
              The sound of it was <strong>{selection.era.topArtist}</strong> —{' '}
              {num(selection.era.topArtistPlays)} plays, most often{' '}
              <em>{selection.era.topTrack}</em>.
            </p>
          )}
          <button className="btn btn--small" onClick={() => onOpenDay(selection.era.from)}>
            Print the first day of this era
          </button>
        </>
      )}

      {selection.kind === 'month' && (
        <>
          <p className="drawer__kind">month</p>
          <h3 className="drawer__title">{selection.month}</h3>
          <dl className="drawer__stats">
            <div>
              <dt>plays</dt>
              <dd>{num(selection.plays)}</dd>
            </div>
            <div>
              <dt>minutes</dt>
              <dd>{num(selection.minutes)}</dd>
            </div>
            <div>
              <dt>ledger</dt>
              <dd>{rupees(selection.ledger, true)}</dd>
            </div>
            <div>
              <dt>card</dt>
              <dd>{rupees(selection.card, true)}</dd>
            </div>
            <div>
              <dt>disputed</dt>
              <dd style={{ color: 'var(--ghost)' }}>{rupees(selection.ghost, true)}</dd>
            </div>
          </dl>
        </>
      )}
    </aside>
  );
}
