import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SPAWN_TYPE,
  buildSpawnTable,
  resolveSpawnType,
} from '../../src/game/questionBlocks.js';

describe('問號磚生成對照', () => {
  it('有蘑菇標記的磚格回傳 mushroom', () => {
    const table = buildSpawnTable([{ name: 'mushroom', tileX: 21, tileY: 9 }]);

    expect(resolveSpawnType(table, 21, 9)).toBe('mushroom');
  });

  it('未標記磚格預設回傳 coin', () => {
    const table = buildSpawnTable([{ name: 'mushroom', tileX: 21, tileY: 9 }]);

    expect(resolveSpawnType(table, 5, 5)).toBe(DEFAULT_SPAWN_TYPE);
  });

  it('未知名稱標記視為 coin', () => {
    const table = buildSpawnTable([{ name: 'mystery', tileX: 3, tileY: 3 }]);

    expect(resolveSpawnType(table, 3, 3)).toBe('coin');
  });

  it('空表回傳 coin', () => {
    expect(resolveSpawnType(buildSpawnTable([]), 0, 0)).toBe('coin');
  });
});
