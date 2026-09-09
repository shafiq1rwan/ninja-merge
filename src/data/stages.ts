import type { RegionDef, StageDef } from '../types';

/**
 * World map: Village -> Forest -> Cave -> Mountain -> Desert -> Snow -> Demon Castle.
 * Each region = 5 normal battles + 1 boss. `level` feeds ENEMY_SCALING.
 */
interface RegionSpec {
  id: string;
  name: string;
  subtitle: string;
  theme: RegionDef['theme'];
  music: string;
  stageNames: string[];
  enemies: string[]; // 5 normal enemy ids
  boss: string;
  startLevel: number;
}

const SPECS: RegionSpec[] = [
  {
    id: 'forest', name: 'Bamboo Forest', subtitle: 'Where every journey begins', theme: 'forest', music: 'music_forest',
    stageNames: ['Forest 1', 'Forest 2', 'Forest 3', 'Forest 4', 'Forest 5', 'Forest Boss'],
    enemies: ['slime', 'bamboo', 'bat', 'mushroom', 'goblin'], boss: 'bamboo_titan', startLevel: 1,
  },
  {
    id: 'cave', name: 'Echo Cave', subtitle: 'Damp, dark and hungry', theme: 'cave', music: 'music_battle',
    stageNames: ['Cave 1', 'Cave 2', 'Cave 3', 'Cave 4', 'Cave 5', 'Cave Boss'],
    enemies: ['skull', 'bat', 'larva', 'spirit', 'mole'], boss: 'slime_king', startLevel: 7,
  },
  {
    id: 'mountain', name: 'Stone Mountain', subtitle: 'Thin air, thick hides', theme: 'mountain', music: 'music_battle',
    stageNames: ['Mountain 1', 'Mountain 2', 'Mountain 3', 'Mountain 4', 'Mountain 5', 'Mountain Boss'],
    enemies: ['bear', 'owl', 'racoon', 'eye', 'cyclope'], boss: 'racoon_chief', startLevel: 13,
  },
  {
    id: 'desert', name: 'Sunscar Desert', subtitle: 'Nothing here forgives', theme: 'desert', music: 'music_battle',
    stageNames: ['Desert 1', 'Desert 2', 'Desert 3', 'Desert 4', 'Desert 5', 'Desert Boss'],
    enemies: ['snake', 'lizard', 'reptile', 'skeleton', 'spider'], boss: 'tengu', startLevel: 19,
  },
  {
    id: 'snow', name: 'Frostveil Peaks', subtitle: 'Silence, then teeth', theme: 'snow', music: 'music_battle',
    stageNames: ['Snow 1', 'Snow 2', 'Snow 3', 'Snow 4', 'Snow 5', 'Snow Boss'],
    enemies: ['yellowbat', 'mouse', 'spirit', 'beast', 'mage'], boss: 'frost_spirit', startLevel: 25,
  },
  {
    id: 'castle', name: 'Demon Castle', subtitle: 'The end of the road', theme: 'castle', music: 'music_boss',
    stageNames: ['Castle 1', 'Castle 2', 'Castle 3', 'Castle 4', 'Castle 5', 'Demon Lord'],
    enemies: ['skeleton_demon', 'demon', 'samurai', 'dark_ninja', 'master'], boss: 'demon_lord', startLevel: 31,
  },
];

export const REGIONS: RegionDef[] = SPECS.map((spec) => {
  const stages: StageDef[] = spec.stageNames.map((name, index) => ({
    id: `${spec.id}_${index + 1}`,
    name,
    regionId: spec.id,
    index,
    enemyId: index === 5 ? spec.boss : spec.enemies[index],
    level: spec.startLevel + index,
    isBoss: index === 5,
  }));
  return { id: spec.id, name: spec.name, subtitle: spec.subtitle, theme: spec.theme, music: spec.music, stages };
});

export const ALL_STAGES: StageDef[] = REGIONS.flatMap((r) => r.stages);

export function getStage(id: string): StageDef {
  const s = ALL_STAGES.find((st) => st.id === id);
  if (!s) throw new Error(`Unknown stage ${id}`);
  return s;
}

export function getRegion(id: string): RegionDef {
  const r = REGIONS.find((rg) => rg.id === id);
  if (!r) throw new Error(`Unknown region ${id}`);
  return r;
}

/** The stage after `id`, crossing into the next region; null after the final boss. */
export function nextStage(id: string): StageDef | null {
  const i = ALL_STAGES.findIndex((s) => s.id === id);
  return i >= 0 && i + 1 < ALL_STAGES.length ? ALL_STAGES[i + 1] : null;
}

export const FIRST_STAGE_ID = ALL_STAGES[0].id;
