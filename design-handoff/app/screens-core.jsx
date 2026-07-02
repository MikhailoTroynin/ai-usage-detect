// screens-core.jsx — Onboarding, Home/Dashboard, Editor
const { useState: useStateC } = React;

// ── Brand mark ───────────────────────────────────────────────
function Logo({ size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 14px var(--accent-glow)', flexShrink: 0,
    }}>
      <Icon name="wand" size={size * 0.56} stroke="#fff" sw={1.9} />
    </div>
  );
}

// ── Onboarding ───────────────────────────────────────────────
function Onboarding({ go }) {
  // mini preview of the highlight feature
  const demo = [
    { t: 'Our cutting-edge solution leverages synergy', r: 'red' },
    { t: "Honestly? It just works the way you'd hope.", r: 'green' },
  ];
  return (
    <Screen pt={70} pb={30} scroll={false}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 26 }}>
          <Logo size={60} />
          <div>
            <div style={{ fontSize: 38, fontWeight: 790, letterSpacing: -1.4, lineHeight: 1.04, color: 'var(--text)' }}>
              Write like a<br />human.<br />
              <span style={{ color: 'var(--accent)' }}>Pass every detector.</span>
            </div>
            <div style={{ fontSize: 16, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.5, letterSpacing: -0.2 }}>
              Run AI drafts through a 4-layer humanizer that breaks the statistical fingerprint — and keeps your text readable.
            </div>
          </div>

          {/* feature preview card */}
          <Card pad={14} style={{ background: 'var(--surface)' }}>
            <div style={{ fontSize: 11, fontWeight: 650, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>Live sentence scoring</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {demo.map((d, i) => (
                <div key={i} style={{
                  fontSize: 14, lineHeight: 1.45, padding: '8px 10px', borderRadius: 10,
                  background: RISK[d.r].bg, color: 'var(--text)',
                  borderLeft: `3px solid ${RISK[d.r].c}`,
                }}>{d.t}</div>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button full size="lg" icon="arrowR" onClick={() => go('home')}>Get started — it's free</Button>
          <button onClick={() => go('home')} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 15,
            fontWeight: 550, fontFamily: 'inherit', cursor: 'pointer', padding: 6,
          }}>I already have an account</button>
        </div>
      </div>
    </Screen>
  );
}

// ── Credit balance card ──────────────────────────────────────
function BalanceCard({ compact }) {
  const left = CREDITS_TOTAL - CREDITS_USED;
  const pct = (CREDITS_USED / CREDITS_TOTAL) * 100;
  return (
    <Card pad={18} style={{ background: 'var(--accent)', border: 'none', color: '#fff', boxShadow: '0 10px 30px var(--accent-glow)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12.5, opacity: 0.85, fontWeight: 600, letterSpacing: 0.2 }}>WORDS REMAINING</div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.2, marginTop: 6, lineHeight: 1 }}>
            {left.toLocaleString('en-US')}
          </div>
        </div>
        <Chip color="#fff" bg="rgba(255,255,255,.2)" style={{ backdropFilter: 'blur(4px)' }}>
          <Icon name="spark" size={13} fill="#fff" stroke="#fff" sw={0} /> Starter
        </Chip>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ height: 7, background: 'rgba(255,255,255,.25)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#fff', borderRadius: 999 }} />
        </div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 8, fontWeight: 550 }}>
          {CREDITS_USED.toLocaleString()} of {CREDITS_TOTAL.toLocaleString()} used this month
        </div>
      </div>
    </Card>
  );
}

