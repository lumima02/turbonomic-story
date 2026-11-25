import React from 'react';
import { SCENES } from '../content.js';

// Isometric block stage. Every scene is a different state of the same 27 blocks
// (3 layers × 9 cells), so moving between scenes animates the blocks instead of swapping pictures.
// To use Blender renders instead, pass `render` (an image URL) and the SVG is skipped.

const G = 112;           // grid spacing
const E = 66;            // block edge
const W = 0.866 * E, D = 0.5 * E, H = E;
// Block faces (top, left, right) per health color. The values are CSS variables set per theme in index.scss, so
// day mode can use lighter shades.
const COLORS = Object.fromEntries(['teal', 'yellow', 'red', 'gray'].map(c => [c, ['top', 'left', 'right'].map(f => `var(--block-${c}-${f})`)]));
const FLOAT = [0.55, 0.7, 0.5, 0.75, 0.6, 0.8, 0.55, 0.7, 0.5];
const pts = a => a.map(p => p.join(',')).join(' ');
const FACES = {
  left: pts([[-W, 0], [0, D], [0, D - H], [-W, -H]]),
  right: pts([[0, D], [W, 0], [W, -H], [0, D - H]]),
  top: pts([[-W, -H], [0, D - H], [W, -H], [0, -D - H]])
};
const cellXY = (i, j, lift) => [(i - j) * G * 0.866, (i + j - 2) * G * 0.5 - lift * G];
// The plate is centered on the same grid as the blocks: each block's footprint is centered on cellXY,
// and the plate extends the same distance past the outer cells on every side.
const plate = () => {
  const a = -0.8, b = 2.8, pr = (i, j) => [(i - j) * G * 0.866, (i + j - 2) * G * 0.5];
  return pts([pr(a, a), pr(b, a), pr(b, b), pr(a, b)]);
};
const PLATE = plate();

const hidden = { c: 'teal', s: 0.01, o: 0 };
const all = c => Array.from({ length: 9 }, () => ({ c, s: 1, o: 1 }));
// Block sizes by health: congested (red) blocks are small, healthy (teal) full size, and oversized (yellow)
// exactly halfway between the two.
const RED_S = 0.6, YELLOW_S = (RED_S + 1) / 2;
const IMBALANCED = ['teal', 'yellow', 'teal', 'red', 'teal', 'yellow', 'yellow', 'teal', 'red']
  .map(c => ({ c, s: c === 'yellow' ? YELLOW_S : c === 'red' ? RED_S : 1, o: 1 }));

// A layer of 9 blocks whose green / yellow / red counts follow a supply chain ring's proportions (largest remainder,
// so the counts always add up to 9). Unhealthy blocks are scattered, with each layer's pattern rotated so they
// don't line up in columns between layers.
const SCAN_ROWS = (() => { const v = SCENES.find(s => s.id === 'visibility').supplyChain; return [v[2], v[1], v[0]]; })();
const SCATTER = [4, 0, 8, 2, 6, 1, 5, 3, 7];
const TONE = { green: 'teal', yellow: 'yellow', red: 'red' };
function healthLayer(segs, L) {
  const raw = segs.map(([c, f]) => [c, f * 9]);
  const n = raw.map(([, x]) => Math.floor(x));
  raw.map(([, x], k) => [x - Math.floor(x), k]).sort((a, b) => b[0] - a[0])
    .slice(0, 9 - n.reduce((a, b) => a + b, 0)).forEach(([, k]) => { n[k]++; });
  const order = SCATTER.map((_, k) => SCATTER[(k + L * 3) % 9]);
  const layer = Array(9);
  let at = 0;
  // Red first, then yellow, take scattered cells; green fills the rest.
  ['red', 'yellow'].forEach(c => {
    const k = segs.findIndex(([sc]) => sc === c);
    for (let m = 0; k >= 0 && m < n[k]; m++) layer[order[at++]] = c;
  });
  return Array.from({ length: 9 }, (_, k) => {
    const c = layer[k] || 'green';
    return { c: TONE[c], s: c === 'yellow' ? YELLOW_S : c === 'red' ? RED_S : 1, o: 1 };
  });
}

