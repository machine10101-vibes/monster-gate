import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PROTOCOL, TYPES, CHAT_MAX, TELEPORT_MAX,
  MAX_PAYLOAD, PRE_AUTH_BURST, PRE_AUTH_PER_SEC, CLOSE_POLICY, CLOSE_TOO_LARGE,
  parseMessage, encode, readHello, readMove, readChat, ProtocolError,
} from '../server/protocol.js';
import { applyMove, createBucket, createLimiter } from '../server/limits.js';

test('protocol envelopes require v=1 and a type', () => {
  assert.equal(PROTOCOL, 1);
  const hello = parseMessage(encode(TYPES.hello, { name: 'Ann' }));
  assert.equal(hello.type, 'hello');
  assert.equal(hello.v, 1);
  assert.throws(() => parseMessage('{"type":"hello"}'), ProtocolError);
  assert.throws(() => parseMessage('{'), ProtocolError);
  assert.throws(() => parseMessage(encode('hello', { v: 2 })), ProtocolError);
});

test('hello / move / chat validation', () => {
  const hello = readHello({ type: 'hello', v: 1, name: '  Rowan the Long-Named  ', token: 'abc' });
  assert.equal(hello.name, 'Rowan the Long-N');
  assert.equal(hello.token, 'abc');
  const move = readMove({ type: 'move', v: 1, x: 80, z: 70, yaw: 1, anim: 'attack', zone: 'Oakhollow' });
  assert.equal(move.anim, 1);
  assert.equal(move.zone, 'Oakhollow');
  const chat = readChat({ type: 'chat', v: 1, channel: 'zone', text: '  hi  ' + 'x'.repeat(200) });
  assert.equal(chat.channel, 'zone');
  assert.equal(chat.text.length, CHAT_MAX);
  assert.throws(() => readChat({ type: 'chat', v: 1, channel: 'guild', text: 'no' }), ProtocolError);
  assert.throws(() => readChat({ type: 'chat', v: 1, channel: 'world', text: '   ' }), ProtocolError);
});

test('speed is clamped and teleports are rejected', () => {
  const prev = { x: 72, y: 3, z: 72, yaw: 0, move: 0, anim: 0, held: 'blade', sheath: null, look: null, armor: {}, zone: 'Oakhollow', movedAt: 1000 };
  const far = applyMove(prev, { ...prev, x: 72 + TELEPORT_MAX + 5, z: 72 }, 1100);
  assert.equal(far.teleport, true);
  assert.equal(far.pose.x, 72);
  const dash = applyMove(prev, { ...prev, x: 90, z: 72 }, 1100);
  assert.equal(dash.teleport, false);
  assert.equal(dash.clamped, true);
  assert.ok(dash.pose.x < 90);
  assert.ok(dash.pose.x > 72);
});

test('the first move may resume the hunter wherever they logged out', () => {
  const prev = { x: 72, y: 3, z: 72.5, yaw: 0, move: 0, anim: 0, held: 'blade', sheath: null, look: null, armor: {}, zone: 'Oakhollow', movedAt: 0 };
  const back = applyMove(prev, { ...prev, x: -230, y: 12, z: -500, yaw: 1.2, zone: 'Cinderfall', resume: true, held: 'bow' }, 1100);
  assert.equal(back.teleport, false);
  assert.equal(back.pose.x, -230);
  assert.equal(back.pose.z, -500);
  assert.equal(back.pose.held, 'blade');
  assert.equal(back.pose.resumeUsed, true);
  const again = applyMove(back.pose, { ...back.pose, x: 400, z: 400, resume: true }, 2200);
  assert.equal(again.teleport, true);
  assert.equal(again.pose.x, -230);
  const read = readMove({ type: 'move', v: 1, x: -230, z: -500, resume: true });
  assert.equal(read.resume, true);
  assert.equal(readMove({ type: 'move', v: 1, x: 72, z: 72 }).resume, false);
});

test('a tome landing is accepted past the speed cap', () => {
  const prev = { x: 72, y: 3, z: 72, yaw: 0, move: 0, anim: 0, held: 'blade', sheath: null, look: null, armor: {}, zone: 'Oakhollow', movedAt: 1000 };
  const shore = applyMove(prev, { ...prev, x: -244, y: 2, z: 386.8, zone: 'Dunes', held: 'bow', look: { skin: 2 }, armor: { helm: 'x' } }, 1100);
  assert.equal(shore.teleport, false);
  assert.equal(shore.pose.x, -244);
  assert.equal(shore.pose.z, 386.8);
  assert.equal(shore.pose.held, 'blade');
  assert.equal(shore.pose.armor.helm, undefined);
  const stray = applyMove(shore.pose, { ...shore.pose, x: 400, z: 400 }, 2200);
  assert.equal(stray.teleport, true);
  assert.equal(stray.pose.x, -244);
});

test('move and chat rate limits', () => {
  let t = 0;
  const lim = createLimiter(() => t);
  let moves = 0;
  let chats = 0;
  for (let i = 0; i < 20; i++) if (lim.allowMove()) moves += 1;
  for (let i = 0; i < 10; i++) if (lim.allowChat()) chats += 1;
  assert.ok(moves <= 12);
  assert.ok(moves >= 10);
  assert.equal(chats, 2);
  t = 2000;
  assert.equal(lim.allowChat(), true);
});

test('debug and unlock flags are rejected on any frame', () => {
  assert.throws(() => parseMessage(encode('hello', { token: 'abc', debug: 1 })), (err) => err instanceof ProtocolError && err.code === 'debug');
  assert.throws(() => parseMessage(encode('move', { x: 74, z: 72, unlock: true })), (err) => err instanceof ProtocolError && err.code === 'debug');
  assert.throws(() => parseMessage(encode('chat', { channel: 'zone', text: 'hi', flags: { debug: '1' } })), (err) => err instanceof ProtocolError && err.code === 'debug');
  const ok = parseMessage(encode('hello', { token: 'abc', name: 'Ann' }));
  assert.equal(ok.type, 'hello');
});

test('applyMove keeps the server-owned held, look, and armor', () => {
  const prev = {
    x: 72, y: 3, z: 72, yaw: 0, move: 0, anim: 0,
    held: 'budgeblade', sheath: null,
    look: { skin: 2 }, armor: { helm: 'budgehelm' },
    zone: 'Oakhollow', movedAt: 1000,
  };
  const next = applyMove(prev, {
    ...prev, x: 73, z: 72.4,
    held: 'demonsword', look: { skin: 0 }, armor: { helm: 'ironhelm' },
  }, 1100);
  assert.equal(next.teleport, false);
  assert.equal(next.pose.held, 'budgeblade');
  assert.equal(next.pose.look.skin, 2);
  assert.equal(next.pose.armor.helm, 'budgehelm');
});

test('pre-auth bucket allows a short burst then refills', () => {
  assert.equal(MAX_PAYLOAD, 8192);
  assert.equal(CLOSE_POLICY, 1008);
  assert.equal(CLOSE_TOO_LARGE, 1009);
  let t = 0;
  const bucket = createBucket(PRE_AUTH_PER_SEC, PRE_AUTH_BURST, () => t);
  let allowed = 0;
  for (let i = 0; i < 20; i++) if (bucket.take()) allowed += 1;
  assert.equal(allowed, PRE_AUTH_BURST);
  t = 1000;
  assert.equal(bucket.take(), true);
});
