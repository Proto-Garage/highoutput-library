import debug, { Debugger } from 'debug';
import LRU from 'lru-cache';

type Argument = number | string | Error | object;

const loggers: LRU<string, Debugger> = new LRU({
  max: 32768,
});

class Logger {
  private tags: string[] | undefined;

  constructor(tags?: string | string[]) {
    if (tags) {
      this.tags = (tags instanceof Array)? tags: [tags];
    }
  }

  tag(tags: string | string[]): Logger {
    return new Logger([
      ...((this.tags || []).slice(0) as string[]),
      ...((tags instanceof Array)? tags: [tags]),
    ]);
  }

  log(level: string, ...args: Argument[]): void {
    const logger = loggers.get(level) || debug(level);

    if (!loggers.get(level)) {
      loggers.set(level, logger);
    }

    args
      .map((item: Argument) => {
        if (item instanceof Error) {
          const obj = { message: item.message };

          Object.getOwnPropertyNames(item).forEach(property => {
            (obj as any)[property] = 
              (typeof (item as any)[property] === 'string') ?
                (item as any)[property].replace(/\n/g, '\\n') :
                (item as any)[property];
          });

          return obj;
        }

        if (typeof item === 'string') {
          return item.replace(/\n/g, '\\n');
        }

        if (typeof item === 'number') {
          return item.toString();
        }

        return item;
      })
      .map(item => {
        return JSON.stringify({ 
          tags: this.tags, 
          ...(process.env.SERVICE_NAME)? { service: process.env.SERVICE_NAME } : {},
          message: item, 
        });
      })
      .forEach(item => logger(item));
  }

  critical(...args: Argument[]): void {
    this.log.apply(this, ['critical', ...args]);
  }

  error(...args: Argument[]): void {
    this.log.apply(this, ['error', ...args]);
  }

  warn(...args: Argument[]): void {
    this.log.apply(this, ['warn', ...args]);
  }

  info(...args: Argument[]): void {
    this.log.apply(this, ['info', ...args]);
  }

  verbose(...args: Argument[]): void {
    this.log.apply(this, ['verbose', ...args]);
  }

  silly(...args: Argument[]): void {
    this.log.apply(this, ['silly', ...args]);
  }
}

export default Logger;
