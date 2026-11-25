import React, { useEffect, useRef, useState } from 'react';
import {
  Header, HeaderName, HeaderGlobalBar, HeaderGlobalAction, SkipToContent, Grid, Column, Button, Tag, Toggletip, ToggletipButton, ToggletipContent,
  ContentSwitcher, Switch, ProgressBar, ProgressIndicator, ProgressStep, Tile, Link, Toggle, ComposedModal, ModalHeader, ModalBody, ModalFooter, TextInput, ToastNotification,
  Table, TableHead, TableRow, TableHeader, TableBody, TableCell, InlineLoading
} from '@carbon/react';
import { ArrowRight, Launch, Share, Copy, Information, WarningAltFilled, ErrorFilled, CheckmarkFilled, Reset, Light, Asleep } from '@carbon/icons-react';
import { SCENES, DEMO_URL, CASE_STUDIES, LEGEND } from './content.js';
import Stage, { blockPosition } from './components/Stage.jsx';
import SupplyChain from './components/SupplyChain.jsx';

const STATUS_ICON = { warning: WarningAltFilled, error: ErrorFilled, success: CheckmarkFilled };
const byId = id => SCENES.find(s => s.id === id);

const HEADER = 48;

export default function App() {
  const [active, setActive] = useState(SCENES[0].id);
  // Wide screens show one pinned stage beside the story; narrower ones show a stage inside each scene. Only the set
  // in use is built: the hidden set used to keep running its animation loops (and doubled the page's SVG).
  const WIDE = '(min-width: 66rem)';
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE), on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  // Day mode swaps the page to Carbon's white theme (the cds--white zone class on body); the choice is remembered.
  const [day, setDay] = useState(() => { try { return localStorage.getItem('theme') === 'day'; } catch { return false; } });
  useEffect(() => {
    document.body.classList.toggle('cds--white', day);
    try { localStorage.setItem('theme', day ? 'day' : 'night'); } catch { /* storage unavailable */ }
  }, [day]);
  const [option, setOption] = useState('safe');
  const [actions, setActions] = useState(byId('automation').actions);
  const [automate, setAutomate] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [revealed, setRevealed] = useState(() => new Set([SCENES[0].id]));
  const refs = useRef({});
  const timers = useRef([]);
  const activeIdx = SCENES.findIndex(s => s.id === active);
  // Which way the progress marker last travelled, so its leading edge can move first.
  const lastIdx = useRef(activeIdx);
  const [markerDir, setMarkerDir] = useState('down');
  useEffect(() => {
    if (activeIdx !== lastIdx.current) setMarkerDir(activeIdx > lastIdx.current ? 'down' : 'up');
    lastIdx.current = activeIdx;
  }, [activeIdx]);

  // The scene crossing the middle of the viewport drives the stage.
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActive(e.target.dataset.scene); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    // A scene's copy builds in once its top passes 65% of the viewport, and resets once it is fully off screen.
    const reveal = new IntersectionObserver(entries => {
      setRevealed(prev => {
        const next = new Set(prev);
        entries.forEach(e => (e.isIntersecting ? next.add(e.target.dataset.scene) : next.delete(e.target.dataset.scene)));
        return next;
      });
    }, { rootMargin: '0px 0px -35% 0px' });
    Object.values(refs.current).forEach(el => { if (el) { io.observe(el); reveal.observe(el); } });
    return () => { io.disconnect(); reveal.disconnect(); };
  }, []);

  // Each scene's copy pins while you scroll through its buffer. A panel marked .scene__fit (the supply chain) first
  // shrinks, down to FIT_MIN, so its scene fits the window and keeps its buffer. If a scene still can't fit (a very
  // short window), it's marked data-tall and scrolls normally instead, so nothing is pinned off screen.
  useEffect(() => {
    const FIT_MIN = 0.6;
    const sections = () => Object.values(refs.current).filter(Boolean);
    const measure = () => sections().forEach(sec => {
      const pin = sec.querySelector('.scene__pin');
      if (!pin) return;
      const avail = window.innerHeight - HEADER;
      const fit = sec.querySelector('.scene__fit');
      if (fit) {
        const z = parseFloat(fit.style.zoom) || 1;
        const shown = fit.getBoundingClientRect().height, natural = shown / z;
        const pinned = window.matchMedia('(min-width: 66rem)').matches;   // Carbon lg: the copy only pins from here up
        const want = pinned ? Math.min(1, Math.max(FIT_MIN, (avail - (pin.offsetHeight - shown)) / natural)) : 1;
        if (Math.abs(want - z) > 0.005) fit.style.zoom = want === 1 ? '' : want.toFixed(3);
      }
      sec.dataset.tall = String(pin.offsetHeight > avail + 1);
    });
    const ro = new ResizeObserver(measure);
    sections().forEach(sec => sec.querySelectorAll('.scene__pin, .scene__inner').forEach(el => ro.observe(el)));
    window.addEventListener('resize', measure);
    measure();
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  function clearTimers() { timers.current.forEach(clearTimeout); timers.current = []; }
  useEffect(() => clearTimers, []);

  // Once the Automation scene is fully off screen, undo its actions so the demo is fresh on the way back:
  // the red and yellow blocks return and the Execute buttons reappear.
  const automationShown = revealed.has('automation');
  const resetAutomation = () => {
    clearTimers();
    setActions(byId('automation').actions);
    setAutomate(false);
  };
  useEffect(() => {
    if (!automationShown) resetAutomation();
  }, [automationShown]);
  // The reset button is live once anything has changed from the starting state.
  const automationTouched = automate || actions.some((a, n) => a.done !== byId('automation').actions[n].done || a.running);

  const ctx = { option, actions };
  // On wide screens the quote sits just under the blocks in Automation, centered on them. The blocks' drawn
  // extent depends on the stage's zoom and the window, so it's measured, and followed each frame while the stage
  // settles into place (about a second) so the quote arrives with it.
  // The quote is kept to two lines: set in its full size where that fits the stage, stepped down a pixel at a time
  // where it doesn't, then the box is shrunk to its longest line so the quote and credit share one left edge.
  const stageRef = useRef(null), quoteRef = useRef(null);
  useEffect(() => {
    if (active !== 'automation') return;
    const fit = () => {
      const stage = stageRef.current, quote = quoteRef.current;
      const text = quote?.querySelector('blockquote');
      if (!stage || !text) return;
      // measured at the stage's left edge, so the full stage width is available to wrap in
      quote.style.width = ''; quote.style.left = '0px'; text.style.fontSize = ''; text.style.lineHeight = '';
      const range = document.createRange(); range.selectNodeContents(text);
      const lines = () => new Set([...range.getClientRects()].map(r => Math.round(r.top))).size;
      let size = parseFloat(getComputedStyle(text).fontSize);
      while (lines() > 2 && size > 18) { size -= 1; text.style.fontSize = size + 'px'; text.style.lineHeight = '1.3'; }
      quote.style.width = Math.ceil(Math.max(...[...range.getClientRects()].map(r => r.right)) - text.getBoundingClientRect().left) + 1 + 'px';
    };
    const place = () => {
      const stage = stageRef.current, quote = quoteRef.current;
      const art = stage?.querySelector('.stage__svg .stage__root');
      if (!art || !quote) return;
      const s = stage.getBoundingClientRect(), a = art.getBoundingClientRect();
      const gap = 24, room = s.height - quote.offsetHeight - 16;
      quote.style.top = Math.min(room, a.bottom - s.top + gap) + 'px';
      quote.style.left = a.left + a.width / 2 - s.left + 'px';
      quote.style.bottom = 'auto';
    };
    const resize = () => { fit(); place(); };
    let raf; const t0 = performance.now();
    const follow = now => { place(); if (now - t0 < 1400) raf = requestAnimationFrame(follow); };
    fit();
    raf = requestAnimationFrame(follow);
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [active, wide]);

  // The color key sits just above the blocks (their drawn top varies by scene and window), following them each frame
  // while the stage morphs so the two move together. The scan plane is left out: it starts far above the stack.
  const legendRef = useRef(null);
  useEffect(() => {
    if (!wide) return undefined;
    const place = () => {
      const stage = stageRef.current, legend = legendRef.current;
      if (!stage || !legend) return;
      const parts = stage.querySelectorAll('.stage__svg .block, .stage__svg .stage__plate');
      let top = Infinity;
      parts.forEach(el => { const r = el.getBoundingClientRect(); if (r.height > 2) top = Math.min(top, r.top); });
      if (top === Infinity) return;
      const s = stage.getBoundingClientRect();
      legend.style.top = Math.max(16, top - s.top - 32 - legend.offsetHeight) + 'px';
    };
    let raf; const t0 = performance.now();
    const follow = now => { place(); if (now - t0 < 1600) raf = requestAnimationFrame(follow); };
    raf = requestAnimationFrame(follow);
    window.addEventListener('resize', place);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', place); };
  }, [active, wide, option]);   // the trade-off options stack the blocks to different heights

  // Jumps to a scene glide rather than snap: an eased scroll whose length grows with the distance (about 1s for
  // the next scene, up to 2.4s across the whole story). Any wheel, touch or key input hands control back at once.
  const glide = useRef(null);
  const scrollTo = id => {
    const el = refs.current[id]; if (!el) return;
    const root = document.documentElement;
    const target = el.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(el).scrollMarginTop || 0);
    glide.current?.();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { window.scrollTo(0, target); return; }
    const from = window.scrollY, dist = target - from;
    const dur = Math.min(2400, 900 + Math.abs(dist) / window.innerHeight * 180);
    const ease = t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);   // ease in-out, gentle start and landing
    let raf, t0;
    const stop = () => { cancelAnimationFrame(raf); root.style.scrollBehavior = '';
      ['wheel', 'touchstart', 'keydown'].forEach(e => window.removeEventListener(e, stop)); glide.current = null; };
    const step = now => {
      t0 ??= now; const t = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, from + dist * ease(t));
      if (t < 1) raf = requestAnimationFrame(step); else stop();
    };
    root.style.scrollBehavior = 'auto';   // the page's CSS smooth scrolling would fight the per-frame steps
    ['wheel', 'touchstart', 'keydown'].forEach(e => window.addEventListener(e, stop, { passive: true }));
    glide.current = stop;
    raf = requestAnimationFrame(step);
  };
  // Executing an action shows Carbon's inline loading for a moment, then marks it done (and its block rebalances).
  const RUN_MS = 1200;
  const patch = (id, change) => setActions(a => a.map(x => (x.id === id ? { ...x, ...change } : x)));
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };
  const runAction = (id, delay = 0) => {
    later(() => patch(id, { running: true }), delay);
    later(() => patch(id, { running: false, done: true }), delay + RUN_MS);
  };
  const execute = id => runAction(id);
  // Turning automation on works through every pending action in turn, like Turbonomic running them under policy.
  // Turning it off stops the queue; anything already executing finishes.
  const onAutomate = on => {
    setAutomate(on);
    if (on) {
      actions.filter(a => !a.done && !a.running).forEach((a, n) => runAction(a.id, 300 + n * (RUN_MS + 200)));
    } else {
      clearTimers();
      setActions(a => a.map(x => (x.running ? { ...x, running: false, done: true } : x)));
    }
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); } catch (e) { /* clipboard blocked: the field is still selectable */ }
    setShareOpen(false); setToast(true);
  };

  const stageFor = (id, withHotspots) => {
    const s = byId(id);
    const src = id === 'trade-off' ? s.options.find(o => o.name === option) : s;
    return (
      <div className="stage__canvas">
        <Stage sceneId={id} ctx={ctx} label={src.stageLabel} render={src.render} />
        {withHotspots && id === 'problem' && (
          <>
            <Hotspot pos={blockPosition('problem', 1)} text={s.tips.idle} align="top" />
            <Hotspot pos={blockPosition('problem', 3)} text={s.tips.pressure} align="top" />
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <SkipToContent href="#main" />
      <Header aria-label="IBM Turbonomic">
        <HeaderName href="#top" prefix="IBM">Turbonomic</HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label={day ? 'Switch to night mode' : 'Switch to day mode'} tooltipAlignment="end"
            isActive={false} onClick={() => setDay(d => !d)}>
            {day ? <Asleep size={20} /> : <Light size={20} />}
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      <nav className={'progress progress--' + markerDir} aria-label="Story progress" style={{ '--k': activeIdx }}>
        <span className="progress__marker" aria-hidden="true" />
        {SCENES.map((s, k) => (
          <button key={s.id} type="button" className={'progress__step' + (active === s.id ? ' is-active' : '')}
            aria-label={`Scene ${k + 1}: ${s.eyebrow}`} aria-current={active === s.id ? 'step' : undefined} onClick={() => scrollTo(s.id)} />
        ))}
      </nav>

      <main id="main" className="story">
        <Grid>
          <Column sm={4} md={8} lg={{ start: 2, end: 8 }} className="story__copy">
            {SCENES.map((s, k) => (
              <section key={s.id} id={s.id} data-scene={s.id} ref={el => { refs.current[s.id] = el; }}
                className={'scene' + (revealed.has(s.id) ? ' is-revealed' : '')} aria-labelledby={s.id + '-h'}>
                <div className="scene__pin">
                <div className="scene__inner">
                  <p className="scene__eyebrow">{s.eyebrow}</p>
                  <h2 id={s.id + '-h'} className="scene__headline">{s.headline}</h2>
                  {s.body && <p className="scene__body">{s.body}</p>}

                  {s.id === 'banking' && (
                    <div className="scene__actions">
                      {/* "See how it works" with two stacked chevrons that light in turn; clicking glides to the next scene. */}
                      <button type="button" className="scroll-cue" onClick={() => scrollTo(SCENES[k + 1].id)}>
                        <span className="scroll-cue__label">See how it works</span>
                        <svg width="28" height="32" viewBox="0 0 28 32" aria-hidden="true">
                          <path className="scroll-cue__v" d="M5 5 L14 14 L23 5" />
                          <path className="scroll-cue__v scroll-cue__v--2" d="M5 16 L14 25 L23 16" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {s.id === 'problem' && (
                    <div className="scene__tags">
                      {s.tags.map(t => <Tag key={t.label} type="gray" renderIcon={STATUS_ICON[t.status]} className={'status status--' + t.status}>{t.label}</Tag>)}
                    </div>
                  )}

                  {s.id === 'trade-off' && (() => {
                    const o = s.options.find(x => x.name === option);
                    return (
                      <>
                        <p className="scene__body" aria-live="polite">{o.body}</p>
                        <ContentSwitcher className="scene__switcher" size="md" selectedIndex={s.options.indexOf(o)}
                          onChange={({ name }) => setOption(name)}>
                          {s.options.map(x => <Switch key={x.name} name={x.name} text={x.label} />)}
                        </ContentSwitcher>
                        <div className={'scene__bars' + (o.name === 'balance' ? ' is-good' : '')}>
                          <ProgressBar className="bar bar--cost" label="Cost" value={revealed.has(s.id) ? o.cost : 0} max={100} />
                          <ProgressBar className="bar bar--risk" label="Risk" value={revealed.has(s.id) ? o.risk : 0} max={100} />
                        </div>
                        {('bridge' in o ? o.bridge : s.bridge) && <p className="scene__bridge">{'bridge' in o ? o.bridge : s.bridge}</p>}
                      </>
                    );
                  })()}

                  {s.id === 'visibility' && (
                    <div className="scene__panel scene__fit">
                      <SupplyChain items={s.supplyChain} play={revealed.has(s.id)} />
                      <div className="platforms">
                        <p className="platforms__label">Works across</p>
                        <ul className="platforms__list">
                          {s.platforms.map(p => <li key={p}><Tag type="outline" size="sm">{p}</Tag></li>)}
                        </ul>
                      </div>
                    </div>
                  )}

                  {s.id === 'automation' && (
                    <>
                      {/* Shrinks with the window (like the supply chain) so the scene still pins. */}
                      <div className="scene__fit">
                      <Table size="lg" className="scene__table" aria-label="Pending actions">
                        <TableHead>
                          <TableRow>
                            <TableHeader colSpan={3}>
                              <span className="scene__table-title">
                                Pending actions <Tag type="gray">{actions.filter(a => !a.done).length} pending</Tag>
                              </span>
                            </TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {actions.map(a => (
                            <TableRow key={a.id}>
                              <TableCell>
                                <span className="action__title">
                                  {a.title}
                                  {/* Why Turbonomic recommends it: the measurement behind the action. */}
                                  <Toggletip className="action__why" align="top-start">
                                    <ToggletipButton label={`Why: ${a.title}`}><Information size={14} /></ToggletipButton>
                                    <ToggletipContent><p>{a.why}</p></ToggletipContent>
                                  </Toggletip>
                                </span>
                                <span className="action__detail">{a.detail}</span>
                              </TableCell>
                              <TableCell>
                                <Tag type="gray" renderIcon={a.category === 'Performance' ? ErrorFilled : WarningAltFilled}
                                  className={'status status--' + (a.category === 'Performance' ? 'error' : 'warning')}>{a.category}</Tag>
                              </TableCell>
                              <TableCell>
                                {a.done ? <Tag type="green">Executed</Tag>
                                  : a.running ? <InlineLoading className="action__running" status="active" description="Executing…" />
                                    : <Button size="sm" kind="primary" disabled={automate} onClick={() => execute(a.id)}>Execute</Button>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="scene__controls">
                        <Toggle id="automation-toggle" labelText="Automation" labelA="Off" labelB="On"
                          toggled={automate} onToggle={onAutomate} />
                        <Button kind="ghost" size="sm" renderIcon={Reset} disabled={!automationTouched} onClick={resetAutomation}>
                          Reset demo
                        </Button>
                      </div>
                      <ProgressIndicator className="control" spaceEqually aria-label="Adopting automation"
                        currentIndex={automate ? 2 : actions.some((a, n) => a.done !== s.actions[n].done || a.running) ? 1 : 0}>
                        {s.control.map(c => <ProgressStep key={c.label} label={c.label} secondaryLabel={c.text} />)}
                      </ProgressIndicator>
                      </div>
                      {/* Below lg the quote follows the table; on wide screens it sits under the stage instead. */}
                      <Quote quote={s.quote} className="quote--inline" />
                    </>
                  )}

                  {s.id === 'results' && (
                    <>
                      <div className="scene__stats">
                        {s.stats.map((st, n) => (
                          <Tile key={n} className="stat">
                            <p className={'stat__value' + (st.small ? ' stat__value--small' : '')}>{st.value}</p>
                            <p className="stat__label">{st.label}</p>
                            <p className="stat__source">{st.source}</p>
                          </Tile>
                        ))}
                      </div>
                      <div className="scene__links">
                        {Object.entries(CASE_STUDIES).map(([name, url]) => (
                          <Link key={name} href={url} target="_blank" rel="noopener noreferrer" renderIcon={ArrowRight}>Read the {name} case study</Link>
                        ))}
                      </div>
                    </>
                  )}

                  {s.id === 'next-steps' && (
                    <>
                    <ul className="audiences" aria-label="Who it helps">
                      {s.audiences.map(a => (
                        <li key={a.role} className="audience"><span className="audience__role">{a.role}</span><span className="audience__text">{a.text}</span></li>
                      ))}
                    </ul>
                    <div className="scene__actions scene__actions--pair">
                      <Button kind="primary" href={DEMO_URL} target="_blank" rel="noopener noreferrer" renderIcon={Launch}>Take the product tour</Button>
                      <Button kind="tertiary" renderIcon={Share} onClick={() => setShareOpen(true)}>Share this page</Button>
                    </div>
                    </>
                  )}

                  {/* A footnote that explains the content (rather than citing a source) follows it, not the foot of the screen. */}
                  {s.footnote && s.footnoteNearContent && <p className="scene__footnote scene__footnote--near">{s.footnote}</p>}
                </div>

                {s.footnote && !s.footnoteNearContent && (
                  <p className="scene__footnote">
                    {s.footnoteUrl
                      ? <Link href={s.footnoteUrl} target="_blank" rel="noopener noreferrer" size="sm" inline className="scene__source">{s.footnote}</Link>
                      : s.footnote}
                  </p>
                )}
                </div>

                {!wide && (
                  <div className="scene__stage-inline" aria-hidden="true">{/* Below lg: an upcoming scene's stage holds the previous scene's state, then morphs when you reach it. */}
                    {stageFor(k > activeIdx && k > 0 ? SCENES[k - 1].id : s.id, false)}</div>
                )}
              </section>
            ))}
          </Column>

          <Column lg={{ start: 9, end: 17 }} className="story__stage">
            {wide && (
              <div ref={stageRef} className={'stage' + (active === 'automation' ? ' has-quote' : '')}>
                {stageFor(active, true)}
                <Legend active={active} innerRef={legendRef} />
                <Quote quote={byId('automation').quote} className={'quote--stage' + (active === 'automation' ? ' is-shown' : '')}
                  hidden={active !== 'automation'} innerRef={quoteRef} />
              </div>
            )}
          </Column>
        </Grid>
      </main>

      {/* ComposedModal rather than Modal, so the Copy link button can carry Carbon's Copy icon. */}
      <ComposedModal open={shareOpen} size="sm" onClose={() => setShareOpen(false)}>
        <ModalHeader label={byId('next-steps').share.label} title={byId('next-steps').share.heading} />
        <ModalBody>
          <p className="share__body">{byId('next-steps').share.body}</p>
          <TextInput id="share-link" labelText="Page link" readOnly value={typeof window !== 'undefined' ? window.location.href : ''}
            onFocus={e => e.target.select()} />
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setShareOpen(false)}>Cancel</Button>
          <Button kind="primary" renderIcon={Copy} onClick={copyLink}>Copy link</Button>
        </ModalFooter>
      </ComposedModal>

      {toast && (
        <div className="toast-region">
          <ToastNotification kind="success" title={byId('next-steps').share.toastTitle} subtitle={byId('next-steps').share.toastBody}
            timeout={5000} onClose={() => setToast(false)} onCloseButtonClick={() => setToast(false)} />
        </div>
      )}
    </>
  );
}

// What the block colors mean, above the stage. Each swatch is a tiny block drawn with the same face colors.
function Legend({ active, innerRef }) {
  const shown = LEGEND.scenes.includes(active);
  return (
    <ul ref={innerRef} className={'legend' + (shown ? ' is-shown' : '')} aria-label="Block colors" aria-hidden={!shown || undefined}>
      {LEGEND.items.filter(it => !it.only || it.only === active).map(it => (
        <li key={it.color} className="legend__item">
          <svg className="legend__cube" width="14" height="16" viewBox="0 0 14 16" aria-hidden="true">
            <polygon points="7,0 14,4 7,8 0,4" style={{ fill: `var(--block-${it.color}-top)` }} />
            <polygon points="0,4 7,8 7,16 0,12" style={{ fill: `var(--block-${it.color}-left)` }} />
            <polygon points="7,8 14,4 14,12 7,16" style={{ fill: `var(--block-${it.color}-right)` }} />
          </svg>
          {it.label}
        </li>
      ))}
    </ul>
  );
}

// The customer quote for Automation. On wide screens it sits under the stage, as in the Figma frames;
// below lg it follows the table. Only one of the two is ever displayed.
function Quote({ quote, className, hidden, innerRef }) {
  return (
    <figure ref={innerRef} className={'quote ' + className} aria-hidden={hidden || undefined}>
      <blockquote>“{quote.text}”</blockquote>
      <figcaption><strong>{quote.name}</strong><span>{quote.role}</span></figcaption>
    </figure>
  );
}

function Hotspot({ pos, text, align }) {
  return (
    <div className="hotspot" style={pos}>
      <Toggletip align={align}>
        <ToggletipButton label="Show details">
          <Information />
        </ToggletipButton>
        <ToggletipContent><p>{text}</p></ToggletipContent>
      </Toggletip>
    </div>
  );
}
