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

/**
 * Runs `arrange` with the Jasmine mock clock installed, then uninstalls it,
 * even if `arrange` throws.
 *
 * For a test that needs real timers afterwards, such as an axe check, and so
 * cannot be `fakeAsync`: the mock clock captures the timers `arrange`
 * starts, and discards those still pending on uninstall rather than letting
 * them fire during a later test.
 */
export function withMockClock(arrange: () => void): void {
  jasmine.clock().install();
  try {
    arrange();
  } finally {
    jasmine.clock().uninstall();
  }
}
