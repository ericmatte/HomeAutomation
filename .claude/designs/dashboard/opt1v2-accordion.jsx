// Option 1 V2 — Accordion + floor tabs + swipeable light tiles + scene icons.
// Refinements requested by user:
//   - tabs at top to switch floors (incl. "All")
//   - per-floor master toggle + dim slider for ALL lights on the floor
//   - light tiles: tap=toggle, drag horizontally=dim (background fills), long-press=modal
//   - scenes as icon-only row inside expanded room
//   - covers split into curtains/shades (with up/stop/down) and doors (state-only)

// ---------- Swipeable Light Tile ----------
// pointerdown → start timer; on move >6px enter drag; on up <500ms & no drag → toggle;
// timer fires → long-press (open modal).
function SwipeLightTile({ light, onToggle, onBright, onLongPress, onOpenModal }) {
  const ref = React.useRef(null);
  const stateRef = React.useRef({});
  const [dragging, setDragging] = React.useState(false);
  const [tempBright, setTempBright] = React.useState(null);
  const unavailable = light.unavailable;
  const iconName = light.icon || 'bulb';

  const onDown = (e) => {
    if (unavailable) return;
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const s = stateRef.current = {
      startX: e.clientX, startY: e.clientY,
      rectLeft: rect.left, rectWidth: rect.width,
      start: Date.now(),
      dragging: false, longPressFired: false
    };
    s.lpTimer = setTimeout(() => {
      s.longPressFired = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
      onLongPress && onLongPress();
    }, 480);
    try {ref.current.setPointerCapture(e.pointerId);} catch (_) {}
  };

  const onMove = (e) => {
    const s = stateRef.current;
    if (!s.startX) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.dragging && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
      s.dragging = true;
      setDragging(true);
      clearTimeout(s.lpTimer);
    }
    if (s.dragging) {
      const pct = Math.max(0, Math.min(100, Math.round((e.clientX - s.rectLeft) / s.rectWidth * 100)));
      setTempBright(pct);
    }
  };

  const onUp = () => {
    const s = stateRef.current;
    clearTimeout(s.lpTimer);
    if (s.dragging) {
      onBright(tempBright != null ? tempBright : light.brightness);
    } else if (!s.longPressFired) {
      onToggle();
    }
    stateRef.current = {};
    setDragging(false);
    setTempBright(null);
  };

  const onCancel = () => {
    const s = stateRef.current;
    clearTimeout(s.lpTimer);
    stateRef.current = {};
    setDragging(false);
    setTempBright(null);
  };

  const showBright = tempBright != null ? tempBright : light.brightness;
  const fillVisible = !unavailable && (light.on || dragging);
  const fillWidth = fillVisible ? `${showBright}%` : '0%';

  return (
    <div ref={ref}
    onPointerDown={onDown}
    onPointerMove={onMove}
    onPointerUp={onUp}
    onPointerCancel={onCancel}
    style={{
      position: 'relative', borderRadius: 12, padding: '12px 14px',
      background: TONE.surface2, overflow: 'hidden',
      userSelect: 'none', touchAction: 'pan-y', cursor: unavailable ? 'not-allowed' : 'pointer',
      minHeight: 56, transition: 'background .2s',
      opacity: unavailable ? 0.65 : 1
    }}>
      {/* Brightness fill (acts as the slider track) */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: fillWidth,
        background: `linear-gradient(90deg, rgba(245,196,81,0.22) 0%, rgba(245,196,81,0.30) 100%)`,
        transition: dragging ? 'none' : 'width .2s ease',
        pointerEvents: 'none'
      }} />
      {/* Drag handle hint */}
      {fillVisible &&
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: `calc(${showBright}% - 2px)`, width: 2,
        background: TONE.light, opacity: dragging ? 1 : 0.55,
        transition: dragging ? 'none' : 'all .2s', pointerEvents: 'none'
      }} />
      }
      {/* Content */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          role="button"
          aria-label={`Open ${light.name} controls`}
          title="Open entity"
          onPointerDown={(e) => { e.stopPropagation(); }}
          onPointerUp={(e) => { e.stopPropagation(); }}
          onPointerCancel={(e) => { e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!unavailable) onOpenModal && onOpenModal(); }}
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: light.on && !unavailable ? 'rgba(245,196,81,0.18)' : 'rgba(255,255,255,0.04)',
            color: unavailable ? TONE.textMute : (light.on ? TONE.light : TONE.textMute),
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            position: 'relative', cursor: unavailable ? 'not-allowed' : 'pointer',
            transition: 'background .15s ease, transform .12s ease',
          }}
          onMouseEnter={(e) => { if (!unavailable) e.currentTarget.style.background = 'rgba(245,196,81,0.28)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = light.on && !unavailable ? 'rgba(245,196,81,0.18)' : 'rgba(255,255,255,0.04)'; }}
        >
          <Icon name={iconName} size={14} />
          {unavailable && (
            <div style={{
              position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 999,
              background: '#f0b13a', color: '#1a1208',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, lineHeight: 1
            }}>!</div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{light.name}</div>
          <div style={{ fontSize: 11, color: unavailable ? TONE.textMute : (light.on || dragging ? TONE.light : TONE.textMute), fontWeight: dragging ? 600 : 400 }}>
            {unavailable ? 'Unavailable' : (dragging ? `${showBright}%` : light.on ? `${showBright}%` : 'Off')}
          </div>
        </div>
      </div>
    </div>);

}

// ---------- Swipeable Cover Tile (curtains / shades) ----------
// tap = closed ↔ open (0↔100), drag = position, hold = modal with up/stop/down.
function SwipeCoverTile({ cover, onPos }) {
  const ref = React.useRef(null);
  const stateRef = React.useRef({});
  const [dragging, setDragging] = React.useState(false);
  const [tempPos, setTempPos] = React.useState(null);

  const onDown = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    stateRef.current = {
      startX: e.clientX, startY: e.clientY,
      rectLeft: rect.left, rectWidth: rect.width,
      dragging: false
    };
    try { ref.current.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const onMove = (e) => {
    const s = stateRef.current;
    if (!s.startX) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.dragging && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
      s.dragging = true; setDragging(true);
    }
    if (s.dragging) {
      const pct = Math.max(0, Math.min(100, Math.round((e.clientX - s.rectLeft) / s.rectWidth * 100)));
      setTempPos(pct);
    }
  };
  const onUp = () => {
    const s = stateRef.current;
    if (s.dragging) {
      onPos(tempPos != null ? tempPos : cover.position);
    } else {
      // tap: toggle closed ↔ open
      onPos(cover.position > 5 ? 0 : 100);
    }
    stateRef.current = {};
    setDragging(false);
    setTempPos(null);
  };
  const onCancel = () => {
    stateRef.current = {};
    setDragging(false);
    setTempPos(null);
  };

  const pos = tempPos != null ? tempPos : cover.position;
  const open = pos > 5 || dragging;
  const fillWidth = open ? `${pos}%` : '0%';

  return (
    <div ref={ref}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel}
      style={{
        position: 'relative', borderRadius: 12, padding: '12px 14px',
        background: TONE.surface2, overflow: 'hidden',
        userSelect: 'none', touchAction: 'pan-y', cursor: 'pointer',
        minHeight: 56, transition: 'background .2s'
      }}>
      {/* Position fill */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: fillWidth,
        background: `linear-gradient(90deg, rgba(155,127,209,0.18) 0%, rgba(155,127,209,0.28) 100%)`,
        transition: dragging ? 'none' : 'width .2s ease',
        pointerEvents: 'none'
      }} />
      {open && (
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: `calc(${pos}% - 2px)`, width: 2,
          background: TONE.curtain, opacity: dragging ? 1 : 0.55,
          transition: dragging ? 'none' : 'all .2s', pointerEvents: 'none'
        }} />
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: pos > 5 ? TONE.curtainBg : 'rgba(255,255,255,0.04)',
          color: pos > 5 ? TONE.curtain : TONE.textMute,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}><Icon name="curtain" size={14} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cover.name}</div>
          <div style={{ fontSize: 11, color: pos > 5 ? TONE.curtain : TONE.textMute, fontWeight: dragging ? 600 : 400 }}>
            {dragging ? `${pos}%` : pos === 0 ? 'Closed' : pos === 100 ? 'Open' : `${pos}% open`}
          </div>
        </div>
        {cover.batteries && cover.batteries.length > 0 &&
          <CoverBatteryChip batteries={cover.batteries} />
        }
      </div>
    </div>);

}

