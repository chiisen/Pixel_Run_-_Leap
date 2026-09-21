export class ActionLogger {
  constructor(options = {}) {
    this.maxSize = options.maxSize ?? 200;
    this.consoleOutput = options.consoleOutput ?? true;
    // eslint-disable-next-line no-console
    this.loggerFn = options.loggerFn ?? console.log;
    this.logs = [];
    this.nextId = 1;
  }

  log(category, action, details = {}, snapshot = null) {
    const entry = {
      id: this.nextId++,
      timestamp: Date.now(),
      category,
      action,
      details: { ...details },
    };

    if (snapshot) {
      entry.snapshot = { ...snapshot };
      if (snapshot.gameTime !== undefined) {
        entry.gameTime = snapshot.gameTime;
      }
    }

    this.logs.push(entry);
    if (this.logs.length > this.maxSize) {
      this.logs.shift();
    }

    if (this.consoleOutput && typeof this.loggerFn === 'function') {
      const detailStr = Object.keys(details).length > 0 ? JSON.stringify(details) : '';
      const snapStr = snapshot ? ` (x:${snapshot.x}, y:${snapshot.y})` : '';
      this.loggerFn(
        `[PixelRun][${category.toUpperCase()}] ${action}${snapStr} ${detailStr}`.trim(),
      );
    }

    return entry;
  }

  getLogs(filter = {}) {
    let result = this.logs;

    if (filter.category) {
      result = result.filter((item) => item.category === filter.category);
    }
    if (filter.action) {
      result = result.filter((item) => item.action === filter.action);
    }
    if (typeof filter.limit === 'number' && filter.limit > 0) {
      result = result.slice(-filter.limit);
    }

    return result.map((entry) => ({
      ...entry,
      details: { ...entry.details },
      snapshot: entry.snapshot ? { ...entry.snapshot } : undefined,
    }));
  }

  clear() {
    this.logs = [];
  }

  setConsoleOutput(enabled) {
    this.consoleOutput = Boolean(enabled);
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}
