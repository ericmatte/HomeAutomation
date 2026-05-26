// Shared data + icons + helpers for all three options.
// Components are exported to window at the bottom (multi-Babel-file scope).

const ROOMS = [
  // FIRST FLOOR
  { id: 'bedroom', name: 'Bedroom', floor: 'First floor', icon: 'bed',
    temp: 24.0, humidity: null, motion: false,
    lights: [
      { id: 'bed_ceiling', name: 'Ceiling', on: false, brightness: 60 },
      { id: 'bed_lamp', name: 'Bedside lamp', on: false, brightness: 30 },
    ],
    curtains: [{ id: 'bed_curtain', name: 'Curtains', position: 0, batteries: [78, 82] }],
    climate: [{ id: 'bed_therm', name: 'Thermostat', mode: 'heat', target: 21, current: 24.0 }],
    actions: [{ id: 'bed_sleep', name: 'Sleep mode', icon: 'moon' }],
    sensors: [{ id: 'bed_motion', name: 'Motion sensor', pct: 64, icon: 'motion' }],
    automations: [
      { id: 'bed_a1', name: 'Heat intervals',                                last: '8 hours ago',         labels: ['when_at_home'] },
      { id: 'bed_a2', name: 'Hidden 3-buttons remote',                       last: '16 hours ago' },
      { id: 'bed_a3', name: 'Hue remote',                                    last: '35 minutes ago' },
      { id: 'bed_a4', name: 'Lightly open covers in the morning',            last: '9 hours ago',         labels: ['need_validation', 'when_at_home'] },
      { id: 'bed_a5', name: 'Motion (5 min before sunset, 1h after)',        last: '35 minutes ago',      labels: ['motions'] },
      { id: 'bed_a6', name: 'Turn off all when going to bed',                last: 'Nov 22, 2025, 12:01 AM', enabled: false },
      { id: 'bed_a7', name: 'Turn off almost every thing before going to bed', last: 'Nov 22, 2025, 11:53 PM', enabled: false },
    ],
  },
  { id: 'entrance', name: 'Entrance', floor: 'First floor', icon: 'door',
    temp: 22.5, humidity: null, motion: false,
    door: { state: 'closed' },
    lights: [
      { id: 'ent_chand', name: 'Chandelier', on: false, brightness: 60 },
    ],
    curtains: [],
    doors: [{ id: 'ent_front', name: 'Front door', state: 'closed' }],
    climate: [],
    automations: [
      { id: 'ent_a1', name: 'Button',                                  last: 'Jan 10, 3:30 PM',  enabled: false, labels: ['need_validation'] },
      { id: 'ent_a2', name: 'Lights on when arriving or opening the door', last: 'yesterday' },
    ],
    actions: [
      { id: 'ent_red', name: 'Red warning', icon: 'sparkle' },
      { id: 'ent_living', name: 'Living lights', icon: 'sparkle' },
      { id: 'ent_caro', name: 'Go go go Caro', icon: 'sparkle' },
    ],
  },
  { id: 'living', name: 'Living room', floor: 'First floor', icon: 'sofa',
    temp: 23.0, humidity: 54.8, motion: true,
    lights: [
      { id: 'liv_left', name: 'Left floor lamp', on: true, brightness: 70 },
      { id: 'liv_right', name: 'Right floor lamp', on: false, brightness: 40 },
    ],
    curtains: [{ id: 'liv_curtain', name: 'Main curtains', position: 60, batteries: [88] }],
    propane: { id: 'liv_propane', name: 'Propane tank', pct: 64 },
    climate: [
      { id: 'liv_pump', name: 'Heat pump', kind: 'heatpump',
        mode: 'cool', target: 21, current: 23.0,
        humidity: 52, fanMode: 'auto', swing: 'static' },
      { id: 'liv_therm', name: 'Thermostat', mode: 'heat', target: 18, current: 22.5 },
    ],
    media: [{ id: 'sonos', name: 'Sonos', state: 'idle' }],
    vacuums: [{ id: 'roby', name: 'Roby', status: 'docked', battery: 100, fanSpeed: 'strong', lastSeen: '1 hour ago' }],
    automations: [
      { id: 'liv_a1', name: 'Phone call',                          last: 'Jan 22, 8:45 PM', enabled: false, labels: ['need_validation'] },
      { id: 'liv_a2', name: 'Smart heat controller',               last: 'May 15, 6:00 AM', enabled: false },
      { id: 'liv_a3', name: 'Sync dining room with living room',   last: '19 hours ago',    labels: ['motions', 'need_validation'] },
      { id: 'liv_s1', name: 'Escape Room',     kind: 'script',     last: 'May 14, 9:29 PM', labels: ['escape_room'] },
      { id: 'liv_s2', name: 'Stop escape room', kind: 'script',    last: 'May 14, 9:54 PM', labels: ['escape_room'] },
    ],
    actions: [
      { id: 'liv_ambiance', name: 'Living ambiance', icon: 'sparkle' },
      { id: 'liv_sync', name: 'Sync w/ dining', icon: 'link', active: true },
    ],
  },
  { id: 'dining', name: 'Dining room', floor: 'First floor', icon: 'fork',
    temp: 23.0, humidity: null, motion: true,
    lights: [{ id: 'din_pendant', name: 'Pendant', on: false, brightness: 80 }],
    curtains: [{ id: 'din_curtain', name: 'Curtains', position: 100, batteries: [45] }],
    climate: [],
    actions: [],
    automations: [
      { id: 'din_a1', name: 'Open curtains when lights are turned on in the morning', last: '9 hours ago', labels: ['when_at_home'] },
      { id: 'din_a2', name: 'Toggle covers',                                          last: '2 days ago',   labels: ['need_validation'] },
    ],
  },
  { id: 'kitchen', name: 'Kitchen', floor: 'First floor', icon: 'kitchen',
    temp: 22.7, humidity: null, motion: false,
    leak: { state: 'dry' },
    lights: [
      { id: 'kit_island', name: 'Island lights', on: true, brightness: 100 },
      { id: 'kit_middle', name: 'Middle light', on: true, brightness: 100 },
      { id: 'kit_sink', name: 'Sink lights', on: true, brightness: 100 },
    ],
    curtains: [],
    doors: [{ id: 'kit_coffee', name: 'Coffee cabinet', state: 'closed' }],
    climate: [],
    actions: [{ id: 'kit_all_on', name: 'All-on when entering', icon: 'sparkle', active: true }],
    sensors: [{ id: 'kit_coffee_batt', name: 'Coffee cabinet contact', pct: 55, icon: 'door' }],
    automations: [
      { id: 'kit_a1', name: 'All lights one when turning on middle kitchen light', last: '9 hours ago' },
      { id: 'kit_a2', name: 'Dishwasher leak alarm notification',                  last: 'Oct 14, 2025, 8:00 PM' },
      { id: 'kit_a3', name: 'Lights on when making coffee',                        last: '7 hours ago' },
      { id: 'kit_a4', name: 'Sync kitchen lights',                                 last: '9 hours ago' },
      { id: 'kit_a5', name: 'Turn off light after 30min before sunset',            last: 'Jan 25, 1:08 AM' },
    ],
  },
  { id: 'bath_up', name: 'Upstairs bathroom', floor: 'First floor', icon: 'bath',
    temp: 23.9, humidity: 55.0, motion: false,
    lights: [{ id: 'bath_up_main', name: 'Main', on: false, brightness: 70 }],
    curtains: [],
    climate: [],
    actions: [],
    automations: [
      { id: 'bup_a1', name: 'Diva remote', last: '34 minutes ago' },
      { id: 'bup_a2', name: 'Motion',      last: '35 minutes ago', labels: ['motions', 'need_validation'] },
    ],
  },
  { id: 'hallway', name: 'Hallway', floor: 'First floor', icon: 'corridor',
    temp: 22.8, humidity: null, motion: true,
    lights: [{ id: 'hall_main', name: 'Hallway', on: true, brightness: 50 }],
    curtains: [], climate: [], actions: [],
    automations: [
      { id: 'hall_a1', name: 'Laundry light on when door opens', last: '19 hours ago' },
      { id: 'hall_a2', name: 'Motion',                           last: '35 minutes ago', labels: ['motions'] },
    ],
  },
  // BASEMENT
  { id: 'down_hallway', name: 'Downstairs hallway', floor: 'Basement', icon: 'stairs',
    temp: null, humidity: null, motion: false,
    lights: [], curtains: [], climate: [], actions: [],
    automations: [
      { id: 'dh_a1', name: 'Motion', last: '38 minutes ago', labels: ['motions'] },
    ],
  },
  { id: 'theatre', name: 'Theatre', floor: 'Basement', icon: 'screen',
    temp: 20.5, humidity: null, motion: false,
    lights: [
      { id: 'th_sync', name: 'Sync box', on: false, brightness: 60 },
      { id: 'th_metal', name: 'Metal lamp', on: false, brightness: 40 },
      { id: 'th_bad', name: 'Bad light', on: false, brightness: 30 },
      { id: 'th_wood', name: 'Wooden lamp', on: false, brightness: 50 },
    ],
    curtains: [{ id: 'th_shades', name: 'Shades', position: 100, batteries: [92, 88, 18] }],
    climate: [{ id: 'th_therm', name: 'Thermostat', mode: 'heat', target: 20, current: 20.5 }],
    media: [
      { id: 'th_droid', name: 'Android Streamer', state: 'off' },
      { id: 'th_tv', name: 'Streamer TV', state: 'off' },
    ],
    actions: [
      { id: 'th_mountain', name: 'Mountain breeze', icon: 'palette' },
      { id: 'th_night', name: 'Nightlight', icon: 'palette' },
      { id: 'th_blood', name: 'Blood moon', icon: 'palette' },
      { id: 'th_promise', name: 'Promise', icon: 'palette' },
      { id: 'th_energize', name: 'Energize', icon: 'palette' },
      { id: 'th_savanna', name: 'Savanna sunset', icon: 'palette' },
      { id: 'th_tropical', name: 'Tropical twilight', icon: 'palette' },
      { id: 'th_concentrate', name: 'Concentrate', icon: 'palette' },
    ],
    automations: [
      { id: 'th_a1', name: 'Cinema lights on after turning off TV',  last: '20 hours ago', labels: ['need_validation'] },
      { id: 'th_a2', name: 'Motion off after 5min before sunset',    last: '21 hours ago', labels: ['motions'] },
      { id: 'th_a3', name: 'Motion off after 45min after sunset',    last: '16 hours ago', labels: ['motions'] },
      { id: 'th_a4', name: 'Motion on',                              last: '22 hours ago', labels: ['motions'] },
      { id: 'th_a5', name: 'Sump leak alarm notification',           last: 'Apr 1, 8:32 AM' },
      { id: 'th_a6', name: 'Sync box reset',                         last: 'May 2, 4:36 AM' },
      { id: 'th_a7', name: 'Sync box toggle',                        last: '12 hours ago' },
      { id: 'th_a8', name: 'Sync heat with lights',                  last: '16 hours ago', labels: ['when_at_home'] },
    ],
  },
  { id: 'office', name: "Eric's office", floor: 'Basement', icon: 'desk',
    temp: 23.0, humidity: 62.0, motion: true,
    soil: { moisture: 38, name: 'Monstera' },
    lights: [{ id: 'off_desk', name: 'Desk', on: true, brightness: 85 }],
    curtains: [],
    climate: [],
    actions: [{ id: 'off_focus', name: 'Focus', icon: 'target' }],
    sensors: [{ id: 'off_motion', name: 'Motion sensor', pct: 12, icon: 'motion' }],
    automations: [
      { id: 'off_a1', name: 'Light on when opening workshop door',  last: '19 hours ago',         labels: ['motions'] },
      { id: 'off_a2', name: 'Motion',                               last: 'Nov 4, 2025, 12:48 PM', enabled: false },
      { id: 'off_a3', name: 'Motion',                               last: '9 hours ago',           labels: ['motions', 'need_validation'] },
      { id: 'off_a4', name: 'Soil moisture alert',                  last: 'Never',                 labels: ['need_validation'] },
      { id: 'off_a5', name: 'Sync auxiliary light with main light', last: '1 hour ago' },
      { id: 'off_a6', name: 'Turn up heat while lights are on',     last: '9 hours ago',           labels: ['when_at_home'] },
    ],
  },
  { id: 'workshop', name: 'Workshop', floor: 'Basement', icon: 'wrench',
    temp: 22.3, humidity: 69.4, motion: false,
    door: { state: 'open' },
    lights: [],
    curtains: [],
    doors: [{ id: 'ws_door', name: 'Door', state: 'open' }],
    climate: [],
    actions: [{ id: 'ws_humid', name: 'High humidity alert', icon: 'sparkle', active: true }],
    sensors: [{ id: 'ws_door_batt', name: 'Door contact', pct: 38, icon: 'door' }],
    automations: [
      { id: 'ws_a1', name: 'High humidity alert', last: 'Never' },
      { id: 'ws_a2', name: 'Warn when below 0°C', last: 'Nov 23, 2025, 2:03 AM', enabled: false },
    ],
  },
  { id: 'guest', name: 'Guest room', floor: 'Basement', icon: 'bed',
    temp: null, humidity: null, motion: false,
    lights: [], curtains: [{ id: 'gst_curtain', name: 'Curtains', position: 0 }],
    climate: [], actions: [],
    automations: [
      { id: 'gst_a1', name: 'Toggle curtains', last: '2 days ago' },
    ],
  },
  { id: 'bath_down', name: 'Downstairs bathroom', floor: 'Basement', icon: 'bath',
    temp: 21.4, humidity: 58, motion: false,
    leak: { state: 'leak' },
    lights: [], curtains: [], climate: [], actions: [],
    sensors: [{ id: 'bd_leak_batt', name: 'Leak sensor', pct: 71, icon: 'leak' }],
  },
  // OTHER
  { id: 'outside', name: 'Outside', floor: 'Outside', icon: 'sun',
    temp: 19.7, humidity: null, motion: false,
    lights: [
      { id: 'out_xmas', name: 'Christmas tree', on: false, brightness: 80, icon: 'tree' },
      { id: 'out_porch', name: 'Front porch lights', on: false, brightness: 70 },
      { id: 'out_drive', name: 'Driveway light', on: false, brightness: 60, unavailable: true },
    ],
    curtains: [], climate: [],
    actions: [
      { id: 'out_pool', name: 'Pool level notification', icon: 'pool', active: true },
      { id: 'out_vacay', name: 'Vacation mode', icon: 'palm', active: true },
    ],
    automations: [
      { id: 'out_a1', name: 'Away mode',                                 last: '1 hour ago' },
      { id: 'out_a2', name: 'Lights off after 1h30am',                   last: 'Jan 1, 1:30 AM' },
      { id: 'out_a3', name: 'Pool level notification',                   last: 'May 3, 7:32 AM' },
      { id: 'out_a4', name: 'Send notification if a door opens when away', last: '1 hour ago' },
      { id: 'out_a5', name: 'Show outside temperature on thermostats',   last: '48 minutes ago' },
      { id: 'out_a6', name: 'Sync front yard lights',                    last: 'yesterday' },
      { id: 'out_a7', name: 'Vacation mode',                             last: '3 days ago', labels: ['need_validation'] },
    ],
  },
];

