// app-main.jsx — shell, navigation, tweaks, device scaling
const { useState: useStateM, useEffect: useEffectM, useRef: useRefM } = React;

const FONT_STACKS = {
  System: '-apple-system, "SF Pro Text", system-ui, sans-serif',
  Geist:  '"Geist", -apple-system, system-ui, sans-serif',
  Jakarta:'"Plus Jakarta Sans", -apple-system, system-ui, sans-serif',
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "accent": "#5E6AD2",
  "font": "System"
}/*EDITMODE-END*/;

const ACCENTS = ['#5E6AD2', '#2F9E68', '#7C5CDB', '#E8833A', '#2F7BE0', '#111827'];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useStateM('onboarding');
  const [editor, setEditor] = useStateM({
    input: SAMPLE_INPUT, mode: 'medium', tone: 'Conversational', style: 'Marketing',
  });
  const setE = (patch) => setEditor(s => ({ ...s, ...patch }));

  const go = (s) => {
    setScreen(s);
    // scroll the device content to top on navigation
    requestAnimationFrame(() => {
      document.querySelectorAll('.app-root [data-scroll]').forEach(el => { el.scrollTop = 0; });
    });
  };

  // ── device scale-to-fit ──
  const stageRef = useRefM(null);
  const [scale, setScale] = useStateM(1);
  useEffectM(() => {
    const fit = () => {
      const pad = 40;
      const vw = window.innerWidth - pad, vh = window.innerHeight - pad;
      setScale(Math.min(vw / 402, vh / 874, 1.18));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const screens = {
    onboarding: <Onboarding go={go} />,
    home:       <Home go={go} />,
    humanize:   <Editor go={go} state={editor} set={setE} />,
    processing: <Processing go={go} />,
    result:     <Result go={go} />,
    detector:   <Detector go={go} />,
    stats:      <Metrics go={go} />,
    pricing:    <Pricing go={go} />,
    profile:    <Profile go={go} />,
  };

  const noChrome = ['onboarding', 'processing'].includes(screen);
  const tabMap = { home: 'home', detector: 'detector', stats: 'stats', profile: 'profile', pricing: 'profile' };
  const currentTab = tabMap[screen] || null;

  const rootStyle = {
    '--accent': t.accent,
    '--font-ui': FONT_STACKS[t.font] || FONT_STACKS.System,
    fontFamily: 'var(--font-ui)',
    height: '100%', position: 'relative', background: 'var(--bg)', color: 'var(--text)',
    overflow: 'hidden',
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div ref={stageRef} style={{ transform: `scale(${scale})`, transformOrigin: 'center center', transition: 'transform .2s ease' }}>
        <IOSDevice dark={t.dark}>
          <div className="app-root" data-theme={t.dark ? 'dark' : 'light'} style={rootStyle}>
            <div key={screen} className="screen-fade" style={{ height: '100%' }}>
              {screens[screen]}
            </div>
            {!noChrome && <TabBar current={currentTab} onNav={go} onHumanize={() => go('humanize')} />}
          </div>
        </IOSDevice>
      </div>

      <TweaksPanel>
        <TweakSection label="Appearance" />
        <TweakToggle label="Dark mode" value={t.dark} onChange={v => setTweak('dark', v)} />
        <TweakColor label="Accent" value={t.accent} options={ACCENTS} onChange={v => setTweak('accent', v)} />
        <TweakSection label="Typography" />
        <TweakRadio label="Font" value={t.font} options={['System', 'Geist', 'Jakarta']} onChange={v => setTweak('font', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
