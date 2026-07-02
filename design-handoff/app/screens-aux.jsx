// screens-aux.jsx — Detector (free funnel), Metrics, Pricing, Profile
const { useState: useStateA } = React;

// ════════════════════════════════════════════════════════════
// AI DETECTOR — the free-to-paid funnel
// ════════════════════════════════════════════════════════════
const DETECT_SENTENCES = [
  { id: 'd1', text: "In today's fast-paced digital landscape, businesses must leverage cutting-edge solutions to stay ahead of the competition.", risk: 'red', score: 97 },
  { id: 'd2', text: "Artificial intelligence has revolutionized the way companies approach content creation.", risk: 'red', score: 91 },
  { id: 'd3', text: "Moreover, it is important to note that quality remains a key factor in driving engagement.", risk: 'red', score: 95 },
  { id: 'd4', text: "Many organizations have successfully implemented these tools to streamline their workflows.", risk: 'amber', score: 52 },
  { id: 'd5', text: "Ultimately, the integration of AI represents a paradigm shift in modern marketing.", risk: 'red', score: 89 },
];

function Detector({ go }) {
  const [text, setText] = useStateA(SAMPLE_INPUT);
  const [phase, setPhase] = useStateA('input'); // input | scanning | done
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const run = () => {
    setPhase('scanning');
    setTimeout(() => setPhase('done'), 1600);
  };

  return (
    <Screen pb={120}>
      <Header title="AI Detector" sub="Free, unlimited checks. No sign-up needed." />

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {phase !== 'done' && (
          <Card pad={0} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '11px 15px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--text-muted)' }}>Text to scan</span>
              <Chip>{words} words</Chip>
            </div>
            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder="Paste any text to check how AI-detectable it is…"
              style={{ width: '100%', minHeight: 170, border: 'none', outline: 'none', resize: 'none', padding: '14px 15px', fontSize: 15, lineHeight: 1.55, fontFamily: 'inherit', color: 'var(--text)', background: 'transparent', letterSpacing: -0.1, boxSizing: 'border-box' }} />
          </Card>
        )}

        {phase === 'input' && (
          <Button full size="lg" icon="detect" disabled={!words} onClick={run}>Scan for AI</Button>
        )}

        {phase === 'scanning' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, padding: '16px 0', color: 'var(--text-muted)', fontSize: 15, fontWeight: 550 }}>
            <div style={{ width: 18, height: 18, borderRadius: 999, border: '2.5px solid var(--accent-soft)', borderTopColor: 'var(--accent)', animation: 'spin .8s linear infinite' }} />
            Scanning across 4 detectors…
          </div>
        )}

        {phase === 'done' && (
          <>
            <Card pad={20} style={{ background: 'var(--risk-red-bg)', border: '1px solid color-mix(in oklch, var(--risk-red) 22%, transparent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <Gauge value={94} size={108} thickness={11} color="var(--risk-red)" label="94%" sub="likely AI" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 760, color: 'var(--text)', letterSpacing: -0.3 }}>Heavily AI-detectable</div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.45 }}>
                    This text would be flagged by most detectors. 4 of 5 sentences read as machine-written.
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
                {DETECTORS.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', borderRadius: 10, padding: '8px 11px' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 580, color: 'var(--text-muted)' }}>{d.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 720, color: 'var(--risk-red)' }}>{d.before}%</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card pad={16}>
              <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--text-muted)', marginBottom: 10 }}>Sentence breakdown</div>
              <p style={{ fontSize: 15, lineHeight: 1.7, margin: 0, letterSpacing: -0.1, textWrap: 'pretty' }}>
                {DETECT_SENTENCES.map(s => <SentenceSpan key={s.id} s={{ ...s, alts: null }} />)}
              </p>
            </Card>

            {/* the conversion CTA */}
            <Card pad={18} style={{ background: 'var(--accent)', border: 'none', color: '#fff', boxShadow: '0 10px 30px var(--accent-glow)' }}>
              <div style={{ fontSize: 18, fontWeight: 770, letterSpacing: -0.4 }}>Fix it in one click</div>
              <div style={{ fontSize: 13.5, opacity: 0.9, marginTop: 5, lineHeight: 1.45 }}>
                Run this through our humanizer and drop detection below 10% — while keeping it readable.
              </div>
              <button onClick={() => go('humanize')} style={{
                marginTop: 14, width: '100%', height: 50, borderRadius: 'var(--r-md)', border: 'none',
                background: '#fff', color: 'var(--accent)', fontWeight: 700, fontSize: 16, fontFamily: 'inherit',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              }}>
                <Icon name="wand" size={19} /> Humanize this text
              </button>
            </Card>
            <button onClick={() => setPhase('input')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 14, fontWeight: 550, fontFamily: 'inherit', cursor: 'pointer', padding: 4 }}>Scan another text</button>
          </>
        )}
      </div>
    </Screen>
  );
}

