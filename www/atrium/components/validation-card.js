// Two-level (change / ongoing) validation checklists per automation. Content
// lives in ../validation-checklists.json (versioned in git); checked state
// lives natively in 2 global Local To-do lists so it's checkable from any
// HA client. See ../../CLAUDE.md for the authoring convention.
const _v = new URL(import.meta.url).search;
const [domUtilsMod] = await Promise.all([import(`../lib/dom-utils.js${_v}`)]);
const { haIcon, fireMoreInfo } = domUtilsMod;
const STYLE = await fetch(new URL(`./validation-card.css${_v}`, import.meta.url)).then((r) => r.text());
const MANIFEST_URL = new URL(`../validation-checklists.json${_v}`, import.meta.url);

const REFRESH_INTERVAL_MS = 30 * 1000;

const LEVELS = [
  { key: "change", entityId: "todo.validation_changement", label: "🔧 Changement" },
  { key: "ongoing", entityId: "todo.validation_suivi_long_terme", label: "🔁 Suivi long terme" },
];

class AtriumValidationCard extends HTMLElement {
  constructor() {
    super();
    this._built = false;
    this._synced = false;
    this._refreshInterval = null;
    this._expanded = false;
  }

  setConfig(_config) {}

  connectedCallback() {
    if (!this._refreshInterval) {
      this._refreshInterval = setInterval(() => this._refreshAndRender(), REFRESH_INTERVAL_MS);
    }
  }