// ── Home / Dashboard ─────────────────────────────────────────
function Home({ go }) {
  return (
    <Screen>
      <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 550 }}>Good morning</div>
          <div style={{ fontSize: 26, fontWeight: 770, letterSpacing: -0.7, color: 'var(--text)' }}>Alex Morgan</div>
        </div>
        <button onClick={() => go('profile')} style={{
          width: 44, height: 44, borderRadius: 999, border: '1px solid var(--border)',
          background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'relative',
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 999, background: 'linear-gradient(135deg, var(--accent), color-mix(in oklch, var(--accent), #fff 40%))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>A</div>
          <span style={{ position: 'absolute', top: 0, right: 0, width: 11, height: 11, borderRadius: 999, background: 'var(--risk-green)', border: '2px solid var(--bg)' }} />
        </button>
      </div>

      <div style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <BalanceCard />

        {/* primary actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Card onClick={() => go('humanize')} pad={16} style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 116, justifyContent: 'space-between' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
              <Icon name="wand" size={21} />
            </div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 680, letterSpacing: -0.2 }}>Humanize text</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>Rewrite an AI draft</div>
            </div>
          </Card>
          <Card onClick={() => go('detector')} pad={16} style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 116, justifyContent: 'space-between' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
              <Icon name="detect" size={21} />
            </div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 680, letterSpacing: -0.2 }}>AI detector</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>Check before you ship</div>
            </div>
          </Card>
        </div>

        {/* recent history */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <div style={{ fontSize: 17, fontWeight: 720, letterSpacing: -0.4 }}>Recent</div>
          <span style={{ fontSize: 13.5, color: 'var(--accent)', fontWeight: 600 }}>See all</span>
        </div>
        <Card pad={0}>
          {HISTORY.map((h, i) => (
            <div key={h.id} onClick={() => go('result')} style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', cursor: 'pointer',
              borderBottom: i < HISTORY.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                <Icon name="doc" size={19} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 620, letterSpacing: -0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{h.words.toLocaleString()} words · {h.when} · {h.mode}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--risk-red)' }}>{h.before}</span>
                <Icon name="arrowR" size={13} stroke="var(--text-faint)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--risk-green)' }}>{h.after}%</span>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </Screen>
  );
}

// ── A field that opens a picker sheet ────────────────────────
function PickerField({ label, value, onPick, options }) {
  const [open, setOpen] = useStateC(false);
  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        flex: 1, minWidth: 0, textAlign: 'left', background: 'var(--surface)', cursor: 'pointer',
        border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 13px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontFamily: 'inherit',
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, letterSpacing: 0.2, textTransform: 'uppercase' }}>{label}</div>
          <div style={{ fontSize: 15, fontWeight: 620, color: 'var(--text)', letterSpacing: -0.2, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
        </div>
        <Icon name="chevD" size={17} stroke="var(--text-faint)" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`Choose ${label.toLowerCase()}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 8 }}>
          {options.map(o => {
            const active = o === value;
            return (
              <button key={o} onClick={() => { onPick(o); setOpen(false); }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: active ? 'var(--accent-soft)' : 'transparent', fontFamily: 'inherit',
                fontSize: 16, fontWeight: active ? 650 : 500, color: active ? 'var(--accent)' : 'var(--text)',
                textAlign: 'left', letterSpacing: -0.2,
              }}>
                {o}
                {active && <Icon name="check" size={19} stroke="var(--accent)" sw={2.2} />}
              </button>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}

// ── Import content sheet (best-practice multi-source import) ──
function ImportSheet({ open, onClose, onImport }) {
  const [drag, setDrag] = useStateC(false);
  const [urlMode, setUrlMode] = useStateC(false);
  const [url, setUrl] = useStateC('');
  const [status, setStatus] = useStateC(null); // {kind:'loading'|'error', msg}
  const fileRef = React.useRef(null);

  const reset = () => { setUrlMode(false); setUrl(''); setStatus(null); setDrag(false); };
  const close = () => { reset(); onClose(); };

  const handleFile = (file) => {
    if (!file) return;
    const isText = /\.(txt|md|text|markdown|rtf)$/i.test(file.name);
    if (isText) {
      const reader = new FileReader();
      reader.onload = (e) => { onImport(String(e.target.result || '').trim(), file.name); reset(); };
      reader.readAsText(file);
    } else {
      // simulate secure server-side extraction for docx / pdf
      setStatus({ kind: 'loading', msg: `Extracting text from ${file.name}…` });
      setTimeout(() => { onImport(SAMPLE_INPUT, file.name); reset(); }, 1300);
    }
  };

  const pasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) { onImport(text.trim(), 'Clipboard'); reset(); }
      else setStatus({ kind: 'error', msg: 'Clipboard is empty — copy some text first.' });
    } catch {
      setStatus({ kind: 'error', msg: 'Allow clipboard access, or paste into the editor directly.' });
    }
  };

  const fetchUrl = () => {
    if (!url.trim()) return;
    setStatus({ kind: 'loading', msg: 'Fetching & cleaning the page…' });
    setTimeout(() => { onImport(CONTENT_TEMPLATES[0].body, url.trim()); reset(); }, 1400);
  };

  const tile = (icon, label, onClick, active) => (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
      padding: '14px 6px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
      background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
      border: active ? '1px solid color-mix(in srgb, var(--accent) 40%, transparent)' : '1px solid transparent',
      color: active ? 'var(--accent)' : 'var(--text)',
    }}>
      <Icon name={icon} size={21} stroke={active ? 'var(--accent)' : 'var(--text)'} />
      <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: -0.1 }}>{label}</span>
    </button>
  );

  return (
    <Sheet open={open} onClose={close} title="Add content">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 6 }}>
        {/* drop / browse zone */}
        <label
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            padding: '26px 18px', borderRadius: 16, cursor: 'pointer', textAlign: 'center',
            border: `1.5px dashed ${drag ? 'var(--accent)' : 'var(--border-strong)'}`,
            background: drag ? 'var(--accent-soft)' : 'var(--surface-2)',
            transition: 'all .15s ease',
          }}>
          <input ref={fileRef} type="file" accept=".txt,.md,.markdown,.rtf,.doc,.docx,.pdf" hidden
            onChange={e => handleFile(e.target.files[0])} />
          <div style={{ width: 46, height: 46, borderRadius: 13, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px var(--accent-glow)' }}>
            <Icon name="upload" size={24} stroke="#fff" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 680, color: 'var(--text)', letterSpacing: -0.2 }}>
            {drag ? 'Drop to upload' : 'Drag a file or tap to browse'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>TXT · MD · DOCX · PDF — up to 25,000 words</div>
        </label>

        {/* other sources */}
        <div style={{ display: 'flex', gap: 10 }}>
          {tile('clip', 'Paste from clipboard', pasteClipboard)}
          {tile('link', 'Import from URL', () => { setUrlMode(v => !v); setStatus(null); }, urlMode)}
        </div>

        {/* URL input (revealed) */}
        {urlMode && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/article"
              style={{ flex: 1, minWidth: 0, height: 44, border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '0 13px', fontSize: 14.5, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
            <Button size="md" onClick={fetchUrl} disabled={!url.trim()}>Import</Button>
          </div>
        )}

        {/* status line */}
        {status && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 550,
            color: status.kind === 'error' ? 'var(--risk-red)' : 'var(--text-muted)',
            background: status.kind === 'error' ? 'var(--risk-red-bg)' : 'var(--surface-2)',
            padding: '10px 13px', borderRadius: 11,
          }}>
            {status.kind === 'loading' && <span style={{ width: 15, height: 15, borderRadius: 999, border: '2px solid var(--accent-soft)', borderTopColor: 'var(--accent)', animation: 'spin .8s linear infinite', flexShrink: 0 }} />}
            {status.msg}
          </div>
        )}

        {/* best-practice templates */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <Icon name="spark" size={15} stroke="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--text)' }}>Or start from a best-practice example</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CONTENT_TEMPLATES.map(tpl => (
            <button key={tpl.id} onClick={() => { onImport(tpl.body, tpl.title); reset(); }} style={{
              textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
              border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 14, padding: '12px 14px',
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                <Icon name="doc" size={17} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 640, color: 'var(--text)', letterSpacing: -0.2 }}>{tpl.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{tpl.body.slice(0, 52)}…</div>
              </div>
              <Chip>{tpl.tag}</Chip>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

// ── Editor ───────────────────────────────────────────────────
function Editor({ go, state, set }) {
  const [importOpen, setImportOpen] = useStateC(false);
  const words = state.input.trim() ? state.input.trim().split(/\s+/).length : 0;
  const modeObj = MODES.find(m => m.id === state.mode);
  return (
    <Screen pb={120}>
      <Header title="Humanize" sub="Paste your AI draft, pick a vibe, hit go." />

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* input */}
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '11px 15px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--text-muted)' }}>Original text</span>
            <button onClick={() => setImportOpen(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 650,
              color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', borderRadius: 8,
              padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Icon name="upload" size={14} stroke="var(--accent)" /> Import
            </button>
          </div>
          {state.input.trim() === '' ? (
            <button onClick={() => setImportOpen(true)} style={{
              width: '100%', minHeight: 158, border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: 20, fontFamily: 'inherit', color: 'var(--text-muted)',
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <Icon name="upload" size={22} stroke="var(--accent)" />
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>Import or paste your content</div>
              <div style={{ fontSize: 12.5 }}>Upload a file, paste from clipboard, or pick an example</div>
            </button>
          ) : (
            <textarea
              value={state.input}
              onChange={e => set({ input: e.target.value })}
              placeholder="Paste the text you want to humanize…"
              style={{
                width: '100%', minHeight: 158, border: 'none', outline: 'none', resize: 'none',
                padding: '14px 15px', fontSize: 15, lineHeight: 1.55, fontFamily: 'inherit',
                color: 'var(--text)', background: 'transparent', letterSpacing: -0.1, boxSizing: 'border-box',
              }} />
          )}
          <div style={{ padding: '0 15px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Chip style={{ marginRight: 'auto' }}>{words} words</Chip>
            <button onClick={() => set({ input: SAMPLE_INPUT })} style={{
              fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)',
              border: 'none', borderRadius: 8, padding: '6px 11px', cursor: 'pointer', fontFamily: 'inherit',
            }}>Use sample</button>
            <button onClick={() => set({ input: '' })} style={{
              fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface-2)',
              border: 'none', borderRadius: 8, padding: '6px 11px', cursor: 'pointer', fontFamily: 'inherit',
            }}>Clear</button>
          </div>
        </Card>

        {/* intensity */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 680, letterSpacing: -0.2 }}>Intensity</span>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{modeObj.blurb}</span>
          </div>
          <Segmented options={MODES} value={state.mode} onChange={v => set({ mode: v })}
            getId={m => m.id} getLabel={m => m.label} />
        </div>

        {/* tone + style */}
        <div style={{ display: 'flex', gap: 12 }}>
          <PickerField label="Tone" value={state.tone} options={TONES} onPick={v => set({ tone: v })} />
          <PickerField label="Style" value={state.style} options={STYLES} onPick={v => set({ style: v })} />
        </div>

        {/* cost summary */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-muted)', fontSize: 13.5 }}>
            <Icon name="spark" size={16} stroke="var(--text-muted)" />
            Cost: <b style={{ color: 'var(--text)' }}>{words} words</b>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
            {(CREDITS_TOTAL - CREDITS_USED).toLocaleString()} left
          </div>
        </div>

        <Button full size="lg" icon="wand" disabled={words === 0} onClick={() => go('processing')}>
          Humanize {words > 0 ? `${words} words` : 'text'}
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-faint)', fontSize: 12, marginTop: -4 }}>
          <Icon name="lock" size={13} stroke="var(--text-faint)" /> Privacy-first · text never stored on our servers
        </div>
      </div>

      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)}
        onImport={(text) => { set({ input: text }); setImportOpen(false); }} />
    </Screen>
  );
}

Object.assign(window, { Logo, Onboarding, Home, Editor, BalanceCard, PickerField, ImportSheet });
