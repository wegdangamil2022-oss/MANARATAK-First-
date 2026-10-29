/** Each lease belongs to one session epoch; canceled pages never retain a queue slot. */
export class AdminRequestQueue {
  private active = 0;
  private epoch = 0;
  private waiting: Array<{ start: () => void; cancel: () => void }> = [];

  constructor(private readonly limit: number) {}

  acquire(signal: AbortSignal): Promise<() => void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new Error('REQUEST_ABORTED'));
      const epoch = this.epoch;
      const ticket = {
        start: () => {
          signal.removeEventListener('abort', cancel);
          this.active++;
          let released = false;
          resolve(() => {
            if (released || epoch !== this.epoch) return;
            released = true;
            this.active--;
            this.waiting.shift()?.start();
          });
        },
        cancel: () => cancel(),
      };
      const cancel = () => {
        signal.removeEventListener('abort', cancel);
        this.waiting = this.waiting.filter((row) => row !== ticket);
        reject(new Error('REQUEST_ABORTED'));
      };
      if (this.active < this.limit) ticket.start();
      else {
        this.waiting.push(ticket);
        signal.addEventListener('abort', cancel, { once: true });
      }
    });
  }

  reset(): void {
    this.epoch++;
    this.active = 0;
    const waiting = this.waiting;
    this.waiting = [];
    for (const ticket of waiting) ticket.cancel();
  }
}
