// 貼圖預設朝右。往左走才需要水平翻轉。
export function turtleFlipX(velocityX) {
  return velocityX < 0;
}

// 腳底低於關卡底邊代表已經掉進洞裡，不再站在地板上。
export function hasFallenPastFloor(bodyBottom, floorBottom) {
  return bodyBottom > floorBottom;
}

export const DEATH_HOP_VELOCITY = -360;
export const DEATH_MIN_MS = 700;

// 死亡要先往上彈、再掉出畫面，時間未到不能重生。
export function deathFallFinished({ elapsedMs, playerY, screenBottom, minMs = DEATH_MIN_MS }) {
  return elapsedMs >= minMs && playerY > screenBottom;
}

// 垂直速度不再往上時，人已過最高點，落下時頭腳顛倒。
export function deathUpsideDown(velocityY) {
  return velocityY >= 0;
}
