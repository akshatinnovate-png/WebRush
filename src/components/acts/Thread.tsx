import { useCallback, useMemo, useState } from 'react';
import { useData } from '../../hooks';
import { num } from '../../utils/format';
import { INK } from '../../constants/streams';
import type { GraphNode, NodeKind } from '../../types';

/**
 * Follow one collision all the way through.
 *
 * The constellation shows every tie at once, which is good for seeing shape
 * and bad for seeing a story. This pass does the opposite: it walks a single
 * path through the graph, hop by hop, always taking the strongest tie that
 * has not been used yet, and prints what each hop means in words.
 *
 * The result reads like a sentence assembled by the data — a band, the ledger
 * line that keeps landing on the same days, the town that keeps landing on
 * those — which is exactly the "unrelated receipts that turn out to be one
 * moment" the brief is asking for, but narrated rather than plotted.
 */

const KIND_NOUN: Record<NodeKind, string> = {
  artist: 'a band',
  ledger: 'a line in the household ledger',
  place: 'a town the card visited',
  spend: 'a class of merchant',
};

const KIND_INK: Record<NodeKind, string> = {
  artist: INK.music,
  ledger: INK.ledger,
  place: INK.place,
  spend: INK.ghost,
};

interface Hop {
  node: GraphNode;
  /** Shared days and lift against the previous hop; null for the first. */
  shared: number | null;
  lift: number | null;
}

/** Pass 07 — one chain of collisions, narrated. */
export default function Thread() {
  const { graph } = useData();
  const [seed, setSeed] = useState(0);

  const adjacency = useMemo(() => {
    const map = new Map<number, { id: number; shared: number; lift: number }[]>();
    graph?.edges.forEach(([a, b, shared, lift]) => {
      if (!map.has(a)) map.set(a, []);
      if (!map.has(b)) map.set(b, []);
      map.get(a)?.push({ id: b, shared, lift });
      map.get(b)?.push({ id: a, shared, lift });
    });
    map.forEach((l) => l.sort((p, q) => q.lift - p.lift));
    return map;
  }, [graph]);

  /**
   * Greedy strongest-tie walk. Prefers hops that change kind, because a chain
   * of six bands says much less than a band → a bus fare → a town.
   */
  const chain = useMemo<Hop[]>(() => {
    if (!graph || graph.nodes.length === 0) return [];
    const start = graph.nodes[seed % graph.nodes.length];
    const used = new Set<number>([start.id]);
    const hops: Hop[] = [{ node: start, shared: null, lift: null }];

    for (let step = 0; step < 5; step += 1) {
      const here = hops[hops.length - 1].node;
      const options = (adjacency.get(here.id) ?? []).filter((e) => !used.has(e.id));
      if (options.length === 0) break;
      const scored = options
        .map((e) => ({
          e,
          node: graph.nodes[e.id],
          score: e.lift * (graph.nodes[e.id].k === here.k ? 1 : 1.6),
        }))
        .sort((a, b) => b.score - a.score);
      const pick = scored[0];
      used.add(pick.node.id);
      hops.push({ node: pick.node, shared: pick.e.shared, lift: pick.e.lift });
    }
    return hops;
  }, [graph, adjacency, seed]);

  const reroll = useCallback(() => setSeed((s) => s + 7), []);

  if (!graph) {
    return (
      <article className="act act--pad">
        <p className="loading" role="status">
          Tracing the thread…
        </p>
      </article>
    );
  }

  const strongest = chain.reduce((best, h) => Math.max(best, h.lift ?? 0), 0);

  return (
    <article className="act act--pad act--thread">
      <header className="act__head">
        <h2 className="h-act">
          <span className="h-act__n">07</span> Follow one thread
        </h2>
        <p className="h-act__sub">
          The web shows every tie at once. This walks a single one, hop by hop, always taking
          the strongest link that has not been used — and tells you what each hop means.
        </p>
      </header>

      <ol className="thread" aria-label="A chain of connected things">
        {chain.map((hop, i) => (
          <li
            key={hop.node.id}
            className="thread__hop"
            style={{ '--ink': KIND_INK[hop.node.k], '--i': i } as React.CSSProperties}
          >
            {hop.lift !== null && (
              <p className="thread__link">
                <span className="thread__rail" aria-hidden="true" />
                turned up on the same day{' '}
                <b>
                  {hop.shared} time{hop.shared === 1 ? '' : 's'}
                </b>{' '}
                — <b>{hop.lift.toFixed(1)}×</b> more often than chance allows
              </p>
            )}
            <div className="thread__card">
              <span className="thread__n" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="thread__body">
                <h3>{hop.node.l}</h3>
                <p className="thread__kind">{KIND_NOUN[hop.node.k]}</p>
                {hop.node.d && <p className="thread__detail">{hop.node.d}</p>}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="thread__foot">
        <button className="btn" onClick={reroll}>
          Trace another thread
        </button>
        <p className="fine">
          {num(graph.nodes.length)} things, {num(graph.edges.length)} ties, and{' '}
          {chain.length} hops from one end of this chain to the other. The strongest link in it
          fires {strongest.toFixed(1)}× more often than chance — that is the whole test, applied
          one step at a time.
        </p>
      </div>
    </article>
  );
}