// ════════════════════════════════════════════════════════════
// METRICS / READABILITY
// ════════════════════════════════════════════════════════════
function StatTile({ label, value, unit, hint, good }) {
  return (
    <Card pad={15} style={{ flex: 1 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.1 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 6 }}>
        <span style={{ fontSize: 28, fontWeight: 780, letterSpacing: -1, color: 'var(--text)' }}>{value}</span>
        {unit && <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>{unit}</span>}
      </div>
      {hint && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11.5, fontWeight: 600, color: good ? 'var(--risk-green)' : 'var(--text-muted)' }}>
          {good && <Icon name="check" size={13} sw={2.4} stroke="var(--risk-green)" />}{hint}
        </div>
      )}
    </Card>
  );
}

function Metrics({ go }) {
  const dist = [9, 14, 22, 18, 11, 16, 7, 19, 12]; // sentence-length burstiness
  const maxD = Math.max(...dist);
  return (
    <Screen>
      <Header title="Metrics" sub="Readability & detection health of your last run." />
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Flesch hero */}
        <Card pad={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Gauge value={READABILITY.fre} size={112} thickness={11} color="var(--accent)" label={READABILITY.fre} sub="Flesch ease" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16.5, fontWeight: 740, letterSpacing: -0.3 }}>Easy to read</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.45 }}>
                Above the 60-point target. Roughly an 8th-grade reading level.
              </div>
              <Chip color="var(--risk-green)" bg="var(--risk-green-bg)" style={{ marginTop: 10 }}>
                <Icon name="check" size={12} sw={2.6} stroke="var(--risk-green)" /> Meets quality bar
              </Chip>
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', gap: 12 }}>
          <StatTile label="Grade level" value={READABILITY.fkgl} hint="Flesch-Kincaid" good />
          <StatTile label="Avg. sentence" value={READABILITY.avgSentence} unit="w" hint="High burstiness" good />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <StatTile label="Avg. syllables" value={READABILITY.avgSyllables} hint="per word" />
          <StatTile label="Passive voice" value={READABILITY.passive} unit="%" hint="Low — good" good />
        </div>

        {/* burstiness chart */}
        <Card pad={16}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 680, letterSpacing: -0.2 }}>Sentence length variation</span>
            <Chip color="var(--accent)" bg="var(--accent-soft)">burstiness</Chip>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>Varied length = harder to detect</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 96 }}>
            {dist.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ height: `${(d / maxD) * 100}%`, background: i % 2 ? 'var(--accent)' : 'color-mix(in oklch, var(--accent) 55%, var(--surface))', borderRadius: 5, transition: 'height .6s ease' }} />
              </div>
            ))}
          </div>
        </Card>

        {/* detection before/after */}
        <Card pad={16}>
          <span style={{ fontSize: 14, fontWeight: 680, letterSpacing: -0.2 }}>Detection: before → after</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            {DETECTORS.map(d => (
              <div key={d.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ fontWeight: 580, color: 'var(--text)' }}>{d.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    <b style={{ color: 'var(--risk-red)' }}>{d.before}%</b> → <b style={{ color: 'var(--risk-green)' }}>{d.after}%</b>
                  </span>
                </div>
                <div style={{ position: 'relative', height: 8, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${d.before}%`, background: 'color-mix(in oklch, var(--risk-red) 30%, transparent)' }} />
                  <div style={{ position: 'absolute', inset: 0, width: `${d.after}%`, background: 'var(--risk-green)', borderRadius: 999, transition: 'width .8s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Screen>
  );
}

// ════════════════════════════════════════════════════════════
// PRICING / BILLING
// ════════════════════════════════════════════════════════════
function Pricing({ go }) {
  const [selected, setSelected] = useStateA('pro');
  const [annual, setAnnual] = useStateA(false);
  return (
    <Screen pb={120}>
      <Header title="Plans" sub="Scale your word budget as you grow." onBack={() => go('profile')} />
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* billing toggle */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Segmented options={[{ id: false, l: 'Monthly' }, { id: true, l: 'Annual · -20%' }]}
            value={annual} onChange={setAnnual} getId={o => o.id} getLabel={o => o.l} />
        </div>

        {PLANS.map(p => {
          const active = selected === p.id;
          const price = annual ? Math.round(p.price * 0.8) : p.price;
          return (
            <Card key={p.id} onClick={() => setSelected(p.id)} pad={18} style={{
              border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
              position: 'relative', boxShadow: active ? '0 8px 26px var(--accent-glow)' : 'var(--shadow-sm)',
            }}>
              {p.popular && (
                <div style={{ position: 'absolute', top: -10, right: 18, background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, letterSpacing: 0.3 }}>POPULAR</div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 760, letterSpacing: -0.4 }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{p.words.toLocaleString()} words / mo</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, color: 'var(--text)' }}>${price}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>/mo</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                {p.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: 'var(--text)' }}>
                    <Icon name="check" size={16} sw={2.4} stroke="var(--accent)" /> {f}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}

        <Button full size="lg" icon="bolt" onClick={() => go('profile')}>
          {selected === 'starter' ? 'Stay on current plan' : `Upgrade to ${PLANS.find(p => p.id === selected).name}`}
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-faint)', fontSize: 12 }}>
          <Icon name="card" size={14} stroke="var(--text-faint)" /> Secured by Stripe · cancel anytime
        </div>
      </div>
    </Screen>
  );
}

// ════════════════════════════════════════════════════════════
// PROFILE / SETTINGS
// ════════════════════════════════════════════════════════════
function Row({ icon, title, detail, onClick, danger, last, control }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', cursor: onClick ? 'pointer' : 'default',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: danger ? 'var(--risk-red-bg)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: danger ? 'var(--risk-red)' : 'var(--text)', flexShrink: 0 }}>
        <Icon name={icon} size={18} />
      </div>
      <div style={{ flex: 1, fontSize: 15, fontWeight: 560, color: danger ? 'var(--risk-red)' : 'var(--text)', letterSpacing: -0.2 }}>{title}</div>
      {detail && <span style={{ fontSize: 13.5, color: 'var(--text-muted)', marginRight: 2 }}>{detail}</span>}
      {control}
      {onClick && !control && <Icon name="chevR" size={17} stroke="var(--text-faint)" />}
    </div>
  );
}

function MiniToggle({ on, onClick }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} style={{
      width: 46, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 3,
      background: on ? 'var(--risk-green)' : 'var(--border-strong)', transition: 'background .2s ease',
      display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start',
    }}>
      <span style={{ width: 22, height: 22, borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'all .2s ease' }} />
    </button>
  );
}

function Profile({ go }) {
  const [privacy, setPrivacy] = useStateA(true);
  const [notif, setNotif] = useStateA(true);
  const left = CREDITS_TOTAL - CREDITS_USED;
  return (
    <Screen>
      <Header title="Account" />
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* profile head */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: 999, background: 'linear-gradient(135deg, var(--accent), color-mix(in oklch, var(--accent), #fff 40%))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 24 }}>A</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 740, letterSpacing: -0.4 }}>Alex Morgan</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>alex@contentlab.co</div>
          </div>
          <Chip color="var(--accent)" bg="var(--accent-soft)">Starter</Chip>
        </div>

        {/* usage card */}
        <Card pad={16}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 680 }}>This month</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{left.toLocaleString()} / {CREDITS_TOTAL.toLocaleString()} left</span>
          </div>
          <Meter value={left} max={CREDITS_TOTAL} />
          <Button variant="soft" size="sm" full icon="bolt" style={{ marginTop: 14 }} onClick={() => go('pricing')}>Upgrade plan</Button>
        </Card>

        {/* settings groups */}
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.4, padding: '0 4px 8px' }}>Preferences</div>
          <Card pad={0}>
            <Row icon="shield" title="Privacy-first mode" detail="" control={<MiniToggle on={privacy} onClick={() => setPrivacy(!privacy)} />} />
            <Row icon="bell" title="Notifications" control={<MiniToggle on={notif} onClick={() => setNotif(!notif)} />} />
            <Row icon="eye" title="Appearance" detail="Open Tweaks" onClick={() => {}} last />
          </Card>
        </div>

        <div>
          <div style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.4, padding: '0 4px 8px' }}>Billing</div>
          <Card pad={0}>
            <Row icon="card" title="Plans & pricing" onClick={() => go('pricing')} />
            <Row icon="clock" title="Usage history" onClick={() => {}} />
            <Row icon="doc" title="Invoices" onClick={() => {}} last />
          </Card>
        </div>

        <Card pad={0}>
          <Row icon="close" title="Sign out" danger onClick={() => go('onboarding')} last />
        </Card>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-faint)', paddingBottom: 4 }}>AI Humanizer · v1.0.0</div>
      </div>
    </Screen>
  );
}

Object.assign(window, { Detector, Metrics, Pricing, Profile, StatTile, Row, MiniToggle });
