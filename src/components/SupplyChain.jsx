import React from 'react';
import { Tile } from '@carbon/react';

const HEALTH = { green: '#42BE65', yellow: '#F1C21B', red: '#FA4D56' };

// A simplified Turbonomic supply chain: each entity type is a health ring with its count and a boxed label beneath.
// The first types form a single column joined by arrows; the last two (host and storage) sit side by side, both
// fed from the type above, as in Turbonomic's own view. The chain builds top to bottom: a row rises in, its rings
// draw, then the arrows below it draw down (a trim path with an easy ease) and land as the next row arrives.
// `play` turns off when the panel is hidden, so it replays next time.
const STEP = 520;        // ms between rows
const ARROW_START = 120; // ms after a row starts arriving that its arrows begin to draw
const BASE = 400;        // the panel itself rises in first

const SIZE = 44, R = 18.5, STROKE = 5, GAP = 2;   // ring geometry; GAP is the space between health segments

// Segments meet edge to edge; the gaps between them are cut by a mask of straight bars laid across the ring at
// each boundary, so every gap has parallel sides (a gap left in the stroke itself would be a wedge, wider outside).
function Ring({ segs, count, play, delay }) {
  const id = React.useId().replace(/:/g, '');
  const c = 2 * Math.PI * R, mid = SIZE / 2;
  let offset = 0, cum = 0;
  const cuts = segs.length > 1 ? segs.map(([, f]) => (cum += f) * 360) : [];
  return (
    <svg className="ring" width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
      <g transform={`rotate(-90 ${mid} ${mid})`}>
        <mask id={`gaps-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width={SIZE} height={SIZE}>
          <rect width={SIZE} height={SIZE} fill="#fff" />
          {cuts.map(deg => <rect key={deg} x={mid} y={mid - GAP / 2} width={mid} height={GAP} fill="#000" transform={`rotate(${deg} ${mid} ${mid})`} />)}
        </mask>
        <g mask={`url(#gaps-${id})`}>
          {segs.map(([col, f], k) => {
            const el = <circle key={k} className="ring__seg" cx={mid} cy={mid} r={R} fill="none" stroke={HEALTH[col]} strokeWidth={STROKE}
              strokeDashoffset={-offset}
              style={{ strokeDasharray: `${play ? f * c : 0} ${c}`, transitionDelay: play ? `${delay + 150 + k * 120}ms` : '0ms' }} />;
            offset += f * c;
            return el;
          })}
        </g>
      </g>
      <text x={SIZE / 2} y={SIZE / 2} dy="0.35em" textAnchor="middle" className="ring__count">{count}</text>
    </svg>
  );
}

function Node({ item, row, play }) {
  return (
    <div className="supply-chain__node" style={{ '--d': `${row * STEP}ms` }}>
      <Ring segs={item.segs} count={item.count} play={play} delay={BASE + row * STEP} />
      <span className="supply-chain__label" title={item.label}>{item.label}</span>
    </div>
  );
}

// Straight arrow: the head rides down on the tip of the line as it draws.
function Arrow({ row }) {
  return (
    <svg className="supply-chain__arrow" width="12" height="24" viewBox="0 0 12 24" aria-hidden="true"
      style={{ '--a': BASE + row * STEP + ARROW_START + 'ms' }}>
      <path className="supply-chain__shaft" d="M6 1 V18" pathLength="1" />
      <path className="supply-chain__head is-riding" d="M2 17 H10 L6 23 Z" />
    </svg>
  );
}

// Branching arrows from one node down to the two side-by-side nodes. Drawn in a 282-wide box (the panel's inner
// width); the two ends sit over the centers of the two columns. Heads appear as each curve lands.
const BW = 282, BH = 32, LEFT = 66.5, RIGHT = 215.5;
function Branch({ row }) {
  const mid = BW / 2;
  const curve = x => `M${mid} 1 C${mid} ${BH * 0.55}, ${x} ${BH * 0.3}, ${x} ${BH - 6}`;
  const head = x => `M${x - 4} ${BH - 7} H${x + 4} L${x} ${BH - 1} Z`;
  return (
    <svg className="supply-chain__arrow supply-chain__branch" width={BW} height={BH} viewBox={`0 0 ${BW} ${BH}`} aria-hidden="true"
      style={{ '--a': BASE + row * STEP + ARROW_START + 'ms' }}>
      {[LEFT, RIGHT].map(x => (
        <React.Fragment key={x}>
          <path className="supply-chain__shaft" d={curve(x)} pathLength="1" />
          <path className="supply-chain__head is-landing" d={head(x)} />
        </React.Fragment>
      ))}
    </svg>
  );
}

export default function SupplyChain({ items, play = true }) {
  const chain = items.slice(0, -2), leaves = items.slice(-2);
  return (
    <Tile className={'supply-chain' + (play ? ' is-playing' : '')} aria-label="Supply chain">
      <ol className="supply-chain__list">
        {chain.map((it, k) => (
          <li key={it.label} className="supply-chain__row">
            <Node item={it} row={k} play={play} />
            {k < chain.length - 1 ? <Arrow row={k} /> : <Branch row={k} />}
          </li>
        ))}
        <li className="supply-chain__row supply-chain__row--pair">
          {leaves.map(it => <Node key={it.label} item={it} row={chain.length} play={play} />)}
        </li>
      </ol>
    </Tile>
  );
}
