// 問號磚頂出生成的純邏輯：標記 -> 磚格 -> 道具種類。
// 無標記或未知種類一律回傳金幣，場景只負責呈現與物理。
export const QUESTION_BLOCK_INDEX = 41;
export const USED_BLOCK_INDEX = 40;
export const DEFAULT_SPAWN_TYPE = 'coin';

const KNOWN_SPAWN_TYPES = ['coin', 'flower', 'mushroom', 'star', '1up'];

export function buildSpawnTable(entries = []) {
  const table = {};

  entries.forEach(({ name, tileX, tileY }) => {
    table[`${tileX},${tileY}`] = KNOWN_SPAWN_TYPES.includes(name) ? name : DEFAULT_SPAWN_TYPE;
  });

  return table;
}

export function resolveSpawnType(table, tileX, tileY) {
  return table[`${tileX},${tileY}`] ?? DEFAULT_SPAWN_TYPE;
}
