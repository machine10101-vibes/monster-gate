import { QUESTS, QUEST_POINTS_TOTAL, questById } from '../data/quests.js';

const ACTIVITY_CAP = 32;

function blankQuest() {
  return { started: false, done: false, step: 0, n: 0, pages: [], unseen: false, choice: null };
}

function normalize(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const quests = {};
  if (src.quests && typeof src.quests === 'object') {
    for (const q of QUESTS) {
      const row = src.quests[q.id];
      if (!row || typeof row !== 'object') continue;
      const step = Math.max(0, Math.min(q.steps.length, row.step | 0));
      quests[q.id] = {
        started: !!row.started || !!row.done || step > 0,
        done: !!row.done || step >= q.steps.length,
        step,
        n: Math.max(0, row.n | 0),
        pages: Array.isArray(row.pages) ? row.pages.filter((p) => typeof p === 'string').slice(0, 24) : [],
        unseen: !!row.unseen,
        choice: typeof row.choice === 'string' ? row.choice : null,
      };
    }
  }
  const activity = Array.isArray(src.activity)
    ? src.activity
        .filter((a) => a && typeof a.title === 'string' && typeof a.text === 'string')
        .slice(0, ACTIVITY_CAP)
        .map((a) => ({ title: a.title.slice(0, 80), text: a.text.slice(0, 400) }))
    : [];
  return {
    quests,
    activity,
    challengeNew: Math.max(0, src.challengeNew | 0),
  };
}

/**
 * Story journal for one hunter. The pages are part of the save.
 * Gameplay calls onKill, finishTalk, and pulse. The menu only reads.
 */
export class Journal {
  constructor(progress) {
    this.progress = progress;
    this.state = normalize(null);
    this.onEvent = null;
    this.rebind();
  }

  /** Read the journal off the current hunter and open anything already earned. */
  rebind() {
    const had = this.progress.data.journal;
    this.state = normalize(had);
    this.progress.data.journal = this.state;
    let dirty = false;
    if (!this.state.quests.restless?.started) {
      this.start('restless', false);
      dirty = true;
    }
    for (const q of QUESTS) {
      if (this.status(q.id) === 'available' && this.start(q.id, false)) dirty = true;
    }
    if (dirty) this.persist(false);
  }

  persist(echo = true) {
    this.progress.data.journal = this.state;
    this.progress.save(echo);
  }

  row(id) {
    return this.state.quests[id] || null;
  }

  status(id) {
    const q = questById(id);
    if (!q) return 'locked';
    const st = this.row(id);
    if (st?.done) return 'done';
    if (st?.started) return 'active';
    if (q.requires.every((r) => this.row(r)?.done)) return 'available';
    return 'locked';
  }

  points() {
    let n = 0;
    for (const q of QUESTS) if (this.row(q.id)?.done) n += q.points;
    return { n, total: QUEST_POINTS_TOTAL };
  }

  unseenQuests() {
    return QUESTS.filter((q) => this.row(q.id)?.unseen).length;
  }

  start(id, announce = true) {
    const q = questById(id);
    if (!q || this.row(id)?.started) return null;
    if (!q.requires.every((r) => this.row(r)?.done)) return null;
    this.state.quests[id] = {
      ...blankQuest(),
      started: true,
      pages: q.opening ? [q.opening] : [],
      unseen: true,
    };
    this.log('Quest started', `${q.name}. ${q.blurb}`);
    return { toast: `New quest: ${q.name}`, hud: true, questId: id, quiet: !announce };
  }

  log(title, text) {
    this.state.activity.unshift({ title, text });
    if (this.state.activity.length > ACTIVITY_CAP) this.state.activity.length = ACTIVITY_CAP;
  }

  addPage(id, text) {
    if (!text) return;
    const st = this.row(id);
    if (!st) return;
    st.pages.push(text);
    st.unseen = true;
  }

  holds(goods) {
    return (goods || []).every((g) => this.progress.good(g.id) >= g.n);
  }

  objective(id) {
    const q = questById(id);
    const st = this.row(id);
    if (!q || !st?.started || st.done) return null;
    const step = q.steps[st.step];
    if (!step) return null;
    const total = step.kind === 'kill' ? step.count : step.kind === 'hold' ? 1 : 1;
    const n = step.kind === 'kill' ? Math.min(step.count, st.n || 0) : 0;
    return { text: step.objective, n, total, quest: q.name };
  }

  /** The line under the minimap. The guild board shows when no story step is open. */
  tracker(board) {
    for (const q of QUESTS) {
      const obj = this.objective(q.id);
      if (obj) return { text: obj.text, n: obj.n, total: obj.total };
    }
    return { text: board.text, n: board.n, total: board.total };
  }

