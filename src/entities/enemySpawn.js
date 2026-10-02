export function buildEnemySpawn({ levelOffsetY, name, x, y }) {
  const turtle = name === 'turtle';

  return {
    frame: turtle ? 'turtle/turtle0' : 'goomba/walk1',
    name,
    speed: turtle ? -25 : -35,
    x,
    // Tiled y 是物件底部，中心需上移半身高：goomba 16px、烏龜 24px。
    y: y - (turtle ? 24 : 16) + levelOffsetY,
  };
}
