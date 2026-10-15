import { Page, test } from '@playwright/test';
import type { AxeResults, NodeResult } from 'axe-core';

/** A failed axe rule: its id and the HTML of the offending nodes. */
export type AxeViolationSummary = [string, string[]];

/** Marks the element whose text the contrast measure hides. */
const MEASURED_ATTRIBUTE = 'data-e2e-contrast-measure';

/** The minimum ratios of WCAG 1.4.3 (AA). */
const NORMAL_TEXT_RATIO = 4.5;
const LARGE_TEXT_RATIO = 3;

/**
 * Runs axe on the page and lists its violations, so that a failing
 * `expect(...).toEqual([])` names the rules and the nodes at fault.
 *
 * The content of the iframes, the Vimeo player, is left out: only the
 * application is checked, the iframe element included (`frame-title`).
 *
 * axe cannot decide the contrast of text over an image or a gradient and
 * reports it as incomplete: that contrast is measured on a screenshot of
 * the text, against its least favourable background pixel, and listed as a
 * `color-contrast` violation when below the ratio WCAG requires.
 *
 * axe needs timers: when the test has paused the clock of the page, pass
 * `pausedClock`, and the clock moves 1 ms at a time until axe is done.
 * `disabledRules` leaves out the given rules.
 */
export async function axeViolations(
  page: Page,
  { pausedClock = false, disabledRules = [] as readonly string[] } = {},
): Promise<AxeViolationSummary[]> {
  await waitForAnimations(page);
  await injectAxe(page);
  const results = await runAxe(page, pausedClock, disabledRules);
  await test.info().attach('axe results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  const violations: AxeViolationSummary[] = results.violations.map(
    (violation) => [violation.id, violation.nodes.map((node) => node.html)],
  );
  const lowContrastNodes = await measureIncompleteContrasts(page, results);
  if (lowContrastNodes.length > 0) {
    violations.push(['color-contrast', lowContrastNodes]);
  }
  return violations;
}

async function runAxe(
  page: Page,
  pausedClock: boolean,
  disabledRules: readonly string[],
): Promise<AxeResults> {
  await page.evaluate((disabledRules) => {
    delete window.axeResults;
    void window.axe
      .run(document, {
        iframes: false,
        resultTypes: ['violations', 'incomplete'],
        rules: Object.fromEntries(
          disabledRules.map((rule) => [rule, { enabled: false }]),
        ),
      })
      .then((results) => (window.axeResults = results));
  }, disabledRules);
  if (pausedClock) {
    while (!(await page.evaluate(() => 'axeResults' in window))) {
      await page.clock.runFor(1);
    }
  }
  await page.waitForFunction(() => 'axeResults' in window);
  return page.evaluate(() => window.axeResults!);
}

async function injectAxe(page: Page): Promise<void> {
  if (await page.evaluate(() => 'axe' in window)) {
    return;
  }
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
}

/** Waits until the animations with an end, such as the quiz fade-in, end. */
async function waitForAnimations(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) =>
          Number.isFinite(animation.effect?.getComputedTiming().endTime),
        )
        .map((animation) => animation.finished),
    ),
  );
}

/** The HTML of the incomplete contrast nodes whose measure fails. */
async function measureIncompleteContrasts(
  page: Page,
  results: AxeResults,
): Promise<string[]> {
  const nodes =
    results.incomplete.find((result) => result.id === 'color-contrast')
      ?.nodes ?? [];
  const failures: string[] = [];
  for (const node of nodes) {
    const { ratio, expected } = await measureContrast(page, node);
    if (ratio < expected) {
      failures.push(`${node.html} (measured ${ratio.toFixed(2)}:1)`);
    }
  }
  return failures;
}

/**
 * Measures the contrast of the text of `node`: hides the text, takes a
 * screenshot of each line box and compares the text colour with each
 * background pixel.
 */
async function measureContrast(
  page: Page,
  node: NodeResult,
): Promise<{ ratio: number; expected: number }> {
  const selector = node.target.join(' ');
  const element = page.locator(selector);
  await element.scrollIntoViewIfNeeded();

  const { color, rects, expected } = await element.evaluate(
    (target, { attribute, normal, large }) => {
      const style = getComputedStyle(target);
      const fontSize = parseFloat(style.fontSize);
      const isBold = Number(style.fontWeight) >= 700;
      // WCAG large text: 18 pt, or 14 pt in bold (1 pt = 4/3 px).
      const isLarge = fontSize >= 24 || (isBold && fontSize >= 18.66);
      const range = document.createRange();
      range.selectNodeContents(target);
      const rects = [...range.getClientRects()]
        .filter((rect) => rect.width >= 1 && rect.height >= 1)
        .map(({ x, y, width, height }) => ({ x, y, width, height }));
      target.setAttribute(attribute, '');
      return {
        color: style.color,
        rects,
        expected: isLarge ? large : normal,
      };
    },
    {
      attribute: MEASURED_ATTRIBUTE,
      normal: NORMAL_TEXT_RATIO,
      large: LARGE_TEXT_RATIO,
    },
  );

  const hideText = await page.addStyleTag({
    content: `[${MEASURED_ATTRIBUTE}], [${MEASURED_ATTRIBUTE}] * {
      color: transparent !important;
      text-shadow: none !important;
      caret-color: transparent !important;
    }`,
  });
  try {
    let ratio = Infinity;
    for (const rect of rects) {
      const screenshot = await page.screenshot({ clip: rect });
      ratio = Math.min(
        ratio,
        await page.evaluate(lowestContrast, {
          png: screenshot.toString('base64'),
          color,
        }),
      );
    }
    return { ratio, expected };
  } finally {
    await hideText.evaluate((style) => (style as HTMLStyleElement).remove());
    await element.evaluate(
      (target, attribute) => target.removeAttribute(attribute),
      MEASURED_ATTRIBUTE,
    );
  }
}

/**
 * Runs in the page, which decodes the PNG: the lowest contrast between the
 * CSS colour `color`, blended over each pixel when translucent, and the
 * pixels of the screenshot.
 */
async function lowestContrast({
  png,
  color,
}: {
  png: string;
  color: string;
}): Promise<number> {
  const bytes = Uint8Array.from(atob(png), (char) => char.charCodeAt(0));
  const bitmap = await createImageBitmap(
    new Blob([bytes], { type: 'image/png' }),
  );
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d')!;
  context.drawImage(bitmap, 0, 0);
  const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);

  const [red, green, blue, alpha = 1] = (color.match(/[\d.]+/g) ?? []).map(
    Number,
  );
  const channel = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (r: number, g: number, b: number) =>
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

  let lowest = Infinity;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const text = luminance(
      red * alpha + r * (1 - alpha),
      green * alpha + g * (1 - alpha),
      blue * alpha + b * (1 - alpha),
    );
    const background = luminance(r, g, b);
    const ratio =
      (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
    lowest = Math.min(lowest, ratio);
  }
  return lowest;
}

declare global {
  interface Window {
    axe: typeof import('axe-core');
    axeResults?: AxeResults;
  }
}