// Small battery indicator on a cover tile. For a group of batteries we show
// the minimum (worst-case determines when a replacement is needed) plus count.
function CoverBatteryChip({ batteries }) {
  const min = Math.min(...batteries);
  const color = levelColor(min);
  const multi = batteries.length > 1;
  return (
    <span
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onPointerCancel={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      title={multi ? `Batteries: ${batteries.map(b => `${b}%`).join(', ')} (min shown)` : `Battery: ${min}%`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 7px 3px 6px', borderRadius: 999,
        background: `${color}1f`, color, fontSize: 10.5, fontWeight: 600,
        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0,
      }}
    >
      <Icon name="battery" size={11} />{min}%{multi ? <span style={{ opacity: 0.7, fontWeight: 500 }}>·{batteries.length}</span> : null}
    </span>
  );
}

// ---------- Floor master tile ----------
function FloorMasterTile({ floor, rooms, onUpdateRoom }) {
  const ref = React.useRef(null);
  const stateRef = React.useRef({});
  const [dragging, setDragging] = React.useState(false);
  const [tempBright, setTempBright] = React.useState(null);

  const allLights = rooms.flatMap((r) => r.lights.map((l) => ({ ...l, _room: r.id })));
  const onCount = allLights.filter((l) => l.on).length;
  const totalCount = allLights.length;
  const avgBright = onCount > 0 ?
  Math.round(allLights.filter((l) => l.on).reduce((s, l) => s + l.brightness, 0) / onCount) :
  50;

  const setAll = (on, brightness) => {
    rooms.forEach((r) => {
      if (!r.lights.length) return;
      onUpdateRoom(r.id, { lights: r.lights.map((l) => ({ ...l, on, brightness: brightness != null ? brightness : l.brightness })) });
    });
  };

  const onDown = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    stateRef.current = { startX: e.clientX, startY: e.clientY, rectLeft: rect.left, rectWidth: rect.width, dragging: false };
    try {ref.current.setPointerCapture(e.pointerId);} catch (_) {}
  };
  const onMove = (e) => {
    const s = stateRef.current;
    if (!s.startX) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      s.dragging = true;setDragging(true);
    }
    if (s.dragging) {
      const pct = Math.max(0, Math.min(100, Math.round((e.clientX - s.rectLeft) / s.rectWidth * 100)));
      setTempBright(pct);
    }
  };
  const onUp = () => {
    const s = stateRef.current;
    if (s.dragging) {
      const v = tempBright != null ? tempBright : avgBright;
      setAll(v > 0, v);
    } else {
      setAll(onCount === 0);
    }
    stateRef.current = {};
    setDragging(false);
    setTempBright(null);
  };

  if (totalCount === 0) return null;
  const showBright = tempBright != null ? tempBright : avgBright;
  const fillVisible = onCount > 0 || dragging;
  const fillWidth = fillVisible ? `${showBright}%` : '0%';

  return (
    <div ref={ref}
    onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => {stateRef.current = {};setDragging(false);setTempBright(null);}}
    style={{
      position: 'relative', borderRadius: 14, padding: '14px 16px',
      background: 'linear-gradient(180deg, #1a1d23 0%, #161920 100%)',
      border: `1px solid ${TONE.line2}`,
      overflow: 'hidden', userSelect: 'none', touchAction: 'pan-y', cursor: 'pointer',
      marginBottom: 10
    }}>
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: fillWidth,
        background: 'linear-gradient(90deg, rgba(245,196,81,0.15) 0%, rgba(245,196,81,0.22) 100%)',
        transition: dragging ? 'none' : 'width .2s ease', pointerEvents: 'none'
      }} />
      {fillVisible &&
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `calc(${showBright}% - 2px)`, width: 2, background: TONE.light, opacity: dragging ? 1 : 0.5, pointerEvents: 'none' }} />
      }
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: onCount > 0 ? 'rgba(245,196,81,0.20)' : 'rgba(255,255,255,0.05)',
          color: onCount > 0 ? TONE.light : TONE.textDim,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon name="bulb" size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>All {floor.toLowerCase()} lights</div>
          <div style={{ fontSize: 11, color: TONE.textDim }}>
            {dragging ? `Dim → ${showBright}%` : `${onCount} of ${totalCount} on · drag to dim`}
          </div>
        </div>
        <div style={{ fontSize: 11, color: onCount > 0 ? TONE.light : TONE.textMute, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {onCount > 0 ? `${avgBright}%` : 'Off'}
        </div>
      </div>
    </div>);

}