export function stageState(sceneId, ctx = {}) {
  const st = { zoom: 1, ty: 440, layers: [all('teal'), Array(9).fill(hidden), Array(9).fill(hidden)], lift: [0, 0, 0], plates: [1, 0, 0], float: false, scan: false, lines: false };
  switch (sceneId) {
    case 'banking':
    case 'next-steps':
      st.float = true; break;
    case 'problem':
      st.layers[0] = IMBALANCED; break;
    case 'trade-off':
      if (ctx.option === 'balance') {
        // Turbonomic's option: the default healthy, right-sized cluster.
      } else if (ctx.option === 'cut') {
        st.layers[0] = ['teal', null, 'red', null, 'red', null, 'red', null, 'teal'].map(c => c ? { c, s: c === 'red' ? RED_S : 1, o: 1 } : hidden);
      } else {
        st.layers[0] = all('teal').map((b, k) => ([0, 2, 4, 6, 8].includes(k) ? { c: 'yellow', s: YELLOW_S, o: 1 } : b));
        st.layers[1] = Array.from({ length: 9 }, (_, k) => ([0, 1, 3, 4].includes(k) ? { c: 'yellow', s: YELLOW_S, o: 1 } : hidden));
        st.lift[1] = 0.9;
      }
      break;
    case 'visibility':
      st.zoom = 0.6; st.ty = 600; st.scan = true; st.lines = true;
      // Each layer's health mirrors a row of the supply chain panel: top = business applications, middle =
      // application components, bottom = virtual machines. Layers start gray and light up in those colors as the
      // scan plane lands on each one (see litAt).
      st.layers = SCAN_ROWS.map((row, L) => healthLayer(row.segs, L));
      st.lift = [0, 2.8, 5.6]; st.plates = [1, 0.6, 0.6];
      break;
    case 'automation': {
      const base = IMBALANCED.map(b => ({ ...b }));
      [1, 6].forEach(k => { base[k] = { c: 'teal', s: 1, o: 1 }; });   // already right-sized earlier
      (ctx.actions || []).forEach(a => { if (a.done) base[a.cell] = { c: 'teal', s: 1, o: 1 }; });
      st.layers[0] = base;
      break;
    }
    case 'results':
      st.layers[0] = ctx.before ? IMBALANCED : all('teal'); break;
    default: break;
  }
  return st;
}

// Blocks change in a ripple, front corner first and layer by layer, so a scene change reads as a morph.
const delayFor = (L, i, j) => L * 90 + (i + j) * 45;
// When a scan sweep restarts, the lit layers go back to gray together, front row first (i + j = 4 is the front corner).
const RESET_DELAY = (i, j) => (4 - (i + j)) * 110;

// Floating scenes react to the cursor: blocks near it are nudged aside and lifted, so the cluster parts
// wherever the pointer passes and settles back behind it. Nothing is pulled toward the cursor.
const REACH = 230, PUSH = 46, RISE = 34;
function pushFor(x, y, i, j, ptr) {
  if (!ptr) return [0, 0];
  const dx = x - ptr[0], dy = y - H / 2 - ptr[1];
  const dist = Math.hypot(dx, dy) || 1;
  const f = Math.max(0, 1 - dist / REACH) ** 2;
  return [(dx / dist) * f * PUSH, (dy / dist) * f * PUSH * 0.5 - f * RISE];
}

