import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerPatientSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Please provide a valid email address.").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
  phone: z.string().trim().min(7, "Phone number must be at least 7 digits.").optional().or(z.literal("")),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.string().trim().optional().or(z.literal("")),
  emergencyContact: z.string().trim().optional().or(z.literal("")),
  medicalHistory: z.string().trim().optional().or(z.literal("")),
});

export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;

export const createDoctorSchema = z.object({
  name: z.string().trim().min(2, "Doctor name must be at least 2 characters."),
  email: z.string().trim().email("Please provide a valid email address.").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
  specialization: z.string().trim().min(2, "Specialization is required."),
  bio: z.string().trim().optional(),
  slotDurationMins: z.number().int().min(10).max(120).default(30),
  timezone: z.string().default("Asia/Kolkata"),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
