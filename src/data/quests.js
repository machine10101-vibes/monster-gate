/** Starter story for Oakhollow. Steps run in order. The journal keeps the pages. */

export const QUESTS = [
  {
    id: 'restless',
    name: 'The Restless Gate',
    series: 'Oakhollow',
    kind: 'quest',
    points: 1,
    giver: 'Mira',
    requires: [],
    reward: { gold: 20 },
    blurb: 'The guild receptionist has a name on her board and a story she does not like telling.',
    opening:
      'The road into Oakhollow ends at a guild hall with a teal roof and a board of names. Mine was not on it yet. North of the houses the trees turn the wrong color, and something in that color has been keeping the receptionist at her desk past dusk.',
    steps: [
      {
        id: 'mira-ask',
        kind: 'talk',
        npc: 'guild',
        objective: 'Speak with Mira at the Hunter Guild',
        lines: [
          'You have the look of someone who has not run from the north road yet. Good. The board is short a name.',
          'The Monster Gate used to sleep. This season it does not. Things come through that were never born in these fields.',
        ],
        choices: [
          {
            id: 'lore',
            label: 'Tell me what the gate is.',
            reply: 'An old arch in the north wood. It opens onto somewhere else. We posted hunters. The hunters stopped coming back with clean reports. Walk up and see it, then come and tell me you still want the work.',
            journal:
              'Mira called it an arch in the north wood that opens onto somewhere else. The hunters she posted there have stopped coming back with clean reports. She asked me to walk up and see the gate before I put my name on the board.',
          },
          {
            id: 'blade',
            label: 'Put my name on the board.',
            reply: 'Bold, and maybe foolish, which is how most hunters start. I will write you down. First walk north and look at the gate with your own eyes. I do not send the blind.',
            journal:
              'I told Mira to put my name on the board. She did, and then she told me I was not allowed to be blind about it. The gate is north of the houses. She wants me to see it before the work begins.',
          },
        ],
      },
      {
        id: 'see-gate',
        kind: 'visit',
        spot: 'gate',
        radius: 14,
        objective: 'Walk up to the Monster Gate',
        journal:
          'The arch stands in a ring of purple fire, and the air in front of it is the wrong temperature. I could hear something moving on the far side, the way you hear a crowd through a shut door. The grass around the stones is beaten flat by things that do not leave bootprints.',
      },
      {
        id: 'mira-back',
        kind: 'talk',
        npc: 'guild',
        objective: 'Return to Mira',
        lines: [
          'You came back on your own feet. That already puts you ahead of last week\'s volunteer.',
          'The board pays for five of whatever comes through. Slimes, boars, the shades after dark. Not the chickens. The chickens were here before the gate and they have done nothing wrong.',
          'Do the five. Bring me the count. Then we will talk about the pit, and about staying alive.',
        ],
        journal:
          'Mira listened without writing anything down, which I think means she believed me. The guild will pay for five creatures from the gate. Chickens do not count. She said the pit comes after, and so does staying alive.',
      },
    ],
  },
  {
    id: 'board',
    name: 'Five for the Board',
    series: 'Oakhollow',
    kind: 'quest',
    points: 2,
    giver: 'Mira',
    requires: ['restless'],
    reward: { gold: 30 },
    blurb: 'The guild pays for five gate creatures. The chickens are not invited.',
    opening:
      'Five marks on a board, and a receptionist who will not count a chicken among them. The gate is north. The things it sends are already in the grass.',
    steps: [
      {
        id: 'slay-five',
        kind: 'kill',
        exclude: ['chicken'],
        count: 5,
        objective: 'Slay 5 gate creatures',
        lines: [
          'The first one is down. My hands are still deciding whether to shake.',
          'Two. The guild board looks shorter from this side of the fight.',
          'Three. Whatever is sending them has not noticed me yet, or it has and does not care.',
          'Four. The grass here remembers every fight. I am trying not to add my own shape to it.',
          'Five. I can go back to Mira with a number she will write in ink.',
        ],
      },
      {
        id: 'report',
        kind: 'talk',
        npc: 'guild',
        objective: 'Report the five to Mira',
        lines: [
          'Five. I will mark the board, and I will pay you what the guild promised.',
          'There is a smith on the rim of Greyrock Pit, just outside town. Bram. He moved the forge out of the square so the ore would not have to walk so far.',
          'Take him the copper from the pit. One lump, smelted into a bar. A hunter with no plate is a story I am tired of telling.',
        ],
        journal:
          'Mira marked the board and paid the guild\'s price. She sent me to Bram. He has moved the forge to the rim of Greyrock Pit, and she wants a copper bar in my hands before she will call me equipped.',
      },
    ],
  },
  {
    id: 'pit',
    name: 'Copper from the Pit',
    series: 'Oakhollow',
    kind: 'quest',
    points: 2,
    giver: 'Bram',
    requires: ['board'],
    reward: { gold: 25 },
    blurb: 'Bram works the forge on the south rim of Greyrock Pit. He wants a copper bar, not a promise.',
    opening:
      'Mira\'s directions were plain. East out of the houses, the ground rises into a ring of stone, and the ring has a hole in it. The smith is on the south lip, with the town at his back and the ore at his feet.',
    steps: [
      {
        id: 'meet-bram',
        kind: 'talk',
        npc: 'smith',
        objective: 'Speak with Bram at Greyrock Pit',
        lines: [
          'Mira sends me the ones who have already bled a little. You qualify.',
          'The pit is the round hole behind me. The orange rocks are copper. Hit one until it gives.',
          'Bring the ore to the smithy door and smelt a copper bar. Then come back and show me the bar. I will not take it. A smith who keeps the first bar is a thief.',
        ],
        journal:
          'Bram stands by a forge on the rim, close enough to the pit that the ore is still warm in the story he tells. He wants one copper ore, smelted at the smithy into a bar, and he says he will not take the bar from me.',
      },
      {
        id: 'ore',
        kind: 'hold',
        goods: [
          { id: 'copper_ore', n: 1 },
        ],
        also: [{ id: 'copper_bar', n: 1 }],
        alsoJournal:
          'I already had a copper bar in the bag. Bram\'s rocks can wait. The smithy has done this work once, and the bar is the part he asked to see.',
        objective: 'Mine 1 copper ore',
        journal:
          'The pit floor is gravel and old stone, and the orange rocks give up their color if you hit them long enough. I have copper. The smithy door is on the rim above me.',
      },
      {
        id: 'bar',
        kind: 'hold',
        goods: [{ id: 'copper_bar', n: 1 }],
        also: [{ id: 'iron_bar', n: 1 }],
        alsoJournal:
          'I already had an iron bar from the old copper-and-tin recipe. Bram asked to see a bar, and this one still counts.',
        objective: 'Smelt a copper bar at the smithy',
        journal:
          'The hearth took the ore and gave back one bar, orange and heavy. It looks too simple for the trouble, which is what Bram said copper always looks like.',
      },
      {
        id: 'show-bar',
        kind: 'talk',
        npc: 'smith',
        objective: 'Show the copper bar to Bram',
        lines: [
          'That is a true bar. Keep it. Armor and blades both start there, and so do arrowheads if you ever decide to be clever.',
          'The forge beside me will shape it when you are ready. Monster parts, too, if the gate gives you any. I hammer what you bring. I do not hunt.',
        ],
        journal:
          'Bram turned the bar in the light and gave it back. The forge next to him will make it into a blade or a plate when I ask. He hunts nothing himself. He only keeps the people who do from breaking.',
      },
    ],
  },
  {
    id: 'lira',
    name: "Lira's Quiet Shelf",
    series: 'Oakhollow',
    kind: 'miniquest',
    points: 1,
    giver: 'Lira',
    requires: ['pit'],
    reward: { gold: 15 },
    blurb: 'The alchemist on the south road wants a feather and will not say why until she has it.',
    opening:
      'South of the well, a stall smells like crushed leaves and hot glass. Lira sells draughts to hunters and does not enjoy being hurried.',
    steps: [
      {
        id: 'lira-ask',
        kind: 'talk',
        npc: 'alchemist',
        objective: 'Speak with Lira on the south road',
        lines: [
          'You smell like ore and gate-smoke. Sit nowhere near the philters.',
          'I am short a feather. A plain chicken feather, the kind the road-birds drop when they are offended. Bring me one and I will tell you why the shelf has been quiet.',
        ],
        journal:
          'Lira would not stand near me until the ore-smell faded. She wants a chicken feather, and she says the reason is on the other side of the errand.',
      },
      {
        id: 'feather',
        kind: 'hold',
        goods: [{ id: 'feather', n: 1 }],
        objective: 'Pluck a feather from a chicken',
        journal:
          'The chicken objected, then remembered it is a chicken, and left a feather in my hand. Lira\'s stall is back on the south road.',
      },
      {
        id: 'lira-give',
        kind: 'talk',
        npc: 'alchemist',
        objective: 'Bring the feather to Lira',
        deliver: { id: 'feather', n: 1 },
        lack: 'That is a hand, not a feather. The white birds by the fences will donate one if you insist.',
        lines: [
          'Good. The quiet on that shelf was a draught that would not take. Feathers remind the mixture which way is up.',
          'Healing draughts for the cuts. Spirit philters for the bolt. Buy them when you are bleeding, not after. I dislike eulogies. They take so long.',
        ],
        journal:
          'Lira took the feather as if it were a tool and not a joke. The quiet shelf was a draught that would not settle. She sells healing when I am cut and spirit when the bolt runs dry, and she would like me to buy them before the eulogy.',
      },
    ],
  },
  {
    id: 'fence',
    name: "Tobin's Fence",
    series: 'Oakhollow',
    kind: 'quest',
    points: 2,
    giver: 'Old Tobin',
    requires: ['pit'],
    reward: { gold: 25 },
    blurb: 'Slimes have found the wheat. The farmer has found the end of his patience.',
    opening:
      'Old Tobin keeps a red tunic and a field that used to be only wheat. Something green has been hopping the fence, and the wheat is taking it personally.',
    steps: [
      {
        id: 'tobin-ask',
        kind: 'talk',
        npc: 'farmer',
        objective: 'Speak with Old Tobin',
        lines: [
          'If you are here to tell me the slimes are harmless, the wheat would like a word.',
          'They come from the gate and they bounce until they find a warm place. My field is warm. Three of them. I am not particular about the color, so long as they stop landing in the rows.',
        ],
        journal:
          'Tobin talks to the wheat more kindly than he talks to hunters. Three slimes have been using his field as a landing. He does not care if they are the green ones or the gate-glow ones. He cares that they stop.',
      },
      {
        id: 'slimes',
        kind: 'kill',
        types: ['slime', 'voidslime'],
        count: 3,
        objective: 'Slay 3 slimes',
        lines: [
          'One slime fewer, and the fence looks a little taller.',
          'Two. They burst like bad fruit and then the ground pretends nothing happened.',
          'Three. Tobin can have his rows back.',
        ],
      },
      {
        id: 'tobin-back',
        kind: 'talk',
        npc: 'farmer',
        objective: 'Tell Old Tobin the field is clear',
        lines: [
          'Three. I will believe you when the rows stay empty until supper, and I will pay you now because I am old and impatient.',
          'If they come back I will be here. The wheat is not going anywhere. That is the trouble with wheat.',
        ],
        journal:
          'Tobin paid me before supper and said he would believe the field was safe when the field agreed. The slimes may come back. He will still be by the fence. Wheat, he says, is not famous for leaving.',
      },
    ],
  },
  {
    id: 'shiny',
    name: "Pip's Shiny Stone",
    series: 'Oakhollow',
    kind: 'miniquest',
    points: 1,
    giver: 'Pip',
    requires: ['pit'],
    reward: { gold: 10 },
    blurb: 'The apprentice wants a stone from the pit and will not be talked out of it.',
    opening:
      'Pip is smaller than his opinions. He has decided that hunters bring back shiny things, and he has decided that I am a hunter.',
    steps: [
      {
        id: 'pip-ask',
        kind: 'talk',
        npc: 'child',
        objective: 'Speak with Pip',
        lines: [
          'You went to the gate. I saw the way you walked back. That is a gate-walk.',
          'Bring me a shiny stone from the pit. The orange ones. Bram says they are ore and I say they are treasure, and I am right until he is looking.',
        ],
        journal:
          'Pip has appointed me a hunter and given me a quest he invented. He wants an orange stone from Greyrock Pit. Bram calls it ore. Pip calls it treasure whenever Bram is not in earshot.',
      },
      {
        id: 'pip-ore',
        kind: 'hold',
        goods: [{ id: 'copper_ore', n: 1 }],
        objective: 'Get a copper ore for Pip',
        journal:
          'The pit gave up an orange stone. Pip is somewhere near the square, being shorter than the stalls and louder than them.',
      },
      {
        id: 'pip-give',
        kind: 'talk',
        npc: 'child',
        objective: 'Give the copper ore to Pip',
        deliver: { id: 'copper_ore', n: 1 },
        lack: 'That is not shiny enough. The orange rocks in the pit. Bram pretends they are for hammers.',
        lines: [
          'It is warm. I am going to keep it in the pocket that does not have holes. Thank you for not telling Bram it was treasure.',
          'When I am tall I will go through the gate and bring you something better. Do not tell Mira I said tall. She will measure me.',
        ],
        journal:
          'Pip put the ore in the pocket he trusts and made me promise not to call it ore in front of Bram. He intends to cross the gate when he is tall. He also intends for Mira not to measure him.',
      },
    ],
  },
  {
    id: 'mark',
    name: "The Guild's Mark",
    series: 'Oakhollow',
    kind: 'quest',
    points: 2,
    giver: 'Mira',
    requires: ['lira', 'fence', 'shiny'],
    reward: { gold: 40 },
    blurb: 'Mira keeps one more conversation for hunters who have walked the whole town.',
    opening:
      'The pit, the field, the stall, and the boy with the ore in his pocket. Mira has been counting those errands the way she counts bodies on the board.',
    steps: [
      {
        id: 'mira-mark',
        kind: 'talk',
        npc: 'guild',
        objective: 'Speak with Mira at the guild',
        lines: [
          'Bram says you can hold a bar. Lira says you can follow a strange instruction. Tobin says the wheat survived you. Pip says you are tall, which I am choosing to ignore.',
          'This is the mark. Not a medal. A note on the board that you came back from more than one kind of work.',
          'The gate is still open. The board will keep a number on it. When that number gets heavy, you already know the pit, the forge, and the woman who sells the things that keep you standing.',
        ],
        journal:
          'Mira called it a mark, not a medal: a note that I came back from more than one kind of work. The gate is still open. The board will keep its number. I know where the iron is, and who sells the draughts, and which fence the slimes prefer. That is the whole of the starter town, and it is enough to leave it on purpose.',
      },
    ],
  },
  {
    id: 'deepdig',
    name: 'The Deep Dig',
    series: 'Oakhollow',
    kind: 'miniquest',
    points: 1,
    giver: 'Bram',
    requires: ['pit'],
    reward: { gold: 35 },
    blurb: 'Greyrock is copper. Bram wants iron from the hole they call Deepwell.',
    opening:
      'Bram has one more errand once the first bar is in your hands. The pit behind him is the starter hole. South of Southford, the desert has a bigger one, and the rocks there are not orange.',
    steps: [
      {
        id: 'deep-ask',
        kind: 'talk',
        npc: 'smith',
        objective: 'Ask Bram about the Deepwell dig',
        lines: [
          'Greyrock is copper. That is how a hunter starts. It is not how a hunter finishes.',
          'South of Southford the dunes open into a pit they call Deepwell. Iron, then coal, then mithril and adamite if you live long enough to swing at them.',
          'Bring me one iron ore from that hole. I will not take it. I want to know you found the place.',
        ],
        journal:
          'Bram sent me south of Southford, into the desert pit called Deepwell. He wants one iron ore from those rocks. Copper will not count.',
      },
      {
        id: 'iron-ore',
        kind: 'hold',
        goods: [{ id: 'iron_ore', n: 1 }],
        objective: 'Mine 1 iron ore at Deepwell',
        journal:
          'The Deepwell rocks gave up a rust-brown lump. Bram is still on the rim of Greyrock, pretending he does not care whether I found the way.',
      },
      {
        id: 'show-iron',
        kind: 'talk',
        npc: 'smith',
        objective: 'Show Bram the iron ore',
        lines: [
          'That is iron. Heavy, ugly, and honest. Smelt it here if you want another bar, or take coal from the same pit and make steel.',
          'The blue rocks are mithril. The green ones are adamite. Titanium lives in Cinderfall, platinum on Glimmerfrost. They will not open for a pick until your arms remember the work.',
        ],
        journal:
          'Bram turned the iron ore and gave it back. Deepwell also holds coal, mithril and adamite, each behind a higher Mining level. Titanium is in Cinderfall, platinum on Glimmerfrost. The smithy will take whatever I bring.',
      },
    ],
  },
  {
    id: 'burntpan',
    name: "Lira's Burnt Pan",
    series: 'Oakhollow',
    kind: 'miniquest',
    points: 1,
    giver: 'Lira',
    requires: ['lira'],
    reward: { gold: 20 },
    blurb: 'The alchemist wants a shrimp off the fire, cooked or ruined. She is collecting data.',
    opening:
      'Lira has decided that hunters who can follow a strange instruction can also follow a fire. She wants a shrimp from Mirrormere, put on a campfire, and she will take it whether it comes out gold or black.',
    steps: [
      {
        id: 'pan-ask',
        kind: 'talk',
        npc: 'alchemist',
        objective: 'Speak with Lira about the fire',
        lines: [
          'The feather settled. The next quiet on that shelf is a draught that hates guesswork.',
          'Net a shrimp at Mirrormere. Light a fire. Cook it. If you burn it I will still take it. I am measuring the difference, not your pride.',
        ],
        journal:
          'Lira wants a shrimp cooked on a campfire. A burnt shrimp still counts. She is measuring the difference, she says, not my pride.',
      },
      {
        id: 'cooked',
        kind: 'hold',
        goods: [{ id: 'cooked_shrimp', n: 1 }],
        also: [{ id: 'burnt_shrimp', n: 1 }],
        alsoJournal:
          'I burnt the shrimp. Lira said that still counted. The stall on the south road is waiting for the black one as cheerfully as it would have waited for the gold one.',
        objective: 'Cook a shrimp on a campfire',
        journal:
          'The fire took the shrimp and gave it back cooked. Lira\'s stall is on the south road, and she asked for this on purpose.',
      },
      {
        id: 'pan-give',
        kind: 'talk',
        npc: 'alchemist',
        objective: 'Bring Lira a cooked or burnt shrimp',
        deliver: { id: 'cooked_shrimp', n: 1 },
        alsoDeliver: { id: 'burnt_shrimp', n: 1 },
        lack: 'That is not a shrimp from the fire. Net one at the lake, cook it, and try not to look so wounded if it burns.',
        lines: [
          'Good. Gold or charcoal, the shelf has its sample. Hunters who never burn anything are lying, or they are not cooking.',
          'Eat the rest yourself. A cooked catch heals more than a raw one. A burnt catch heals nothing, and it still taught the fire your name.',
        ],
        journal:
          'Lira took the shrimp as a sample and told me to eat the rest. Cooked fish heal more than raw. Burnt fish teach the fire your name and still count as cooking practice.',
      },
    ],
  },
  {
    id: 'keepassault',
    name: 'The Eternal War',
    series: 'Embergate',
    kind: 'quest',
    points: 3,
    giver: 'Mira',
    requires: ['mark'],
    reward: { gold: 70, gear: 'ashenbrand' },
    blurb: 'Hellspire and Dawnspire have spilled their war onto the Endless Field. Mira wants a hunter who can walk both courtyards and put the Warden down.',
    opening:
      'The board in the guild hall has a new name on it that is not a slime. Mira has been reading reports from the north pass: black iron at one keep, white gold at the other, and something between them that answers to both.',
    steps: [
      {
        id: 'war-ask',
        kind: 'talk',
        npc: 'guild',
        objective: 'Speak with Mira about the keeps',
        lines: [
          'The north pass is not a pasture. Ashen Road climbs into a wasteland the guild maps as Embergate.',
          'Hellspire is the Demon Knight\'s fortress. Dawnspire is the Holy Knight\'s castle. They have been at this longer than Oakhollow has had a name.',
          'Walk both courtyards. Put down the knights that will let you. Then stand in the field between them. The Warden waits there. If you come back with the brand it carries, the board will believe you.',
        ],
        journal:
          'Mira sent me north through Ashen Road. Hellspire first, then Dawnspire, then the Endless Field between them. The Keep Warden carries a brand she wants on the board.',
      },
      {
        id: 'see-hell',
        kind: 'visit',
        spot: 'hellspire',
        radius: 28,
        objective: 'Enter the courtyard of Hellspire',
        journal:
          'Hellspire is a mouth of black iron. The courtyard smells like old heat. The knights on the posts did not look surprised to see a hunter from the south.',
      },
      {
        id: 'kill-demon',
        kind: 'kill',
        types: ['demonknight'],
        count: 2,
        objective: 'Slay 2 Demon Knights at Hellspire',
        journal:
          'Two of the black knights went down. The keep did not. I still had the white castle west of the field to walk, and Mira does not take half a report.',
      },
      {
        id: 'see-dawn',
        kind: 'visit',
        spot: 'dawnspire',
        radius: 28,
        objective: 'Enter the courtyard of Dawnspire',
        journal:
          'Dawnspire is white stone and blue fire. The courtyard is quieter than Hellspire and somehow worse for it. The Holy Knights watch the same war from the other side.',
      },
      {
        id: 'kill-holy',
        kind: 'kill',
        types: ['holyknight'],
        count: 2,
        objective: 'Slay 2 Holy Knights at Dawnspire',
        journal:
          'Two of the white knights fell. The field between the keeps is a grave of banners. That is where Mira said the Warden would be.',
      },
      {
        id: 'see-field',
        kind: 'visit',
        spot: 'warfield',
        radius: 22,
        objective: 'Stand on the Endless Field',
        journal:
          'The Endless Field is swords in the ash, two colours of banner, and a knight in mixed plate that does not belong to either keep. It was waiting.',
      },
      {
        id: 'kill-warden',
        kind: 'kill',
        types: ['keepwarden'],
        count: 1,
        objective: 'Defeat the Keep Warden',
        journal:
          'The Warden used both keeps\' tricks: a hammer of light and a line of hellfire. It went down harder than a posted knight and cleaner than a dragon. The brand it carried is ugly, honest steel.',
      },
      {
        id: 'war-back',
        kind: 'talk',
        npc: 'guild',
        objective: 'Return to Mira with the report',
        lines: [
          'You walked both keeps and the dirt between them. That is more than most names on this board will ever do.',
          'Keep the brand. It is not dusk steel and it is not a starter hammer. It is what a hunter carries after the war has looked at them.',
          'The knights will still be there tomorrow. The Warden too. The board does not need you to end eternity. It needed you to stand in it.',
        ],
        journal:
          'Mira took the report and left me the brand. Hellspire and Dawnspire are still at war. The guild board has a name that has been to both courtyards.',
      },
    ],
  },
  ...skillQuests(),
];

