import { describe, expect, it } from 'vitest';

import { resolveEnemyHit } from '../../src/game/combat.js';
import { createGameState, togglePause } from '../../src/game/gameState.js';
import { resolveHorizontalMove } from '../../src/game/input.js';
import { assignPowerUpMarkers } from '../../src/game/levelSpawns.js';
import { buildEnemySpawn } from '../../src/entities/enemySpawn.js';
import { applyPatrolLeash } from '../../src/game/patrol.js';

describe('暫停', () => {
  it('切換暫停且不改生命與分數', () => {
    const playing = createGameState({ score: 200 });

    const paused = togglePause(playing);

    expect(paused.paused).toBe(true);
    expect(paused.score).toBe(200);
    expect(togglePause(paused).paused).toBe(false);
  });
});

describe('輸入轉換', () => {
  it('鍵盤向右與觸控向右得到相同速度', () => {
    const keyboard = resolveHorizontalMove({ right: true });
    const touch = resolveHorizontalMove({ right: true });

    expect(keyboard).toEqual(touch);
    expect(keyboard).toEqual({ facing: 'right', velocityX: 140 });
  });

  it('向左為負速度，蹲下或沒有方向時停止', () => {
    expect(resolveHorizontalMove({ left: true })).toEqual({ facing: 'left', velocityX: -140 });
    expect(resolveHorizontalMove({ crouching: true, right: true }).velocityX).toBe(0);
    expect(resolveHorizontalMove().velocityX).toBe(0);
  });

  it('同時按左右時左邊優先', () => {
    expect(resolveHorizontalMove({ left: true, right: true }).facing).toBe('left');
  });
});

describe('敵人碰撞', () => {
  it('腳底碰上敵人頭頂視為踩踏，即使沒有向下速度', () => {
    expect(resolveEnemyHit({ enemyTouchingUp: true, playerTouchingDown: true })).toBe('defeat');
  });

  it('無敵直接擊敗，受傷冷卻穿過，大型掉能力，小型死亡', () => {
    expect(resolveEnemyHit({ invincible: true })).toBe('defeat');
    expect(resolveEnemyHit({ hurtInvulnerable: true })).toBe('ignore');
    expect(resolveEnemyHit({ power: 'fire' })).toBe('downgrade');
    expect(resolveEnemyHit({ power: 'small' })).toBe('death');
  });
});

describe('關卡標記', () => {
  const tiles = [
    { centerX: 352, tileX: 22, tileY: 5 },
    { centerX: 368, tileX: 23, tileY: 9 },
  ];

  it('相鄰問號磚掛上花朵，沒有空磚時才靜態擺放', () => {
    const assigned = assignPowerUpMarkers(
      [{ name: 'flower', type: 'powerUp', x: 352, y: 96 }],
      tiles,
    );

    expect(assigned.entries).toEqual([{ name: 'flower', tileX: 22, tileY: 5 }]);
    expect(assigned.statics).toEqual([]);
  });

  it('沒有相鄰磚時改掛最近的空閒問號磚', () => {
    const assigned = assignPowerUpMarkers(
      [{ name: '1up', type: 'powerUp', x: 1000, y: 144 }],
      tiles,
    );

    expect(assigned.entries[0]).toMatchObject({ name: '1up', tileX: 23, tileY: 9 });
  });
});

describe('敵人出生資料', () => {
  it('烏龜出生點比 goomba 再上移，速度較慢', () => {
    expect(buildEnemySpawn({ levelOffsetY: 10, name: 'turtle', x: 100, y: 200 })).toMatchObject({
      speed: -25,
      y: 186,
    });
    expect(buildEnemySpawn({ levelOffsetY: 10, name: 'goomba', x: 100, y: 200 }).y).toBe(194);
  });
});

describe('巡邏範圍', () => {
  it('走出出生點右側範圍就向左，左側範圍就向右', () => {
    expect(applyPatrolLeash({ homeX: 400, velocityX: 35, x: 528 })).toBe(-35);
    expect(applyPatrolLeash({ homeX: 400, velocityX: -35, x: 272 })).toBe(35);
    expect(applyPatrolLeash({ homeX: 400, velocityX: -35, x: 390 })).toBe(-35);
  });
});
