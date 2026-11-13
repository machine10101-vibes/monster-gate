const CORNERS = ['nw', 'ne', 'sw', 'se'];

export function decorateFrame(el) {
  if (!el) return el;
  el.classList.add('mg-frame');
  if (el.querySelector(':scope > .mg-corner, :scope > .qj-corner')) return el;
  for (const c of CORNERS) {
    const i = document.createElement('i');
    i.className = `mg-corner ${c}`;
    i.setAttribute('aria-hidden', 'true');
    el.appendChild(i);
  }
  return el;
}

export function decorateAllFrames(root = typeof document !== 'undefined' ? document : null) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll('.mg-frame, .panel-card, .account-panel, .cs-panel, .cs-confirm-box, #dialog').forEach(decorateFrame);
}
