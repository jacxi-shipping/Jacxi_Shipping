import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { runWithConcurrency } from './concurrency.ts';

describe('runWithConcurrency', () => {
  test('processes all items', async () => {
    const items = [1, 2, 3, 4, 5];
    const processed: number[] = [];

    await runWithConcurrency(items, async (item) => {
      processed.push(item);
    }, 2);

    assert.deepStrictEqual(processed.sort(), items.sort());
  });

  test('respects concurrency limit', async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 10 }, (_, i) => i);

    await runWithConcurrency(items, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async work
      active--;
    }, 3);

    assert.ok(maxActive <= 3, `Expected max concurrency <= 3, got ${maxActive}`);
  });

  test('performance: concurrent vs sequential', async () => {
    const items = Array.from({ length: 5 }, (_, i) => i);
    const taskDuration = 50; // ms

    const task = async () => {
      await new Promise(resolve => setTimeout(resolve, taskDuration));
    };

    // Baseline: Sequential execution
    const startSequential = Date.now();
    for (const item of items) {
      await task();
    }
    const durationSequential = Date.now() - startSequential;

    // Test: Concurrent execution (concurrency 2)
    const startConcurrent = Date.now();
    await runWithConcurrency(items, task, 2);
    const durationConcurrent = Date.now() - startConcurrent;

    console.log(`Sequential: ${durationSequential}ms`);
    console.log(`Concurrent (limit 2): ${durationConcurrent}ms`);

    // Sequential should take roughly 5 * 50 = 250ms
    // Concurrent should take roughly ceil(5/2) * 50 = 3 * 50 = 150ms
    // Allow some buffer for execution overhead

    assert.ok(durationConcurrent < durationSequential, 'Concurrent execution should be faster');
    assert.ok(durationConcurrent < (durationSequential * 0.8), 'Concurrent execution should be significantly faster');
  });
});
