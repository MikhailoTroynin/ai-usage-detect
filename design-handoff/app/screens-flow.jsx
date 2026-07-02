// screens-flow.jsx — Processing pipeline + Result with sentence highlights & alternatives
const { useState: useStateF, useEffect: useEffectF } = React;

// ── Processing: the 4-layer pipeline ─────────────────────────
function Processing({ go }) {
  const [active, setActive] = useStateF(0);   // current layer index
  const [pct, setPct] = useStateF(0);

  useEffectF(() => {
    const per = 1100;                          // ms per layer
    const timers = PIPELINE.map((_, i) =>
      setTimeout(() => setActive(i + 1), per * (i + 1)));
    const done = setTimeout(() => go('result'), per * PIPELINE.length + 700);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, []);

  useEffectF(() => {
    const id = setInterval(() => setPct(p => Math.min(100, p + 1.6)), 60);
    return () => clearInterval(id);
  }, []);

  return (
    <Screen pt={70} pb={30} scroll={false}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px' }}>
        {/* rotating ring */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <div style={{ position: 'relative', width: 150, height: 150 }}>
            <Gauge value={pct} size={150} thickness={10} color="var(--accent)" label={`${Math.round(pct)}%`} sub="humanizing" big />
            <div style={{
              position: 'absolute', inset: -8, borderRadius: 999,
              border: '2px solid var(--accent-soft)', borderTopColor: 'var(--accent)',
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ fontSize: 22, fontWeight: 760, letterSpacing: -0.6 }}>Breaking the AI fingerprint</div>
          <div style={{ fontSize: 14.5, color: 'var(--text-muted)', marginTop: 5 }}>This usually takes a few seconds.</div>
        </div>

        {/* pipeline steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PIPELINE.map((l, i) => {
            const done = i < active, running = i === active;
            return (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 13, padding: '12px 14px',
                borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)',
                opacity: done || running ? 1 : 0.5, transition: 'opacity .4s ease',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? 'var(--risk-green-bg)' : running ? 'var(--accent-soft)' : 'var(--surface-2)',
                  color: done ? 'var(--risk-green)' : 'var(--accent)',
                }}>
                  {done ? <Icon name="check" size={17} sw={2.4} />
                    : running ? <div style={{ width: 13, height: 13, borderRadius: 999, border: '2px solid var(--accent-soft)', borderTopColor: 'var(--accent)', animation: 'spin .8s linear infinite' }} />
                    : <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-faint)' }}>{i + 1}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 640, letterSpacing: -0.2, color: 'var(--text)' }}>{l.label}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 1 }}>{l.sub}</div>
                </div>
                {running && <Chip color="var(--accent)" bg="var(--accent-soft)">running</Chip>}
              </div>
            );
          })}
        </div>
      </div>
    </Screen>
  );
}

// ── A clickable, risk-colored sentence ───────────────────────
function SentenceSpan({ s, onClick }) {
  const clickable = s.risk !== 'green' && s.alts;
  const r = RISK[s.risk];
  return (
    <span onClick={clickable ? onClick : undefined} style={{
      background: s.risk === 'green' ? 'transparent' : r.bg,
      borderRadius: 5, padding: '1px 2px', margin: '0 -1px',
      boxShadow: s.risk === 'green' ? 'none' : `inset 0 -2px 0 ${r.c}`,
      cursor: clickable ? 'pointer' : 'default',
      transition: 'background .2s ease',
    }}>{s.text}{' '}</span>
  );
}

// ── Result ───────────────────────────────────────────────────
function Result({ go }) {
  const [sentences, setSentences] = useStateF(RESULT_SENTENCES);
  const [active, setActive] = useStateF(null);   // sentence being edited
  const [copied, setCopied] = useStateF(false);

  const flagged = sentences.filter(s => s.risk !== 'green').length;
  const overall = Math.round(sentences.reduce((a, s) => a + s.score, 0) / sentences.length);

  const applyAlt = (alt) => {
    setSentences(prev => prev.map(s => s.id === active.id
      ? { ...s, text: alt, risk: 'green', score: Math.floor(Math.random() * 8) + 3, alts: null }
      : s));
    setActive(null);
  };

  const copy = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); };

  return (
    <Screen pb={120}>
      <Header title="Result" sub="Tap any highlighted sentence to swap it." onBack={() => go('home')} />

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* score summary */}
        <Card pad={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Gauge value={overall} size={104} thickness={10} color="var(--risk-green)" label={`${overall}%`} sub="AI score" />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Chip color="var(--risk-red)" bg="var(--risk-red-bg)">Before 94%</Chip>
                <Icon name="arrowR" size={15} stroke="var(--text-faint)" />
                <Chip color="var(--risk-green)" bg="var(--risk-green-bg)">After {overall}%</Chip>
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                {flagged === 0
                  ? 'Every sentence now reads as human. Ready to ship.'
                  : `${flagged} sentence${flagged > 1 ? 's' : ''} still flagged — tap to refine.`}
              </div>
            </div>
          </div>
          {/* per-detector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
            {DETECTORS.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', borderRadius: 10, padding: '8px 11px' }}>
                <span style={{ fontSize: 12.5, fontWeight: 580, color: 'var(--text-muted)' }}>{d.name}</span>
                <span style={{ fontSize: 13, fontWeight: 720, color: 'var(--risk-green)' }}>{d.after}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* humanized text */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 680, letterSpacing: -0.2 }}>Humanized text</span>
            <div style={{ display: 'flex', gap: 12 }}>
              {['green', 'amber', 'red'].map(k => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 550 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: RISK[k].c }} />{RISK[k].label}
                </span>
              ))}
            </div>
          </div>
          <Card pad={16}>
            <p style={{ fontSize: 15.5, lineHeight: 1.7, color: 'var(--text)', letterSpacing: -0.1, margin: 0, textWrap: 'pretty' }}>
              {sentences.map(s => <SentenceSpan key={s.id} s={s} onClick={() => setActive(s)} />)}
            </p>
          </Card>
        </div>

        {/* actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant={copied ? 'soft' : 'ghost'} size="md" full icon={copied ? 'check' : 'copy'} onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="ghost" size="md" full icon="refresh" onClick={() => go('humanize')}>Re-run</Button>
        </div>
        <Button variant="soft" size="md" full icon="chart" onClick={() => go('stats')}>View readability metrics</Button>
      </div>

      {/* alternatives sheet */}
      <Sheet open={!!active} onClose={() => setActive(null)} title="Choose an alternative">
        {active && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-muted)' }}>
              <Chip color={RISK[active.risk].c} bg={RISK[active.risk].bg}>{RISK[active.risk].label} · {active.score}%</Chip>
              <span>Generated at temperature 1.0</span>
            </div>
            {active.alts && active.alts.map((alt, i) => (
              <button key={i} onClick={() => applyAlt(alt)} style={{
                textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
                border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 14,
                padding: '13px 15px', fontSize: 14.5, lineHeight: 1.5, color: 'var(--text)', letterSpacing: -0.1,
                display: 'flex', gap: 11, alignItems: 'flex-start',
              }}>
                <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                <span style={{ flex: 1 }}>{alt}</span>
              </button>
            ))}
          </div>
        )}
      </Sheet>
    </Screen>
  );
}

Object.assign(window, { Processing, Result, SentenceSpan });