// ---- Icons (24px, currentColor) ----
const Icon = ({ name, size = 18, style }) => {
  const s = { width: size, height: size, display: 'inline-block', verticalAlign: 'middle', ...style };
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'bed': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 14h18M7 9V7a1 1 0 0 1 1-1h3v3"/></svg>;
    case 'door': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17H6zM6 21h12M14 12h.5"/></svg>;
    case 'sofa': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M3 12v5h18v-5M3 12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M21 12a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2M9 12V8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4M5 17v2M19 17v2"/></svg>;
    case 'fork': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M7 3v8a2 2 0 0 0 2 2v8M5 3v6M9 3v6M17 3v18M17 14c-1.5 0-3-1.5-3-3V6c0-1.5 1.5-3 3-3"/></svg>;
    case 'kitchen': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M5 3h14v18H5zM5 9h14M9 6h.5M9 14h.5M9 17h.5"/></svg>;
    case 'bath': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3zM6 12V6a2 2 0 0 1 4 0M5 21l-1 1M19 21l1 1"/></svg>;
    case 'corridor': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M4 3v18M20 3v18M9 12h6M12 9v6"/></svg>;
    case 'stairs': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M3 20h4v-4h4v-4h4V8h4V4"/></svg>;
    case 'screen': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M3 5h18v12H3zM8 21h8M12 17v4"/></svg>;
    case 'desk': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M3 9h18M5 9v11M19 9v11M8 13h3v3H8zM14 4l3 5M10 4l-3 5"/></svg>;
    case 'wrench': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M14 6a4 4 0 1 1 4 4l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 1-1-1z"/></svg>;
    case 'sun': return <svg viewBox="0 0 24 24" style={s}><circle {...stroke} cx="12" cy="12" r="4"/><path {...stroke} d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"/></svg>;
    case 'bulb': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 0 0-4-10z"/></svg>;
    case 'curtain': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M3 3h18M5 3v18c3 0 5-2 5-9s2-9 2-9M19 3v18c-3 0-5-2-5-9s-2-9-2-9"/></svg>;
    case 'motion': return <svg viewBox="0 0 24 24" style={s}><circle {...stroke} cx="12" cy="6" r="2"/><path {...stroke} d="M9 22l1-7-3-3 2-4 3 3 4 1M14 22l-1-7M17 13l4-1"/></svg>;
    case 'thermo': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M14 14V5a2 2 0 0 0-4 0v9a4 4 0 1 0 4 0z"/></svg>;
    case 'drop': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M12 3l5 7a6 6 0 1 1-10 0l5-7z"/></svg>;
    case 'plus': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M12 5v14M5 12h14"/></svg>;
    case 'minus': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M5 12h14"/></svg>;
    case 'chevron': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M6 9l6 6 6-6"/></svg>;
    case 'play': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M7 4l12 8-12 8V4z"/></svg>;
    case 'moon': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/></svg>;
    case 'sparkle': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/></svg>;
    case 'lock': return <svg viewBox="0 0 24 24" style={s}><rect {...stroke} x="5" y="11" width="14" height="10" rx="1"/><path {...stroke} d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
    case 'link': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M10 14a4 4 0 0 1 0-6l3-3a4 4 0 1 1 6 6l-1 1M14 10a4 4 0 0 1 0 6l-3 3a4 4 0 1 1-6-6l1-1"/></svg>;
    case 'flame': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M12 3c2 4 6 5 6 11a6 6 0 1 1-12 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 2-10z"/></svg>;
    case 'puzzle': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M10 4h4v3a2 2 0 1 0 0 4v3h3a2 2 0 1 0 4 0v-3h-3V8h-4V4z"/></svg>;
    case 'target': return <svg viewBox="0 0 24 24" style={s}><circle {...stroke} cx="12" cy="12" r="8"/><circle {...stroke} cx="12" cy="12" r="4"/><circle {...stroke} cx="12" cy="12" r="1"/></svg>;
    case 'palette': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M12 3a9 9 0 1 0 0 18c1.5 0 1.5-2 0-2-1 0-1.5-.5-1.5-1.5 0-1 .5-1.5 1.5-1.5h2a5 5 0 0 0 5-5 8 8 0 0 0-7-8z"/><circle cx="7" cy="11" r="1.2" fill="currentColor"/><circle cx="10" cy="7" r="1.2" fill="currentColor"/><circle cx="15" cy="7" r="1.2" fill="currentColor"/><circle cx="17" cy="11" r="1.2" fill="currentColor"/></svg>;
    case 'door2': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M5 21h14M7 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M13 12h.5"/></svg>;
    case 'up': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M6 14l6-6 6 6"/></svg>;
    case 'down': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M6 10l6 6 6-6"/></svg>;
    case 'stop': return <svg viewBox="0 0 24 24" style={s}><rect {...stroke} x="7" y="7" width="10" height="10" rx="1"/></svg>;
    case 'x': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'arrow_left': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M14 6l-6 6 6 6M8 12h12"/></svg>;
    case 'speaker': return <svg viewBox="0 0 24 24" style={s}><rect {...stroke} x="6" y="3" width="12" height="18" rx="1"/><circle {...stroke} cx="12" cy="14" r="3"/><circle {...stroke} cx="12" cy="7" r=".8"/></svg>;
    case 'dots': return <svg viewBox="0 0 24 24" style={s}><circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/></svg>;
    case 'check': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M5 12l5 5L20 7"/></svg>;
    case 'search': return <svg viewBox="0 0 24 24" style={s}><circle {...stroke} cx="11" cy="11" r="6"/><path {...stroke} d="M16 16l4 4"/></svg>;
    case 'home': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-9z"/></svg>;
    case 'tree': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M12 3l4 5h-2l3 4h-2l4 5H7l4-5H9l3-4H7l5-5zM10 17h4v3h-4z"/></svg>;
    case 'pool': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M3 17c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0M3 20c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0M7 14V6a2 2 0 0 1 4 0M13 14V6a2 2 0 0 1 4 0M7 10h10"/></svg>;
    case 'palm': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M12 21V10M12 10c-2-3-5-3-7-2 1-3 4-4 7-2-1-3 0-5 3-5 2 0 3 2 2 4 3-1 5 1 5 4-3-1-6 0-7 2-1-2-2-2-3-1zM5 21h14"/></svg>;
    case 'warning': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M12 4l10 17H2L12 4zM12 11v4M12 18h.5"/></svg>;
    case 'leak': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M12 3l5 7a6 6 0 1 1-10 0l5-7z"/><path {...stroke} d="M9 13c0 2 1 3 2.5 3"/></svg>;
    case 'plant': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M12 21v-7M12 14c-3 0-5-2-5-5 3 0 5 2 5 5zM12 14c3 0 5-2 5-5-3 0-5 2-5 5zM12 11c0-2 1.5-4 4-4-.2 2-2 4-4 4zM12 11c0-2-1.5-4-4-4 .2 2 2 4 4 4zM8 21h8"/></svg>;
    case 'door_open': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M3 21h18M14 21V5a1 1 0 0 0-1.2-1L6.2 5.3A1 1 0 0 0 5 6.3V21M14 21h5V7M11 12h.5"/></svg>;
    case 'motion2': return <svg viewBox="0 0 24 24" style={s}><circle {...stroke} cx="7" cy="5" r="1.6"/><path {...stroke} d="M5 22l2-8 4 2 1 5M11 16l4-4 3 2 3-1M11 22l1-7"/></svg>;
    case 'snow': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13M12 5l-2-1.5M12 5l2-1.5M12 19l-2 1.5M12 19l2 1.5M5 12l-1.5-2M5 12l-1.5 2M19 12l1.5-2M19 12l1.5 2"/></svg>;
    case 'fan': return <svg viewBox="0 0 24 24" style={s}><circle {...stroke} cx="12" cy="12" r="1.5"/><path {...stroke} d="M12 10.5c0-3 2-6 5-5 1 3-1 6-5 5zM13.5 12c3 0 6 2 5 5-3 1-6-1-5-5zM12 13.5c0 3-2 6-5 5-1-3 1-6 5-5zM10.5 12c-3 0-6-2-5-5 3-1 6 1 5 5z"/></svg>;
    case 'swing': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M4 17a8 8 0 0 1 16 0"/><path {...stroke} d="M2 14l2 3 2-3M22 14l-2 3-2-3"/></svg>;
    case 'power': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M12 4v8M7 7a7 7 0 1 0 10 0"/></svg>;
    case 'auto': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M5 19l4-12 4 12M6.5 15h5M15 13a3 3 0 1 1 6 0v6M15 17h6"/></svg>;
    case 'vacuum': return <svg viewBox="0 0 24 24" style={s}><circle {...stroke} cx="12" cy="13" r="7"/><circle {...stroke} cx="12" cy="13" r="2.5"/><path {...stroke} d="M9 6.5a7 7 0 0 1 6 0"/></svg>;
    case 'dock': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9z"/><path {...stroke} d="M9 21v-6h6v6"/></svg>;
    case 'pin': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M12 21s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12z"/><circle {...stroke} cx="12" cy="9" r="2.5"/></svg>;
    case 'pause': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M8 5v14M16 5v14"/></svg>;
    case 'battery': return <svg viewBox="0 0 24 24" style={s}><rect {...stroke} x="3" y="8" width="16" height="9" rx="1.5"/><path {...stroke} d="M20 11v3"/></svg>;
    case 'propane': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M9 21h6M10 21v-3M14 21v-3M7 14a5 5 0 0 1 10 0v3a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-3z"/><path {...stroke} d="M10 6V4h4v2"/><path {...stroke} d="M9 6h6"/></svg>;
    case 'cogs': return <svg viewBox="0 0 24 24" style={s}><circle {...stroke} cx="12" cy="12" r="3"/><path {...stroke} d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4L5.6 5.6"/></svg>;
    case 'script': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M6 3h11a2 2 0 0 1 2 2v13M6 3v15a3 3 0 0 0 3 3h11v-3H9a3 3 0 0 1-3-3V3z"/><path {...stroke} d="M9 7h7M9 11h7M9 15h4"/></svg>;
    case 'play_circle': return <svg viewBox="0 0 24 24" style={s}><circle {...stroke} cx="12" cy="12" r="9"/><path {...stroke} d="M10 8.5l6 3.5-6 3.5v-7z"/></svg>;
    case 'leaf': return <svg viewBox="0 0 24 24" style={s}><path {...stroke} d="M4 20c0-9 7-16 16-16 0 9-7 16-16 16zM4 20c4-4 8-6 12-8"/></svg>;
    default: return null;
  }
};

