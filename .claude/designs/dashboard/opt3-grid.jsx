// Option 3 — All-visible grid (zero clicks to see state).
// Compact room tiles in a 2-col layout. Every sensor + every actionable entity is
// rendered inline. Long-press / dedicated section per type. Heavy density.
// Tradeoff: more visual load, but truly zero navigation.

function Opt3({ rooms, onUpdate }) {
  const floors = ['First floor', 'Basement', 'Other areas'];
  return (
    <div style={{ background: TONE.bg, color: TONE.text, fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', minHeight: '100%', paddingBottom: 30 }}>
      {/* Compact header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(14,15,18,0.92)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${TONE.line}`, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="home" size={18} style={{ color: TONE.textDim }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>Home</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, fontSize: 11, color: TONE.textDim }}>
            <span><strong style={{ color: TONE.light }}>{rooms.reduce((s,r) => s + lightsOn(r), 0)}</strong> on</span>
            <span><strong style={{ color: TONE.curtain }}>{rooms.reduce((s,r) => s + curtainsOpen(r), 0)}</strong> open</span>
            <span style={{ color: TONE.text }}>22.9°</span>
          </div>
        </div>
      </div>

      {floors.map(floor => {
        const fr = rooms.filter(r => r.floor === floor);
        if (!fr.length) return null;
        return (
          <div key={floor} style={{ padding: '14px 10px 0' }}>
            <div style={{ fontSize: 10, color: TONE.textMute, letterSpacing: 0.7, textTransform: 'uppercase', fontWeight: 600, padding: '0 4px 8px' }}>{floor}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {fr.map(room => (
                <DenseTile key={room.id} room={room} onUpdate={(p) => onUpdate(room.id, p)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DenseTile({ room, onUpdate }) {
  const lOn = lightsOn(room);
  const cOpen = curtainsOpen(room);

  const toggleAllLights = (e) => {
    e.stopPropagation();
    onUpdate({ lights: room.lights.map(l => ({ ...l, on: lOn === 0 })) });
  };
  const toggleAllCurtains = (e) => {
    e.stopPropagation();
    onUpdate({ curtains: room.curtains.map(c => ({ ...c, position: cOpen === 0 ? 100 : 0 })) });
  };
  const toggleLight = (i, e) => {
    e?.stopPropagation();
    onUpdate({ lights: room.lights.map((x, j) => j === i ? { ...x, on: !x.on } : x) });
  };
  const cycleCurtain = (i, e) => {
    e?.stopPropagation();
    const c = room.curtains[i];
    const next = c.position === 0 ? 50 : c.position === 50 ? 100 : 0;
    onUpdate({ curtains: room.curtains.map((x, j) => j === i ? { ...x, position: next } : x) });
  };
  const adjustClimate = (i, delta, e) => {
    e?.stopPropagation();
    const c = room.climate[i];
    onUpdate({ climate: room.climate.map((x, j) => j === i ? { ...x, target: x.target + delta } : x) });
  };

  const empty = !room.lights.length && !room.curtains.length && !(room.climate||[]).length;
  const accent = lOn > 0 ? TONE.light : 'transparent';

  return (
    <div style={{
      background: TONE.surface, borderRadius: 12, padding: 10,
      border: `1px solid ${TONE.line}`,
      position: 'relative', overflow: 'hidden',
      minHeight: 110,
    }}>
      {lOn > 0 && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent, opacity: 0.7 }} />
      )}
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon name={room.icon} size={13} style={{ color: lOn > 0 ? TONE.light : TONE.textDim, flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.name}</div>
        {room.motion && (
          <span style={{ width: 5, height: 5, borderRadius: 999, background: TONE.motion, boxShadow: `0 0 6px ${TONE.motion}`, animation: 'pulse 1.6s ease infinite', flexShrink: 0 }} />
        )}
      </div>
      {/* Sensors row */}
      <div style={{ fontSize: 10.5, color: TONE.textDim, display: 'flex', gap: 8, marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>
        {room.temp != null && <span>{room.temp.toFixed(1)}°</span>}
        {room.humidity != null && <span>{room.humidity.toFixed(0)}%</span>}
        {room.temp == null && room.humidity == null && <span style={{ color: TONE.textMute }}>—</span>}
      </div>

      {/* Lights */}
      {room.lights.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
            <button onClick={toggleAllLights} style={miniLabel(TONE.light, lOn > 0)}>
              <Icon name="bulb" size={9} /> {lOn}/{room.lights.length}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {room.lights.map((l, i) => (
              <button key={l.id} onClick={(e) => toggleLight(i, e)} title={l.name} style={{
                flex: '1 1 calc(50% - 2px)', minWidth: 0,
                padding: '5px 6px', border: 'none', borderRadius: 6, cursor: 'pointer',
                background: l.on ? TONE.lightBg : 'rgba(255,255,255,0.04)',
                color: l.on ? TONE.light : TONE.textDim,
                fontFamily: 'inherit', fontSize: 10, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 4,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                <span style={{ width: 4, height: 4, borderRadius: 999, background: l.on ? TONE.light : TONE.textMute, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Curtains */}
      {room.curtains.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {room.curtains.map((c, i) => (
              <button key={c.id} onClick={(e) => cycleCurtain(i, e)} style={{
                flex: '1 1 100%', padding: '5px 7px', border: 'none', borderRadius: 6, cursor: 'pointer',
                background: c.position > 5 ? TONE.curtainBg : 'rgba(255,255,255,0.04)',
                color: c.position > 5 ? TONE.curtain : TONE.textDim,
                fontFamily: 'inherit', fontSize: 10, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'space-between',
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="curtain" size={10}/> {c.name}
                </span>
                <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {c.position === 0 ? 'closed' : c.position === 100 ? 'open' : `${c.position}%`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Climate */}
      {room.climate && room.climate.length > 0 && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 4 }}>
          {room.climate.map((c, i) => {
            const accent2 = c.mode === 'heat' ? TONE.heat : TONE.cool;
            return (
              <div key={c.id} style={{
                flex: '1 1 100%', padding: '4px 6px', borderRadius: 6,
                background: 'rgba(255,255,255,0.03)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Icon name="thermo" size={10} style={{ color: accent2, flexShrink: 0 }}/>
                <div style={{ fontSize: 10, color: TONE.textDim, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                <button onClick={(e) => adjustClimate(i, -0.5, e)} style={tinyBtn}>−</button>
                <span style={{ fontSize: 10.5, fontWeight: 600, minWidth: 30, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{c.target.toFixed(1)}°</span>
                <button onClick={(e) => adjustClimate(i, +0.5, e)} style={tinyBtn}>+</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Scenes — show first 2 as ghost chips */}
      {room.actions && room.actions.length > 0 && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {room.actions.slice(0, 2).map(a => (
            <button key={a.id} style={{
              padding: '3px 7px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: a.active ? TONE.lightBg : 'rgba(255,255,255,0.04)',
              color: a.active ? TONE.light : TONE.textDim,
              fontFamily: 'inherit', fontSize: 9.5, display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              <Icon name={a.icon} size={9}/>{a.name}
            </button>
          ))}
          {room.actions.length > 2 && (
            <button style={{ padding: '3px 7px', borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.04)', color: TONE.textDim, fontFamily: 'inherit', fontSize: 9.5, cursor: 'pointer' }}>+{room.actions.length - 2}</button>
          )}
        </div>
      )}

      {empty && (
        <div style={{ fontSize: 10, color: TONE.textMute, padding: '4px 0' }}>sensors only</div>
      )}
    </div>
  );
}

const tinyBtn = {
  width: 18, height: 18, borderRadius: 4, border: 'none', cursor: 'pointer',
  background: 'rgba(255,255,255,0.05)', color: TONE.text,
  fontFamily: 'inherit', fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
};

function miniLabel(color, active) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 3,
    padding: '2px 6px', borderRadius: 999, border: 'none', cursor: 'pointer',
    background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
    color: active ? color : TONE.textMute,
    fontFamily: 'inherit', fontSize: 9.5, fontWeight: 600,
  };
}

window.Opt3 = Opt3;
