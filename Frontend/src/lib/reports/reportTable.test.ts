import assert from "node:assert/strict";
import test from "node:test";

import { clampReportTablePage, compareReportTableValues } from "./reportTable.ts";

test("date sorting is chronological and keeps null values last", () => {
  assert.equal(
    compareReportTableValues("2026-03-10T12:00:00.000Z", "2026-03-11T12:00:00.000Z", "date", "asc") < 0,
    true,
  );
  assert.equal(
    compareReportTableValues(null, "2026-03-11T12:00:00.000Z", "date", "asc") > 0,
    true,
  );
});

test("text sorting is locale aware and keeps empty values last", () => {
  assert.equal(compareReportTableValues("Álvaro", "Bruno", "text", "asc") < 0, true);
  assert.equal(compareReportTableValues("", "Bruno", "text", "asc") > 0, true);
});

test("page clamping keeps the current page inside the available range", () => {
  assert.equal(clampReportTablePage(3, 15, 10), 1);
  assert.equal(clampReportTablePage(0, 0, 10), 0);
});