function Block({ i, j, state, lift, float, index, delay, fillDelay = delay, pushRef, clip, pulse = true }) {
  const [x, y] = cellXY(i, j, lift + (float ? FLOAT[index % 9] : 0));
  const p = COLORS[state.c];
  return (
    <g className="block" style={{ transform: `translate(${x}px, ${y}px)`, '--d': delay + 'ms', '--fd': fillDelay + 'ms' }}>
      <g className="block__push" ref={pushRef}>
      <g className={'block__bob' + (float ? ' is-floating' : '')} style={{ animationDelay: `${-(index % 9) * 0.45}s` }}>
        <g clipPath={clip ? `url(#${clip})` : undefined}>
        <g className="block__body" style={{ transform: `scale(${state.s})`, opacity: state.o }}>
          <polygon points={FACES.left} style={{ fill: p[1] }} />
          <polygon points={FACES.right} style={{ fill: p[2] }} />
          <polygon points={FACES.top} style={{ fill: p[0] }} />
        </g>
        </g>
        {pulse && state.c === 'red' && state.o > 0 && (
          // Trouble signal: faint arcs that rise off the top face and fade, three waves offset in time.
          <g className="pulse" style={{ transform: `translateY(${-H * state.s}px)` }} aria-hidden="true">
            {[0, 1, 2].map(n => <path key={n} d={PULSE_ARC} style={{ animationDelay: `${n * 0.6 - (index % 9) * 0.25}s` }} />)}
          </g>
        )}
      </g>
      </g>
    </g>
  );
}
const PULSE_ARC = `M ${-W * 0.6} 0 A ${W * 0.6} ${W * 0.6} 0 0 1 ${W * 0.6} 0`;

// The scan plane is a horizontal slice that steps down through the layers, pausing at each one. Its height is a
// cut: the stage is drawn in bands either side of it, bottom up (everything below the plane, the plane, then
// everything above). A block the plane is passing through is cut along the line where the plane meets its side
// faces, so the plane reads as slicing through the stack rather than sliding in front of it.
const SCAN_TOP = 720, SCAN_STILL = 4.2 * G;
const BIG = 4000;
// A strong "easy ease", cubic-bezier(0.7, 0, 0.3, 1): each move starts from rest and builds speed slowly,
// then glides into the next stop with a long, soft landing. Solved for y at time x.
function ease(x) {
  const [x1, y1, x2, y2] = [0.7, 0, 0.3, 1];
  const bz = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  let lo = 0, hi = 1, t = x;
  for (let n = 0; n < 24; n++) { t = (lo + hi) / 2; if (bz(t, x1, x2) < x) lo = t; else hi = t; }
  return bz(t, y1, y2);
}
// One sweep: fade in while dropping onto the top layer, then hold and step down to each layer below, then fade
// out on the bottom layer. Each stop is halfway up that layer's blocks. Two rests keep the loop from feeling rushed:
// END_HOLD leaves the fully lit stack in view after the plane fades, and START_HOLD lets the reset to gray
// (which happens as the sweep restarts) finish before the plane comes back.
const START_HOLD = 1600, END_HOLD = 1400;
function scanTimeline(lift) {
  const stop = L => lift[L] * G + H / 2;
  const S = START_HOLD;
  return [
    [0, SCAN_TOP, 0], [S, SCAN_TOP, 0], [S + 1200, stop(2), 1], [S + 2100, stop(2), 1],
    [S + 3900, stop(1), 1], [S + 4800, stop(1), 1],
    [S + 6600, stop(0), 1], [S + 7500, stop(0), 1], [S + 8200, stop(0), 0], [S + 8200 + END_HOLD, stop(0), 0]
  ];
}
function scanAt(keys, t) {
  const total = keys[keys.length - 1][0];
  t = ((t % total) + total) % total;
  let k = 1;
  while (k < keys.length - 1 && keys[k][0] < t) k++;
  const [t0, h0, o0] = keys[k - 1], [t1, h1, o1] = keys[k];
  const e = ease(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));
  return { h: h0 + (h1 - h0) * e, o: o0 + (o1 - o0) * e };
}
// Which layers the plane has reached this sweep: each lights up as the plane settles onto it, and all go dark
// again when the sweep restarts. LIGHT_LEAD starts the color change just before the plane comes to rest.
const LIGHT_LEAD = 250;
function litAt(keys, t) {
  const total = keys[keys.length - 1][0];
  t = ((t % total) + total) % total;
  return [keys[6][0], keys[4][0], keys[2][0]].map(arrive => t >= arrive - LIGHT_LEAD);
}
// Clip region in a block's own coordinates for the part between heights lo and hi above its base. Each cut follows
// the front chevron of the side faces; everything behind it (the top face) belongs to the part above.
// The upper piece of a block split by the scan plane reaches this far down over the lower piece. The two clip edges
// would otherwise meet exactly, and their anti-aliasing leaves a faint seam across the block, still visible once
// the plane has faded at the end of the scan.
const SEAM = 1.5;
function bandRegion(lo, hi, top) {
  const cc = c => (c <= 0 ? -BIG : c >= top ? BIG : c);
  const a = cc(hi), b = cc(lo);
  return pts([[-BIG, -a], [-W, -a], [0, D - a], [W, -a], [BIG, -a], [BIG, -b], [W, -b], [0, D - b], [-W, -b], [-BIG, -b]]);
}

