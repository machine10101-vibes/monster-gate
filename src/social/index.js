import { parseSocialFlags } from './constants.js';
import { MockSocial } from './mock.js';
import { MmoSocial } from './mmo.js';
import { OfflineSocial } from './offline.js';
import { SocialSession } from './session.js';
import { mountSocialHud } from './ui.js';

export { parseSocialFlags } from './constants.js';
export { splitXp, splitGold, lootWinner, nextLootTurn, needGreedResolve, clampPartySize } from './rewards.js';
export { MockSocial } from './mock.js';
export { MmoSocial } from './mmo.js';
export { SocialSession } from './session.js';
export { mountFriends } from './ui.js';

/**
 * Mount friends + party. Offline unless ?mmo=1.
 * Mock: ?mmo=1&mocksocial=1. Live: wraps game.mmo when MG Servers adds methods.
 */
export function attachSocial(game, search) {
  if (game?.social) return game.social;
  const src = search ?? (typeof location !== 'undefined' ? location.search : '');
  const flags = parseSocialFlags(src);
  const self = {
    id: 'u_you',
    name: game?.character?.name || game?.net?.name || 'Hunter',
    zone: game?.hud?.el?.area?.textContent || 'Oakhollow',
  };
  let backend;
  if (flags.mock) backend = new MockSocial({ self, autoInvite: true, autoPresence: true });
  else if (flags.live) backend = new MmoSocial({ game });
  else backend = new OfflineSocial();
  const session = new SocialSession(game, backend, flags);
  game.social = session;
  if (typeof window !== 'undefined') window.__social = session;
  session.uiOff = mountSocialHud(game);
  session.subscribe((snap, evt) => {
    if (evt?.type === 'whisper' && evt.text && game.worldView?.pushChat) {
      game.worldView.pushChat({
        channel: 'whisper',
        from: { id: snap.self?.id, name: snap.self?.name || 'Hunter' },
        to: { id: evt.to, name: evt.name },
        text: evt.text,
      });
    }
  });
  wrapGame(game, session);
  return session;
}

function wrapGame(game, session) {
  if (!game || game._socialWrapped) return;
  game._socialWrapped = true;
  const step = game.step?.bind(game);
  if (step) {
    game.step = (dt, rawDt) => {
      step(dt, rawDt);
      if (game.started) session.tick(dt);
      if (game.player?.pos && session.state?.self) {
        const area = game.hud?.el?.area?.textContent;
        if (area) session.state.self.zone = area;
      }
    };
  }
}