  scriptFor(npcId) {
    for (const q of QUESTS) {
      if (this.status(q.id) !== 'active') continue;
      const step = q.steps[this.row(q.id).step];
      if (step?.kind === 'talk' && step.npc === npcId) {
        return { questId: q.id, lines: step.lines, choices: step.choices || null };
      }
    }
    return null;
  }

  finishTalk(questId, choiceId) {
    const q = questById(questId);
    const st = this.row(questId);
    if (!q || !st || st.done) return { ok: false };
    const step = q.steps[st.step];
    if (!step || step.kind !== 'talk') return { ok: false };
    if (step.deliver || step.alsoDeliver) {
      const primary = step.deliver && this.progress.good(step.deliver.id) >= step.deliver.n ? step.deliver : null;
      const alt = step.alsoDeliver && this.progress.good(step.alsoDeliver.id) >= step.alsoDeliver.n ? step.alsoDeliver : null;
      const take = primary || alt;
      if (!take) return { ok: false, blocked: true, line: step.lack };
      this.progress.takeGood(take.id, take.n);
    }
    let page = step.journal;
    if (step.choices) {
      const choice = step.choices.find((c) => c.id === choiceId) || step.choices[0];
      st.choice = choice.id;
      page = choice.journal || page;
    }
    return { ok: true, ...this.completeStep(questId, page) };
  }

  onKill(type) {
    const events = [];
    for (const q of QUESTS) {
      if (this.status(q.id) !== 'active') continue;
      const st = this.row(q.id);
      const step = q.steps[st.step];
      if (!step || step.kind !== 'kill') continue;
      if (step.exclude?.includes(type)) continue;
      if (step.types && !step.types.includes(type)) continue;
      st.n = (st.n || 0) + 1;
      const line = step.lines?.[Math.min(st.n, step.lines.length) - 1];
      if (st.n >= step.count) {
        events.push(this.completeStep(q.id, line || step.journal));
      } else if (line) {
        this.addPage(q.id, line);
        this.persist();
        events.push({ hud: true, questId: q.id });
      }
    }
    return events;
  }

  /** Visits and items already in the bag. Safe to call every few seconds. */
  pulse(pos, spots) {
    const events = [];
    for (let guard = 0; guard < 4; guard++) {
      const hit = this.autoStep(pos, spots);
      if (!hit) break;
      events.push(hit);
    }
    return events;
  }

  autoStep(pos, spots) {
    for (const q of QUESTS) {
      if (this.status(q.id) !== 'active') continue;
      const st = this.row(q.id);
      const step = q.steps[st.step];
      if (!step) continue;
      if (step.kind === 'visit') {
        const spot = spots?.[step.spot];
        if (!spot || !pos) continue;
        if (Math.hypot(pos.x - spot.x, pos.z - spot.z) <= (step.radius || 12)) {
          return this.completeStep(q.id, step.journal);
        }
      }
      if (step.kind === 'hold') {
        if (this.holds(step.goods)) return this.completeStep(q.id, step.journal);
        if (step.also && this.holds(step.also)) return this.completeStep(q.id, step.alsoJournal || step.journal);
      }
    }
    return null;
  }

  completeStep(id, page) {
    const q = questById(id);
    const st = this.row(id);
    if (page) this.addPage(id, page);
    st.step += 1;
    st.n = 0;
    st.unseen = true;
    if (st.step >= q.steps.length) {
      st.done = true;
      st.step = q.steps.length;
      this.log('Quest complete', `${q.name}. ${q.points} quest point${q.points === 1 ? '' : 's'}.`);
      const started = [];
      const follow = [];
      for (const next of QUESTS) {
        if (this.status(next.id) !== 'available') continue;
        const ev = this.start(next.id, false);
        if (ev) started.push(next.name);
      }
      this.persist();
      return {
        complete: true,
        questId: id,
        quest: q.name,
        gold: q.reward?.gold || 0,
        points: q.points,
        started,
        fanfare: true,
        banner: ['Quest complete', q.name],
        toast: started.length ? `New: ${started.join(', ')}` : `+${q.reward?.gold || 0} gold`,
        hud: true,
        follow,
      };
    }
    const obj = this.objective(id);
    this.log(q.name, obj?.text || 'The work continues.');
    this.persist();
    return { advance: true, questId: id, quest: q.name, toast: obj?.text || q.name, hud: true };
  }

  noteChallenge(rankName, count) {
    this.state.challengeNew = Math.min(9, (this.state.challengeNew || 0) + 1);
    this.log('Guild board', `The board advanced. ${rankName}. The next mark is ${count} gate creatures.`);
    this.persist();
  }

  seeQuest(id) {
    const st = this.row(id);
    if (!st?.unseen) return;
    st.unseen = false;
    this.persist(false);
  }

  seeChallenges() {
    if (!this.state.challengeNew) return;
    this.state.challengeNew = 0;
    this.persist(false);
  }

  markRead(id) {
    this.seeQuest(id);
  }
}
