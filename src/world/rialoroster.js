// THE RIALO HUB ROSTER.
//
// Copied from the Rialo Temple Play character sheet — the DATA, never the art.
// Semesta paints every one of these procedurally from the same chibi builder
// the villagers use, because the project rule is that no image file ever ships;
// what carries over is who they are, what colour they are, what they do all day
// and what they actually say about Rialo.
//
// 35 of them. Spider is deliberately absent: in the Temple they are
// Eric Argent's pet, and here they roam the starting basecamp as a cat instead,
// which is a creature and not a villager. The player's own Custom Agent is
// excluded too — that one belongs to whoever made it.
//
// `activity` drives what they are doing when you find them; `persona` drives
// how far they stray. Both come straight from the sheet so a player who knows
// the Temple recognises them standing in the same kind of pose.

export const RIALO_NPCS = [
  {
    name: 'Ade', color: '#57e39f', accent: '#78ecff',
    topic: 'Data Spring', activity: 'wander', persona: 'wanderer',
    line: 'Forest paths are quiet, but data never sleeps.',
    dialogue: [
      'Rialo apps can listen to live real-world data, not just old values already written onchain.',
      'Imagine weather, market prices, shipment status, or ratings flowing into a temple pool after being checked.',
      'That lets contracts and agents react to what is happening outside crypto right now.',
    ],
  },
  {
    name: 'Barong', color: '#57e39f', accent: '#c886ff',
    topic: 'Onchain Progress', activity: 'wander', persona: 'pacer',
    line: 'Every badge is better when the ledger can verify it.',
    dialogue: [
      'A local game save can disappear, but an onchain badge can be checked by anyone.',
      'Temple Play uses quests like tiny proof-of-learning stamps for your Rialo Passport.',
      'That is why progression should come from the contract, not from hidden browser memory.',
    ],
  },
  {
    name: 'Eric Argent', color: '#78ecff', accent: '#ff7ad9',
    topic: 'Bridge Gate', activity: 'stroll', persona: 'wanderer',
    line: 'Bridge Gate scrolls carry API messages out and back.',
    dialogue: [
      'Rialo is built so apps can talk to real internet services and systems.',
      'A contract can send a request, wait for an API or real-world response, then use that result.',
      'That makes blockchain apps feel closer to the apps normal people already use.',
    ],
  },
  {
    name: 'Pinkeu', color: '#ff7ad9', accent: '#f2c866',
    topic: 'Quest Board', activity: 'tend', persona: 'homebody',
    line: 'The map gets brighter when badges are claimed.',
    dialogue: [
      'Quests turn learning into little actions instead of long boring reading.',
      'Each badge should prove you understood one Rialo concept, like RWA, agents, or signals.',
      'The fun part is simple: explore, learn, answer, then claim the proof.',
    ],
  },
  {
    name: 'Dikzzy', color: '#c886ff', accent: '#f2c866',
    topic: 'Privacy Chamber', activity: 'dance', persona: 'homebody',
    line: 'Privacy chambers turn plain scrolls into protected ones.',
    dialogue: [
      'Real-world apps often touch identity, finance, and personal messages.',
      'Not every detail should be public forever, especially when users are normal people.',
      'Rialo needs privacy patterns so useful apps can stay safe and respectful.',
    ],
  },
  {
    name: 'K.Gufran', color: '#88d7ff', accent: '#ff8066',
    topic: 'Real-World Connectivity', activity: 'gather', persona: 'wanderer',
    line: 'A response scroll always comes back through Bridge Gate.',
    dialogue: [
      'Connectivity means contracts are not trapped inside a sealed box.',
      'They can coordinate with payments, delivery systems, databases, marketplaces, and more.',
      'Less middleware means the app can feel more direct and easier to trust.',
    ],
  },
  {
    name: 'Rikky', color: '#ffad72', accent: '#78ecff',
    topic: 'Speed Engine', activity: 'meditate', persona: 'homebody',
    line: 'Signals are tiny real-world updates with big consequences.',
    dialogue: [
      'Real-world apps need fast reaction, not long waiting screens.',
      'A payment, check-in, price update, or deadline can become a trigger.',
      'When signals move fast, automations and agents can respond while the moment still matters.',
    ],
  },
  {
    name: 'VibeVortex', color: '#57e39f', accent: '#c886ff',
    topic: 'Grialo Ritual', activity: 'dance', persona: 'homebody',
    line: 'I keep the ritual energy moving between quests.',
    dialogue: [
      'Grialo is the daily ritual loop: channel energy, open the mystery box, earn PTS.',
      'The box reveal is visual dopamine, but the score belongs to your onchain profile.',
      'That makes the temple feel playful while still keeping progression verifiable.',
    ],
  },
  {
    name: 'Wisnu', color: '#f2c866', accent: '#88d7ff',
    topic: 'SCALE Verification', activity: 'meditate', persona: 'homebody',
    line: 'Every clean signal needs a calm verifier.',
    dialogue: [
      'SCALE helps define agent work before payment moves.',
      'A task needs terms, a deadline, a quality check, and a clear settlement rule.',
      'That gives AI agents safer rails before they touch real value.',
    ],
  },
  {
    name: 'Raka', color: '#ffad72', accent: '#57e39f',
    topic: 'Rialo Passport', activity: 'stroll', persona: 'pacer',
    line: 'I patrol the gate so new explorers stay on track.',
    dialogue: [
      'Your Rialo Passport is the identity layer for this temple world.',
      'It connects username, X handle, Grialo PTS, quiz PTS, and wish count.',
      'A beginner should feel like they have a home in the app before doing bigger onchain actions.',
    ],
  },
  {
    name: 'Jepanya', color: '#78ecff', accent: '#f2c866',
    topic: 'RWA Vault', activity: 'wander', persona: 'wanderer',
    line: 'Boxes, scrolls, and data all need a route home.',
    dialogue: [
      'RWA means real-world assets become useful inside blockchain apps.',
      'An invoice, house, ticket, or gold record should update when real-world status changes.',
      'That is the difference between a static token and an asset agents can actually use.',
    ],
  },
  {
    name: 'Aqc', color: '#57e39f', accent: '#78ecff',
    topic: 'Rialo Signal Plaza', activity: 'wander', persona: 'wanderer',
    line: 'The sign plaza is where every signal gets noticed.',
    dialogue: [
      'The RialoSign marks the center of the map: learn, gather, then move with purpose.',
      'When many explorers meet here, it feels like the temple has a real heartbeat.',
      'Signals matter because they turn outside-world changes into app actions.',
    ],
  },
  {
    name: 'DP', color: '#ffad72', accent: '#f2c866',
    topic: 'Temple Passport', activity: 'stroll', persona: 'pacer',
    line: 'A clear passport makes every quest easier to trust.',
    dialogue: [
      'Your Rialo Passport connects identity, quest proof, and score without needing a messy profile system.',
      'A wallet can hold progress, but username and X handle make the world feel human.',
      'That is why onboarding should feel familiar before the app asks for deeper Web3 actions.',
    ],
  },
  {
    name: 'Ishu', color: '#c886ff', accent: '#78ecff',
    topic: 'Real-World Reactivity', activity: 'dance', persona: 'homebody',
    line: 'Fast apps need live triggers, not sleepy buttons.',
    dialogue: [
      'Rialo apps should react when a real event happens: payment, delivery, deadline, or price move.',
      'The app should not make users refresh forever while the world already changed.',
      'That is the difference between a static chain app and a real-world app.',
    ],
  },
  {
    name: 'Jeams', color: '#57e39f', accent: '#ff7ad9',
    topic: 'API Connectivity', activity: 'gather', persona: 'wanderer',
    line: 'I keep the API scrolls neat before they cross the gate.',
    dialogue: [
      'Real-world connectivity means smart contracts can coordinate with internet services.',
      'A request can leave the temple, check an external system, then return with a useful result.',
      'That is how blockchain starts talking to apps people already use.',
    ],
  },
  {
    name: 'Koushik', color: '#88d7ff', accent: '#f2c866',
    topic: 'Real-World Data', activity: 'wander', persona: 'wanderer',
    line: 'Data needs a filter before it becomes app truth.',
    dialogue: [
      'Live data is useful only when the app can understand and check it.',
      'Weather, price, shipment, or review data can become an input for onchain logic.',
      'Better data makes agents and users less blind.',
    ],
  },
  {
    name: 'KingJ', color: '#f2c866', accent: '#57e39f',
    topic: 'RWA Utility', activity: 'stroll', persona: 'wanderer',
    line: 'A good vault turns ownership into something apps can use.',
    dialogue: [
      'RWA is not just making a token and calling it a day.',
      'Useful real-world assets should update with status, verification, and live conditions.',
      'Then agents can reason about them instead of staring at a static badge.',
    ],
  },
  {
    name: 'Richard12', color: '#78ecff', accent: '#c886ff',
    topic: 'Agent Work Terms', activity: 'stroll', persona: 'pacer',
    line: 'SCALE keeps agent work from turning into chaos.',
    dialogue: [
      'Agents need clear tasks, limits, deadlines, and verification before payment.',
      'SCALE makes those terms easier to coordinate between users, agents, and judges.',
      'That is safer than hoping an AI did the right thing.',
    ],
  },
  {
    name: 'Luka', color: '#ff7ad9', accent: '#78ecff',
    topic: 'Real-World Privacy', activity: 'sit', persona: 'homebody',
    line: 'Private messages should stay private.',
    dialogue: [
      'Not every real-world interaction belongs on a public wall.',
      'Identity, finance, and personal updates need careful privacy design.',
      'A useful app protects the user while still giving the system enough proof.',
    ],
  },
  {
    name: 'Silverwave', color: '#78ecff', accent: '#f2c866',
    topic: 'Automation Signals', activity: 'wander', persona: 'wanderer',
    line: 'Signal Tower watches for the little updates that matter.',
    dialogue: [
      'Automation starts when a condition becomes true.',
      'A deadline passes, a delivery completes, or a price crosses a line.',
      'Rialo makes those signals easier for apps and agents to use.',
    ],
  },
  {
    name: 'Suleyman', color: '#b9ff66', accent: '#57e39f',
    topic: 'Learning Quests', activity: 'tend', persona: 'homebody',
    line: 'Quests are tiny lessons with proof attached.',
    dialogue: [
      'Temple Play makes learning interactive instead of dumping a long document on users.',
      'Talk, answer, claim, then see progress through your profile.',
      'A beginner should understand by walking the world, not just reading a pitch.',
    ],
  },
  {
    name: 'Yozi', color: '#c886ff', accent: '#ffad72',
    topic: 'Verification', activity: 'dance', persona: 'homebody',
    line: 'Judges make agent work less risky.',
    dialogue: [
      'A judge step checks whether an output matches the requested task.',
      'That matters before payment releases or before an agent touches real-world value.',
      'Verification turns agent work from vibes into a process.',
    ],
  },
  {
    name: 'Dora', color: '#ffad72', accent: '#ff7ad9',
    topic: 'Response Loops', activity: 'stroll', persona: 'wanderer',
    line: 'The bridge is only useful if the response comes back clean.',
    dialogue: [
      'Connectivity is a loop: ask a real system, receive the result, then act with it.',
      'Without the return path, the contract only shouts into the void.',
      'Rialoâ€™s real-world direction is about closing that loop cleanly.',
    ],
  },
  {
    name: 'Darma', color: '#f2c866', accent: '#88d7ff',
    topic: 'Rialo UX', activity: 'wander', persona: 'wanderer',
    line: 'The best apps feel simple even when the rails are serious.',
    dialogue: [
      'A real-world blockchain app should not feel like homework.',
      'Good UX hides complexity until the user actually needs it.',
      'That is why this world teaches with characters, movement, and small proofs.',
    ],
  },
  {
    name: 'FlippedFace', color: '#f2c866', accent: '#57e39f',
    topic: 'Build For Rialo', activity: 'wander', persona: 'homebody',
    line: 'I keep the builder sign readable for new explorers.',
    dialogue: [
      'Rialo Temple is a gamified education world built for Rialo by nxrskyaa.',
      'The goal is simple: make real-world blockchain ideas feel playable, not intimidating.',
      'If a concept is hard, the temple turns it into a character, quest, or visual ritual.',
    ],
  },
  {
    name: 'Ecelannister', color: '#ff7ad9', accent: '#f2c866',
    topic: 'Real-World Identity', activity: 'dance', persona: 'homebody',
    line: 'A friendly identity flow beats a scary onboarding wall.',
    dialogue: [
      'Real-world users should not need to understand every wallet detail on day one.',
      'Rialo can support friendlier identity patterns like familiar accounts and clear profiles.',
      'That is why the temple uses a passport: it makes Web3 feel like a place you can enter.',
    ],
  },
  {
    name: 'Ali', color: '#88d7ff', accent: '#57e39f',
    topic: 'Privacy and Safety', activity: 'meditate', persona: 'homebody',
    line: 'Safety is the mask before the message leaves the temple.',
    dialogue: [
      'Real-world apps touch personal messages, finance, identity, and status updates.',
      'A useful blockchain experience needs privacy and safer coordination, not public chaos.',
      'That is why Rialo concepts include private communication, verification, and clear action rules.',
    ],
  },
  {
    name: 'LongLife', color: '#57e39f', accent: '#ffad72',
    topic: 'Temple Community', activity: 'stroll', persona: 'wanderer',
    line: 'A world stays alive when the community keeps returning.',
    dialogue: [
      'Daily rituals, quizzes, wishes, and leaderboards give people reasons to come back.',
      'Those loops only matter when progress is connected to the same onchain profile.',
      'That is how Rialo Temple can grow from a demo into a living education hub.',
    ],
  },
  {
    name: 'Bjoestar', color: '#ffad72', accent: '#78ecff',
    topic: 'Builder Routes', activity: 'stroll', persona: 'pacer',
    line: 'I keep the map routes clean for new builders.',
    dialogue: [
      'A good onboarding world should feel easy to walk through.',
      'Rialo Temple uses characters and small quests so users learn by exploring.',
      'The smoother the route, the easier it is to understand real-world blockchain ideas.',
    ],
  },
  {
    name: 'Keep', color: '#b9ff66', accent: '#57e39f',
    topic: 'Rialo Team & Helper', activity: 'wander', persona: 'homebody',
    line: 'I keep the helper notes near RialoSign tidy.',
    dialogue: [
      'Helpers make the temple feel alive by answering small questions around the map.',
      'A beginner can ask what Rialo does, why agents need rails, or how quests become proof.',
      'Good helpers turn confusion into a short path forward.',
    ],
  },
  {
    name: 'Sukanto', color: '#f2c866', accent: '#ff7ad9',
    topic: 'Temple Lessons', activity: 'wander', persona: 'wanderer',
    line: 'I trade short lessons for better quests.',
    dialogue: [
      'Rialo ideas are easier when each zone teaches one clear thing.',
      'Data, identity, privacy, assets, and agents all become little stories here.',
      'That is why Temple Play should feel like a learning RPG, not a plain form.',
    ],
  },
  {
    name: 'Elias', color: '#88d7ff', accent: '#f2c866',
    topic: 'Signal Timing', activity: 'meditate', persona: 'homebody',
    line: 'Signals should arrive fast and clean.',
    dialogue: [
      'Real-world apps need quick reaction when something important changes.',
      'A payment clears, a delivery updates, or a deadline passes: the app should know.',
      'Rialo is interesting because it makes those real-world signals more usable.',
    ],
  },
  {
    name: 'Sza', color: '#ff7ad9', accent: '#78ecff',
    topic: 'Nen Matcha', activity: 'tend', persona: 'homebody',
    line: 'Matcha first, then we talk protocols.',
    dialogue: [
      'Welcome to Nen Matcha, the calmest corner of the temple grounds.',
      'Builders think better with warm matcha â€” even agents queue here between quests.',
      'Real-world commerce like this little shop is exactly what Rialo wants onchain: simple, verifiable, useful.',
    ],
  },
  {
    name: 'Goat', color: '#f2c866', accent: '#57e39f',
    topic: 'Beginner Paths', activity: 'dance', persona: 'homebody',
    line: 'I chew through confusing docs and leave simple Rialo lessons.',
    dialogue: [
      'A good learning world makes the first step obvious.',
      'Rialo Temple turns hard concepts into quests, signs, and characters.',
      'If the player can explain it after walking here, the map did its job.',
    ],
  },
  {
    name: 'Luzzy', color: '#88d7ff', accent: '#f2c866',
    topic: 'Live Data Routes', activity: 'stroll', persona: 'wanderer',
    line: 'I light the route between real-world data and useful app actions.',
    dialogue: [
      'Real-world data matters when apps can use it at the right time.',
      'Prices, delivery status, ratings, and identity signals can all guide app behavior.',
      'Rialo is interesting because those signals can become usable rails for apps and agents.',
    ],
  },
];

/** Palette the Temple uses for its cast — kept so the Hub reads as its own
 *  place rather than as more of Anavela. */
export const RIALO_PALETTE = {
  ground: '#1c2432',
  paving: '#28324a',
  inlay: '#57e39f',
  structure: '#141a26',
  glow: '#78ecff',
};

export const RIALO_ACTIVITIES = [...new Set(RIALO_NPCS.map((n) => n.activity))];
