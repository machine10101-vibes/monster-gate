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
          'Take him the copper and the tin from the pit. One of each, smelted into a bar. A hunter with no iron is a story I am tired of telling.',
        ],
        journal:
          'Mira marked the board and paid the guild\'s price. She sent me to Bram. He has moved the forge to the rim of Greyrock Pit, and she wants a bar of iron in my hands before she will call me equipped.',
      },
    ],
  },
  {
    id: 'pit',
    name: 'Iron from the Pit',
    series: 'Oakhollow',
    kind: 'quest',
    points: 2,
    giver: 'Bram',
    requires: ['board'],
    reward: { gold: 25 },
    blurb: 'Bram works the forge on the south rim of Greyrock Pit. He wants a bar, not a promise.',
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
          'The pit is the round hole behind me. Copper on one side, tin on the other. I do not mind which rock you hit first.',
          'Bring one of each to the smithy door and smelt them. Then come back and show me the bar. I will not take it. A smith who keeps the first bar is a thief.',
        ],
        journal:
          'Bram stands by a forge on the rim, close enough to the pit that the ore is still warm in the story he tells. He wants one copper and one tin, smelted at the smithy into a bar, and he says he will not take the bar from me.',
      },
      {
        id: 'ore',
        kind: 'hold',
        goods: [
          { id: 'copper_ore', n: 1 },
          { id: 'tin_ore', n: 1 },
        ],
        also: [{ id: 'iron_bar', n: 1 }],
        alsoJournal:
          'I already had an iron bar in the bag. Bram\'s rocks can wait. The smithy has done this work once, and the bar is the part he asked to see.',
        objective: 'Mine 1 copper ore and 1 tin ore',
        journal:
          'The pit floor is gravel and old stone, and the rocks give up their color if you hit them long enough. I have copper and tin both. The smithy door is on the rim above me.',
      },
      {
        id: 'bar',
        kind: 'hold',
        goods: [{ id: 'iron_bar', n: 1 }],
        objective: 'Smelt an iron bar at the smithy',
        journal:
          'The hearth took the two ores and gave back one bar, pale and heavy. It looks too simple for the trouble, which is what Bram said iron always looks like.',
      },
      {
        id: 'show-bar',
        kind: 'talk',
        npc: 'smith',
        objective: 'Show the iron bar to Bram',
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
    blurb: 'Greyrock is copper and tin. Bram wants iron from the hole they call Deepwell.',
    opening:
      'Bram has one more errand once the first bar is in your hands. The pit behind him is the starter hole. South of Southford, the desert has a bigger one, and the rocks there are not orange.',
    steps: [
      {
        id: 'deep-ask',
        kind: 'talk',
        npc: 'smith',
        objective: 'Ask Bram about the Deepwell dig',
        lines: [
          'Greyrock is copper and tin. That is how a hunter starts. It is not how a hunter finishes.',
          'South of Southford the dunes open into a pit they call Deepwell. Iron, then coal, then the blue and green seams if you live long enough to swing at them.',
          'Bring me one iron ore from that hole. I will not take it. I want to know you found the place.',
        ],
        journal:
          'Bram sent me south of Southford, into the desert pit called Deepwell. He wants one iron ore from those rocks. Copper and tin will not count.',
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
          'The blue rocks are mithril. The green ones are adamant. They will not open for a pick until your arms remember the work. That is the whole of mining, written in dirt.',
        ],
        journal:
          'Bram turned the iron ore and gave it back. Deepwell also holds coal, mithril and adamant, each behind a higher Mining level. The smithy will take whatever I bring.',
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
];

export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

export const QUEST_POINTS_TOTAL = QUESTS.reduce((n, q) => n + q.points, 0);

export function questById(id) {
  return QUEST_BY_ID[id] || null;
}
