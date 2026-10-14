/**
 * Resolves after `milliseconds` of real time. With no argument, it resolves
 * on the next macrotask, once the pending promise callbacks and the
 * `setTimeout` callbacks already due have run.
 *
 * Relies on real timers: do not call it inside `fakeAsync`.
 */
export function sleep(milliseconds = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
