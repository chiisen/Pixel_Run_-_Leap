import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionLogger } from '../../src/game/actionLogger.js';

describe('ActionLogger', () => {
  let logger;
  let mockConsoleLog;

  beforeEach(() => {
    mockConsoleLog = vi.fn();
    logger = new ActionLogger({
      maxSize: 3,
      consoleOutput: true,
      loggerFn: mockConsoleLog,
    });
  });

  it('記錄事件並指派遞增 ID 與時間戳記', () => {
    const entry = logger.log('input', 'key_down', { key: 'ArrowRight' });
    expect(entry).toMatchObject({
      id: 1,
      category: 'input',
      action: 'key_down',
      details: { key: 'ArrowRight' },
    });
    expect(entry.timestamp).toBeTypeOf('number');
    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
  });

  it('超過 maxSize 時維護環形緩衝區，淘汰最舊記錄', () => {
    logger.log('input', 'key1');
    logger.log('input', 'key2');
    logger.log('input', 'key3');
    logger.log('input', 'key4');

    const logs = logger.getLogs();
    expect(logs).toHaveLength(3);
    expect(logs.map((l) => l.action)).toEqual(['key2', 'key3', 'key4']);
  });

  it('支援依 category、action 與 limit 進行過濾查詢', () => {
    logger = new ActionLogger({ maxSize: 10, consoleOutput: false });
    logger.log('input', 'press', { key: 'Space' });
    logger.log('combat', 'stomp', { enemy: 'goomba' });
    logger.log('combat', 'stomp', { enemy: 'turtle' });
    logger.log('item', 'coin');

    expect(logger.getLogs({ category: 'combat' })).toHaveLength(2);
    expect(logger.getLogs({ action: 'coin' })).toHaveLength(1);
    expect(logger.getLogs({ limit: 2 })).toHaveLength(2);
    expect(logger.getLogs({ limit: 2 })[1].action).toBe('coin');
  });

  it('清空與開關 console 輸出', () => {
    logger.setConsoleOutput(false);
    logger.log('input', 'press');
    expect(mockConsoleLog).not.toHaveBeenCalled();

    logger.clear();
    expect(logger.getLogs()).toHaveLength(0);
  });

  it('支援匯出 JSON 字串', () => {
    logger.log('system', 'start');
    const json = logger.exportLogs();
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].action).toBe('start');
  });

  it('支援記錄快照與 gameTime 並格式化輸出', () => {
    const entry = logger.log('player', 'jump', { speed: 10 }, { x: 100, y: 200, gameTime: 12.5 });
    expect(entry.snapshot).toEqual({ x: 100, y: 200, gameTime: 12.5 });
    expect(entry.gameTime).toBe(12.5);
    expect(mockConsoleLog).toHaveBeenCalledWith(
      '[PixelRun][PLAYER] jump (x:100, y:200) {"speed":10}',
    );
  });
});