export function StageSvg({ state, label }) {
  const uid = React.useId().replace(/:/g, '');
  const [planes, setPlanes] = React.useState([]);
  const liftKey = state.lift.join(',');
  React.useEffect(() => {
    if (!state.scan) { setPlanes([]); return undefined; }
    const keys = scanTimeline(liftKey.split(',').map(Number));
    if (reducedMotion()) { setPlanes([{ h: SCAN_STILL, o: 1, lit: [false, false, true] }]); return undefined; }
    let frame, start;
    const tick = now => {
      if (start === undefined) start = now;
      setPlanes([{ ...scanAt(keys, now - start), lit: litAt(keys, now - start) }]);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state.scan, liftKey]);
  // Two bands, below and above the plane. Both always hold every block, so the two halves of a block morph
  // together between scenes and always add up to the whole block. With no scan, the upper band is hidden.
  const plane = planes[0];
  const scanning = !!plane;
  const bounds = [-Infinity, scanning ? plane.h : Infinity, Infinity];


  const svgRef = React.useRef(null);
  const interactive = state.float && !reducedMotion();
  const live = React.useRef({ state, interactive, ptr: null, frame: 0, last: 0, els: [], pos: [], vel: [] });
  live.current.state = state;
  live.current.interactive = interactive;

  // The cursor reaction runs as a critically damped spring, stepped every animation frame and written straight
  // to the DOM. It keeps velocity between frames, so motion never stalls or restarts the way a retargeted
  // CSS transition does, and React doesn't re-render while the pointer moves.
  const step = React.useCallback(now => {
    const m = live.current;
    const dt = Math.min(0.05, m.last ? (now - m.last) / 1000 : 1 / 60);
    m.last = now;
    const K = 90, C = 2 * Math.sqrt(K);
    let moving = false;
    for (let k = 0; k < 9; k++) {
      // Both copies of the block (below and above the scan plane) move together, so they can never split apart.
      const els = (m.els[k] || []).filter(Boolean);
      if (!els.length) continue;
      const i = k % 3, j = Math.floor(k / 3);
      const [x, y] = cellXY(i, j, m.state.lift[0] + FLOAT[k]);
      const target = m.interactive ? pushFor(x, y, i, j, m.ptr) : [0, 0];
      const pos = m.pos[k] || (m.pos[k] = [0, 0]), vel = m.vel[k] || (m.vel[k] = [0, 0]);
      for (let a = 0; a < 2; a++) {
        vel[a] += (K * (target[a] - pos[a]) - C * vel[a]) * dt;
        pos[a] += vel[a] * dt;
        if (Math.abs(vel[a]) > 0.02 || Math.abs(target[a] - pos[a]) > 0.05) moving = true;
      }
      // Once a block has come to rest, snap it exactly onto its target so no sub-pixel offset is left behind.
      if (!moving && !m.ptr) { pos[0] = target[0]; pos[1] = target[1]; vel[0] = vel[1] = 0; }
      const t = `translate(${pos[0].toFixed(2)}px, ${pos[1].toFixed(2)}px)`;
      els.forEach(el => { el.style.transform = t; });
    }
    m.frame = moving || m.ptr ? requestAnimationFrame(step) : 0;
    if (!m.frame) m.last = 0;
  }, []);
  const kick = () => { if (!live.current.frame) live.current.frame = requestAnimationFrame(step); };
  React.useEffect(() => { if (!interactive) { live.current.ptr = null; kick(); } }, [interactive]);
  // Clear the frame id when the loop is cancelled. Leaving a stale id made kick() think the loop was still
  // running, so after a remount mid-hover (a hot reload, for one) the blocks stayed frozen wherever the cursor
  // had pushed them, out of line with the scan plane's upper copies and with the scene 6 "before" view.
  React.useEffect(() => () => { cancelAnimationFrame(live.current.frame); live.current.frame = 0; live.current.last = 0; }, []);

  // Pointer position in the stage root's own coordinates (undoing the viewBox scale, translate, and zoom).
  const onPointerMove = e => {
    if (!interactive) return;
    const ctm = svgRef.current && svgRef.current.getScreenCTM();
    if (!ctm) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    live.current.ptr = [(pt.x - 360) / state.zoom, (pt.y - state.ty) / state.zoom];
    kick();
  };
  const onPointerLeave = () => { live.current.ptr = null; kick(); };
  const order = [];
  for (let L = 0; L < 3; L++) for (let s = 0; s <= 4; s++) for (let j = 0; j < 3; j++) { const i = s - j; if (i >= 0 && i < 3) order.push([L, i, j]); }
  return (
    <svg ref={svgRef} className={'stage__svg' + (interactive ? ' is-interactive' : '')} viewBox="0 0 720 740" role="img" aria-label={label}
      onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <g className="stage__root" style={{ transform: `translate(360px, ${state.ty}px) scale(${state.zoom})` }}>
        <defs>
          {scanning && bounds.slice(1).map((hi, n) => [0, 1, 2].map(L => state.layers[L].map((b, k) => (
            <clipPath key={`${n}-${L}-${k}`} id={`${uid}-${n}-${L}-${k}`} clipPathUnits="userSpaceOnUse">
              <polygon points={bandRegion(bounds[n] - state.lift[L] * G - (n > 0 ? SEAM : 0), hi - state.lift[L] * G, H * b.s)} />
            </clipPath>
          ))))}
        </defs>
        {bounds.slice(1).map((hi, n) => {
          const lo = bounds[n];
          return (
            <React.Fragment key={'band' + n}>
              {/* Each band is drawn bottom layer up, so each layer occludes the one beneath it: the plate first
                  (it tints the layer below), then the connectors rising from the lower layer's block tops, then
                  this layer's blocks, which cover the connectors' upper ends. */}
              <g style={n > 0 && !scanning ? { display: 'none' } : undefined}>
                {[0, 1, 2].map(L => (
                  <React.Fragment key={'layer' + L}>
                    <g className="stage__plate" style={{ transform: `translateY(${-state.lift[L] * G}px)`, opacity: state.plates[L], '--d': L * 90 + 'ms',
                      display: state.lift[L] * G >= lo && state.lift[L] * G < hi ? undefined : 'none' }}>
                      <polygon points={PLATE} />
                    </g>
                    {L > 0 && (
                      <g className={'stage__lines' + (state.lines ? ' is-on' : '')}>
                        {Array.from({ length: 9 }, (_, k) => {
                          const i = k % 3, j = Math.floor(k / 3);
                          const [x, y0] = cellXY(i, j, state.lift[L - 1]);
                          const [, y1] = cellXY(i, j, state.lift[L]);
                          const base = cellXY(i, j, 0)[1];   // screen y: larger is lower
                          // The line lands on the center of the lower block's top face, which sits H × its size above
                          // the plate (blocks scale from the center of their footprint), so smaller blocks get longer lines.
                          const below = state.layers[L - 1][k], top = H * (below.o > 0 ? below.s : 0);
                          const a = Math.max(y1, base - hi), b = Math.max(a, Math.min(y0 - top, base - lo));
                          // Each line draws downward from the layer above. The dash is measured along the whole
                          // connector (y1 to y0 - top), so a line split across the scan bands still grows as one.
                          // Lines stay mounted (zero length when outside this band) so the draw plays once, on entry.
                          const len = Math.max(1, y0 - top - y1);
                          return <line key={k} x1={x} x2={x} y1={a} y2={b} style={{
                            strokeDasharray: `${len} ${len * 2}`, strokeDashoffset: a - y1,
                            '--from': a - y1 + len + 'px', '--d': (L - 1) * 220 + (i + j) * 40 + 'ms' }} />;
                        })}
                      </g>
                    )}
                    {order.filter(([BL]) => BL === L).map(([, i, j]) => {
                      const k = j * 3 + i;
                      const b = state.layers[L][k];
                      const dark = plane && !plane.lit[L];
                      return <Block key={k} i={i} j={j} index={L * 9 + k} state={dark ? { ...b, c: 'gray' } : b}
                        fillDelay={dark ? RESET_DELAY(i, j) : delayFor(L, i, j)} lift={state.lift[L]} float={state.float && L === 0} delay={delayFor(L, i, j)}
                        clip={scanning ? `${uid}-${n}-${L}-${k}` : undefined}
                        pulse={n === (scanning && (state.lift[L] * G + H * b.s) >= plane.h ? 1 : 0)}
                        pushRef={L === 0 ? el => { (live.current.els[k] ||= [])[n] = el; } : undefined} />;
                    })}
                  </React.Fragment>
                ))}
              </g>
              {n === 0 && plane && (
                <g className="stage__scan" style={{ opacity: state.scan ? 1 : 0 }}>
                  <polygon points={PLATE} style={{ transform: `translateY(${-plane.h}px)`, opacity: plane.o }} />
                </g>
              )}
            </React.Fragment>
          );
        })}
      </g>
    </svg>
  );
}

// Where a block sits on the stage, as a percentage of the stage box (for hotspots).
export function blockPosition(sceneId, cell, ctx) {
  const st = stageState(sceneId, ctx);
  const i = cell % 3, j = Math.floor(cell / 3);
  const b = st.layers[0][cell];
  const [x, y] = cellXY(i, j, st.lift[0]);
  const top = y - (D + H) * b.s;   // top corner of the block, scaled about its footprint center
  return { left: ((360 + x * st.zoom) / 720) * 100 + '%', top: ((st.ty + top * st.zoom) / 740) * 100 + '%' };
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The same StageSvg element stays mounted across every scene, so blocks always morph from the
// previous scene. Results adds its before/after overlay on top instead of replacing the stage.
export default function Stage({ sceneId, ctx, label, render }) {
  if (render) return <img key={render} className="stage__render" src={render} alt={label} />;
  return (
    <div className="stage__scene">
      <StageSvg state={stageState(sceneId, { ...ctx, before: false })} label={label} />
      {sceneId === 'results' && <Compare />}
    </div>
  );
}

// The "before" view wipes in from the left once the blocks have settled, then the slider is free to drag.
function Compare() {
  const still = reducedMotion();
  const [split, setSplit] = React.useState(still ? 50 : 0);
  const [intro, setIntro] = React.useState(!still);
  React.useEffect(() => {
    if (still) return undefined;
    const a = setTimeout(() => setSplit(50), 500);
    const b = setTimeout(() => setIntro(false), 1500);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [still]);
  return (
    <div className={'compare' + (intro ? ' is-intro' : '')} style={{ '--split': split + '%' }}>
      <div className="compare__before" aria-hidden="true">
        <StageSvg state={stageState('results', { before: true })} label="" />
      </div>
      <input className="compare__range" type="range" min="0" max="100" value={split}
        aria-label="Compare before and after Turbonomic" onChange={e => { setIntro(false); setSplit(+e.target.value); }} />
      <div className="compare__divider" aria-hidden="true"><span className="compare__handle" /></div>
      <span className="compare__tag compare__tag--before">Before · 5 of 9 need action</span>
      <span className="compare__tag compare__tag--after">After · All healthy</span>
    </div>
  );
}
