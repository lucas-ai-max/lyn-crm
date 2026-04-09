import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPatientDocumentPath,
  sanitizePatientDocumentName,
  validatePatientDocumentFile,
} from "./files.ts";

test("sanitizePatientDocumentName removes accents and unsafe characters", () => {
  assert.equal(
    sanitizePatientDocumentName("Ficha de Aceitacao (Paciente)!.PDF"),
    "ficha-de-aceitacao-paciente.pdf",
  );
});

test("buildPatientDocumentPath nests file under company and patient", () => {
  assert.equal(
    buildPatientDocumentPath("company-1", "patient-1", "Meu PDF.pdf", 123),
    "company-1/patient-1/123-meu-pdf.pdf",
  );
});

test("validatePatientDocumentFile rejects non-pdf files and oversized files", () => {
  const png = new File(["content"], "image.png", { type: "image/png" });
  assert.equal(validatePatientDocumentFile(png), "Envie apenas arquivos PDF.");

  const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "arquivo.pdf", {
    type: "application/pdf",
  });
  assert.equal(
    validatePatientDocumentFile(oversized),
    "Arquivo muito grande. O limite e 10 MB.",
  );
});

test("validatePatientDocumentFile accepts valid pdf files", () => {
  const pdf = new File(["content"], "arquivo.pdf", { type: "application/pdf" });
  assert.equal(validatePatientDocumentFile(pdf), null);
});