// ---------- Entity modal (long-press) ----------
function EntityModal({ entity, onClose, onChange }) {
  if (!entity) return null;
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(6px)', zIndex: 200,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      animation: 'fadeIn .15s ease'
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 420,
        background: '#1a1d23', borderTopLeftRadius: 18, borderTopRightRadius: 18,
        padding: 20, color: TONE.text, fontFamily: 'inherit',
        animation: 'slideUp .2s cubic-bezier(.2,.7,.3,1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{entity.name}</div>
            <div style={{ fontSize: 12, color: entity.on ? TONE.light : TONE.textDim, marginTop: 2 }}>
              {entity.on ? `On · ${entity.brightness}%` : 'Off'}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)', color: TONE.text,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}><Icon name="x" size={16} /></button>
        </div>

        {/* Big preview */}
        <div style={{
          width: 80, height: 80, borderRadius: 24, margin: '8px auto 18px',
          background: entity.on ? `radial-gradient(circle, ${TONE.light} 0%, rgba(245,196,81,0.1) 70%)` : 'rgba(255,255,255,0.04)',
          color: entity.on ? '#fff' : TONE.textDim,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s'
        }}>
          <Icon name="bulb" size={36} />
        </div>

        {/* Brightness */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: TONE.textMute, marginBottom: 6 }}>
            <span>Brightness</span>
            <span>{entity.brightness}%</span>
          </div>
          <Slider value={entity.brightness} onChange={(v) => onChange({ brightness: v, on: v > 0 })} accent={TONE.light} height={10} />
        </div>

        {/* Color temp (mock) */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: TONE.textMute, marginBottom: 6 }}>
            <span>Color temperature</span>
            <span>2700K</span>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: 'linear-gradient(90deg,#ffb16b 0%,#ffe4a8 40%,#fff 70%,#cce4ff 100%)', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '20%', top: -3, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button onClick={() => onChange({ on: !entity.on })} style={modalBtn(entity.on)}>
            <Icon name="bulb" size={14} /> Turn {entity.on ? 'off' : 'on'}
          </button>
          <button style={modalBtn(false)}>
            <Icon name="dots" size={14} /> More
          </button>
        </div>
      </div>
    </div>);

}
const modalBtn = (active) => ({
  flex: 1, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
  background: active ? 'rgba(245,196,81,0.18)' : 'rgba(255,255,255,0.05)',
  color: active ? TONE.light : TONE.text,
  fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6
});

// ---------- Cover (curtain/shade) ----------
function CoverTile({ cover, onPos }) {
  return (
    <div style={{ background: TONE.surface2, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: cover.position > 5 ? TONE.curtainBg : 'rgba(255,255,255,0.04)',
          color: cover.position > 5 ? TONE.curtain : TONE.textMute,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}><Icon name="curtain" size={14} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{cover.name}</div>
          <div style={{ fontSize: 11, color: TONE.textMute }}>
            {cover.position === 0 ? 'Closed' : cover.position === 100 ? 'Open' : `${cover.position}% open`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => onPos(Math.min(100, cover.position + 25))} style={shadeBtn}><Icon name="up" size={14} /></button>
          <button onClick={() => onPos(cover.position)} style={shadeBtn}><Icon name="stop" size={12} /></button>
          <button onClick={() => onPos(Math.max(0, cover.position - 25))} style={shadeBtn}><Icon name="down" size={14} /></button>
        </div>
      </div>
      <Slider value={cover.position} onChange={onPos} accent={TONE.curtain} height={6} />
    </div>);

}
const shadeBtn = {
  width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
  background: 'rgba(255,255,255,0.05)', color: TONE.textDim,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
};

// ---------- Door (state-only) ----------
function DoorTile({ door }) {
  const open = door.state !== 'closed';
  return (
    <div style={{ background: TONE.surface2, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8,
        background: open ? 'rgba(255,138,91,0.18)' : 'rgba(255,255,255,0.04)',
        color: open ? TONE.heat : TONE.textMute,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}><Icon name="door2" size={14} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5 }}>{door.name}</div>
        <div style={{ fontSize: 10.5, color: open ? TONE.heat : TONE.textMute, textTransform: 'capitalize' }}>{door.state}</div>
      </div>
    </div>);

}

