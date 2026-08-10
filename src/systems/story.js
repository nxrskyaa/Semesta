// THE STORY OF ANAVELA.
//
// Semesta had systems but no reason. You woke up in a village and did things.
// This gives the hero a past, the world a wound, and the player a thread to pull
// — told in short beats that hook onto things the game ALREADY tracks, so the
// story advances by playing rather than by watching cutscenes.
//
// The arc, in one line: you are the last apprentice of the Lanternkeepers, the
// order that kept Anavela's lights burning; the lights went out, the wilds came
// back, and relighting them is how the world is put right.
//
// Each chapter is gated on a condition the game can check for itself, so nothing
// here has to be wired into a dozen call sites — story.check(ctx) is called once
// a second with the live game state and decides whether to advance.

export const CHAPTERS = [
  {
    id: 'waking',
    title: 'I · The Last Apprentice',
    lines: [
      'Nine hundred lamps, and an order that lit every one of them by hand.',
      'Your mother walked the northern road for twenty-two years. Her name is eleventh of the forty-one cut into the shrine wall, because there was nothing to bury.',
      'You were nine. You are not nine now, and the lamps are still out.',
      'Nobody appointed you. That is not how it works — somebody just has to start.',
    ],
    hint: 'Talk to the villagers. Anavela is still here.',
    // opens immediately
    when: () => true,
    reward: { coins: 60, label: '60 coins' },
  },
  {
    id: 'first-light',
    title: 'II · First Light',
    lines: [
      'The lamp at the edge of the village has been dark eleven years. It takes you four tries.',
      'Grandpa Tato watches from the well and does not offer to help. Afterwards he says: "Your mother took three."',
      'One flame is not an order. It is one flame. You go and find the next one.',
    ],
    hint: 'Grow stronger. The wilds have had years to settle in.',
    when: (c) => c.level >= 3,
    reward: { item: 'tonic', n: 3, label: 'Tonic x3' },
  },
  {
    id: 'the-wilds',
    title: 'III · What Came Back',
    lines: [
      'The things in the long grass are not animals. They are what fills a place when nobody is watching it.',
      'They will not cross lit ground. That is the entire secret of the order, and it is why nobody ever thought the work was dangerous.',
      'Forty-one people found out otherwise in one night.',
    ],
    hint: 'Clear the wilds. Twenty of them should make a point.',
    when: (c) => c.kills >= 20,
    reward: { item: 'forge_stone', n: 4, label: 'Forge Stone x4' },
  },
  {
    id: 'the-sea',
    title: 'IV · The Drowned Road',
    lines: [
      'There was a road south-east once. The sea took it, and the islands are what is left of the waystations.',
      'Your mother crossed it every spring to light the far lamps. She never once said what was out there, and you never once asked.',
      'The water is warm. The lanterns on those rocks have been dark a long time.',
    ],
    hint: 'The marina keeps a boat. Go and see what is out there.',
    when: (c) => c.swam,
    reward: { coins: 250, label: '250 coins' },
  },
  {
    id: 'the-craft',
    title: 'V · A Keeper Travels',
    lines: [
      'A keeper walked their circuit. You will not — the circuit is longer now, and half of it is water.',
      'The old moorings still hold. Whoever left these here meant them to be used again.',
      'You are further from the village than you have ever been, and the lights behind you are still on.',
    ],
    hint: 'Reach the islands. Somebody was out there before you.',
    when: (c) => c.visitedIsland,
    reward: { item: 'potion_luck', n: 2, label: 'Lucky Charm x2' },
  },
  {
    id: 'the-keeper',
    title: 'VI · What the Order Was For',
    lines: [
      'On the far rock, under a torii the salt has eaten pale, there is a lantern with your mother\'s mark cut into the base.',
      'It is the furthest lamp on the register and the last one she ever lit. The wick is long gone. The mark is not.',
      '"We were never keeping the dark out," she said once, at the gate, in the voice she used when you had asked something obvious. "We were keeping the place worth coming back to."',
      'You were annoyed with her that evening. You would like her to know that you understood it eventually.',
    ],
    hint: 'Anavela is yours to keep. Build something that lasts.',
    when: (c) => c.level >= 12 && c.visitedIsland,
    reward: { cosmetic: 'hat_crown', label: 'Keeper\'s Crown', big: true },
  },
  {
    id: 'the-home',
    title: 'VII · Somewhere To Come Back To',
    lines: [
      'A house with a light in the window is the entire argument of the order, in one object.',
      'People stop by without a reason, which is the thing nobody in Anavela has done in eleven years.',
      'You never got past the gate as a child. You have now walked every road on the register, and the lamps behind you are all burning.',
      'Forty-one names, and none of them went out for nothing.',
    ],
    hint: 'Anavela is lit. Go and enjoy it.',
    when: (c) => c.hasHome && c.level >= 15,
    reward: { mount: 'mount_nimbus', label: 'NIMBUS MOUNT', grand: true },
  },
];

export function createStory({ grant, onChapter }) {
  const state = { seen: [], hint: CHAPTERS[0].hint };

  function load(data) {
    if (!data) return;
    state.seen = Array.isArray(data.seen) ? data.seen : [];
    const last = CHAPTERS.filter((c) => state.seen.includes(c.id)).pop();
    if (last) state.hint = last.hint;
  }
  const serialize = () => ({ seen: state.seen });

  /** The next chapter that has not been seen yet, or null when the arc is done. */
  const next = () => CHAPTERS.find((c) => !state.seen.includes(c.id)) || null;

  /**
   * Called with the live game state; advances at most one chapter per call so
   * two chapters never fire on top of each other.
   */
  function check(ctx) {
    const c = next();
    if (!c || !c.when(ctx)) return null;
    state.seen.push(c.id);
    state.hint = c.hint;
    if (c.reward) grant(c.reward);
    onChapter?.(c);
    return c;
  }

  /** Everything read so far, for a journal view. */
  const read = () => CHAPTERS.filter((c) => state.seen.includes(c.id));
  const progress = () => `${state.seen.length}/${CHAPTERS.length}`;

  return { state, load, serialize, check, next, read, progress, CHAPTERS };
}
