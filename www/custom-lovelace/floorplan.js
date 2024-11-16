function normalizeSelector(e) {
  function t() {
    l && (u.length > 0 && /^[~+>]$/.test(u[u.length - 1]) && u.push(" "), u.push(l));
  }
  var n,
    l,
    r,
    o,
    u = [],
    s = [0],
    c = 0,
    h = /(?:[^\\]|(?:^|[^\\])(?:\\\\)+)$/,
    a = /^\s+$/,
    i = [/\s+|\/\*|["'>~+[(]/g, /\s+|\/\*|["'[\]()]/g, /\s+|\/\*|["'[\]()]/g, null, /\*\//g];
  for (e = e.trim(); ; ) {
    if (((l = ""), ((r = i[s[s.length - 1]]).lastIndex = c), !(n = r.exec(e)))) {
      (l = e.substr(c)), t();
      break;
    }
    if (((o = c) < (c = r.lastIndex) - n[0].length && (l = e.substring(o, c - n[0].length)), s[s.length - 1] < 3)) {
      if ((t(), "[" === n[0])) s.push(1);
      else if ("(" === n[0]) s.push(2);
      else if (/^["']$/.test(n[0])) s.push(3), (i[3] = new RegExp(n[0], "g"));
      else if ("/*" === n[0]) s.push(4);
      else if (/^[\])]$/.test(n[0]) && s.length > 0) s.pop();
      else if (
        /^(?:\s+|[~+>])$/.test(n[0]) &&
        (u.length > 0 && !a.test(u[u.length - 1]) && 0 === s[s.length - 1] && u.push(" "),
        1 === s[s.length - 1] && 5 === u.length && "=" === u[2].charAt(u[2].length - 1) && (u[4] = " " + u[4]),
        a.test(n[0]))
      )
        continue;
      u.push(n[0]);
    } else
      (u[u.length - 1] += l),
        h.test(u[u.length - 1]) &&
          (4 === s[s.length - 1] &&
            (u.length < 2 || a.test(u[u.length - 2]) ? u.pop() : (u[u.length - 1] = " "), (n[0] = "")),
          s.pop()),
        (u[u.length - 1] += n[0]);
  }
  return u.join("").trim();
}
function querySelectorAllDeep(e, t = document, n = null) {
  return _querySelectorDeep(e, !0, t, n);
}
function querySelectorDeep(e, t = document, n = null) {
  return _querySelectorDeep(e, !1, t, n);
}
function _querySelectorDeep(e, t, n, l = null) {
  e = normalizeSelector(e);
  let r = n.querySelector(e);
  if (document.head.createShadowRoot || document.head.attachShadow) {
    if (!t && r) return r;
    return splitByCharacterUnlessQuoted(e, ",").reduce(
      (e, r) => {
        if (!t && e) return e;
        const o = splitByCharacterUnlessQuoted(r.replace(/^\s+/g, "").replace(/\s*([>+~]+)\s*/g, "$1"), " ")
            .filter((e) => !!e)
            .map((e) => splitByCharacterUnlessQuoted(e, ">")),
          u = o.length - 1,
          s = collectAllElementsDeep(o[u][o[u].length - 1], n, l),
          c = findMatchingElement(o, u, n);
        return t ? (e = e.concat(s.filter(c))) : (e = s.find(c)) || null;
      },
      t ? [] : null
    );
  }
  return t ? n.querySelectorAll(e) : r;
}
function findMatchingElement(e, t, n) {
  return (l) => {
    let r = t,
      o = l,
      u = !1;
    for (; o && !isDocumentNode(o); ) {
      let t = !0;
      if (1 === e[r].length) t = o.matches(e[r]);
      else {
        const l = [].concat(e[r]).reverse();
        let u = o;
        for (const e of l) {
          if (!u || !u.matches(e)) {
            t = !1;
            break;
          }
          u = findParentOrHost(u, n);
        }
      }
      if (t && 0 === r) {
        u = !0;
        break;
      }
      t && r--, (o = findParentOrHost(o, n));
    }
    return u;
  };
}
function splitByCharacterUnlessQuoted(e, t) {
  return e
    .match(/\\?.|^$/g)
    .reduce(
      (e, n) => (
        '"' !== n || e.sQuote
          ? "'" !== n || e.quote
            ? e.quote || e.sQuote || n !== t
              ? (e.a[e.a.length - 1] += n)
              : e.a.push("")
            : ((e.sQuote ^= 1), (e.a[e.a.length - 1] += n))
          : ((e.quote ^= 1), (e.a[e.a.length - 1] += n)),
        e
      ),
      { a: [""] }
    ).a;
}
function isDocumentNode(e) {
  return e.nodeType === Node.DOCUMENT_FRAGMENT_NODE || e.nodeType === Node.DOCUMENT_NODE;
}
function findParentOrHost(e, t) {
  const n = e.parentNode;
  return n && n.host && 11 === n.nodeType ? n.host : n === t ? null : n;
}
function collectAllElementsDeep(e = null, t, n = null) {
  let l = [];
  if (n) l = n;
  else {
    const e = function (t) {
      for (let n = 0; n < t.length; n++) {
        const r = t[n];
        l.push(r), r.shadowRoot && e(r.shadowRoot.querySelectorAll("*"));
      }
    };
    t.shadowRoot && e(t.shadowRoot.querySelectorAll("*")), e(t.querySelectorAll("*"));
  }
  return e ? l.filter((t) => t.matches(e)) : l;
}
(window.querySelectorDeep = querySelectorDeep), (window.querySelectorAllDeep = querySelectorAllDeep);

/****************************/
/** ACTUAL CODE STARTS HERE */

let interval;

const waitForRedirectionButton = (callback) => {
  const check = () => {
    const redirectionButton = querySelectorDeep("hui-icon-element ha-icon");
    if (redirectionButton?.getAttribute("title").includes("floorplan")) {
      callback();
      return clearInterval(interval);
    }
  };

  check();
  interval = setInterval(check, 50);
};

const getFloorplanHeader = (floorplanElement) => {
  const viewElements = [...floorplanElement.parentElement.childNodes];
  const index = viewElements.indexOf(floorplanElement);
  return viewElements[index - 1];
};

const toggleElement = (element, visible) => {
  element.style.display = visible ? "" : "none";
};

const toggleFloorplan = (floorplanElement, visible) => {
  toggleElement(floorplanElement, visible);
  toggleElement(getFloorplanHeader(floorplanElement), visible);
};

const selectRotation = () => {
  const callback = () => {
    const [flooplan90, floorplan360] = querySelectorAllDeep("hui-picture-elements-card");
    if (!flooplan90?.___config?.image?.includes("floorplan-90")) return;
    if (!floorplan360?.___config?.image?.includes("floorplan-360")) return;

    const appDrawer = querySelectorDeep("app-drawer");
    const width = document.body.clientWidth - (appDrawer ? appDrawer.clientWidth : 0);
    const height = document.body.clientHeight;
    const useVerticalPlan = height > width;

    toggleFloorplan(flooplan90, useVerticalPlan);
    toggleFloorplan(floorplan360, !useVerticalPlan);
  };

  clearInterval(interval);
  waitForRedirectionButton(callback);
};

const checkPageTransition = () => {
  requestAnimationFrame(() => {
    selectRotation();
  }, true);
};

const setupListeners = () => {
  document.body.addEventListener("click", checkPageTransition);
  document.body.addEventListener("keyup", (e) => {
    if (e.code === "Enter" || e.code === "Space") checkPageTransition();
  });

  window.addEventListener("resize", () => selectRotation());
  selectRotation();
};
