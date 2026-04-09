import assert from "node:assert/strict";
import test from "node:test";

import { classifyLeadLifecycle, isLeadConverted, isLeadScheduled } from "./leadLifecycle.ts";

test("scheduled status remains scheduled even when the stage is final", () => {
  const input = {
    status: "agendamento",
    stage: { name: "Agendamento", position: 3, is_final: true },
  };

  assert.equal(classifyLeadLifecycle(input), "scheduled");
  assert.equal(isLeadScheduled(input), true);
  assert.equal(isLeadConverted(input), false);
});

test("final stages convert leads when they are not scheduled", () => {
  const input = {
    status: "ganho",
    stage: { name: "Fechado", position: 4, is_final: true },
  };

  assert.equal(classifyLeadLifecycle(input), "converted");
  assert.equal(isLeadConverted(input), true);
});

test("intermediate stages are classified as active", () => {
  const input = {
    status: "qualificacao",
    stage: { name: "Qualificação", position: 1, is_final: false },
  };

  assert.equal(classifyLeadLifecycle(input), "active");
});

test("stage position zero falls back to new leads", () => {
  const input = {
    status: null,
    stage: { name: "Entrada", position: 0, is_final: false },
  };

  assert.equal(classifyLeadLifecycle(input), "new");
});