export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

export const QUEST_POINTS_TOTAL = QUESTS.reduce((n, q) => n + q.points, 0);

/** Display-name → NPC def id. Used when a quest lists a giver but no giverNpc. */
export const QUEST_GIVER_NPC = {
  Mira: 'guild',
  Bram: 'smith',
  Lira: 'alchemist',
  'Old Tobin': 'farmer',
  Pip: 'child',
};

export const QUEST_MARK_OFFER = 'offer';
export const QUEST_MARK_STEP = 'step';

export function questById(id) {
  return QUEST_BY_ID[id] || null;
}

/** NPC id the gold ! sits on while this quest is available / first talk. */
export function questGiverNpc(q) {
  if (!q) return '';
  if (q.giverNpc) return q.giverNpc;
  if (q.giver && QUEST_GIVER_NPC[q.giver]) return QUEST_GIVER_NPC[q.giver];
  const talk = (q.steps || []).find((s) => s.kind === 'talk');
  return talk?.npc || '';
}

/**
 * One quest per mining unlock after iron, then the skill cap,
 * and one per fishing catch after shrimp, then the skill cap.
 * A level step sits in front of the held good so a bought ore
 * cannot finish the tier, and the good cannot finish it early.
 */
function skillQuests() {
  const mine = (spec) => ladder('mining', 'Mining', 'Bram', 'smith', spec);
  const fish = (spec) => ladder('fishing', 'Fishing', 'Lira', 'alchemist', spec);
  return [
    mine({
      id: 'coalbed',
      name: 'Coal for the Fire',
      requires: ['deepdig'],
      level: 30,
      good: 'coal',
      spot: 'deepwell',
      radius: 28,
      gold: 35,
      blurb: 'Black rock in the Deepwell. Mining 30.',
      opening: 'Bram wants coal from the Deepwell. The black rock does not break until Mining is 30.',
      where: 'Stand at the Deepwell pit',
      hold: 'Carry a lump of coal',
      ask: [
        'Iron is a start. Steel is iron and coal, and the coal is south, in the Deepwell under the dunes.',
        'The black rock will not give until the pick is at Mining 30. Iron in that same pit still trains you. Bring me one lump.',
      ],
      askJournal: 'Bram sent me south to the Deepwell for coal. Mining 30 opens the black rock.',
      goJournal: 'The Deepwell pit is cut into the sand. Coal sits on the floor with the iron.',
      levelJournal: 'Mining 30. The coal rock will break now. Iron in the same pit was the way up.',
      holdJournal: 'A lump of coal is in the bag.',
      back: [
        'That burns clean. Steel is one iron and one of these.',
        'Deeper in that same pit the rock turns blue. Mithril. It waits for Mining 45.',
      ],
      backJournal: 'Bram took the news of the coal and named the blue seam under it. Mithril, at Mining 45.',
    }),
    mine({
      id: 'mithrilvein',
      name: 'The Blue Seam',
      requires: ['coalbed'],
      level: 45,
      good: 'mithril_ore',
      spot: 'deepwell',
      radius: 28,
      gold: 45,
      blurb: 'Mithril under the coal. Mining 45.',
      opening: 'The blue rock in the Deepwell is mithril. It waits for Mining 45.',
      where: 'Return to the Deepwell pit',
      hold: 'Carry a mithril ore',
      ask: [
        'Past the coal the floor turns blue. That is mithril.',
        'Mining 45. Coal and iron in the pit still pay the levels if the blue rock will not break. Bring one ore, unsmelted.',
      ],
      askJournal: 'Bram wants one mithril ore from the Deepwell. Mining 45 opens the blue rock.',
      goJournal: 'Back at the Deepwell. The blue seam is in the pit floor.',
      levelJournal: 'Mining 45. The mithril rock will give ore now.',
      holdJournal: 'A mithril ore is in the bag.',
      back: [
        'Blue, and heavy for its size. Leave it as ore until you mean to smelt it.',
        'The deepest rock in that pit is green. Adamite. Mining 60.',
      ],
      backJournal: 'Bram named the green rock at the bottom of the Deepwell. Adamite, at Mining 60.',
    }),
    mine({
      id: 'adamitevein',
      name: 'Green in the Dark',
      requires: ['mithrilvein'],
      level: 60,
      good: 'adamite_ore',
      spot: 'deepwell',
      radius: 28,
      gold: 60,
      blurb: 'Adamite at the bottom of the Deepwell. Mining 60.',
      opening: 'Adamite is the green rock at the bottom of the Deepwell. Mining 60.',
      where: 'Stand at the bottom of the Deepwell',
      hold: 'Carry an adamite ore',
      ask: [
        'The last rock in the Deepwell is green. Adamite. Mining 60.',
        'The blue and the black still train the pick on the way down. Bring one green ore.',
      ],
      askJournal: 'Bram wants adamite from the bottom of the Deepwell. Mining 60.',
      goJournal: 'The bottom of the Deepwell. The green rock is the last one this pit keeps.',
      levelJournal: 'Mining 60. Adamite will break.',
      holdJournal: 'An adamite ore is in the bag.',
      back: [
        'That is the end of the sand pit. The next metal is not here.',
        'Cinderfall, in the smoke west of town. The white rocks are titanium. Mining 75. The slope is steep and a dragon nests on it.',
      ],
      backJournal: 'The Deepwell is finished. Titanium is the white rock in Cinderfall, at Mining 75.',
    }),
    mine({
      id: 'cindermetal',
      name: 'White in the Smoke',
      requires: ['adamitevein'],
      level: 75,
      good: 'titanium_ore',
      spot: 'cinderfall',
      radius: 18,
      gold: 80,
      blurb: 'Titanium on the Cinderfall slope. Mining 75.',
      opening: 'Titanium is the white rock on the Cinderfall slope. Mining 75.',
      where: 'Find the titanium rocks in Cinderfall',
      hold: 'Carry a titanium ore',
      ask: [
        'Leave the sand. Cinderfall is west, under the ash. White rocks on the slope, not the black glass.',
        'Mining 75. Adamite will carry you most of the way. Bring one titanium ore, and do not pick a fight with the dragon unless you mean it.',
      ],
      askJournal: 'Bram sent me to the white rocks on the Cinderfall slope. Titanium, at Mining 75.',
      goJournal: 'The white rocks are in the smoke on the Cinderfall slope.',
      levelJournal: 'Mining 75. The white rock will give titanium.',
      holdJournal: 'A titanium ore is in the bag.',
      back: [
        'White, and it rings. That is the metal the ash country keeps.',
        'One seam is left, and it is north on the ice. Platinum. Bright against the snow. Mining 90.',
      ],
      backJournal: 'Titanium is done. The last ore is platinum on the Glimmerfrost ice, at Mining 90.',
    }),
    mine({
      id: 'frostmetal',
      name: 'Bright on the Ice',
      requires: ['cindermetal'],
      level: 90,
      good: 'platinum_ore',
      spot: 'platinum',
      radius: 18,
      gold: 100,
      blurb: 'Platinum on the Glimmerfrost ice. Mining 90.',
      opening: 'Platinum is the bright rock on the Glimmerfrost ice. Mining 90. It is the last ore.',
      where: 'Find a platinum seam in Glimmerfrost',
      hold: 'Carry a platinum ore',
      ask: [
        'Glimmerfrost. The rock that shines against the snow is platinum. There is no ore after it.',
        'Mining 90. Titanium will train you until the bright rock gives. Bring one ore.',
      ],
      askJournal: 'Bram wants platinum from a bright seam on the Glimmerfrost ice. Mining 90.',
      goJournal: 'A platinum seam on the ice. The rock is bright against the snow.',
      levelJournal: 'Mining 90. Platinum will break. It is the last ore.',
      holdJournal: 'A platinum ore is in the bag.',
      back: [
        'That is the last metal I can name. The rock still pays, but nothing new comes out of it.',
        'Take the pick to Mining 99 on that same seam. The guild marks a pick that has gone all the way.',
      ],
      backJournal: 'Platinum is the last ore. Bram wants the pick taken to Mining 99 on that seam.',
    }),
    mine({
      id: 'minecap',
      name: 'The Pick Remembers',
      requires: ['frostmetal'],
      level: 99,
      points: 3,
      gold: 150,
      blurb: 'No richer rock. Mining 99.',
      opening: 'There is no ore past platinum. The bright rock on the ice still pays the pick, all the way to Mining 99.',
      ask: [
        'Nothing left to find. Platinum is the end of the seams.',
        'Stay on that bright rock until Mining is 99. Then come back. I want to see the pick that did it.',
      ],
      askJournal: 'Bram wants Mining at 99. Platinum on the ice is the rock that still pays.',
      levelJournal: 'Mining 99. The pick has gone as far as it goes.',
      back: [
        'Ninety-nine. The head of that pick is the same iron. The arm is not.',
        'I have no further seam. Swing it where you like.',
      ],
      backJournal: 'Bram looked at the pick and had no further rock to name. Mining is 99.',
    }),
    fish({
      id: 'troutline',
      name: 'A Pole on the Lake',
      requires: ['burntpan'],
      level: 3,
      good: 'trout',
      spot: 'lake',
      radius: 16,
      gold: 20,
      blurb: 'Trout from the Mirrormere dock. Fishing 3.',
      opening: 'Shrimp take a net. Trout take a pole, off the same dock. Fishing 3.',
      where: 'Stand on the Mirrormere dock',
      hold: 'Carry a trout',
      ask: [
        'The net was the shrimp. Trout will not sit in a net.',
        'Buy a pole, or use the one you have, and stand on the Mirrormere dock. Fishing 3. Shrimp still count toward it. Bring me a trout.',
      ],
      askJournal: 'Lira wants a trout from the Mirrormere dock. A pole, and Fishing 3.',
      goJournal: 'On the Mirrormere dock. The pole spots are the blue rings.',
      levelJournal: 'Fishing 3. Trout will bite on the pole.',
      holdJournal: 'A trout is in the bag.',
      back: [
        'A proper fish. The lake does not get better than that.',
        'South of town the Silverrun cuts a bank. A net there takes pikeminnow. Fishing 8.',
      ],
      backJournal: 'Lira sent me to the Silverrun with a net. Pikeminnow, at Fishing 8.',
    }),
    fish({
      id: 'silverminnow',
      name: 'Minnows in the Silverrun',
      requires: ['troutline'],
      level: 8,
      good: 'pikeminnow',
      spot: 'river',
      radius: 80,
      gold: 25,
      blurb: 'Pikeminnow from the Silverrun. Fishing 8.',
      opening: 'The Silverrun, south of town, takes a net. Pikeminnow. Fishing 8.',
      where: 'Stand on the Silverrun bank',
      hold: 'Carry a pikeminnow',
      ask: [
        'Leave the lake. The river south of Oakhollow is the Silverrun. Fish it from the east bank.',
        'A net, not the pole. Fishing 8. Trout will carry the levels if the river is stubborn. Bring a pikeminnow.',
      ],
      askJournal: 'Lira wants a pikeminnow from the Silverrun. A net, and Fishing 8.',
      goJournal: 'The east bank of the Silverrun. The net spots are the warm rings over the water.',
      levelJournal: 'Fishing 8. The river net will take pikeminnow.',
      holdJournal: 'A pikeminnow is in the bag.',
      back: [
        'Small, and all fight. The river has a better fish.',
        'Same bank, with the pole. Salmon. Fishing 12.',
      ],
      backJournal: 'The next fish is salmon, on the same bank, with a pole. Fishing 12.',
    }),
    fish({
      id: 'salmonrun',
      name: 'The Silver Fish',
      requires: ['silverminnow'],
      level: 12,
      good: 'salmon',
      spot: 'river',
      radius: 80,
      gold: 30,
      blurb: 'Salmon from the Silverrun. Fishing 12.',
      opening: 'Salmon take a pole on the Silverrun. Fishing 12.',
      where: 'Stand on the Silverrun bank with a pole in mind',
      hold: 'Carry a salmon',
      ask: [
        'Back to the east bank. The pole spots, not the nets.',
        'Salmon. Fishing 12. The minnows still pay the line on the way. Bring one salmon.',
      ],
      askJournal: 'Lira wants a salmon from a pole spot on the Silverrun. Fishing 12.',
      goJournal: 'Back on the Silverrun bank. The pole spots are the blue rings.',
      levelJournal: 'Fishing 12. Salmon will take the pole.',
      holdJournal: 'A salmon is in the bag.',
      back: [
        'That is the river finished. The sea is a different animal.',
        'The pirate shore has a long dock. Tuna run under it. Fishing 18.',
      ],
      backJournal: 'The river is done. Tuna are off the pirate dock, at Fishing 18.',
    }),
    fish({
      id: 'tunadock',
      name: 'Off the Pirate Dock',
      requires: ['salmonrun'],
      level: 18,
      good: 'tuna',
      spot: 'pirate',
      radius: 22,
      gold: 40,
      blurb: 'Tuna off the pirate fishing dock. Fishing 18.',
      opening: 'The long pier at the pirate shore reaches tuna water. Fishing 18.',
      where: 'Stand on the pirate fishing dock',
      hold: 'Carry a tuna',
      ask: [
        'South and west, where the jungle meets the sea. The long pier, the one with the platform, not the ship mooring.',
        'A pole. Tuna. Fishing 18. Salmon will train you until the sea pays. Bring one.',
      ],
      askJournal: 'Lira wants a tuna from the long pier at the pirate shore. Fishing 18.',
      goJournal: 'The fishing platform on the pirate pier. Deep water on three sides.',
      levelJournal: 'Fishing 18. Tuna will bite off the pier.',
      holdJournal: 'A tuna is in the bag.',
      back: [
        'Heavy. The sea will get stranger, but the next fish is not in it.',
        'Glimmerfrost cuts holes in the lake ice. Pike wait under them. Fishing 20.',
      ],
      backJournal: 'Tuna is done. Pike are under the ice holes in Glimmerfrost, at Fishing 20.',
    }),
    fish({
      id: 'icepike',
      name: 'Through the Ice',
      requires: ['tunadock'],
      level: 20,
      good: 'pike',
      spot: 'icehole',
      radius: 16,
      gold: 45,
      blurb: 'Pike under the Glimmerfrost ice. Fishing 20.',
      opening: 'Pike sit under the holes cut in the Glimmerfrost ice. Fishing 20.',
      where: 'Stand at an ice hole in Glimmerfrost',
      hold: 'Carry a pike',
      ask: [
        'North, on the ice. Someone cut two holes in the frozen lake. Fish those, not the open sea.',
        'A pole. Pike. Fishing 20. Bring one before it thaws in your bag.',
      ],
      askJournal: 'Lira wants a pike from an ice hole in Glimmerfrost. Fishing 20.',
      goJournal: 'A hole in the Glimmerfrost ice. The water under it is black.',
      levelJournal: 'Fishing 20. Pike will rise in the ice hole.',
      holdJournal: 'A pike is in the bag.',
      back: [
        'Long teeth for such cold water. The sea has a flatter customer.',
        'Back to the pirate dock. Stingrays lie on the sand under the poles. Fishing 26.',
      ],
      backJournal: 'Pike is done. Stingrays are back under the pirate dock, at Fishing 26.',
    }),
    fish({
      id: 'flatfish',
      name: 'The Flat One',
      requires: ['icepike'],
      level: 26,
      good: 'stingray',
      spot: 'pirate',
      radius: 22,
      gold: 55,
      blurb: 'A stingray off the pirate dock. Fishing 26.',
      opening: 'Stingrays lie under the pirate dock. Fishing 26.',
      where: 'Return to the pirate fishing dock',
      hold: 'Carry a stingray',
      ask: [
        'The same platform as the tuna. The ray sits flatter and deeper.',
        'Fishing 26. The tuna still bite while you wait on the ray. Bring one stingray.',
      ],
      askJournal: 'Lira wants a stingray from the pirate dock. Fishing 26.',
      goJournal: 'Back on the pirate platform. The rays are under the deep poles.',
      levelJournal: 'Fishing 26. A stingray will take the line.',
      holdJournal: 'A stingray is in the bag.',
      back: [
        'Mind the tail even after it is dead. I have no use for the venom, only the proof.',
        'The ice again. Under those same holes, deeper, is sturgeon. Fishing 30.',
      ],
      backJournal: 'The ray is done. Sturgeon are the old fish under the same ice holes, at Fishing 30.',
    }),
    fish({
      id: 'sturgeonhole',
      name: 'The Old Fish',
      requires: ['flatfish'],
      level: 30,
      good: 'sturgeon',
      spot: 'icehole',
      radius: 16,
      gold: 70,
      blurb: 'Sturgeon under the ice. Fishing 30.',
      opening: 'Sturgeon are the old fish under the Glimmerfrost ice. Fishing 30.',
      where: 'Return to the ice holes',
      hold: 'Carry a sturgeon',
      ask: [
        'Same holes as the pike. The sturgeon lies deeper and it is older than the ice.',
        'Fishing 30. Pike will keep paying the line. Bring a sturgeon.',
      ],
      askJournal: 'Lira wants a sturgeon from the Glimmerfrost ice holes. Fishing 30.',
      goJournal: 'The ice holes again. Sturgeon lie under the pike.',
      levelJournal: 'Fishing 30. Sturgeon will take the line through the ice.',
      holdJournal: 'A sturgeon is in the bag.',
      back: [
        'That fish remembers a colder year than this one. One hunter left in the water.',
        'The pirate dock, the deep poles. Tiger shark. Fishing 34. After that the sea repeats itself.',
      ],
      backJournal: 'Sturgeon is done. The last fish is a tiger shark off the pirate dock, at Fishing 34.',
    }),
    fish({
      id: 'sharkline',
      name: 'The Striped One',
      requires: ['sturgeonhole'],
      level: 34,
      good: 'tigershark',
      spot: 'pirate',
      radius: 22,
      gold: 90,
      blurb: 'A tiger shark off the pirate dock. Fishing 34. The last fish.',
      opening: 'Tiger shark is the last fish the water keeps. Deep poles, pirate dock, Fishing 34.',
      where: 'Stand on the pirate fishing dock',
      hold: 'Carry a tiger shark',
      ask: [
        'Back to the long pier. Cast the deep poles, the ones off the end of the platform.',
        'Tiger shark. Fishing 34. Sturgeon and the ray still train you. It is the last new fish. Bring one.',
      ],
      askJournal: 'Lira wants a tiger shark from the deep poles on the pirate dock. Fishing 34.',
      goJournal: 'The end of the pirate platform. The deep poles are where the shark runs.',
      levelJournal: 'Fishing 34. A tiger shark will take the deep line. It is the last fish.',
      holdJournal: 'A tiger shark is in the bag.',
      back: [
        'Stripes, and a jaw that could take the pole with the bait. That is the end of the book.',
        'No rarer fish. The same shark still pays the line. Take Fishing to 99 and come tell me the number.',
      ],
      backJournal: 'The tiger shark is the last fish. Lira wants the line taken to Fishing 99 on that same dock.',
    }),
    fish({
      id: 'fishcap',
      name: 'The Line Holds',
      requires: ['sharkline'],
      level: 99,
      points: 3,
      gold: 150,
      blurb: 'No rarer fish. Fishing 99.',
      opening: 'There is no fish past the tiger shark. The deep poles still pay, all the way to Fishing 99.',
      ask: [
        'I have no further water to send you to.',
        'Stay on the tiger shark until Fishing is 99. Then come back. I want the number from your own mouth.',
      ],
      askJournal: 'Lira wants Fishing at 99. The tiger shark off the pirate dock is the fish that still pays.',
      levelJournal: 'Fishing 99. The line has gone as far as it goes.',
      back: [
        'Ninety-nine. The pole is the same stick. The wrist is not.',
        'The water will still bite. It just will not teach you a new fish.',
      ],
      backJournal: 'Lira heard the number and had no further fish to name. Fishing is 99.',
    }),
  ];
}

