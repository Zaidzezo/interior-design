import { performance } from "node:perf_hooks";
import {
  sampleScene,
  blankScene,
  rectangleRoom,
} from "../packages/core/src/sample";
import { analyze } from "../packages/core/src/geometry";
import { writeFileSync } from "node:fs";
const sample = sampleScene().floors[0];
const large = blankScene().floors[0];
large.rooms = [rectangleRoom("Benchmark", "Custom", 0, 0, 100, 100)];
const item = sample.items[0];
large.items = Array.from({ length: 1000 }, (_, i) => ({
  ...item,
  id: crypto.randomUUID(),
  x: 2 + (i % 32) * 3,
  y: 2 + Math.floor(i / 32) * 3,
  width: 1,
  depth: 1,
}));
const results = [];
for (const [name, floor] of [
  ["sample", sample],
  ["1000-separated-items", large],
] as const) {
  analyze(floor);
  const times = Array.from({ length: 20 }, () => {
    const t = performance.now();
    analyze(floor);
    return performance.now() - t;
  }).sort((a, b) => a - b);
  results.push({
    name,
    items: floor.items.length,
    runs: 20,
    medianMs: times[10],
    p95Ms: times[18],
    maxMs: times[19],
    issues: analyze(floor).length,
  });
}
writeFileSync(
  "artifacts/geometry-benchmark.json",
  JSON.stringify({ runtime: process.version, results }, null, 2),
);
console.log(JSON.stringify(results));
