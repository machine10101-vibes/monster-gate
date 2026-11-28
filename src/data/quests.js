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
        types: ['slime', 'voidslime', 'boar', 'wraith'],
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
  {
    id: 'gilan-pick',
    name: 'The Missing Pick',
    series: 'Gilantre',
    kind: 'quest',
    points: 1,
    giver: 'Grimbold Ironfist',
    giverNpc: 'grimbold',
    requires: [],
    reward: { gold: 25 },
    blurb: 'A pick walked out of Ironhaven and into Ragnar\'s stall.',
    opening:
      'Grimbold keeps the anvil in front of Ironhaven, on the south side of the well. He says his best pick is not on the bench. He says Ragnar has it, and that Ragnar will call it a loan.',
    steps: [
      {
        id: 'ask-grimbold',
        kind: 'talk',
        npc: 'grimbold',
        objective: 'Speak with Grimbold at Ironhaven',
        lines: [
          'You have the look of someone who swings a pick. Good. Mine is missing.',
          'Ragnar Stonebeard keeps the mining stall on the north side of the well. He will tell you it was a loan. Ask him whose name was on the handle, then come back.',
        ],
        journal:
          'Grimbold\'s best pick is not on the Ironhaven bench. He sent me to Ragnar Stonebeard, who will call it a loan. I am to ask whose name was on the handle.',
      },
      {
        id: 'ask-ragnar',
        kind: 'talk',
        npc: 'ragnar',
        objective: 'Ask Ragnar about the pick',
        lines: [
          'The iron one with the split handle? It was on my bench so a hunter could see what a Gilantre pick looks like. Grimbold lent it. He has forgotten the lending.',
          'Tell him the handle still says Ironhaven. I do not keep what I do not sell. The picks I do sell are the plain ones, and you already carry one of those if you have been in a pit.',
        ],
        journal:
          'Ragnar says the split-handled pick was a loan for the stall, and that the handle still reads Ironhaven. He does not sell that one. He sells the plain picks, and I already carry one.',
      },
      {
        id: 'pick-back',
        kind: 'talk',
        npc: 'grimbold',
        objective: 'Tell Grimbold what Ragnar said',
        lines: [
          'A loan. I did say that, last month, and then I said it again to the coal and not to him.',
          'Leave it on his bench. A stall with no iron on it looks closed. Take the coin. The anvil is here when you have bars.',
        ],
        journal:
          'Grimbold remembered the loan once I repeated it. The split-handled pick stays on Ragnar\'s bench so the stall does not look closed. The anvil is there when I have bars.',
      },
    ],
  },
  {
    id: 'gilan-bowl',
    name: 'Onto the Sand',
    series: 'Gilantre',
    kind: 'quest',
    points: 1,
    giver: 'Marcellus Valerius',
    giverNpc: 'marcellus',
    requires: [],
    reward: { gold: 30 },
    blurb: 'The arena master wants a hunter standing on the sand, not talking about it.',
    opening:
      'The bowl north of the well is older than the brick wall. Marcellus Valerius keeps the doors. He does not explain the place to people who have not stood in it.',
    steps: [
      {
        id: 'ask-marcellus',
        kind: 'talk',
        npc: 'marcellus',
        objective: 'Speak with Marcellus at the arena',
        lines: [
          'You can see the arches from the well. That is not the same as standing on the sand.',
          'Walk in through the south gate. If the gate turns you around, we will both have learned something. Then come and tell me the color of the lowest course of stone.',
        ],
        journal:
          'Marcellus will not talk about the arena until I have been in it. The south gate faces the well. He wants the color of the lowest course of stone.',
      },
      {
        id: 'stand-sand',
        kind: 'visit',
        spot: 'coliseum',
        radius: 8,
        objective: 'Stand on the sand of the arena',
        journal:
          'The sand is pale and beaten flat. The lowest course of the wall is a yellower stone than the seats, and the joints are wider. Elwynn was right about the age. She was wrong about there being a stair.',
      },
      {
        id: 'bowl-back',
        kind: 'talk',
        npc: 'marcellus',
        objective: 'Tell Marcellus you stood on the sand',
        lines: [
          'You came back through the same gate. Most people do. A few try the seats and learn why the seats have no stairs on the inside.',
          'The old stone stays. I keep the doors and the banners. If you want a fight, the prairie outside the wall has more of them than I do.',
        ],
        journal:
          'Marcellus took the report and paid the door fee the other way around. The old stone stays. The fights, he says, are still out on the prairie.',
      },
    ],
  },
  {
    id: 'gilan-roots',
    name: 'Thin Fields',
    series: 'Gilantre',
    kind: 'quest',
    points: 1,
    giver: 'Gwyneth Earthsong',
    giverNpc: 'gwyneth',
    requires: [],
    reward: { gold: 20 },
    blurb: 'Gwyneth will not cross the moat. She wants eyes on the west wood.',
    opening:
      'Gwyneth Earthsong walks the cobbles with a basket she does not fill. The fields outside the west bridge are thin this season, and she will not go and look.',
    steps: [
      {
        id: 'ask-gwyneth',
        kind: 'talk',
        npc: 'gwyneth',
        objective: 'Speak with Gwyneth in the square',
        lines: [
          'The wheat outside the west bridge came up and then stopped. I can see the color from the gate. I cannot see the roots.',
          'Cross the drawbridge and walk to the trees on the north side of the road. Tell me if the soil is bare. I am not carrying a basket across that moat.',
        ],
        journal:
          'Gwyneth can see the color of the west fields from the gate and nothing else. She wants me across the drawbridge, at the trees on the north side of the road, to look at the soil.',
      },
      {
        id: 'see-grove',
        kind: 'visit',
        spot: 'westwood',
        radius: 16,
        objective: 'Look at the trees west of the bridge',
        journal:
          'The trees are standing. The grass under them is short and pale, and the soil at the roots is open in patches, as if something pulled instead of grazed. It is not a blight I have a name for. It is enough to tell Gwyneth the field is thin and the wood is not dead.',
      },
      {
        id: 'roots-back',
        kind: 'talk',
        npc: 'gwyneth',
        objective: 'Tell Gwyneth what the west wood looks like',
        lines: [
          'Standing trees and open soil. That is better than a fire and worse than a harvest.',
          'I will keep the basket for the prairie on the east road. Take the coin. You walked farther than I would, which is the whole of the work.',
        ],
        journal:
          'Gwyneth kept the basket for the east prairie. The west wood is thin and still standing. She paid for the walk she would not take.',
      },
    ],
  },
  {
    id: 'gilan-timber',
    name: 'The Marked Oak',
    series: 'Gilantre',
    kind: 'quest',
    points: 1,
    giver: 'Elara Moonwhisper',
    giverNpc: 'elara',
    requires: [],
    reward: { gold: 20 },
    blurb: 'Elara marked an oak on the east road and wants it seen before someone else claims it.',
    opening:
      'Elara Moonwhisper sells the axes and keeps the marks. There is an oak past the east drawbridge with her cut in the bark, and she does not trust the road to leave it alone.',
    steps: [
      {
        id: 'ask-elara',
        kind: 'talk',
        npc: 'elara',
        objective: 'Speak with Elara at the wood stall',
        lines: [
          'The axe you carry will fell birch and oak. Maple waits until your arm is less hopeful.',
          'Past the east bridge, on the south side of the road, there is an oak with a fresh cut in the bark and a sign under it. Go and see that the sign is still mine. Do not swing at it.',
        ],
        journal:
          'Elara marked an oak past the east drawbridge, south of the road. I am to see that her sign is still there. I am not to swing at the tree.',
      },
      {
        id: 'see-oak',
        kind: 'visit',
        spot: 'markoak',
        radius: 12,
        objective: 'Find Elara\'s marked oak',
        journal:
          'The cut in the bark is fresh and the sign is still standing. The oak is large enough for a hall beam. The prairie around it is open, and nothing else on the road has a mark.',
      },
      {
        id: 'timber-back',
        kind: 'talk',
        npc: 'elara',
        objective: 'Tell Elara the oak is still marked',
        lines: [
          'Still standing, then. Good. The hall can wait a season. A tree cut in a hurry is a beam that twists.',
          'If you need the axe sharpened, the bench is here. I do not charge a hunter for looking at a tree I asked them to look at.',
        ],
        journal:
          'Elara left the oak for another season. The sign stays. She does not charge for a look she asked for, and the axe bench is there when the edge goes dull.',
      },
    ],
  },
  {
    id: 'gilan-reed',
    name: 'The East Reed',
    series: 'Gilantre',
    kind: 'quest',
    points: 1,
    giver: 'Lyra Swiftfoot',
    giverNpc: 'lyra',
    requires: [],
    reward: { gold: 15 },
    blurb: 'Lyra dries one reed on the east bank. She wants it looked at, not pulled.',
    opening:
      'Lyra Swiftfoot sells the same draughts Lira does, from a stall on the south road inside the wall. The reed she dries grows on the east bank of the moat, and she will not say it is still good until someone has looked at the water.',
    steps: [
      {
        id: 'ask-lyra',
        kind: 'talk',
        npc: 'lyra',
        objective: 'Speak with Lyra at her stall',
        lines: [
          'Draughts for the cuts, philters for the bolt. The prices are the same as the south road in Oakhollow. The herbs are not.',
          'On the east bank of the moat, past the bridge and a little south, there is a stand of reed I cut for drying. Look at the water around it. If it is brown, tell me. If it is clear, also tell me. Do not pull the reed.',
        ],
        journal:
          'Lyra cuts one stand of reed on the east bank, south of the bridge. I am to look at the water and leave the reed in the mud.',
      },
      {
        id: 'see-reed',
        kind: 'visit',
        spot: 'reed',
        radius: 12,
        objective: 'Look at the reed on the east bank',
        journal:
          'The reed is green at the tips and pale at the waterline. The moat around it is dark and clear enough to show the brick of the inner bank. Nothing brown is moving in it. Lyra can dry this cutting.',
      },
      {
        id: 'reed-back',
        kind: 'talk',
        npc: 'lyra',
        objective: 'Tell Lyra the water is clear',
        lines: [
          'Clear, then. I will cut it in the morning, when the guards are bored and not watching the bank.',
          'Buy a draught if you are bleeding. Looking at a reed does not close a cut, whatever the old stories say.',
        ],
        journal:
          'The east reed is fit to dry. Lyra will cut it when the guards are bored. A draught is still the thing that closes a cut.',
      },
    ],
  },
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
  'Grimbold Ironfist': 'grimbold',
  'Ragnar Stonebeard': 'ragnar',
  'Elara Moonwhisper': 'elara',
  'Lyra Swiftfoot': 'lyra',
  'Marcellus Valerius': 'marcellus',
  'Gwyneth Earthsong': 'gwyneth',
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
