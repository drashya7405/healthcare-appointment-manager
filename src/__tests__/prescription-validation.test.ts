import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createPrescriptionSchema,
  updateNotesSchema,
  medicationInputSchema,
} from "../validation/prescription";

describe("Prescription & Clinical Notes Validation Schemas", () => {
  describe("medicationInputSchema", () => {
    it("should accept valid medication item", () => {
      const result = medicationInputSchema.safeParse({
        name: "Amoxicillin",
        dosage: "500mg",
        frequency: "Three times daily",
        instructions: "Take with food",
      });

      assert.equal(result.success, true);
    });

    it("should reject missing name or dosage", () => {
      const result = medicationInputSchema.safeParse({
        name: "",
        dosage: "",
        frequency: "Daily",
      });

      assert.equal(result.success, false);
    });
  });

  describe("createPrescriptionSchema", () => {
    it("should accept valid prescription payload with medications", () => {
      const result = createPrescriptionSchema.safeParse({
        clinicalNotes: "Acute bacterial sinusitis. Prescribed antibiotic course and rest.",
        followUpSteps: "Return in 10 days if symptoms persist.",
        markCompleted: true,
        medications: [
          {
            name: "Amoxicillin",
            dosage: "500mg",
            frequency: "Three times daily",
            instructions: "Finish entire 7-day course",
          },
        ],
      });

      assert.equal(result.success, true);
    });

    it("should reject empty clinicalNotes", () => {
      const result = createPrescriptionSchema.safeParse({
        clinicalNotes: "",
      });

      assert.equal(result.success, false);
    });
  });

  describe("updateNotesSchema", () => {
    it("should accept valid notes update", () => {
      const result = updateNotesSchema.safeParse({
        clinicalNotes: "Patient feeling significantly better. Vitals stable.",
        status: "COMPLETED",
      });

      assert.equal(result.success, true);
    });
  });
});
