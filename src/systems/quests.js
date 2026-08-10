// Quest system: a story chain from the villagers plus repeatable grind quests.
// Objective kinds: kill / kill_any / fish / chest / forge / deliver / talk.
import { ITEMS } from './items.js';

export const QUESTS = {
  // THE AWAKENING. A real quest entry, not a toast — a permanent choice should
  // sit in the tracker with a name on it until you go and make it, the same way
  // every other important thing in this game does. `minLevel` gates it so the
  // Elder cannot offer it before the Grand Master would accept you.
  the_calling: {
    giver: 'elder', name: 'The Calling', minLevel: 10,
    offer: 'You have been carrying that borrowed sword for ten levels now, and it shows. '
      + 'Grand Master Vell has been watching. Go to the shrine avenue and speak to them — '
      + 'it is time you stopped being nobody in particular.',
    done: 'So you chose. Good. The road does not get easier, but from here it is YOURS.',
    objective: { type: 'talk', target: 'grandmaster', n: 1, label: 'Speak to Grand Master Vell' },
    reward: { xp: 300, items: [{ id: 'tonic', count: 3 }, { id: 'forge_stone', count: 3 }] },
  },
  welcome: {
    giver: 'elder', name: 'Welcome to Anavela',
    offer: 'You look capable, adventurer! Let me show you around. First — go say hello to Finn the fisherman by the huts.',
    done: 'You found him! Finn is the best angler this side of the lakes.',
    objective: { type: 'talk', target: 'fisher', n: 1, label: 'Talk to Finn' },
    reward: { xp: 20 },
  },
  slime_trouble: {
    giver: 'elder', name: 'Slime Trouble', requires: ['welcome'],
    offer: 'Slimes keep oozing into our gardens! Squash 3 of them for me, would you?',
    done: 'Splendid work! The gardens are safe... for now.',
    objective: { type: 'kill', target: 'slime', n: 3, label: 'Defeat 3 Slimes' },
    reward: { xp: 50, items: [{ id: 'tonic', count: 2 }] },
  },
  first_catch: {
    giver: 'fisher', name: 'First Catch', requires: ['welcome'],
    offer: 'Ever fished before? Stand at the lake shore, press the fishing key, and strike when you see the "!". Bring me 2 fish!',
    done: 'Ha! A natural! The lakes will feed you well.',
    objective: { type: 'fish', n: 2, label: 'Catch 2 fish' },
    reward: { xp: 40, items: [{ id: 'tonic', count: 1 }] },
  },
  gear_up: {
    giver: 'smith', name: 'Gear Up', requires: ['welcome'],
    offer: 'That weapon of yours needs work. Gather Forge Stones from monsters and temper it to +1 at my forge (press V).',
    done: 'Feel that edge! Keep feeding the forge and it will keep getting stronger.',
    objective: { type: 'forge', n: 1, label: 'Forge your weapon to +1' },
    reward: { xp: 80, items: [{ id: 'forge_stone', count: 2 }] },
  },
  treasure_hunt: {
    giver: 'scout', name: 'Treasure Hunt', requires: ['welcome'],
    offer: 'My patrol maps show chests glittering out in the wilds. Crack open 2 of them!',
    done: 'Told you my maps were good! Keep an eye out for the sparkles.',
    objective: { type: 'chest', n: 2, label: 'Open 2 treasure chests' },
    reward: { xp: 60, items: [{ id: 'forge_stone', count: 2 }] },
  },
  night_lights: {
    giver: 'elder', name: 'Night Lights', requires: ['slime_trouble'],
    offer: 'When darkness falls, Wisps drift out of the woods. Their essence is precious — hunt 2 of them tonight.',
    done: 'Ahh, wisp essence. Beautiful and dangerous, like the night itself.',
    objective: { type: 'kill', target: 'wisp', n: 2, label: 'Defeat 2 Wisps (night)' },
    reward: { xp: 90, items: [{ id: 'forge_stone', count: 2 }] },
  },
  golem_menace: {
    giver: 'elder', name: 'The Golem Menace', requires: ['night_lights', 'gear_up'],
    offer: 'An ancient Golem stirs far from the village. It is our greatest threat... and its core our greatest prize. End it.',
    done: 'You... you actually did it! Anavela Universe will sing of this day! Take this charm — a companion for a true hero.',
    objective: { type: 'kill', target: 'golem', n: 1, label: 'Defeat the Golem' },
    reward: { xp: 250, items: [{ id: 'charm_moku', count: 1 }, { id: 'forge_stone', count: 3 }] },
  },
  // --- mount quests: from simple deliveries to boss hunts ---
  saddle_up: {
    giver: 'scout', name: 'Saddle Up', requires: ['treasure_hunt'],
    offer: 'I found a boar-pony foal on patrol — Trotter. He will carry you if you feed him. Bring 4 Boar Tusks to prove you can handle him!',
    done: 'Ha! Trotter likes you already. Blow this whistle whenever you want to ride.',
    objective: { type: 'deliver', item: 'boar_tusk', n: 4, label: 'Deliver 4 Boar Tusks' },
    reward: { xp: 80, items: [{ id: 'mount_trotter', count: 1 }] },
  },
  home_sweet_home: {
    giver: 'scout', name: 'A Place to Call Home', requires: ['treasure_hunt'],
    offer: 'There is an island off the south-east coast the old order used as a waystation. Nobody has claimed it since. It is called Lanternhome and it is yours — the foundation is already laid. Chop birch for Hardwood, mine boulders for Iron Ore, then get out there and raise the walls. I will chip in for the housewarming.',
    done: 'A roof of your own on Lanternhome. Keep at it — that cabin has two more storeys in it yet.',
    objective: { type: 'build', n: 1, label: 'Build your house on Lanternhome' },
    reward: { xp: 120, items: [{ id: 'forge_stone', count: 3 }, { id: 'tonic', count: 3 }] },
  },
  egg_rider: {
    giver: 'fisher', name: 'The Big Cluck', requires: ['first_catch'],
    offer: 'You will not believe this — a hen the size of a pony keeps stealing my catch! Bring me 5 fresh fish to lure her, and she is yours.',
    done: 'She took the bait — and took a liking to you! Meet Clucky. She jumps like a champion.',
    objective: { type: 'fish', n: 5, label: 'Catch 5 fish' },
    reward: { xp: 120, items: [{ id: 'mount_clucky', count: 1 }] },
  },
  steady_shell: {
    giver: 'smith', name: 'Steady as a Shell', requires: ['gear_up'],
    offer: 'Old Shellsworth the great-turtle needs new shell plating. Bring me 6 Chitin Shells and I will rivet him a saddle while I am at it.',
    done: 'Plated and saddled! Shellsworth is slow to anger and slower to fall. Ride safe.',
    objective: { type: 'deliver', item: 'chitin_shell', n: 6, label: 'Deliver 6 Chitin Shells' },
    reward: { xp: 140, items: [{ id: 'mount_shellsworth', count: 1 }] },
  },
  sky_rider: {
    giver: 'elder', name: 'Rider of the Sky', requires: ['golem_menace'],
    offer: 'Legends speak of Nimbus, a cloud-cat that only bonds with true champions. Defeat 2 world bosses and the skies themselves will take notice.',
    done: 'The clouds part... Nimbus has chosen you. No hero has earned this in a hundred years.',
    objective: { type: 'kill', target: 'worldboss', n: 2, label: 'Defeat 2 World Bosses' },
    reward: { xp: 400, items: [{ id: 'mount_nimbus', count: 1 }] },
  },
  // --- repeatable grind quests ---
  boss_hunter: {
    giver: 'elder', name: 'Boss Hunter', requires: ['golem_menace'], repeatable: true,
    offer: 'A great beast stirs again — they rise every few minutes now. Bring one down for Anavela Universe!',
    done: 'The ground shakes no more. You are the wall between us and the wilds.',
    objective: { type: 'kill', target: 'worldboss', n: 1, label: 'Defeat 1 World Boss' },
    reward: { xp: 200, items: [{ id: 'forge_stone', count: 3 }, { id: 'tonic', count: 2 }] },
  },
  cull: {
    giver: 'scout', name: 'Cull the Wilds', requires: ['treasure_hunt'], repeatable: true,
    offer: 'The wilds are overflowing again. Thin out 10 monsters — any kind will do.',
    done: 'That should keep the roads safe for a while. Same again tomorrow?',
    objective: { type: 'kill_any', n: 10, label: 'Defeat 10 monsters' },
    reward: { xp: 80, items: [{ id: 'forge_stone', count: 1 }] },
  },
  fresh_fish: {
    giver: 'fisher', name: 'Fresh Fish', requires: ['first_catch'], repeatable: true,
    offer: 'The village pantry runs on fish. Reel in 3 more for me?',
    done: 'Mmm, fresh as morning dew. You have a gift!',
    objective: { type: 'fish', n: 3, label: 'Catch 3 fish' },
    reward: { xp: 60, items: [{ id: 'tonic', count: 1 }] },
  },
  herb_run: {
    giver: 'merchant', name: 'Herb Runner', requires: ['welcome'], repeatable: true,
    offer: 'Green Herbs! I trade them to travelers. Bring me 4 and I will make it worth your while.',
    done: 'Wonderful! Crisp and fragrant. Here, your cut of the profits.',
    objective: { type: 'deliver', item: 'green_herb', n: 4, label: 'Deliver 4 Green Herbs' },
    reward: { xp: 50, items: [{ id: 'tonic', count: 2 }] },
  },
};

