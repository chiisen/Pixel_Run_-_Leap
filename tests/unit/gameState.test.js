import { describe, expect, it } from 'vitest';

import {
  collectCoin,
  completeLevel,
  createGameState,
  damagePlayer,
  defeatEnemy,
  collectPowerUp,
  tickTimer,
} from '../../src/game/gameState.js';

describe('遊戲狀態', () => {
  it('建立預設的遊戲進行狀態', () => {
    expect(createGameState()).toEqual({
      coins: 0,
      invincible: false,
      lives: 3,
      paused: false,
      power: 'small',
      score: 0,
      status: 'playing',
      timeRemaining: 300,
    });
  });

  it('收集金幣時增加金幣數與分數', () => {
    const state = collectCoin(createGameState());

    expect(state.coins).toBe(1);
    expect(state.score).toBe(100);
  });

  it('擊敗敵人時增加 100 分且不改變生命', () => {
    const state = createGameState({ lives: 2 });

    expect(defeatEnemy(state)).toMatchObject({ score: 100, lives: 2 });
  });

  it('取得蘑菇時變大並增加分數', () => {
    const state = collectPowerUp(createGameState(), 'mushroom');

    expect(state).toMatchObject({ power: 'super', score: 1000 });
  });

  it('取得星星時啟用無敵並增加分數', () => {
    const state = collectPowerUp(createGameState(), 'star');

    expect(state).toMatchObject({ invincible: true, score: 1000 });
  });

  it('取得 1UP 時增加生命但不改變能力', () => {
    const state = collectPowerUp(createGameState({ lives: 2 }), '1up');

    expect(state).toMatchObject({ lives: 3, power: 'small', score: 1000 });
  });

  it('玩家受傷時減少生命且不修改原始狀態', () => {
    const original = createGameState();
    const damaged = damagePlayer(original);

    expect(damaged.lives).toBe(2);
    expect(damaged.status).toBe('playing');
    expect(original.lives).toBe(3);
  });

  it('失去最後一條生命時結束遊戲', () => {
    const state = createGameState({ lives: 1 });

    expect(damagePlayer(state)).toMatchObject({ lives: 0, status: 'game-over' });
  });

  it('倒數時間歸零時結束遊戲', () => {
    const state = createGameState({ timeRemaining: 2 });

    expect(tickTimer(state, 2)).toMatchObject({
      status: 'game-over',
      timeRemaining: 0,
    });
  });

  it('通關時標記完成且保留原有分數', () => {
    const state = createGameState({ score: 500 });

    expect(completeLevel(state)).toMatchObject({ status: 'complete', score: 500 });
  });
});
