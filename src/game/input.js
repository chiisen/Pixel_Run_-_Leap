export const MOVE_SPEED = 140;

// 鍵盤與觸控先轉成左右布林，再共用這次換算。同時按左右時左邊優先。
export function resolveHorizontalMove({ crouching = false, left = false, right = false } = {}) {
  if (crouching || (!left && !right)) {
    return { facing: null, velocityX: 0 };
  }

  if (left) {
    return { facing: 'left', velocityX: -MOVE_SPEED };
  }

  return { facing: 'right', velocityX: MOVE_SPEED };
}
