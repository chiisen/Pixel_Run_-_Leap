export const TILE_SIZE = 16;
export const POWER_UP_NAMES = ['coin', 'flower', 'mushroom', 'star', '1up'];

export function questionBlockNear(x, y, tiles) {
  const tileX = Math.floor(x / TILE_SIZE);
  const tileY = Math.floor(y / TILE_SIZE);
  const occupied = new Set(tiles.map((tile) => `${tile.tileX},${tile.tileY}`));

  for (const candidateY of [tileY - 1, tileY, tileY + 1]) {
    if (occupied.has(`${tileX},${candidateY}`)) {
      return { tileX, tileY: candidateY };
    }
  }

  return null;
}

// 相鄰問號磚優先；沒有相鄰磚時改掛最近的空閒問號磚；都沒有才靜態擺放。
export function assignPowerUpMarkers(markers = [], questionTiles = []) {
  const entries = [];
  const statics = [];
  const usedKeys = new Set();
  const tiles = questionTiles.map((tile) => ({
    centerX: tile.centerX ?? tile.pixelX + TILE_SIZE / 2,
    tileX: tile.tileX,
    tileY: tile.tileY,
  }));

  markers
    .filter(({ name, type }) => type === 'powerUp' && POWER_UP_NAMES.includes(name))
    .forEach(({ name, x, y }) => {
      const block = questionBlockNear(x, y, tiles);

      if (block) {
        entries.push({ name, ...block });
        usedKeys.add(`${block.tileX},${block.tileY}`);
        return;
      }

      const spare = tiles
        .filter((tile) => !usedKeys.has(`${tile.tileX},${tile.tileY}`))
        .sort((a, b) => Math.abs(a.centerX - x) - Math.abs(b.centerX - x))[0];

      if (spare) {
        entries.push({ name, tileX: spare.tileX, tileY: spare.tileY });
        usedKeys.add(`${spare.tileX},${spare.tileY}`);
      } else {
        statics.push({ name, x, y });
      }
    });

  return { entries, statics };
}