function ladder(skill, skillName, giver, npc, spec) {
  const steps = [
    {
      id: `${spec.id}-ask`,
      kind: 'talk',
      npc,
      objective: `Talk to ${giver}`,
      lines: spec.ask,
      journal: spec.askJournal,
    },
  ];
  if (spec.spot) {
    steps.push({
      id: `${spec.id}-go`,
      kind: 'visit',
      spot: spec.spot,
      radius: spec.radius,
      objective: spec.where,
      journal: spec.goJournal,
    });
  }
  steps.push({
    id: `${spec.id}-lvl`,
    kind: 'level',
    skill,
    level: spec.level,
    objective: `Reach ${skillName} level ${spec.level}`,
    journal: spec.levelJournal,
  });
  if (spec.good) {
    steps.push({
      id: `${spec.id}-hold`,
      kind: 'hold',
      goods: [{ id: spec.good, n: 1 }],
      objective: spec.hold,
      journal: spec.holdJournal,
    });
  }
  steps.push({
    id: `${spec.id}-back`,
    kind: 'talk',
    npc,
    objective: `Return to ${giver}`,
    lines: spec.back,
    journal: spec.backJournal,
  });
  return {
    id: spec.id,
    name: spec.name,
    series: skill,
    kind: 'quest',
    points: spec.points || 2,
    giver,
    requires: spec.requires,
    reward: { gold: spec.gold },
    blurb: spec.blurb,
    opening: spec.opening,
    steps,
  };
}
