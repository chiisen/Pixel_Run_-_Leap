const DEFAULT_GAME_STATE = {
  coins: 0,
  invincible: false,
  lives: 3,
  paused: false,
  power: 'small',
  score: 0,
  status: 'playing',
  timeRemaining: 300,
};

// 使用不可變狀態，讓單元測試與 Phaser 場景都能安全保存前一個狀態。
export function createGameState(overrides = {}) {
  return { ...DEFAULT_GAME_STATE, ...overrides };
}

// 每枚金幣固定增加 100 分；amount 讓測試與關卡資料可一次套用多枚金幣。
export function collectCoin(state, amount = 1) {
  return {
    ...state,
    coins: state.coins + amount,
    score: state.score + amount * 100,
  };
}

// 踩踏敵人固定增加 100 分，生命與流程狀態維持不變。
export function defeatEnemy(state) {
  return { ...state, score: state.score + 100 };
}

// 道具效果集中在狀態層，畫面只負責呈現能力並處理碰撞。
export function collectPowerUp(state, type) {
  const base = { ...state, score: state.score + 1000 };

  switch (type) {
    case 'mushroom':
      return { ...base, power: 'super' };
    case 'star':
      return { ...base, invincible: true };
    case 'flower':
      return { ...base, power: 'fire' };
    case '1up':
      return { ...base, lives: state.lives + 1 };
    default:
      return state;
  }
}

// 暫停不影響生命、分數與流程狀態，只由場景控制物理、計時與音效是否停止。
export function togglePause(state) {
  return { ...state, paused: !state.paused };
}

// 生命歸零才進入 Game Over，受傷但仍有生命時維持目前遊戲狀態。
export function damagePlayer(state) {
  const lives = Math.max(0, state.lives - 1);

  return {
    ...state,
    lives,
    status: lives === 0 ? 'game-over' : state.status,
  };
}

// 倒數不可低於零，時間耗盡與失去最後生命使用相同的結束狀態。
export function tickTimer(state, seconds = 1) {
  const timeRemaining = Math.max(0, state.timeRemaining - seconds);

  return {
    ...state,
    status: timeRemaining === 0 ? 'game-over' : state.status,
    timeRemaining,
  };
}

// 通關只改變流程狀態，不改動玩家目前累積的分數與資源。
export function completeLevel(state) {
  return { ...state, status: 'complete' };
}
