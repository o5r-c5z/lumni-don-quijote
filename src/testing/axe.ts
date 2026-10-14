import axe from 'axe-core';

/** A failed axe rule: its id and the HTML of the offending nodes. */
export type AxeViolationSummary = [string, string[]];

/**
 * Runs axe on `element` and lists its violations, so that a failing
 * `expect(...).toEqual([])` names the rules and the nodes at fault.
 *
 * Incomplete results are ignored. `color-contrast` is disabled: Karma loads
 * neither the global styles nor the backgrounds, so contrast is checked in a
 * real browser instead.
 *
 * Relies on real timers: do not call it inside `fakeAsync`.
 */
export async function axeViolations(
  element: Element,
): Promise<AxeViolationSummary[]> {
  const results = await axe.run(element, {
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations.map((violation) => [
    violation.id,
    violation.nodes.map((node) => node.html),
  ]);
}
