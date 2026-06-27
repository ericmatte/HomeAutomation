export function el(tag, className, innerHTML) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (innerHTML != null) e.innerHTML = innerHTML;
  return e;
}

export function haIcon(icon, sizePx) {
  return sizePx
    ? `<ha-icon icon="${icon}" style="--mdc-icon-size:${sizePx}px"></ha-icon>`
    : `<ha-icon icon="${icon}"></ha-icon>`;
}