// Tone tokens shared across options
const TONE = {
  bg: '#0e0f12',
  surface: '#16181d',
  surface2: '#1d2026',
  surface3: '#252931',
  line: 'rgba(255,255,255,0.06)',
  line2: 'rgba(255,255,255,0.10)',
  text: '#e8e9ec',
  textDim: '#9aa0aa',
  textMute: '#666b75',
  light: '#f5c451',
  lightBg: 'rgba(245,196,81,0.14)',
  curtain: '#9b7fd1',
  curtainBg: 'rgba(155,127,209,0.14)',
  motion: '#5cc6ff',
  motionBg: 'rgba(92,198,255,0.12)',
  heat: '#ff8a5b',
  cool: '#5cc6ff',
};

// Aggregations
const lightsOn = (r) => r.lights.filter(l => l.on).length;
const curtainsOpen = (r) => r.curtains.filter(c => c.position > 5).length;

// Battery / level aggregation — used by the header batteries badge.
// Walks every room and yields one entry per physical battery or level sensor.
// kind: 'battery' (covers, sensors) or 'propane' (tank %).
function collectLevels(rooms) {
  const out = [];
  for (const r of rooms) {
    // Covers — one entry per battery in the group
    for (const c of (r.curtains || [])) {
      const bs = c.batteries || [];
      bs.forEach((pct, i) => {
        out.push({
          id: `${c.id}:${i}`,
          name: bs.length > 1 ? `${c.name} #${i + 1}` : c.name,
          group: bs.length > 1 ? c.name : null,
          room: r.name,
          roomIcon: r.icon,
          icon: 'curtain',
          kind: 'battery',
          pct,
        });
      });
    }
    // Other sensor batteries
    for (const s of (r.sensors || [])) {
      out.push({
        id: s.id,
        name: s.name,
        room: r.name,
        roomIcon: r.icon,
        icon: s.icon || 'battery',
        kind: 'battery',
        pct: s.pct,
      });
    }
    // Tank / fuel levels (propane today, could grow)
    if (r.propane) {
      out.push({
        id: r.propane.id,
        name: r.propane.name,
        room: r.name,
        roomIcon: r.icon,
        icon: 'propane',
        kind: 'propane',
        pct: r.propane.pct,
      });
    }
  }
  return out.sort((a, b) => a.pct - b.pct);
}

