import { PrismaClient, DayOfWeek } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding healthcare database with test users...");

  const adminPasswordHash = await bcrypt.hash("AdminPass123!", 10);
  const doctorPasswordHash = await bcrypt.hash("DoctorPass123!", 10);
  const patientPasswordHash = await bcrypt.hash("PatientPass123!", 10);

  // 1. Seed Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      name: "System Administrator",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      isActive: true,
    },
    create: {
      email: "admin@example.com",
      name: "System Administrator",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log(`✅ Admin user seeded: ${admin.email}`);

  // 2. Seed Doctor 1 (Cardiology)
  const doctor1User = await prisma.user.upsert({
    where: { email: "doctor.smith@example.com" },
    update: {
      name: "Dr. Sarah Smith",
      passwordHash: doctorPasswordHash,
      role: "DOCTOR",
      isActive: true,
    },
    create: {
      email: "doctor.smith@example.com",
      name: "Dr. Sarah Smith",
      passwordHash: doctorPasswordHash,
      role: "DOCTOR",
      isActive: true,
    },
  });

  const doctor1 = await prisma.doctor.upsert({
    where: { userId: doctor1User.id },
    update: {
      specialization: "Cardiology",
      bio: "Board-certified cardiologist with 12 years of clinical experience in preventive and interventional cardiology.",
      slotDurationMins: 30,
      timezone: "Asia/Kolkata",
    },
    create: {
      userId: doctor1User.id,
      specialization: "Cardiology",
      bio: "Board-certified cardiologist with 12 years of clinical experience in preventive and interventional cardiology.",
      slotDurationMins: 30,
      timezone: "Asia/Kolkata",
    },
  });

  // Working hours for Doctor 1: Monday through Friday 09:00 - 17:00
  const weekdays: DayOfWeek[] = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
  ];

  for (const day of weekdays) {
    await prisma.doctorWorkingHours.upsert({
      where: {
        doctorId_day: {
          doctorId: doctor1.id,
          day,
        },
      },
      update: {
        startTime: "09:00",
        endTime: "17:00",
      },
      create: {
        doctorId: doctor1.id,
        day,
        startTime: "09:00",
        endTime: "17:00",
      },
    });
  }
  console.log(`✅ Doctor 1 seeded: ${doctor1User.email} (${doctor1.specialization})`);

  // 3. Seed Doctor 2 (Dermatology)
  const doctor2User = await prisma.user.upsert({
    where: { email: "doctor.jones@example.com" },
    update: {
      name: "Dr. Michael Jones",
      passwordHash: doctorPasswordHash,
      role: "DOCTOR",
      isActive: true,
    },
    create: {
      email: "doctor.jones@example.com",
      name: "Dr. Michael Jones",
      passwordHash: doctorPasswordHash,
      role: "DOCTOR",
      isActive: true,
    },
  });

  const doctor2 = await prisma.doctor.upsert({
    where: { userId: doctor2User.id },
    update: {
      specialization: "Dermatology",
      bio: "Specialist in clinical dermatology, skin cancer screenings, and allergic skin conditions.",
      slotDurationMins: 30,
      timezone: "Asia/Kolkata",
    },
    create: {
      userId: doctor2User.id,
      specialization: "Dermatology",
      bio: "Specialist in clinical dermatology, skin cancer screenings, and allergic skin conditions.",
      slotDurationMins: 30,
      timezone: "Asia/Kolkata",
    },
  });

  for (const day of weekdays) {
    await prisma.doctorWorkingHours.upsert({
      where: {
        doctorId_day: {
          doctorId: doctor2.id,
          day,
        },
      },
      update: {
        startTime: "10:00",
        endTime: "18:00",
      },
      create: {
        doctorId: doctor2.id,
        day,
        startTime: "10:00",
        endTime: "18:00",
      },
    });
  }
  console.log(`✅ Doctor 2 seeded: ${doctor2User.email} (${doctor2.specialization})`);

  // 4. Seed Patient
  const patientUser = await prisma.user.upsert({
    where: { email: "patient.doe@example.com" },
    update: {
      name: "John Doe",
      passwordHash: patientPasswordHash,
      role: "PATIENT",
      isActive: true,
    },
    create: {
      email: "patient.doe@example.com",
      name: "John Doe",
      passwordHash: patientPasswordHash,
      role: "PATIENT",
      isActive: true,
    },
  });

  await prisma.patient.upsert({
    where: { userId: patientUser.id },
    update: {
      phone: "+91 98765 43210",
      dateOfBirth: new Date("1988-04-12"),
      gender: "Male",
      emergencyContact: "Jane Doe (+91 98765 43211)",
      medicalHistory: "Seasonal allergies, mild asthma.",
    },
    create: {
      userId: patientUser.id,
      phone: "+91 98765 43210",
      dateOfBirth: new Date("1988-04-12"),
      gender: "Male",
      emergencyContact: "Jane Doe (+91 98765 43211)",
      medicalHistory: "Seasonal allergies, mild asthma.",
    },
  });
  console.log(`✅ Patient user seeded: ${patientUser.email}`);

  console.log("\n✨ Seed finished successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
