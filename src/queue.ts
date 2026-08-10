export class AsyncQueue<T> implements AsyncIterable<T> {
  private values: T[] = [];
  private waiting: ((result: IteratorResult<T>) => void)[] = [];
  private closed = false;
  push(value: T) { const resolve = this.waiting.shift(); if (resolve) resolve({ value, done: false }); else if (!this.closed) this.values.push(value); }
  close() { this.closed = true; while (this.waiting.length) this.waiting.shift()!({ value: undefined as never, done: true }); }
  async *[Symbol.asyncIterator](): AsyncIterator<T> { while (this.values.length || !this.closed) { if (this.values.length) yield this.values.shift()!; else { const item = await new Promise<IteratorResult<T>>((resolve) => this.waiting.push(resolve)); if (item.done) return; yield item.value; } } }
}
