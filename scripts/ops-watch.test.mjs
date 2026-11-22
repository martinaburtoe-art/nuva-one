import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import * as ts from "typescript";

const sourceText = await readFile(new URL("./ops-watch.mjs", import.meta.url), "utf8");
const sourceFile = ts.createSourceFile(
  "ops-watch.mjs",
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
);

function findRecordMetricCalls(node, calls = []) {
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "recordMetric"
  ) {
    calls.push(node);
  }

  ts.forEachChild(node, (child) => findRecordMetricCalls(child, calls));
  return calls;
}

describe("Production Watch metric persistence", () => {
  it("does not call the removed recordMetric writer before an ops_metrics contract exists", () => {
    const calls = findRecordMetricCalls(sourceFile);
    expect(calls).toHaveLength(0);
  });
});