// ---------- Automations & scripts drawer (per-room) ----------
// Lives at the bottom of an expanded room. Collapsed by default — taps the
// summary chip to drop down a list of every script + automation in that room.
function AutomationsDrawer({ automations, onToggle }) {
  const [open, setOpen] = React.useState(false);
  if (!automations || !automations.length) return null;
  const total = automations.length;
  const disabledCount = automations.filter(a => a.enabled === false).length;

  return (
    <div style={{ marginTop: 4 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: open ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        color: TONE.textDim, fontFamily: 'inherit',
        transition: 'background .15s ease',
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 7,
          background: 'rgba(255,255,255,0.05)', color: TONE.textDim,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}><Icon name="cogs" size={12} /></div>
        <span style={{ fontSize: 11.5, fontWeight: 500, color: TONE.text }}>
          Automations & scripts
        </span>
        <span style={{ fontSize: 10.5, color: TONE.textMute, fontVariantNumeric: 'tabular-nums' }}>
          · {total}
          {disabledCount > 0 && <span style={{ color: TONE.textMute }}> · {disabledCount} off</span>}
        </span>
        <span style={{ flex: 1 }} />
        <Icon name={open ? 'up' : 'down'} size={11} style={{ color: TONE.textMute }} />
      </button>
      {open &&
        <div style={{
          marginTop: 6, borderRadius: 10, overflow: 'hidden',
          background: TONE.surface2,
        }}>
          {automations.map((a, i) =>
            <AutomationRow key={a.id} item={a}
              isLast={i === automations.length - 1}
              onToggle={() => onToggle(i)}
            />
          )}
        </div>
      }
    </div>
  );
}

function AutomationRow({ item, isLast, onToggle }) {
  const isScript = item.kind === 'script';
  // Scripts can never be disabled — only automations have a toggle state.
  const enabled = isScript ? true : item.enabled !== false;
  const iconName = isScript ? 'script' : 'cogs';
  const triggerIcon = isScript ? 'play_circle' : 'play';
  const labels = (item.labels || []).map(k => AUTOMATION_LABELS[k]).filter(Boolean);

  // Icon swatch — clickable toggle for automations, static identity glyph for scripts.
  const iconSwatch = isScript ? (
    <div
      title="Script"
      style={{
        flexShrink: 0,
        width: 30, height: 30, borderRadius: 8,
        background: 'rgba(255,255,255,0.04)', color: TONE.textDim,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
      <Icon name={iconName} size={15} />
    </div>
  ) : (
    <button
      onClick={onToggle}
      title={enabled ? 'Disable automation' : 'Enable automation'}
      aria-label={enabled ? 'Disable automation' : 'Enable automation'}
      style={{
        position: 'relative', flexShrink: 0,
        width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
        background: enabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        color: enabled ? TONE.text : TONE.textMute,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background .15s ease',
      }}>
      <Icon name={iconName} size={15} />
      {!enabled &&
        <svg viewBox="0 0 24 24" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <line x1="4" y1="20" x2="20" y2="4" stroke={TONE.textMute} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      }
    </button>
  );

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 12px',
      borderBottom: isLast ? 'none' : `1px solid ${TONE.line}`,
      opacity: enabled ? 1 : 0.55,
    }}>
      {iconSwatch}

      {/* Body — name + last triggered + labels. Click body = open settings. */}
      <button
        onClick={() => { /* would open automation/script settings */ }}
        style={{
          flex: 1, minWidth: 0, textAlign: 'left',
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          color: TONE.text, fontFamily: 'inherit',
        }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: enabled ? TONE.text : TONE.textDim, lineHeight: 1.3 }}>
          {item.name}
        </div>
        <div style={{ fontSize: 10.5, color: TONE.textMute, marginTop: 2 }}>
          {item.last ? `Last triggered: ${item.last}` : 'Never triggered'}
        </div>
        {labels.length > 0 &&
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
            {labels.map((lb, i) =>
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '1.5px 6px 1.5px 5px', borderRadius: 999,
                background: lb.bg, color: lb.color,
                fontSize: 9.5, fontWeight: 500, lineHeight: 1.5,
              }}>
                <Icon name={lb.icon} size={9} />{lb.name}
              </span>
            )}
          </div>
        }
      </button>

      {/* Play button — trigger automation OR open script modal */}
      <button
        onClick={(e) => { e.stopPropagation(); /* trigger automation or run/open script */ }}
        title={isScript ? 'Run script' : 'Trigger automation'}
        aria-label={isScript ? 'Run script' : 'Trigger automation'}
        disabled={!enabled}
        style={{
          flexShrink: 0,
          width: 30, height: 30, borderRadius: 8, border: 'none',
          cursor: enabled ? 'pointer' : 'not-allowed',
          background: enabled ? 'rgba(92,198,255,0.12)' : 'rgba(255,255,255,0.03)',
          color: enabled ? TONE.cool : TONE.textMute,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background .15s ease',
        }}>
        <Icon name={triggerIcon} size={isScript ? 16 : 13} />
      </button>
    </div>
  );
}

// ---------- Scene icon button ----------
function SceneIconButton({ scene, onClick, label }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick}
    onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
    title={scene.name}
    style={{
      position: 'relative', width: 38, height: 38, borderRadius: 10, border: 'none', cursor: 'pointer',
      background: scene.active ? TONE.lightBg : 'rgba(255,255,255,0.05)',
      color: scene.active ? TONE.light : TONE.textDim,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all .15s'
    }}>
      <Icon name={scene.icon} size={18} />
      {(hover || label) &&
      <div style={{
        position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
        background: '#000', color: '#fff', padding: '4px 8px', borderRadius: 6,
        fontSize: 10.5, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10,
        fontFamily: 'inherit'
      }}>{scene.name}</div>
      }
    </button>);

}

