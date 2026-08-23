import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertResourceOwnership,
  assertDoctorOwnership,
  getRoleDashboardUrl,
  ForbiddenError,
} from "../auth/rbac";
import type { SafeUser } from "../types/auth";

describe("Role-Based Access Control (RBAC) & Authorization Guards", () => {
  const patientUser: SafeUser = {
    id: "user_patient_1",
    name: "John Patient",
    email: "patient@example.com",
    role: "PATIENT",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: { id: "patient_1", phone: "1234567" },
    doctor: null,
  };

  const doctorUser: SafeUser = {
    id: "user_doctor_1",
    name: "Dr. Sarah Smith",
    email: "doctor@example.com",
    role: "DOCTOR",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: null,
    doctor: {
      id: "doctor_1",
      specialization: "Cardiology",
      slotDurationMins: 30,
      timezone: "Asia/Kolkata",
    },
  };

  const adminUser: SafeUser = {
    id: "user_admin_1",
    name: "Admin User",
    email: "admin@example.com",
    role: "ADMIN",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: null,
    doctor: null,
  };

  describe("assertResourceOwnership", () => {
    it("should allow a patient to access their own resources", () => {
      assert.doesNotThrow(() => {
        assertResourceOwnership("user_patient_1", patientUser);
      });
    });

    it("should forbid a patient from accessing another patient's resources", () => {
      assert.throws(
        () => {
          assertResourceOwnership("user_patient_2", patientUser);
        },
        ForbiddenError
      );
    });

    it("should allow an admin to access any user's resources", () => {
      assert.doesNotThrow(() => {
        assertResourceOwnership("user_patient_2", adminUser);
      });
    });
  });

  describe("assertDoctorOwnership", () => {
    it("should allow a doctor to manage their own profile and schedules", () => {
      assert.doesNotThrow(() => {
        assertDoctorOwnership("doctor_1", doctorUser);
      });
    });

    it("should forbid a doctor from modifying another doctor's schedules", () => {
      assert.throws(
        () => {
          assertDoctorOwnership("doctor_2", doctorUser);
        },
        ForbiddenError
      );
    });

    it("should forbid a patient from managing doctor schedules", () => {
      assert.throws(
        () => {
          assertDoctorOwnership("doctor_1", patientUser);
        },
        ForbiddenError
      );
    });

    it("should allow an admin to manage any doctor's schedules", () => {
      assert.doesNotThrow(() => {
        assertDoctorOwnership("doctor_1", adminUser);
      });
    });
  });

  describe("getRoleDashboardUrl", () => {
    it("should return the correct dashboard routes for each role", () => {
      assert.equal(getRoleDashboardUrl("PATIENT"), "/patient/dashboard");
      assert.equal(getRoleDashboardUrl("DOCTOR"), "/doctor/dashboard");
      assert.equal(getRoleDashboardUrl("ADMIN"), "/admin/dashboard");
    });
  });
});
