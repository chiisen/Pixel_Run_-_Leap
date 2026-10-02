// 敵人只在出生點附近來回，避免整關同向走到同一面牆後擠在牆角。
export const PATROL_RANGE = 128;

// 側面碰撞會把玩家速度疊進敵人。絕對值不得超過出生巡邏速率，方向維持原樣。
export function clampPatrolSpeed(velocityX, speed) {
  if (!velocityX || !speed) {
    return velocityX;
  }

  const limit = Math.abs(speed);
  return Math.sign(velocityX) * Math.min(Math.abs(velocityX), limit);
}

export function applyPatrolLeash({ x, homeX, velocityX, range = PATROL_RANGE }) {
  if (!velocityX) {
    return velocityX;
  }

  if (x >= homeX + range && velocityX > 0) {
    return -Math.abs(velocityX);
  }

  if (x <= homeX - range && velocityX < 0) {
    return Math.abs(velocityX);
  }

  return velocityX;
}
