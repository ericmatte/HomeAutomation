// Option 1 — Accordion dense.
// Single scroll. Each room is a card with sensors + quick chips always visible.
// Tap chevron to expand inline → full granular controls. No sub-views.

function Opt1({ rooms, onUpdate }) {
  const [expanded, setExpanded] = React.useState(new Set(['living']));
  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const floors = ['First floor', 'Basement', 'Other areas'];

  return (
    <div style={{ background: TONE.bg, color: TONE.text, fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', minHeight: '100%', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(14,15,18,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${TONE.line}`, padding: '16px 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: TONE.textMute, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Tuesday · 14:32</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>Home</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={iconBtn}><Icon name="search" size={18}/></button>
            <button style={iconBtn}><Icon name="dots" size={18}/></button>
          </div>
        </div>
        {/* Hero summary */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <SummaryStat label="Lights on" value={rooms.reduce((s, r) => s + lightsOn(r), 0)} icon="bulb" color={TONE.light} />
          <SummaryStat label="Curtains" value={rooms.reduce((s, r) => s + curtainsOpen(r), 0)} icon="curtain" color={TONE.curtain} />
          <SummaryStat label="Avg" value="22.9°" icon="thermo" color={TONE.motion} />
        </div>
      </div>

      {/* Floor sections */}
      {floors.map(floor => {
        const fr = rooms.filter(r => r.floor === floor);
        if (!fr.length) return null;
        return (
          <div key={floor} style={{ padding: '20px 14px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 10px' }}>
              <div style={{ width: 4, height: 4, borderRadius: 999, background: TONE.textMute }} />
              <div style={{ fontSize: 11, color: TONE.textDim, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>{floor}</div>
              <div style={{ flex: 1, height: 1, background: TONE.line }} />
              <div style={{ fontSize: 11, color: TONE.textMute }}>{fr.length} rooms</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fr.map(room => (
                <RoomCard key={room.id} room={room}
                  expanded={expanded.has(room.id)}
                  onToggleExpand={() => toggle(room.id)}
                  onUpdate={(patch) => onUpdate(room.id, patch)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const iconBtn = {
  width: 36, height: 36, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.04)',
  color: TONE.textDim, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

function SummaryStat({ label, value, icon, color }) {
  return (
    <div style={{ flex: 1, background: TONE.surface, borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}1f`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={16} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: TONE.text }}>{value}</div>
        <div style={{ fontSize: 10, color: TONE.textMute, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function RoomCard({ room, expanded, onToggleExpand, onUpdate }) {
  const lOn = lightsOn(room);
  const cOpen = curtainsOpen(room);
  const anyLights = room.lights.length > 0;
  const anyCurtains = room.curtains.length > 0;

  // Group toggles
  const toggleAllLights = (e) => {
    e.stopPropagation();
    const targetState = lOn === 0;
    onUpdate({ lights: room.lights.map(l => ({ ...l, on: targetState })) });
  };
  const toggleAllCurtains = (e) => {
    e.stopPropagation();
    const targetState = cOpen === 0 ? 100 : 0;
    onUpdate({ curtains: room.curtains.map(c => ({ ...c, position: targetState })) });
  };

  return (
    <div style={{
      background: TONE.surface, borderRadius: 14,
      border: expanded ? `1px solid ${TONE.line2}` : `1px solid transparent`,
      transition: 'border-color .2s ease',
      overflow: 'hidden',
    }}>
      {/* Row */}
      <div onClick={onToggleExpand} style={{
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: lOn > 0 ? TONE.lightBg : 'rgba(255,255,255,0.04)',
          color: lOn > 0 ? TONE.light : TONE.textDim,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name={room.icon} size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: -0.1 }}>{room.name}</div>
            {room.motion && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: TONE.motion, padding: '1px 6px', borderRadius: 999, background: TONE.motionBg }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: TONE.motion, animation: 'pulse 1.6s ease infinite' }} />
                motion
              </div>
            )}
          </div>
          <div style={{ marginTop: 3, fontSize: 12, color: TONE.textDim, display: 'flex', gap: 10 }}>
            {room.temp != null && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="thermo" size={11} style={{ color: TONE.textMute }} />
                {room.temp.toFixed(1)}°
              </span>
            )}
            {room.humidity != null && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="drop" size={11} style={{ color: TONE.textMute }} />
                {room.humidity.toFixed(0)}%
              </span>
            )}
            {!room.temp && !room.humidity && room.lights.length === 0 && room.curtains.length === 0 && (
              <span style={{ color: TONE.textMute, fontSize: 11 }}>—</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {anyLights && (
            <button onClick={toggleAllLights} style={{
              ...quickBtn,
              background: lOn > 0 ? TONE.lightBg : 'rgba(255,255,255,0.04)',
              color: lOn > 0 ? TONE.light : TONE.textDim,
            }}>
              <Icon name="bulb" size={14} />
              {lOn > 0 && <span style={{ fontSize: 11, fontWeight: 600 }}>{lOn}</span>}
            </button>
          )}
          {anyCurtains && (
            <button onClick={toggleAllCurtains} style={{
              ...quickBtn,
              background: cOpen > 0 ? TONE.curtainBg : 'rgba(255,255,255,0.04)',
              color: cOpen > 0 ? TONE.curtain : TONE.textDim,
            }}>
              <Icon name="curtain" size={14} />
            </button>
          )}
          <div style={{
            transition: 'transform .2s ease', transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            color: TONE.textMute, marginLeft: 2,
          }}>
            <Icon name="chevron" size={16} />
          </div>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '4px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {room.lights.length > 0 && (
            <Section title="Lights">
              {room.lights.map((l, i) => (
                <LightControl key={l.id} light={l}
                  onToggle={() => onUpdate({ lights: room.lights.map((x, j) => j === i ? { ...x, on: !x.on } : x) })}
                  onBright={(v) => onUpdate({ lights: room.lights.map((x, j) => j === i ? { ...x, brightness: v, on: v > 0 } : x) })}
                />
              ))}
            </Section>
          )}
          {room.curtains.length > 0 && (
            <Section title="Curtains">
              {room.curtains.map((c, i) => (
                <CurtainControl key={c.id} curtain={c}
                  onPos={(v) => onUpdate({ curtains: room.curtains.map((x, j) => j === i ? { ...x, position: v } : x) })}
                />
              ))}
            </Section>
          )}
          {room.climate && room.climate.length > 0 && (
            <Section title="Climate">
              <div style={{ display: 'grid', gridTemplateColumns: room.climate.length > 1 ? '1fr 1fr' : '1fr', gap: 8 }}>
                {room.climate.map((c, i) => (
                  <ClimateControl key={c.id} climate={c}
                    onTarget={(t) => onUpdate({ climate: room.climate.map((x, j) => j === i ? { ...x, target: t } : x) })}
                  />
                ))}
              </div>
            </Section>
          )}
          {room.media && room.media.length > 0 && (
            <Section title="Media">
              {room.media.map(m => (
                <div key={m.id} style={{ background: TONE.surface2, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.04)', color: TONE.motion, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="speaker" size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: TONE.textMute }}>{m.state}</div>
                  </div>
                  <button style={{ ...iconBtn, width: 30, height: 30, color: TONE.text }}>
                    <Icon name="play" size={14} />
                  </button>
                </div>
              ))}
            </Section>
          )}
          {room.actions && room.actions.length > 0 && (
            <Section title="Scenes">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {room.actions.map(a => (
                  <button key={a.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
                    background: a.active ? TONE.lightBg : TONE.surface2,
                    color: a.active ? TONE.light : TONE.text,
                    fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
                  }}>
                    <Icon name={a.icon} size={13} />
                    {a.name}
                  </button>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

const quickBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  minWidth: 32, height: 30, padding: '0 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
};

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: TONE.textMute, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  );
}

function LightControl({ light, onToggle, onBright }) {
  return (
    <div style={{ background: TONE.surface2, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onToggle} style={{
          width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: light.on ? TONE.lightBg : 'rgba(255,255,255,0.04)',
          color: light.on ? TONE.light : TONE.textMute,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="bulb" size={15} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13 }}>{light.name}</div>
          <div style={{ fontSize: 11, color: TONE.textMute }}>{light.on ? `${light.brightness}%` : 'Off'}</div>
        </div>
      </div>
      {light.on && (
        <div style={{ marginTop: 10 }}>
          <Slider value={light.brightness} onChange={onBright} accent={TONE.light} />
        </div>
      )}
    </div>
  );
}

function CurtainControl({ curtain, onPos }) {
  return (
    <div style={{ background: TONE.surface2, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: curtain.position > 5 ? TONE.curtainBg : 'rgba(255,255,255,0.04)',
          color: curtain.position > 5 ? TONE.curtain : TONE.textMute,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="curtain" size={15} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13 }}>{curtain.name}</div>
          <div style={{ fontSize: 11, color: TONE.textMute }}>
            {curtain.position === 0 ? 'Closed' : curtain.position === 100 ? 'Open' : `${curtain.position}% open`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => onPos(0)} style={{ ...quickBtn, background: 'rgba(255,255,255,0.04)', color: TONE.textDim, width: 28, height: 28, fontSize: 11 }}>0</button>
          <button onClick={() => onPos(50)} style={{ ...quickBtn, background: 'rgba(255,255,255,0.04)', color: TONE.textDim, width: 28, height: 28, fontSize: 11 }}>½</button>
          <button onClick={() => onPos(100)} style={{ ...quickBtn, background: 'rgba(255,255,255,0.04)', color: TONE.textDim, width: 28, height: 28, fontSize: 11 }}>100</button>
        </div>
      </div>
      <Slider value={curtain.position} onChange={onPos} accent={TONE.curtain} />
    </div>
  );
}

function ClimateControl({ climate, onTarget }) {
  const accent = climate.mode === 'heat' ? TONE.heat : TONE.cool;
  return (
    <div style={{ background: TONE.surface2, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8,
          background: `${accent}24`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="thermo" size={13} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{climate.name}</div>
          <div style={{ fontSize: 10, color: accent, textTransform: 'capitalize' }}>{climate.mode} · {climate.current}°</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <button onClick={() => onTarget(climate.target - 0.5)} style={{ ...iconBtn, width: 28, height: 28, borderRadius: 8 }}><Icon name="minus" size={14}/></button>
        <div style={{ fontSize: 17, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{climate.target.toFixed(1)}°</div>
        <button onClick={() => onTarget(climate.target + 0.5)} style={{ ...iconBtn, width: 28, height: 28, borderRadius: 8 }}><Icon name="plus" size={14}/></button>
      </div>
    </div>
  );
}

window.Opt1 = Opt1;
