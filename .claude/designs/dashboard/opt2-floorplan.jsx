// Option 2 — Floor plan hybrid.
// Top: stylized SVG floor map of the active floor. Rooms glow when lights are on,
// pulse when motion. Tap a room on the map to bring its controls up in the panel below.

function Opt2({ rooms, onUpdate }) {
  const [activeFloor, setActiveFloor] = React.useState('First floor');
  const [selectedId, setSelectedId] = React.useState('living');

  const floors = ['First floor', 'Basement'];
  const floorRooms = rooms.filter(r => r.floor === activeFloor);
  const selected = rooms.find(r => r.id === selectedId) || floorRooms[0];

  // Switching floor — auto-pick first room in that floor
  const switchFloor = (f) => {
    setActiveFloor(f);
    const first = rooms.find(r => r.floor === f);
    if (first) setSelectedId(first.id);
  };

  return (
    <div style={{ background: TONE.bg, color: TONE.text, fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', minHeight: '100%', paddingBottom: 20 }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: TONE.textMute, letterSpacing: 0.5, textTransform: 'uppercase' }}>Home · 14:32</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4, marginTop: 2 }}>{activeFloor}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.04)', color: TONE.textDim, cursor: 'pointer' }}><Icon name="search" size={18}/></button>
        </div>
      </div>

      {/* Floor switcher pills */}
      <div style={{ display: 'flex', gap: 6, padding: '14px 20px 8px' }}>
        {floors.map(f => (
          <button key={f} onClick={() => switchFloor(f)} style={{
            padding: '6px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: activeFloor === f ? '#fff' : 'rgba(255,255,255,0.05)',
            color: activeFloor === f ? '#111' : TONE.textDim,
            fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
          }}>{f}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: TONE.textMute }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: TONE.light }} /> on
          <span style={{ width: 6, height: 6, borderRadius: 999, background: TONE.motion, marginLeft: 4 }} /> motion
        </div>
      </div>

      {/* Floor map */}
      <div style={{ padding: '4px 14px 0' }}>
        <FloorMap rooms={floorRooms} selectedId={selected?.id} onSelect={setSelectedId} />
      </div>

      {/* Selected room control panel */}
      {selected && (
        <div style={{ padding: '14px 14px 0' }}>
          <RoomPanel room={selected} onUpdate={(p) => onUpdate(selected.id, p)} />
        </div>
      )}
    </div>
  );
}

// --- Floor map ---
// Approximate spatial layouts. Position is { x, y, w, h } in 0–100 grid coords.
const FLOOR_LAYOUTS = {
  'First floor': {
    bedroom:    { x: 0, y: 0, w: 42, h: 32 },
    bath_up:    { x: 42, y: 0, w: 28, h: 32 },
    hallway:    { x: 70, y: 0, w: 30, h: 65 },
    living:     { x: 0, y: 32, w: 42, h: 33 },
    kitchen:    { x: 42, y: 32, w: 28, h: 33 },
    dining:     { x: 0, y: 65, w: 45, h: 35 },
    entrance:   { x: 45, y: 65, w: 55, h: 35 },
  },
  'Basement': {
    theatre:      { x: 0, y: 0, w: 50, h: 45 },
    office:       { x: 50, y: 0, w: 50, h: 30 },
    workshop:     { x: 50, y: 30, w: 50, h: 35 },
    down_hallway: { x: 0, y: 45, w: 50, h: 25 },
    guest:        { x: 0, y: 70, w: 60, h: 30 },
    bath_down:    { x: 60, y: 65, w: 40, h: 35 },
  },
};

