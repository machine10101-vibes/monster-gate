import { CHAT_PER_10S, CHAT_PER_SEC, MOVE_PER_SEC, SPEED_MAX, TELEPORT_MAX } from './protocol.js';
import { SOCIAL_PER_10S, SOCIAL_PER_SEC } from './friends.js';

/** Token bucket. `now` is ms. */
export function createBucket(ratePerSec, burst, now) {
  let tokens = burst;
  let last = now();
  return {
    take(cost = 1) {
      const t = now();
      const dt = Math.max(0, (t - last) / 1000);
      last = t;
      tokens = Math.min(burst, tokens + dt * ratePerSec);
      if (tokens < cost) return false;
      tokens -= cost;
      return true;
    },
  };
}

export function createLimiter(now = () => Date.now()) {
  const move = createBucket(MOVE_PER_SEC, MOVE_PER_SEC, now);
  const chat = createBucket(CHAT_PER_SEC, CHAT_PER_SEC, now);
  const social = createBucket(SOCIAL_PER_SEC, SOCIAL_PER_SEC, now);
  const chatWindow = [];
  const socialWindow = [];
  return {
    allowMove() {
      return move.take();
    },
    allowChat() {
      if (!chat.take()) return false;
      const t = now();
      while (chatWindow.length && t - chatWindow[0] > 10_000) chatWindow.shift();
      if (chatWindow.length >= CHAT_PER_10S) return false;
      chatWindow.push(t);
      return true;
    },
    allowSocial() {
      if (!social.take()) return false;
      const t = now();
      while (socialWindow.length && t - socialWindow[0] > 10_000) socialWindow.shift();
      if (socialWindow.length >= SOCIAL_PER_10S) return false;
      socialWindow.push(t);
      return true;
    },
  };
}

/**
 * Clamp a requested pose to the last accepted one.
 * Returns { pose, clamped, teleport }.
 */
export function applyMove(prev, next, nowMs) {
  const dt = prev.movedAt ? Math.max(0.05, Math.min(2, (nowMs - prev.movedAt) / 1000)) : 0.1;
  const dx = next.x - prev.x;
  const dz = next.z - prev.z;
  const dist = Math.hypot(dx, dz);
  if (dist > TELEPORT_MAX) {
    return { pose: { ...prev }, clamped: false, teleport: true };
  }
  const maxDist = SPEED_MAX * dt + 1.5;
  let x = next.x;
  let z = next.z;
  let clamped = false;
  if (dist > maxDist && dist > 0) {
    const s = maxDist / dist;
    x = prev.x + dx * s;
    z = prev.z + dz * s;
    clamped = true;
  }
  return {
    pose: {
      ...prev,
      x,
      y: next.y,
      z,
      yaw: next.yaw,
      move: next.move,
      anim: next.anim,
      sheath: next.sheath,
      // held, look, and armor stay on prev — the server owns appearance.
      zone: next.zone || prev.zone,
      movedAt: nowMs,
    },
    clamped,
    teleport: false,
  };
}