// ---------- Main ----------
function Opt1V2({ rooms, onUpdate, initialTab, initialExpanded }) {
  const [tab, setTab] = React.useState(initialTab || 'First floor');
  const [expanded, setExpanded] = React.useState(new Set(initialExpanded || ['kitchen', 'theatre']));
  const [modalEntity, setModalEntity] = React.useState(null);
  const [modalRoom, setModalRoom] = React.useState(null);
  const [modalIdx, setModalIdx] = React.useState(null);

  const toggle = (id) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const openModal = (room, idx) => {
    setModalRoom(room.id);
    setModalIdx(idx);
    setModalEntity(room.lights[idx]);
  };
  const updateModal = (patch) => {
    if (!modalRoom) return;
    const room = rooms.find((r) => r.id === modalRoom);
    const updated = room.lights.map((x, j) => j === modalIdx ? { ...x, ...patch } : x);
    onUpdate(modalRoom, { lights: updated });
    setModalEntity({ ...modalEntity, ...patch });
  };

  const tabs = ['All', ...Array.from(new Set(rooms.map((r) => r.floor)))];
  const filtered = tab === 'All' ? rooms : rooms.filter((r) => r.floor === tab);
  const floors = tab === 'All' ? Array.from(new Set(rooms.map((r) => r.floor))) : [tab];

  return (
    <div style={{ background: TONE.bg, color: TONE.text, fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', minHeight: '100%', paddingBottom: 40, position: 'relative' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(14,15,18,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${TONE.line}` }}>
        <div style={{ padding: '14px 18px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: TONE.textMute, letterSpacing: 0.5, textTransform: 'uppercase' }}>Tuesday · 14:32</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>Welcome Eric</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={hdrBtn}><Icon name="search" size={18} /></button>
            <button style={hdrBtn}><Icon name="dots" size={18} /></button>
          </div>
        </div>
        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 6, padding: '8px 12px 4px', overflowX: 'auto' }}>
          <QuickStat color={TONE.light} icon="bulb" label={`${rooms.reduce((s, r) => s + lightsOn(r), 0)} lights on`} />
          <QuickStat color={TONE.curtain} icon="curtain" label={`${rooms.reduce((s, r) => s + curtainsOpen(r), 0)} open`} />
          <QuickStat color={TONE.cool} icon="thermo" label="20.5 – 24.1°" />
          <BatteryBadge levels={collectLevels(rooms)} />
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '8px 12px 10px', overflowX: 'auto' }}>
          {tabs.map((t) =>
          <button key={t} onClick={() => setTab(t)} style={{
            flexShrink: 0, padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: tab === t ? '#fff' : 'rgba(255,255,255,0.05)',
            color: tab === t ? '#111' : TONE.textDim,
            fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
            whiteSpace: 'nowrap',
            transition: 'all .15s'
          }}>{t}</button>
          )}
        </div>
      </div>

      {/* Floor sections */}
      {floors.map((floor) => {
        const fr = filtered.filter((r) => r.floor === floor);
        if (!fr.length) return null;
        return (
          <div key={floor} style={{ padding: '14px 12px 0' }}>
            {tab === 'All' &&
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 10px' }}>
                <div style={{ fontSize: 11, color: TONE.textDim, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>{floor}</div>
                <div style={{ flex: 1, height: 1, background: TONE.line }} />
              </div>
            }
            {/* Floor master tile */}
            <FloorMasterTile floor={floor} rooms={fr} onUpdateRoom={onUpdate} />
            {/* Rooms */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fr.map((room) =>
              <RoomCardV2 key={room.id} room={room}
              expanded={expanded.has(room.id)}
              onToggleExpand={() => toggle(room.id)}
              onUpdate={(patch) => onUpdate(room.id, patch)}
              onOpenModal={(idx) => openModal(room, idx)} />
              )}
            </div>
          </div>);

      })}

      {modalEntity && <EntityModal entity={modalEntity} onClose={() => {setModalEntity(null);setModalRoom(null);setModalIdx(null);}} onChange={updateModal} />}
    </div>);

}

const hdrBtn = {
  width: 36, height: 36, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.04)',
  color: TONE.textDim, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
};

function QuickStat({ color, icon, label }) {
  return (
    <div style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', color: TONE.textDim, fontSize: 11.5, whiteSpace: 'nowrap' }}>
      <span style={{ color }}><Icon name={icon} size={11} /></span>
      <span>{label}</span>
    </div>);

}

// ---------- Battery / level badge in the header ----------
// Replaces the old "Secure" pill. Click to drop a popover listing every
// battery + tank level sorted by % ascending, so low ones float to the top.
function BatteryBadge({ levels }) {
  const [open, setOpen] = React.useState(false);
  const [portalEl, setPortalEl] = React.useState(null);
  const [coords, setCoords] = React.useState(null);
  const btnRef = React.useRef(null);
  const popRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (popRef.current && popRef.current.contains(e.target)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Position the popover relative to the .ha-frame so it can escape the
  // quickstats row (which uses overflow-x: auto and would clip it).
  const openMenu = () => {
    if (!btnRef.current) return;
    const frame = btnRef.current.closest('.ha-frame') || document.body;
    setPortalEl(frame);
    const br = btnRef.current.getBoundingClientRect();
    const fr = frame.getBoundingClientRect();
    setCoords({
      top: br.bottom - fr.top + 8,
      right: fr.right - br.right,
    });
    setOpen(true);
  };

  const sorted = levels; // collectLevels already sorts asc
  const critical = sorted.filter(l => levelTier(l.pct) === 'critical');
  const low = sorted.filter(l => levelTier(l.pct) === 'low');
  const min = sorted.length ? sorted[0].pct : 100;
  const accent = critical.length ? '#ff7a7a' : low.length ? '#f0b13a' : '#7dc97a';
  const label = critical.length ? `${critical.length} critical` : low.length ? `${low.length} low` : `Min ${min}%`;

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        ref={btnRef}
        onClick={() => open ? setOpen(false) : openMenu()}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px',
          borderRadius: 999, border: 'none', cursor: 'pointer',
          background: open ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
          color: TONE.textDim, fontSize: 11.5, whiteSpace: 'nowrap',
          fontFamily: 'inherit',
          animation: critical.length ? 'pulse 2.4s ease infinite' : 'none',
        }}
        title="Batteries & levels"
      >
        <span style={{ color: accent }}><Icon name="battery" size={11} /></span>
        <span>{label}</span>
        <Icon name="chevron" size={9} style={{ color: TONE.textMute, opacity: 0.7 }} />
      </button>
      {open && portalEl && coords && ReactDOM.createPortal(
        <div ref={popRef} style={{
          position: 'absolute', top: coords.top, right: coords.right, zIndex: 60,
          background: '#1a1d23', borderRadius: 12, padding: 4, width: 300, maxWidth: 'calc(100% - 24px)',
          boxShadow: '0 16px 38px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)',
          animation: 'fadeIn .12s ease',
        }}>
          <div style={{
            padding: '8px 12px 6px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, color: TONE.textMute, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>Batteries & levels</span>
            <span style={{ fontSize: 10.5, color: TONE.textMute }}>{sorted.length} total</span>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {sorted.map((lv) => {
              const c = levelColor(lv.pct);
              return (
                <div key={lv.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8, margin: '2px 2px',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    background: `${c}1a`, color: c,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={lv.icon} size={13} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: TONE.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lv.name}
                    </div>
                    <div style={{ fontSize: 10.5, color: TONE.textMute, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name={lv.roomIcon} size={10} />{lv.room}
                      {lv.kind === 'propane' && <span style={{ color: '#f0b13a' }}>· Propane</span>}
                    </div>
                  </div>
                  <div style={{
                    width: 56, height: 5, borderRadius: 999,
                    background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0,
                  }}>
                    <div style={{ width: `${lv.pct}%`, height: '100%', background: c, transition: 'width .2s' }} />
                  </div>
                  <div style={{
                    fontSize: 11.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                    color: c, minWidth: 34, textAlign: 'right',
                  }}>{lv.pct}%</div>
                </div>
              );
            })}
          </div>
        </div>,
        portalEl
      )}
    </div>
  );
}

function RoomCardV2({ room, expanded, onToggleExpand, onUpdate, onOpenModal }) {
  const lOn = lightsOn(room);
  const cOpen = curtainsOpen(room);
  const anyLights = room.lights.length > 0;
  const anyCurtains = room.curtains.length > 0;
  const doors = room.doors || [];
  const climate = room.climate || [];
  const actions = room.actions || [];
  const media = room.media || [];
  const vacuums = room.vacuums || [];
  const automations = room.automations || [];

  const toggleAllLights = (e) => {
    e.stopPropagation();
    onUpdate({ lights: room.lights.map((l) => ({ ...l, on: lOn === 0 })) });
  };
  const toggleAllCurtains = (e) => {
    e.stopPropagation();
    onUpdate({ curtains: room.curtains.map((c) => ({ ...c, position: cOpen === 0 ? 100 : 0 })) });
  };

  return (
    <div style={{
      background: TONE.surface, borderRadius: 14,
      border: expanded ? `1px solid ${TONE.line2}` : `1px solid transparent`,
      overflow: 'hidden', transition: 'border-color .2s'
    }}>
      {/* Row */}
      <div onClick={onToggleExpand} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: lOn > 0 ? TONE.lightBg : 'rgba(255,255,255,0.04)',
          color: lOn > 0 ? TONE.light : TONE.textDim,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}><Icon name={room.icon} size={18} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: -0.1 }}>{room.name}</div>
            {room.motion &&
            <div title="Motion detected" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: TONE.motion, padding: '2px 6px 2px 5px', borderRadius: 999, background: TONE.motionBg }}>
                <Icon name="motion2" size={11} />
                motion
              </div>
            }
          </div>
          <div style={{ marginTop: 3, fontSize: 12, color: TONE.textDim, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {room.temp != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="thermo" size={11} style={{ color: TONE.textMute }} />{room.temp.toFixed(1)}°</span>}
            {room.humidity != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="drop" size={11} style={{ color: TONE.textMute }} />{room.humidity.toFixed(0)}%</span>}
            {room.soil && <SensorChip icon="plant" color="#7dc97a" label={`${room.soil.moisture}%`} title={`${room.soil.name || 'Plant'} soil`} />}
            {room.leak && <SensorChip icon="leak"
              color={room.leak.state === 'leak' ? '#ff5252' : TONE.textDim}
              bg={room.leak.state === 'leak' ? 'rgba(255,82,82,0.16)' : 'transparent'}
              label={room.leak.state === 'leak' ? 'Leak!' : 'Dry'}
              pulse={room.leak.state === 'leak'} title="Leak sensor" />}
            {room.door && <SensorChip icon={room.door.state === 'open' ? 'door_open' : 'door2'}
              color={room.door.state === 'open' ? TONE.heat : TONE.textDim}
              bg={room.door.state === 'open' ? 'rgba(255,138,91,0.16)' : 'transparent'}
              label={room.door.state === 'open' ? 'Open' : 'Closed'} title="Door" />}
            {room.propane && <SensorChip icon="propane"
              color={levelColor(room.propane.pct)}
              bg={`${levelColor(room.propane.pct)}1f`}
              label={`${room.propane.pct}%`}
              title={`${room.propane.name}: ${room.propane.pct}%`} />}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {anyLights &&
          <button onClick={toggleAllLights} style={{
            ...quickBtnV2,
            background: lOn > 0 ? TONE.lightBg : 'rgba(255,255,255,0.04)',
            color: lOn > 0 ? TONE.light : TONE.textDim
          }}>
              <Icon name="bulb" size={14} />
              {lOn > 0 && <span style={{ fontSize: 11, fontWeight: 600 }}>{lOn}</span>}
            </button>
          }
          {anyCurtains &&
          <button onClick={toggleAllCurtains} style={{
            ...quickBtnV2,
            background: cOpen > 0 ? TONE.curtainBg : 'rgba(255,255,255,0.04)',
            color: cOpen > 0 ? TONE.curtain : TONE.textDim
          }}><Icon name="curtain" size={14} /></button>
          }
          <div style={{ transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0)', color: TONE.textMute, marginLeft: 2 }}>
            <Icon name="chevron" size={16} />
          </div>
        </div>
      </div>

      {expanded &&
      <div style={{ padding: '0 14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {room.lights.length > 0 &&
        <SectionV2 title="Lights">
              <div style={{ display: 'grid', gridTemplateColumns: room.lights.length === 1 ? '1fr' : '1fr 1fr', gap: 6 }}>
                {room.lights.map((l, i) =>
            <SwipeLightTile key={l.id} light={l}
            onToggle={() => onUpdate({ lights: room.lights.map((x, j) => j === i ? (x.on ? { ...x, on: false } : { ...x, on: true, brightness: 100 }) : x) })}
            onBright={(v) => onUpdate({ lights: room.lights.map((x, j) => j === i ? { ...x, brightness: v, on: v > 0 } : x) })}
            onLongPress={() => onOpenModal(i)}
            onOpenModal={() => onOpenModal(i)} />
            )}
              </div>
            </SectionV2>
        }
          {room.curtains.length > 0 &&
        <SectionV2 title="Covers">
              <div style={{ display: 'grid', gridTemplateColumns: room.curtains.length === 1 ? '1fr' : '1fr 1fr', gap: 6 }}>
                {room.curtains.map((c, i) =>
            <SwipeCoverTile key={c.id} cover={c}
            onPos={(v) => onUpdate({ curtains: room.curtains.map((x, j) => j === i ? { ...x, position: v } : x) })} />
          )}
              </div>
            </SectionV2>
        }
          {doors.length > 0 &&
        <SectionV2 title="Doors">
              <div style={{ display: 'grid', gridTemplateColumns: doors.length === 1 ? '1fr' : '1fr 1fr', gap: 6 }}>
                {doors.map((d) => <DoorTile key={d.id} door={d} />)}
              </div>
            </SectionV2>
        }
          {climate.length > 0 &&
        <SectionV2 title="Climate">
              <div style={{ display: 'grid', gridTemplateColumns: climate.length > 1 ? '1fr 1fr' : '1fr', gap: 8 }}>
                {climate.map((c, i) =>
            <ClimateControl key={c.id} climate={c}
            onPatch={(patch) => onUpdate({ climate: climate.map((x, j) => j === i ? { ...x, ...patch } : x) })} />
            )}
              </div>
            </SectionV2>
        }
          {vacuums.length > 0 &&
        <SectionV2 title="Vacuum">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {vacuums.map((v, i) =>
            <VacuumControl key={v.id} vacuum={v}
            onPatch={(patch) => onUpdate({ vacuums: vacuums.map((x, j) => j === i ? { ...x, ...patch } : x) })} />
            )}
              </div>
            </SectionV2>
        }
          {media.length > 0 &&
        <SectionV2 title="Media">
              <div style={{ display: 'grid', gridTemplateColumns: media.length > 1 ? '1fr 1fr' : '1fr', gap: 6 }}>
                {media.map((m) =>
            <div key={m.id} style={{ background: TONE.surface2, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon name="speaker" size={16} style={{ color: TONE.motion }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                      <div style={{ fontSize: 10.5, color: TONE.textMute }}>{m.state}</div>
                    </div>
                    <button style={{ width: 26, height: 26, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.05)', color: TONE.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="play" size={12} />
                    </button>
                  </div>
            )}
              </div>
            </SectionV2>
        }
          {actions.length > 0 &&
        <SectionV2 title="Scenes" hint={`${actions.length}`}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {actions.map((a) => <SceneIconButton key={a.id} scene={a} onClick={() => {}} />)}
              </div>
            </SectionV2>
        }
          {automations.length > 0 &&
        <AutomationsDrawer
          automations={automations}
          onToggle={(idx) => onUpdate({ automations: automations.map((x, j) => j === idx ? { ...x, enabled: x.enabled === false ? true : false } : x) })}
        />
        }
        </div>
      }
    </div>);

}

const quickBtnV2 = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  minWidth: 32, height: 30, padding: '0 8px', borderRadius: 8, border: 'none', cursor: 'pointer'
};

function SectionV2({ title, hint, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 10, color: TONE.textMute, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>{title}</div>
        {hint && <div style={{ fontSize: 9.5, color: TONE.textMute, opacity: 0.7 }}>{hint}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>);

}

// Deterministic pseudo-temp history from a seed (24h of readings)
function tempHistory(seed, current, mode) {
  const points = 24;
  // Use a small bias toward target mode
  const amp = 1.4;
  const arr = [];
  let v = current - 0.6;
  for (let i = 0; i < points; i++) {
    const n = Math.sin((i + seed) * 0.7) * 0.5 + Math.sin((i + seed) * 0.31) * 0.5;
    v = current + n * amp - (i < points - 4 ? 0.2 : 0);
    arr.push(v);
  }
  arr[points - 1] = current;
  return arr;
}

function TempSparkline({ data, accent, height = 38, target }) {
  const w = 100; // viewBox width units
  const h = 30;
  const min = Math.min(...data, target ?? Infinity) - 0.5;
  const max = Math.max(...data, target ?? -Infinity) + 0.5;
  const range = Math.max(0.5, max - min);
  const stepX = w / (data.length - 1);
  const pts = data.map((v, i) => [i * stepX, h - ((v - min) / range) * h]);
  const pathD = pts.map((p, i) => (i === 0 ? `M${p[0].toFixed(2)},${p[1].toFixed(2)}` : `L${p[0].toFixed(2)},${p[1].toFixed(2)}`)).join(' ');
  const areaD = `${pathD} L${w},${h} L0,${h} Z`;
  const targetY = target != null ? h - ((target - min) / range) * h : null;
  const last = pts[pts.length - 1];
  const gradId = `g-${accent.replace('#', '')}-${Math.round(target ?? 0)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', width: '100%', height, marginTop: 4 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {targetY != null && (
        <line x1="0" x2={w} y1={targetY} y2={targetY}
          stroke={accent} strokeOpacity="0.35" strokeWidth="0.5" strokeDasharray="1.5 1.5" vectorEffect="non-scaling-stroke" />
      )}
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={accent} strokeWidth="1.4" vectorEffect="non-scaling-stroke"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="1.8" fill={accent} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Heat-pump option sets — used by the richer climate tile.
const HEATPUMP_MODES = [
  { id: 'auto',     label: 'Heat/Cool', icon: 'auto',  color: '#bbb' },
  { id: 'heat',     label: 'Heat',      icon: 'flame', color: TONE.heat },
  { id: 'cool',     label: 'Cool',      icon: 'snow',  color: TONE.cool },
  { id: 'dry',      label: 'Dry',       icon: 'drop',  color: '#7fb9ff' },
  { id: 'fan_only', label: 'Fan only',  icon: 'fan',   color: '#9aa0aa' },
  { id: 'off',      label: 'Off',       icon: 'power', color: TONE.textMute },
];
const FAN_MODES = [
  { id: 'auto',  label: 'Auto' },
  { id: 'high',  label: 'High' },
  { id: 'med',   label: 'Medium' },
  { id: 'low',   label: 'Low' },
  { id: 'quiet', label: 'Quiet' },
];
const SWING_MODES = [
  { id: 'swing',  label: 'Swing',  icon: 'swing' },
  { id: 'static', label: 'Static', icon: 'minus' },
];

function ClimateControl({ climate, onPatch }) {
  const isHeatPump = climate.kind === 'heatpump';
  const modeInfo = (isHeatPump ? HEATPUMP_MODES : [
    { id: 'heat', label: 'Heat', icon: 'flame', color: TONE.heat },
    { id: 'cool', label: 'Cool', icon: 'snow',  color: TONE.cool },
  ]).find(m => m.id === climate.mode) || { id: climate.mode, label: climate.mode, icon: 'thermo', color: TONE.cool };
  const isOff = climate.mode === 'off';
  const accent = isOff ? TONE.textMute : modeInfo.color;

  // Seed from id for deterministic history shape
  const seed = React.useMemo(() => {
    let h = 0; for (const ch of climate.id) h = (h * 31 + ch.charCodeAt(0)) % 100; return h;
  }, [climate.id]);
  const history = React.useMemo(() => tempHistory(seed, climate.current, climate.mode), [seed, climate.current, climate.mode]);
  const lo = Math.min(...history).toFixed(1);
  const hi = Math.max(...history).toFixed(1);

  // Show target row for everything except pure fan-only / off
  const showTarget = !isOff && climate.mode !== 'fan_only';

  return (
    <div style={{ background: TONE.surface2, borderRadius: 12, padding: '12px 14px', opacity: isOff ? 0.7 : 1 }}>
      {/* Header — mode swatch is a dropdown for heat pumps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {isHeatPump ? (
          <MenuButton
            icon={modeInfo.icon}
            value={climate.mode}
            items={HEATPUMP_MODES}
            onSelect={(id) => onPatch({ mode: id })}
            accent={accent}
            compact
            direction="down"
          />
        ) : (
          <div style={{
            width: 26, height: 26, borderRadius: 8,
            background: `${accent}24`, color: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}><Icon name={modeInfo.icon || 'thermo'} size={13} /></div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{climate.name}</div>
          <div style={{ fontSize: 10.5, color: accent, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span>{isHeatPump ? modeInfo.label.toLowerCase() : climate.mode} · {climate.current}°</span>
            {climate.humidity != null &&
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: TONE.textDim, textTransform: 'none' }}>
                <Icon name="drop" size={10} />{Math.round(climate.humidity)}%
              </span>
            }
          </div>
        </div>
      </div>
      {/* 24h history */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: TONE.textMute, letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600 }}>
          <span>24h</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', textTransform: 'none', letterSpacing: 0 }}>{lo}°–{hi}°</span>
        </div>
        <TempSparkline data={history} accent={accent} target={showTarget ? climate.target : null} />
      </div>
      {showTarget ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <button onClick={() => onPatch({ target: climate.target - 0.5 })} style={tinyClimateBtn}><Icon name="minus" size={14} /></button>
          <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{climate.target.toFixed(1)}°</div>
          <button onClick={() => onPatch({ target: climate.target + 0.5 })} style={tinyClimateBtn}><Icon name="plus" size={14} /></button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', fontSize: 11, color: TONE.textMute, padding: '6px 0', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
          {isOff ? 'System off' : 'No setpoint'}
        </div>
      )}
      {/* Heat-pump extras: fan + swing */}
      {isHeatPump && !isOff &&
        <div style={{
          marginTop: 10, paddingTop: 10, borderTop: `1px solid ${TONE.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
        }}>
          <MenuButton
            icon="fan"
            value={climate.fanMode || 'auto'}
            items={FAN_MODES}
            onSelect={(id) => onPatch({ fanMode: id })}
            accent={TONE.textDim}
            label="Fan"
          />
          <MenuButton
            icon="swing"
            value={climate.swing || 'static'}
            items={SWING_MODES}
            onSelect={(id) => onPatch({ swing: id })}
            accent={TONE.textDim}
            align="right"
          />
        </div>
      }
    </div>);

}
const tinyClimateBtn = {
  width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
  background: 'rgba(255,255,255,0.05)', color: TONE.text,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
};

// ---------- Robot vacuum tile ----------
const VACUUM_FAN_SPEEDS = [
  { id: 'silent',   label: 'Silent' },
  { id: 'standard', label: 'Standard' },
  { id: 'medium',   label: 'Medium' },
  { id: 'strong',   label: 'Strong' },
  { id: 'turbo',    label: 'Turbo' },
];
const VACUUM_STATUS = {
  docked:    { label: 'Docked',    color: TONE.textDim, primary: 'start',  primaryLabel: 'Start cleaning' },
  cleaning:  { label: 'Cleaning',  color: '#7dc97a',    primary: 'pause',  primaryLabel: 'Pause' },
  paused:    { label: 'Paused',    color: TONE.light,   primary: 'start',  primaryLabel: 'Resume' },
  returning: { label: 'Returning', color: TONE.cool,    primary: 'pause',  primaryLabel: 'Pause' },
  error:     { label: 'Error',     color: '#ff7a7a',    primary: 'start',  primaryLabel: 'Retry' },
};

function VacuumBatteryGlyph({ pct, color }) {
  const w = 22, h = 11;
  const fillPct = Math.max(0, Math.min(100, pct)) / 100;
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', color }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <rect x="0.5" y="0.5" width={w - 4} height={h - 1} rx="2" fill="none" stroke="currentColor" strokeOpacity="0.55" />
        <rect x={w - 3} y={h / 2 - 1.8} width="2" height="3.6" rx="0.6" fill="currentColor" fillOpacity="0.55" />
        <rect x="2" y="2" width={(w - 7) * fillPct} height={h - 4} rx="1" fill="currentColor" />
      </svg>
    </span>
  );
}

function VacuumControl({ vacuum, onPatch }) {
  const status = VACUUM_STATUS[vacuum.status] || VACUUM_STATUS.docked;
  const isCleaning = vacuum.status === 'cleaning' || vacuum.status === 'returning';
  const batteryColor = vacuum.battery <= 20 ? '#ff7a7a' : vacuum.battery <= 50 ? TONE.light : '#7dc97a';

  const cmd = (status, extra) => () => onPatch({ status, ...(extra || {}) });
  const primaryClick = () => onPatch({ status: status.primary === 'start' ? 'cleaning' : 'paused' });

  const cmdBtn = (icon, label, onClick, active = false) => (
    <button onClick={onClick} title={label} aria-label={label} style={{
      flex: 1, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
      background: active ? 'rgba(92,198,255,0.16)' : 'rgba(255,255,255,0.05)',
      color: active ? TONE.cool : TONE.text,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background .15s ease',
    }}>
      <Icon name={icon} size={14} />
    </button>
  );

  return (
    <div style={{ background: TONE.surface2, borderRadius: 12, padding: '12px 14px' }}>
      {/* Header: icon, name + status, battery, primary action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: isCleaning ? 'rgba(92,198,255,0.18)' : 'rgba(255,255,255,0.05)',
          color: isCleaning ? TONE.cool : TONE.textDim,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          animation: isCleaning ? 'pulse 1.8s ease infinite' : 'none',
        }}><Icon name="vacuum" size={16} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vacuum.name}</div>
          <div style={{ fontSize: 10.5, color: status.color, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{status.label}</span>
            {vacuum.lastSeen &&
              <span style={{ color: TONE.textMute }}>· {vacuum.lastSeen}</span>
            }
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: batteryColor, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          <span>{vacuum.battery}%</span>
          <VacuumBatteryGlyph pct={vacuum.battery} color={batteryColor} />
        </div>
      </div>

      {/* Primary action */}
      <button onClick={primaryClick} style={{
        width: '100%', height: 34, borderRadius: 9, border: 'none', cursor: 'pointer',
        background: status.primary === 'start' ? 'rgba(92,198,255,0.16)' : 'rgba(255,255,255,0.05)',
        color: status.primary === 'start' ? TONE.cool : TONE.text,
        fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, marginBottom: 8,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <Icon name={status.primary === 'start' ? 'play' : 'pause'} size={13} />
        {status.primaryLabel}
      </button>

      {/* Command row + fan speed */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {cmdBtn('play',  'Start',         cmd('cleaning'),  vacuum.status === 'cleaning')}
        {cmdBtn('pause', 'Pause',         cmd('paused'),    vacuum.status === 'paused')}
        {cmdBtn('stop',  'Stop',          cmd('docked'))}
        {cmdBtn('pin',   'Locate',        () => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20); })}
        {cmdBtn('dock',  'Return to dock', cmd('returning'), vacuum.status === 'returning')}
      </div>

      {/* Fan speed dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 10, color: TONE.textMute, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>Fan speed</div>
        <MenuButton
          icon="fan"
          value={vacuum.fanSpeed || 'standard'}
          items={VACUUM_FAN_SPEEDS}
          onSelect={(id) => onPatch({ fanSpeed: id })}
          accent={TONE.textDim}
          align="right"
        />
      </div>
    </div>);

}

// ---------- Sensor chip (collapsed-row meta indicator) ----------
function SensorChip({ icon, color, bg, label, pulse, title }) {
  return (
    <span title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: bg && bg !== 'transparent' ? '2px 7px 2px 6px' : '0',
      borderRadius: 999, background: bg || 'transparent', color,
      animation: pulse ? 'pulse 1.4s ease infinite' : 'none',
      fontWeight: pulse ? 600 : 400,
    }}>
      <Icon name={icon} size={11} />
      <span>{label}</span>
    </span>
  );
}

window.Opt1V2 = Opt1V2;