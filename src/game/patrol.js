// 敵人只在出生點附近來回，避免整關同向走到同一面牆後擠在牆角。
export const PATROL_RANGE = 128;

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
