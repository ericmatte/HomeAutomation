/**
 * Standalone, client-side hotspot editor for the floorplan config.
 *
 * Loads a house config.yaml + a floor image, lets you click to place entity
 * hotspots and drag to position them, then exports an updated config.yaml. The
 * full config round-trips: floors and any advanced per-entity keys (labels,
 * service, service_data) are preserved; only left/top of edited hotspots change.
 */

const PERCENT = (value, total) => `${((value / total) * 100).toFixed(2)}%`;
const toRatio = (percent) => parseFloat(String(percent)) / 100;

const state = {
  config: { house: "new-house", style: {}, floors: [] },
  floorId: null,
  selected: null,
};

const els = {
  configFile: document.getElementById("config-file"),
  imageFile: document.getElementById("image-file"),
  floorSelect: document.getElementById("floor-select"),
  img: document.getElementById("floor-img"),
  canvas: document.getElementById("canvas"),
  panel: document.getElementById("hotspot-panel"),
  exportBtn: document.getElementById("export-btn"),
  status: document.getElementById("status"),
};

const currentFloor = () =>
  state.config.floors.find((floor) => floor.id === state.floorId);

const setStatus = (message) => (els.status.textContent = message);

// --- config loading --------------------------------------------------------

els.configFile.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    state.config = jsyaml.load(await file.text()) || { floors: [] };
    state.config.floors = state.config.floors || [];
    rebuildFloorSelect();
    setStatus(`Loaded config with ${state.config.floors.length} floor(s).`);
  } catch (error) {
    setStatus(`Failed to parse YAML: ${error.message}`);
  }
});

const rebuildFloorSelect = () => {
  els.floorSelect.innerHTML = "";
  state.config.floors.forEach((floor) => {
    const option = document.createElement("option");
    option.value = floor.id;
    option.textContent = `${floor.name} (${floor.id})`;
    els.floorSelect.appendChild(option);
  });
  if (state.config.floors.length) selectFloor(state.config.floors[0].id);
};

els.floorSelect.addEventListener("change", (event) => selectFloor(event.target.value));

const selectFloor = (floorId) => {
  state.floorId = floorId;
  els.floorSelect.value = floorId;
  state.selected = null;
  renderPanel();
  renderHotspots();
};

// --- image loading ---------------------------------------------------------

els.imageFile.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  els.img.src = URL.createObjectURL(file);
  els.img.onload = renderHotspots;
});

// --- hotspot placement -----------------------------------------------------

els.img.addEventListener("click", (event) => {
  const floor = currentFloor();
  if (!floor) return setStatus("Load a config and select a floor first.");
  const rect = els.img.getBoundingClientRect();
  const item = {
    entity: "light.new_entity",
    left: PERCENT(event.clientX - rect.left, rect.width),
    top: PERCENT(event.clientY - rect.top, rect.height),
  };
  floor.entities = floor.entities || [];
  floor.entities.push(item);
  state.selected = item;
  renderHotspots();
  renderPanel();
});

const renderHotspots = () => {
  els.canvas.querySelectorAll(".hotspot").forEach((node) => node.remove());
  const floor = currentFloor();
  if (!floor) return;
  (floor.entities || []).forEach((item) => createHotspot(item));
};

const createHotspot = (item) => {
  const node = document.createElement("div");
  node.className = "hotspot" + (item === state.selected ? " selected" : "");
  node.style.left = `${toRatio(item.left) * els.img.clientWidth}px`;
  node.style.top = `${toRatio(item.top) * els.img.clientHeight}px`;
  node.innerHTML = `<span class="tag">${item.entity || item.service || "?"}</span>`;
  node.addEventListener("mousedown", (event) => startDrag(event, item, node));
  els.canvas.appendChild(node);
};

const startDrag = (event, item, node) => {
  event.preventDefault();
  state.selected = item;
  renderHotspots();
  renderPanel();
  let moved = false;

  const onMove = (move) => {
    moved = true;
    const rect = els.img.getBoundingClientRect();
    const x = Math.min(Math.max(move.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(move.clientY - rect.top, 0), rect.height);
    item.left = PERCENT(x, rect.width);
    item.top = PERCENT(y, rect.height);
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
  };
  const onUp = () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    if (moved) renderPanel();
  };
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
};

// --- selected hotspot panel ------------------------------------------------

const renderPanel = () => {
  const item = state.selected;
  if (!item) return (els.panel.innerHTML = "None selected.");

  els.panel.innerHTML = `
    <label>Entity ID</label>
    <input id="f-entity" value="${item.entity || ""}" />
    <label>Tap action</label>
    <select id="f-tap">
      ${["toggle", "more-info", "none"]
        .map((a) => `<option ${item.tap_action === a ? "selected" : ""}>${a}</option>`)
        .join("")}
    </select>
    <div class="row"><label>left ${item.left}</label><label>top ${item.top}</label></div>
    <button id="f-delete">🗑 Delete hotspot</button>`;

  document.getElementById("f-entity").addEventListener("input", (e) => {
    item.entity = e.target.value;
    renderHotspots();
  });
  document.getElementById("f-tap").addEventListener("change", (e) => {
    if (e.target.value === "toggle") delete item.tap_action;
    else item.tap_action = e.target.value;
  });
  document.getElementById("f-delete").addEventListener("click", () => {
    const floor = currentFloor();
    floor.entities = floor.entities.filter((entity) => entity !== item);
    state.selected = null;
    renderHotspots();
    renderPanel();
  });
};

// --- export ----------------------------------------------------------------

els.exportBtn.addEventListener("click", () => {
  const yaml = jsyaml.dump(state.config, { lineWidth: -1, noRefs: true });
  const blob = new Blob([yaml], { type: "text/yaml" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "config.yaml";
  link.click();
  setStatus("Exported config.yaml.");
});