// Tier thresholds for battery / level colour coding
function levelTier(pct) {
  if (pct <= 20) return 'critical';
  if (pct <= 40) return 'low';
  return 'ok';
}
function levelColor(pct) {
  const tier = levelTier(pct);
  return tier === 'critical' ? '#ff7a7a' : tier === 'low' ? '#f0b13a' : '#7dc97a';
}

// Automation / script labels — match the user's HA categories.
const AUTOMATION_LABELS = {
  motions:         { name: 'Motions',         icon: 'motion',  color: '#5cb6b6', bg: 'rgba(92,182,182,0.16)' },
  when_at_home:    { name: 'When at home',    icon: 'home',    color: '#5cb6b6', bg: 'rgba(92,182,182,0.16)' },
  need_validation: { name: 'Need validation', icon: 'search',  color: '#a37fd6', bg: 'rgba(163,127,214,0.18)' },
  escape_room:     { name: 'Escape room',     icon: 'puzzle',  color: '#d9a449', bg: 'rgba(217,164,73,0.18)' },
};

// Slider (range with custom track) — used for brightness & curtain position
function Slider({ value, onChange, accent = TONE.light, height = 6 }) {
  return (
    <div style={{ position: 'relative', height, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, width: `${value}%`, background: accent, borderRadius: 999 }} />
      <input type="range" min={0} max={100} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
    </div>
  );
}

