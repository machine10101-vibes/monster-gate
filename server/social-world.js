import { WebSocket } from 'ws';
import { encode, errorFrame } from './protocol.js';

const MAX_PARTY = 4;
const INVITE_TTL = 60_000;
const NAME_MAX = 16;
const clean = (v, n = NAME_MAX) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);
const okSocket = (s) => s?.ws?.readyState === WebSocket.OPEN;

export class SocialWorld {
  constructor(world, store = null) {
    this.world = world;
    this.store = store;
    this.parties = new Map();
    this.partyByPlayer = new Map();
    this.invites = new Map();
    this.seq = 0;
    this.inviteSeq = 0;
  }

  send(session, type, data = {}) {
    if (okSocket(session)) session.ws.send(encode(type, data));
  }
  error(session, code, message = code) {
    if (okSocket(session)) session.ws.send(errorFrame(code, message));
  }
  async rows(session) {
    if (session.guest || !this.store) throw Object.assign(new Error('Sign in to use friends.'), { code: 'auth' });
    return this.store.list(session.userId);
  }
  async blocked(a, b) {
    if (!this.store || !a || !b) return false;
    const rows = await this.store.list(a);
    return rows.some(r => r.requester_id === a && r.target_id === b && ['blocked','ignored'].includes(r.status));
  }
  onlineByUser(userId) { return this.world.byUser.get(userId) || null; }
  findOnline(ref) {
    const value = String(ref || '').trim();
    if (!value) return null;
    for (const p of this.world.players.values()) {
      if (p.id === value || p.userId === value || p.name.toLowerCase() === value.toLowerCase()) return p;
    }
    return null;
  }
  async friendList(s) {
    const rows = await this.rows(s);
    const friends = [];
    const pending_in = [];
    const pending_out = [];
    const blocked = [];
    const ignored = [];
    for (const r of rows) {
      const outgoing = r.requester_id === s.userId;
      const otherId = outgoing ? r.target_id : r.requester_id;
      const otherName = outgoing ? r.target_name : r.requester_name;
      const live = this.onlineByUser(otherId);
      const p = { user_id: otherId, id: live?.id || `u_${otherId}`, name: live?.name || otherName || 'Hunter', presence: live ? 'online' : 'offline', zone: live?.zone || '' };
      if (r.status === 'accepted') friends.push(p);
      else if (r.status === 'pending') (outgoing ? pending_out : pending_in).push(p);
      else if (r.status === 'blocked' && outgoing) blocked.push(p);
      else if (r.status === 'ignored' && outgoing) ignored.push(p);
    }
    this.send(s, 'friend_list', { friends, pending_in, pending_out, blocked, ignored });
  }
  async presence(session, online) {
    if (session.guest || !this.store) return;
    const rows = await this.store.list(session.userId).catch(() => []);
    const ids = new Set(rows.filter(r => r.status === 'accepted').map(r => r.requester_id === session.userId ? r.target_id : r.requester_id));
    for (const id of ids) {
      const friend = this.onlineByUser(id);
      if (friend) this.send(friend, 'friend_presence', {
        user_id: session.userId, id: session.id, name: session.name,
        presence: online ? 'online' : 'offline', zone: online ? session.zone : '',
      });
    }
  }
  async handle(s, m) {
    const type = m.type;
    if (type.startsWith('friend') || ['block','unblock','ignore','unignore'].includes(type)) {
      if (s.guest || !this.store) { this.error(s, 'auth', 'Sign in to use friends, blocking, and ignoring.'); return true; }
      if (!s.socialLimiter?.take()) { this.error(s, 'rate', 'Slow down.'); return true; }
      try { await this.friendAction(s, m); } catch (e) { this.error(s, e.code || 'persist', e.message || 'Could not save social change.'); }
      return true;
    }
    if (type.startsWith('party_')) {
      if (!s.socialLimiter?.take()) { this.error(s, 'rate', 'Slow down.'); return true; }
      try { await this.partyAction(s, m); } catch (e) { this.error(s, e.code || 'protocol', e.message || 'Party action failed.'); }
      return true;
    }
    if (type === 'whisper') {
      if (s.guest) { this.error(s, 'auth', 'Sign in to whisper.'); return true; }
      if (!s.limiter.allowChat()) { this.error(s, 'rate', 'Slow down.'); return true; }
      await this.whisper(s, m);
      return true;
    }
    return false;
  }
  async friendAction(s, m) {
    const rows = await this.rows(s);
    const fail = (code, msg = code) => { throw Object.assign(new Error(msg), { code }); };
    if (m.type === 'friend_list') { await this.friendList(s); return; }
    if (m.type === 'friend_request') {
      const name = clean(m.name);
      const target = this.findOnline(name);
      if (!name) return fail('name', 'Enter a hunter name.');
      if (!target || target.guest) return fail('not_found', 'No online signed-in hunter by that name.');
      if (target.userId === s.userId) return fail('self', 'That hunter is you.');
      if (await this.blocked(s.userId, target.userId) || await this.blocked(target.userId, s.userId)) return fail('blocked', 'Friend request unavailable.');
      if (rows.filter(r => r.requester_id === s.userId && ['pending','accepted'].includes(r.status)).length >= 100) return fail('full', 'Friends list is full.');
      if (rows.some(r => r.requester_id === s.userId && r.target_id === target.userId && ['pending','accepted'].includes(r.status))) return fail('pending', 'Already waiting or friends.');
      await this.store.put({ requester_id:s.userId,target_id:target.userId,status:'pending',requester_name:s.name,target_name:target.name });
      this.send(target, 'friend_request', { from:{ user_id:s.userId, id:s.id, name:s.name } });
    } else {
      const id = String(m.user_id || m.id || '');
      if (!id || id === s.userId) return fail('not_found', 'Hunter not found.');
      const find = (a,b,status) => rows.find(r => r.requester_id===a && r.target_id===b && (!status || r.status===status));
      if (m.type === 'friend_accept') {
        const req = find(id,s.userId,'pending'); if (!req) return fail('not_found','Request not found.');
        await this.store.remove(id,s.userId);
        await this.store.put({ requester_id:s.userId,target_id:id,status:'accepted',requester_name:s.name,target_name:req.requester_name });
        await this.store.put({ requester_id:id,target_id:s.userId,status:'accepted',requester_name:req.requester_name,target_name:s.name });
      } else if (m.type === 'friend_cancel') {
        if (!find(s.userId,id,'pending')) return fail('not_found','Request not found.');
        await this.store.remove(s.userId,id);
      } else if (m.type === 'friend_decline') {
        if (!find(id,s.userId,'pending')) return fail('not_found','Request not found.');
        await this.store.remove(id,s.userId);
      } else if (m.type === 'friend_remove') {
        await this.store.remove(s.userId,id); await this.store.remove(id,s.userId);
      } else if (m.type === 'block' || m.type === 'ignore') {
        await this.store.remove(s.userId,id); await this.store.remove(id,s.userId);
        await this.store.put({ requester_id:s.userId,target_id:id,status:m.type==='block'?'blocked':'ignored',requester_name:s.name,target_name:find(id,s.userId)?.requester_name || 'Hunter' });
      } else if (m.type === 'unblock' || m.type === 'unignore') {
        await this.store.remove(s.userId,id);
      }
    }
    await this.friendList(s);
    if (m.type !== 'friend_list') {
      const id = String(m.user_id || m.id || '');
      const target = this.onlineByUser(id);
      if (target && target !== s) await this.friendList(target).catch(()=>{});
    }
  }
  partyFor(s) { const id=this.partyByPlayer.get(s.id); return id ? this.parties.get(id) : null; }
  partyState(party) {
    if (!party) return { party:null };
    return { party:{ id:party.id, leader:party.leader, loot:party.loot, loot_turn:party.loot_turn, members:party.members.map(m=>({ id:m.id,user_id:m.guest?null:m.userId,name:m.name,hp:m.hp,max_hp:m.max_hp||20,zone:m.zone,online:true })) } };
  }
  broadcastParty(party) { if (party) for (const m of party.members) this.send(m,'party_state',this.partyState(party)); }
  makeParty(leader) {
    const party={ id:`pty_${++this.seq}`,leader:leader.id,loot:'round_robin',loot_turn:0,members:[leader] };
    this.parties.set(party.id,party); this.partyByPlayer.set(leader.id,party.id); return party;
  }
  async partyAction(s,m) {
    const fail=(code,msg=code)=>{throw Object.assign(new Error(msg),{code});};
    let party=this.partyFor(s);
    if (m.type==='party_invite') {
      const target=this.findOnline(m.id || m.name);
      if (!target) return fail('offline','That hunter is not online.');
      if (target===s) return fail('self','You cannot invite yourself.');
      if (this.partyByPlayer.has(target.id)) return fail('in_party','That hunter is already in a party.');
      if (party && party.leader!==s.id) return fail('not_leader','Only the leader can invite.');
      if ((party?.members.length||1)>=MAX_PARTY) return fail('full','Party is full (4).');
      if (!s.guest && !target.guest && (await this.blocked(s.userId,target.userId) || await this.blocked(target.userId,s.userId))) return fail('blocked','Party invite unavailable.');
      if (!party) party=this.makeParty(s);
      const inviteId=`pinv_${++this.inviteSeq}`;
      this.invites.set(inviteId,{ inviteId,from:s,target,expires:this.world.now()+INVITE_TTL });
      this.send(target,'party_invite',{invite_id:inviteId,from:{id:s.id,name:s.name},expires_at:this.world.now()+INVITE_TTL});
      return;
    }
    if (m.type==='party_accept' || m.type==='party_decline') {
      const inv=this.invites.get(String(m.invite_id||'')); if (!inv || inv.target!==s || this.world.now()>inv.expires) { this.invites.delete(String(m.invite_id||'')); return fail('expired','That invite expired.'); }
      this.invites.delete(inv.inviteId);
      if (m.type==='party_decline') return;
      if (this.partyFor(s)) return fail('in_party','You are already in a party.');
      const p=this.partyFor(inv.from); if (!p || p.members.length>=MAX_PARTY) return fail('full','That party is full.');
      p.members.push(s); this.partyByPlayer.set(s.id,p.id); this.broadcastParty(p); return;
    }
    if (!party) return fail('not_in_party','You are not in a party.');
    if (m.type==='party_leave' || m.type==='party_kick') {
      if (m.type==='party_kick' && party.leader!==s.id) return fail('not_leader','Only the leader can kick.');
      const target=m.type==='party_leave'?s:party.members.find(x=>x.id===String(m.id||''));
      if (!target || (m.type==='party_kick' && target===s)) return fail('not_found','Party member not found.');
      party.members=party.members.filter(x=>x!==target); this.partyByPlayer.delete(target.id);
      if (party.members.length<2) { for(const x of party.members)this.send(x,'party_state',{party:null}); this.parties.delete(party.id); }
      else { if(party.leader===target.id)party.leader=party.members[0].id; this.broadcastParty(party); }
      if (target!==s) this.send(target,'party_state',{party:null});
      return;
    }
    if (m.type==='party_promote') {
      if(party.leader!==s.id)return fail('not_leader','Only the leader can promote.');
      if(!party.members.some(x=>x.id===m.id))return fail('not_found','Party member not found.');
      party.leader=String(m.id); this.broadcastParty(party); return;
    }
    if (m.type==='party_loot') {
      if(party.leader!==s.id)return fail('not_leader','Only the leader can change loot mode.');
      if(!['round_robin','need_greed'].includes(m.loot))return fail('protocol','Unknown loot mode.');
      party.loot=m.loot; this.broadcastParty(party); return;
    }
  }
  async whisper(s,m) {
    const target=this.findOnline(m.to);
    const text=clean(m.text,120);
    if(!target || target.guest || !text){this.error(s,'whisper','Whisper target unavailable.');return;}
    if(await this.blocked(s.userId,target.userId) || await this.blocked(target.userId,s.userId)){this.error(s,'whisper','Whisper target unavailable.');return;}
    const frame={id:`c_${++this.world.chatSeq}`,channel:'whisper',from:{id:s.id,name:s.name},to:{id:target.id,name:target.name},text,at:this.world.now()};
    this.send(s,'chat',frame); this.send(target,'chat',frame);
  }
  async onMove(s) {
    const party=this.partyFor(s); if(party) this.broadcastParty(party);
  }
  async onJoin(s) {
    await this.presence(s,true).catch(()=>{});
    if (!s.guest && this.store) await this.friendList(s).catch(e=>this.error(s,e.code||'persist',e.message));
  }
  async onDrop(s) {
    await this.presence(s,false).catch(()=>{});
    for(const [id,inv] of this.invites) if(inv.from===s || inv.target===s)this.invites.delete(id);
    const p=this.partyFor(s);
    if(p){
      p.members=p.members.filter(x=>x!==s);this.partyByPlayer.delete(s.id);
      if(p.members.length<2){for(const x of p.members)this.send(x,'party_state',{party:null});this.parties.delete(p.id);}
      else {if(p.leader===s.id)p.leader=p.members[0].id;this.broadcastParty(p);}
    }
  }
}
