// 踩踏用碰撞面接觸，不用垂直速度：分離當下速度可能已是 0。
export function resolveEnemyHit({
  enemyTouchingUp = false,
  hurtInvulnerable = false,
  invincible = false,
  playerTouchingDown = false,
  power = 'small',
} = {}) {
  if ((playerTouchingDown && enemyTouchingUp) || invincible) {
    return 'defeat';
  }

  if (hurtInvulnerable) {
    return 'ignore';
  }

  if (power === 'super' || power === 'fire') {
    return 'downgrade';
  }

  return 'death';
}