// Pill chip — used everywhere
function Chip({ active, onClick, color = TONE.light, bg, children, size = 'sm' }) {
  const padding = size === 'sm' ? '6px 10px' : '8px 12px';
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding, borderRadius: 999, border: 'none', cursor: 'pointer',
      background: active ? (bg || `${color}26`) : 'rgba(255,255,255,0.05)',
      color: active ? color : TONE.textDim,
      fontSize: 12, fontFamily: 'inherit', fontWeight: 500,
      transition: 'all .15s ease',
    }}>{children}</button>
  );
}

// MenuButton — small icon trigger that opens a popover of options.
// Used by the heat-pump tile (mode/fan/swing) and the vacuum tile (fan speed).
function MenuButton({ icon, value, items, onSelect, accent = TONE.text, compact = false, align = 'left', direction = 'up', label }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const current = items.find(i => i.id === value) || items[0];
  const popoverSide = align === 'right' ? { right: 0 } : { left: 0 };
  const popoverDir = direction === 'down' ? { top: '100%', marginTop: 6 } : { bottom: '100%', marginBottom: 6 };
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: compact ? '4px 6px' : '5px 8px',
        borderRadius: 8, border: 'none', cursor: 'pointer',
        background: open ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)',
        color: accent, fontFamily: 'inherit', fontSize: 11, fontWeight: 500,
        whiteSpace: 'nowrap',
      }}>
        <Icon name={current.icon || icon} size={12} />
        {!compact &&
          <span style={{ color: TONE.text }}>{label ? `${label} ` : ''}{current.label}</span>
        }
        <Icon name="chevron" size={9} style={{ color: TONE.textMute, opacity: 0.7 }} />
      </button>
      {open &&
        <div style={{
          position: 'absolute', ...popoverDir, ...popoverSide,
          background: '#252931', borderRadius: 10, padding: 4,
          boxShadow: '0 10px 28px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)',
          zIndex: 30, minWidth: 138, animation: 'fadeIn .1s ease',
        }}>
          {items.map((it) => {
            const sel = it.id === value;
            return (
              <button key={it.id} onClick={() => { onSelect(it.id); setOpen(false); }} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 9px', borderRadius: 7, border: 'none', cursor: 'pointer',
                background: sel ? 'rgba(255,255,255,0.07)' : 'transparent',
                color: sel ? (it.color || accent) : TONE.text,
                fontFamily: 'inherit', fontSize: 12, textAlign: 'left',
              }}>
                {it.icon && <Icon name={it.icon} size={12} style={{ color: it.color || (sel ? accent : TONE.textDim) }} />}
                <span style={{ flex: 1 }}>{it.label}</span>
                {sel && <Icon name="check" size={11} style={{ color: accent, opacity: 0.7 }} />}
              </button>
            );
          })}
        </div>
      }
    </div>
  );
}

Object.assign(window, { ROOMS, Icon, TONE, lightsOn, curtainsOpen, Slider, Chip, MenuButton, collectLevels, levelTier, levelColor, AUTOMATION_LABELS });