  disconnectedCallback() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) {
      this._build();
      this._built = true;
      this._init();
    }
  }

  _build() {
    this.innerHTML = "";
    const style = document.createElement("style");
    style.textContent = STYLE;
    this.appendChild(style);
    this._root = document.createElement("div");
    this._root.className = "atrium-validation-root";
    this.appendChild(this._root);
  }

  async _init() {
    let manifest;
    try {
      manifest = await this._loadManifest();
    } catch (err) {
      if (err.notFound) {
        // No checklist authored yet — normal state, nothing to show.
        this._root.replaceChildren();
        return;
      }
      this._renderMessage(`Validation indisponible : ${err.message}`, true);
      return;
    }
    this._manifest = manifest;

    const missing = LEVELS.filter((l) => !this._hass.states[l.entityId]);
    if (missing.length) {
      const names = missing.map((l) => l.entityId).join(", ");
      this._renderMessage(
        `Validation indisponible : liste(s) to-do manquante(s) (${names}). ` +
        "À créer une fois via Réglages → Appareils et services → Local To-do.",
        true
      );
      return;
    }

    try {
      await this._sync();
    } catch (err) {
      this._renderMessage(`Validation indisponible : ${err.message}`, true);
      return;
    }
    this._synced = true;
    await this._refreshAndRender();
  }

  async _loadManifest() {
    // Bypass both the browser HTTP cache and any service-worker cache (HA's
    // frontend runs as a PWA) so edits to the manifest show up on a normal
    // refresh, without needing a hard reload.
    const bustedUrl = new URL(MANIFEST_URL);
    bustedUrl.searchParams.set("_", Date.now());
    const res = await fetch(bustedUrl, { cache: "no-store" });
    if (res.status === 404) {
      const err = new Error("not found");
      err.notFound = true;
      throw err;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} sur validation-checklists.json`);
    try {
      return await res.json();
    } catch {
      throw new Error("JSON invalide dans validation-checklists.json");
    }
  }

  _desiredCorrelationIds(levelKey) {
    const ids = new Set();
    for (const [autoKey, autoDef] of Object.entries(this._manifest)) {
      for (const item of autoDef[levelKey] || []) {
        ids.add(`${autoKey}:${item.id}`);
      }
    }
    return ids;
  }

  async _fetchItems(entityId) {
    const res = await this._hass.callWS({ type: "todo/item/list", entity_id: entityId });
    return res.items || [];
  }

  // Reconciles the manifest (source of truth for content) against the 2
  // native to-do lists. Runs once per page load — editing the manifest
  // takes effect on next load, no HA reload involved.
  async _sync() {
    for (const level of LEVELS) {
      const existing = await this._fetchItems(level.entityId);
      const byCorrelation = new Map(existing.filter((it) => it.description).map((it) => [it.description, it]));
      const desired = this._desiredCorrelationIds(level.key);

      for (const [autoKey, autoDef] of Object.entries(this._manifest)) {
        for (const item of autoDef[level.key] || []) {
          const correlationId = `${autoKey}:${item.id}`;
          if (byCorrelation.has(correlationId)) continue;
          await this._hass.callService("todo", "add_item", {
            entity_id: level.entityId,
            item: item.text,
            description: correlationId,
          });
        }
      }

      // Only clean up items we recognize as ours (correlation id format);
      // anything else in these lists is left untouched.
      for (const it of existing) {
        const correlationId = it.description;
        if (!correlationId || !correlationId.includes(":")) continue;
        if (desired.has(correlationId)) continue;
        await this._hass.callService("todo", "remove_item", {
          entity_id: level.entityId,
          item: it.uid,
        });
      }
    }
  }

  async _refreshAndRender() {
    if (!this._manifest || !this._synced) return;
    const itemsByCorrelation = new Map();
    for (const level of LEVELS) {
      const items = await this._fetchItems(level.entityId);
      for (const it of items) {
        if (it.description) itemsByCorrelation.set(it.description, it);
      }
    }
    this._itemsByCorrelation = itemsByCorrelation;
    this._render();
  }

  _render() {
    const automations = [];
    for (const [autoKey, autoDef] of Object.entries(this._manifest)) {
      const sections = LEVELS
        .map((level) => {
          // Checked items stay visible (struck through) at both levels —
          // only removing the manifest entry itself takes an item away.
          const items = (autoDef[level.key] || [])
            .map((item) => {
              const todoItem = this._itemsByCorrelation.get(`${autoKey}:${item.id}`);
              return todoItem ? { ...item, todoItem } : null;
            })
            .filter(Boolean);
          return { level, items };
        })
        .filter((s) => s.items.length);

      if (sections.length) {
        automations.push({ label: autoDef.label || autoKey, entity: autoDef.entity || null, sections });
      }
    }

    if (!automations.length) {
      this._root.replaceChildren();
      return;
    }

    const totalItems = automations.reduce(
      (n, a) => n + a.sections.reduce((m, s) => m + s.items.length, 0),
      0
    );
    const checkedItems = automations.reduce(
      (n, a) =>
        n +
        a.sections.reduce(
          (m, s) => m + s.items.filter((entry) => entry.todoItem.status === "completed").length,
          0
        ),
      0
    );

    const card = document.createElement("div");
    card.className = "atrium-validation-card" + (this._expanded ? " expanded" : "");

    const header = document.createElement("div");
    header.className = "atrium-validation-header";
    header.innerHTML = `
      <span class="atrium-validation-card-title">✅ ${automations.length} validation${automations.length > 1 ? "s" : ""}</span>
      <span class="atrium-validation-count">${checkedItems}/${totalItems}</span>
      <span class="atrium-validation-chev">${haIcon("mdi:chevron-down", 18)}</span>
    `;
    // Toggle the class on the live element (not a full re-render) so the
    // grid-template-rows transition has a start state to animate from — a
    // rebuilt node would mount already-expanded and skip the ease.
    header.addEventListener("click", () => {
      this._expanded = !this._expanded;
      card.classList.toggle("expanded", this._expanded);
    });
    card.appendChild(header);

    // Wrap as a grid so the body can animate from 0fr to 1fr (height: 0 →
    // auto). Padding lives on .atrium-validation-body-inner so it doesn't
    // leak visible height when the wrap collapses.
    const bodyWrap = document.createElement("div");
    bodyWrap.className = "atrium-validation-body-wrap";
    const body = document.createElement("div");
    body.className = "atrium-validation-body";
    const bodyInner = document.createElement("div");
    bodyInner.className = "atrium-validation-body-inner";

    for (const automation of automations) {
      const block = document.createElement("div");
      block.className = "atrium-validation-automation";

      // Only the automation itself links out — that's the single, top-level
      // "jump to what changed" action. Individual items are plain text so
      // the checklist stays a checklist, not a list of separate links.
      const linkable = !!automation.entity;
      const title = document.createElement(linkable ? "button" : "div");
      title.className = "atrium-validation-automation-title" + (linkable ? " is-linkable" : "");
      if (linkable) {
        title.type = "button";
        title.innerHTML = `<span></span>${haIcon("mdi:open-in-new", 14)}`;
        title.querySelector("span").textContent = automation.label;
        title.addEventListener("click", (e) => {
          e.stopPropagation();
          this._openEntityMore(automation.entity);
        });
      } else {
        title.textContent = automation.label;
      }
      block.appendChild(title);

      for (const section of automation.sections) {
        const sectionLabel = document.createElement("div");
        sectionLabel.className = "atrium-validation-section-label";
        sectionLabel.textContent = section.level.label;
        block.appendChild(sectionLabel);
        for (const entry of section.items) block.appendChild(this._buildItem(entry, section.level));
      }
      bodyInner.appendChild(block);
    }

    body.appendChild(bodyInner);
    bodyWrap.appendChild(body);
    card.appendChild(bodyWrap);
    this._root.replaceChildren(card);
  }

  _buildItem(entry, level) {
    const checked = entry.todoItem.status === "completed";
    const row = document.createElement("div");
    row.className = "atrium-validation-item" + (checked ? " is-checked" : "");

    const checkbox = document.createElement("ha-checkbox");
    checkbox.checked = checked;

    const text = document.createElement("span");
    text.className = "atrium-validation-item-text";
    text.textContent = entry.text;

    row.append(checkbox, text);
    row.addEventListener("click", () => {
      const next = !checkbox.checked;
      checkbox.checked = next;
      this._toggleItem(entry.todoItem, level, next);
    });
    return row;
  }

  _openEntityMore(entityId) {
    fireMoreInfo(this, entityId);
  }

  async _toggleItem(todoItem, level, checked) {
    const status = checked ? "completed" : "needs_action";
    await this._hass.callService("todo", "update_item", {
      entity_id: level.entityId,
      item: todoItem.uid,
      status,
    });
    todoItem.status = status;
    this._render();
  }

  _renderMessage(text, isError) {
    const msg = document.createElement("div");
    msg.className = "atrium-validation-msg" + (isError ? " is-error" : "");
    msg.textContent = text;
    this._root.replaceChildren(msg);
  }

  getCardSize() {
    return 3;
  }
}
customElements.define("atrium-validation-card", AtriumValidationCard);
