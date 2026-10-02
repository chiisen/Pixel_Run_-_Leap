// 貼圖預設朝左。往右走才需要水平翻轉。
export function turtleFlipX(velocityX) {
  return velocityX > 0;
}

// 腳底低於關卡底邊代表已經掉進洞裡，不再站在地板上。
export function hasFallenPastFloor(bodyBottom, floorBottom) {
  return bodyBottom > floorBottom;
}