export function createQuests({ inventory, leveling }) {
  const state = {
    active: {},      // id -> progress count
    completed: new Set(),
    listeners: new Set(),
  };

  function notify() { for (const fn of state.listeners) fn(); }
  function onChange(fn) { state.listeners.add(fn); }

  function isUnlocked(q) {
    return (q.requires || []).every((r) => state.completed.has(r));
  }

  // first offerable quest from this NPC
  function availableFor(npcId, level = 99) {
    for (const [id, q] of Object.entries(QUESTS)) {
      if (q.giver !== npcId) continue;
      if (id in state.active) continue;
      if (state.completed.has(id) && !q.repeatable) continue;
      // A quest whose whole point is "you are ready now" must not be offered
      // before you are.
      if (q.minLevel && level < q.minLevel) continue;
      if (!isUnlocked(q)) continue;
      return { id, ...q };
    }
    return null;
  }

  function activeFor(npcId) {
    for (const id of Object.keys(state.active)) {
      if (QUESTS[id].giver === npcId) return { id, ...QUESTS[id] };
    }
    return null;
  }

  function progress(id) {
    const q = QUESTS[id];
    if (q.objective.type === 'deliver') return Math.min(inventory.count(q.objective.item), q.objective.n);
    return state.active[id] || 0;
  }

  function isComplete(id) {
    return progress(id) >= QUESTS[id].objective.n;
  }

  function accept(id) {
    if (id in state.active) return false;
    state.active[id] = 0;
    notify();
    return true;
  }

  function turnIn(id) {
    const q = QUESTS[id];
    if (!isComplete(id)) return null;
    if (q.objective.type === 'deliver') inventory.remove(q.objective.item, q.objective.n);
    delete state.active[id];
    state.completed.add(id);
    leveling.addXp(q.reward.xp);
    for (const it of q.reward.items || []) inventory.add(it.id, it.count);
    notify();
    return q.reward;
  }

  // game event feed: kind = 'kill' | 'fish' | 'chest' | 'forge' | 'talk'
  function event(kind, data = {}) {
    let changed = false;
    for (const id of Object.keys(state.active)) {
      const o = QUESTS[id].objective;
      const p = state.active[id];
      if (p >= o.n) continue;
      const match =
        (o.type === 'kill' && kind === 'kill' &&
          (o.target === 'worldboss' ? !!data.worldBoss : data.type === o.target)) ||
        (o.type === 'kill_any' && kind === 'kill') ||
        (o.type === 'fish' && kind === 'fish') ||
        (o.type === 'chest' && kind === 'chest') ||
        (o.type === 'forge' && kind === 'forge') ||
        (o.type === 'build' && kind === 'build') ||
        (o.type === 'talk' && kind === 'talk' && data.target === o.target);
      if (match) { state.active[id] = p + 1; changed = true; }
    }
    if (changed) notify();
  }

  // HUD tracker lines.
  //
  // `where` is the whole point of this shape: it says WHAT KIND of place the
  // next step is at, and the caller resolves that to a live world position. A
  // quest log that tells you to defeat three slimes and nothing else is a quest
  // log you look at once and then wander.
  function trackerLines() {
    return Object.keys(state.active).map((id) => {
      const q = QUESTS[id];
      const p = progress(id);
      const done = p >= q.objective.n;
      const o = q.objective;
      // finished work always points back at whoever asked for it
      const where = done
        ? { kind: 'npc', id: q.giver }
        : o.type === 'talk' ? { kind: 'npc', id: o.target }
          : o.type === 'kill' ? { kind: 'enemy', id: o.target }
            : o.type === 'kill_any' ? { kind: 'enemy' }
              : o.type === 'fish' ? { kind: 'water' }
                : o.type === 'chest' ? { kind: 'chest' }
                  : o.type === 'forge' ? { kind: 'landmark', id: 'forge' }
                    : o.type === 'gather' ? { kind: 'gather' }
                      : o.type === 'build' ? { kind: 'land' }
                        : o.type === 'deliver' ? { kind: 'enemy', id: o.from || null }
                          : { kind: 'npc', id: q.giver };
      return {
        id, name: q.name, label: o.label, p, n: o.n, done, giver: q.giver, where,
      };
    });
  }

  function serialize() {
    return { active: { ...state.active }, completed: [...state.completed] };
  }
  function load(data) {
    if (!data) return;
    state.active = data.active || {};
    state.completed = new Set(data.completed || []);
    notify();
  }

  return {
    state, onChange, availableFor, activeFor, accept, turnIn, event,
    progress, isComplete, trackerLines, serialize, load,
  };
}
