export type UserRole = "PATIENT" | "DOCTOR" | "ADMIN";

export interface SafePatientProfile {
  id: string;
  phone?: string | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  emergencyContact?: string | null;
  medicalHistory?: string | null;
}

export interface SafeDoctorProfile {
  id: string;
  specialization: string;
  bio?: string | null;
  slotDurationMins: number;
  timezone: string;
}

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  patient?: SafePatientProfile | null;
  doctor?: SafeDoctorProfile | null;
}

export interface AuthSession {
  id: string;
  sessionToken: string;
  userId: string;
  expiresAt: Date;
  user: SafeUser;
}

export interface AuthResult {
  user: SafeUser;
  redirectUrl: string;
}
