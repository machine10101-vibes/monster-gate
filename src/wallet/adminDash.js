import { mountStaffSettings } from './staffUi.js';

/** Full-screen staff console. Admin accounts skip character select and land here. */
export function openAdminDashboard(game) {
  const root = document.getElementById('admin-dash');
  if (!root) return;
  document.getElementById('title')?.classList.add('hidden');
  document.getElementById('charselect')?.classList.add('hidden');
  root.classList.remove('hidden');
  document.body.classList.add('admin-dash');
  const who = document.getElementById('admin-who');
  if (who) who.textContent = game.wallet?.email || '';
  const host = document.getElementById('admin-staff');
  if (host) {
    host.replaceChildren();
    mountStaffSettings(host, game);
  }
  const world = document.getElementById('admin-world');
  if (world) world.classList.toggle('hidden', !game.canWorldCreator?.());
}

export function closeAdminDashboard(game) {
  const root = document.getElementById('admin-dash');
  root?.classList.add('hidden');
  document.body.classList.remove('admin-dash');
  document.getElementById('admin-staff')?.replaceChildren();
  if (game?.hud?.panelOpen) game.hud.closePanel();
}