function FloorMap({ rooms, selectedId, onSelect }) {
  const layout = FLOOR_LAYOUTS[rooms[0]?.floor] || {};
  const W = 360, H = 260, PAD = 4;
  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: `${W} / ${H}`,
      background: 'linear-gradient(180deg, #14161b 0%, #101216 100%)',
      borderRadius: 16, padding: 10, boxSizing: 'border-box',
      border: `1px solid ${TONE.line}`,
    }}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {rooms.map(room => {
          const pos = layout[room.id];
          if (!pos) return null;
          const lOn = lightsOn(room);
          const isSel = room.id === selectedId;
          const glow = lOn > 0;
          return (
            <button key={room.id} onClick={() => onSelect(room.id)} style={{
              position: 'absolute',
              left: `calc(${pos.x}% + ${PAD/2}px)`,
              top: `calc(${pos.y}% + ${PAD/2}px)`,
              width: `calc(${pos.w}% - ${PAD}px)`,
              height: `calc(${pos.h}% - ${PAD}px)`,
              padding: 0, border: 'none', cursor: 'pointer',
              borderRadius: 10,
              background: isSel ? 'rgba(255,255,255,0.10)' : (glow ? 'rgba(245,196,81,0.08)' : 'rgba(255,255,255,0.025)'),
              boxShadow: isSel
                ? `inset 0 0 0 1.5px #fff`
                : (glow ? `inset 0 0 0 1px rgba(245,196,81,0.35), 0 0 14px rgba(245,196,81,0.18)` : `inset 0 0 0 1px ${TONE.line2}`),
              transition: 'all .25s ease',
              fontFamily: 'inherit', color: TONE.text,
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', inset: 0, padding: '6px 8px',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                textAlign: 'left',
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.1, color: isSel ? '#fff' : TONE.text }}>{room.name}</div>
                  {room.temp != null && (
                    <div style={{ fontSize: 10, color: TONE.textMute, marginTop: 2 }}>{room.temp.toFixed(1)}°{room.humidity != null && <span> · {room.humidity.toFixed(0)}%</span>}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {lOn > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 5px', borderRadius: 999, background: 'rgba(245,196,81,0.18)', color: TONE.light, fontSize: 9, fontWeight: 600 }}>
                      <Icon name="bulb" size={9}/>{lOn}
                    </span>
                  )}
                  {curtainsOpen(room) > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 5px', borderRadius: 999, background: TONE.curtainBg, color: TONE.curtain }}>
                      <Icon name="curtain" size={9}/>
                    </span>
                  )}
                  {room.motion && (
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: TONE.motion, boxShadow: `0 0 6px ${TONE.motion}`, animation: 'pulse 1.6s ease infinite' }} />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Room control panel ---
function RoomPanel({ room, onUpdate }) {
  const lOn = lightsOn(room);
  const cOpen = curtainsOpen(room);
  const toggleAllLights = () => onUpdate({ lights: room.lights.map(l => ({ ...l, on: lOn === 0 })) });
  const toggleAllCurtains = () => onUpdate({ curtains: room.curtains.map(c => ({ ...c, position: cOpen === 0 ? 100 : 0 })) });

  return (
    <div style={{ background: TONE.surface, borderRadius: 16, padding: 14, border: `1px solid ${TONE.line}` }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: lOn > 0 ? TONE.lightBg : 'rgba(255,255,255,0.05)',
          color: lOn > 0 ? TONE.light : TONE.textDim,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={room.icon} size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{room.name}</div>
          <div style={{ fontSize: 11, color: TONE.textDim, display: 'flex', gap: 8, marginTop: 2 }}>
            {room.temp != null && <span><Icon name="thermo" size={10}/> {room.temp.toFixed(1)}°</span>}
            {room.humidity != null && <span><Icon name="drop" size={10}/> {room.humidity.toFixed(0)}%</span>}
            {room.motion && <span style={{ color: TONE.motion }}>· motion detected</span>}
          </div>
        </div>
      </div>

      {/* Bulk chips */}
      {(room.lights.length > 0 || room.curtains.length > 0) && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {room.lights.length > 0 && (
            <Chip active={lOn > 0} onClick={toggleAllLights} color={TONE.light}>
              <Icon name="bulb" size={12} /> All lights · {lOn}/{room.lights.length}
            </Chip>
          )}
          {room.curtains.length > 0 && (
            <Chip active={cOpen > 0} onClick={toggleAllCurtains} color={TONE.curtain}>
              <Icon name="curtain" size={12} /> All curtains
            </Chip>
          )}
        </div>
      )}

      {/* Body */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {room.lights.length > 0 && (
          <Section title={`Lights · ${lOn} on`}>
            {room.lights.map((l, i) => (
              <LightControl key={l.id} light={l}
                onToggle={() => onUpdate({ lights: room.lights.map((x, j) => j === i ? { ...x, on: !x.on } : x) })}
                onBright={(v) => onUpdate({ lights: room.lights.map((x, j) => j === i ? { ...x, brightness: v, on: v > 0 } : x) })} />
            ))}
          </Section>
        )}
        {room.curtains.length > 0 && (
          <Section title="Curtains">
            {room.curtains.map((c, i) => (
              <CurtainControl key={c.id} curtain={c}
                onPos={(v) => onUpdate({ curtains: room.curtains.map((x, j) => j === i ? { ...x, position: v } : x) })} />
            ))}
          </Section>
        )}
        {room.climate && room.climate.length > 0 && (
          <Section title="Climate">
            <div style={{ display: 'grid', gridTemplateColumns: room.climate.length > 1 ? '1fr 1fr' : '1fr', gap: 8 }}>
              {room.climate.map((c, i) => (
                <ClimateControl key={c.id} climate={c}
                  onTarget={(t) => onUpdate({ climate: room.climate.map((x, j) => j === i ? { ...x, target: t } : x) })} />
              ))}
            </div>
          </Section>
        )}
        {room.actions && room.actions.length > 0 && (
          <Section title="Scenes">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {room.actions.map(a => (
                <Chip key={a.id} active={a.active} color={TONE.light}>
                  <Icon name={a.icon} size={12} />{a.name}
                </Chip>
              ))}
            </div>
          </Section>
        )}
        {!room.lights.length && !room.curtains.length && !(room.climate||[]).length && !(room.actions||[]).length && (
          <div style={{ fontSize: 12, color: TONE.textMute, textAlign: 'center', padding: '14px 0' }}>
            No actionable entities · sensors only
          </div>
        )}
      </div>
    </div>
  );
}

window.Opt2 = Opt2;
