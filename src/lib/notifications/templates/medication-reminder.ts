interface MedicationReminderData {
  patientName: string;
  doctorName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  instructions?: string | null;
  scheduledTime?: string;
}

export function renderMedicationReminder(data: MedicationReminderData) {
  const subject = `Medication Reminder: Time to take your ${data.medicationName} (${data.dosage})`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
      <div style="background-color: #059669; padding: 20px; border-radius: 8px 8px 0 0; color: white;">
        <h1 style="margin: 0; font-size: 20px;">Medication Reminder</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Dear <strong>${data.patientName}</strong>,</p>
        <p>This is a scheduled health reminder to take your prescribed medication as directed by Dr. <strong>${data.doctorName}</strong>:</p>
        
        <div style="background-color: #ecfdf5; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #a7f3d0;">
          <p style="margin: 4px 0; font-size: 16px; color: #065f46;"><strong>Medication:</strong> ${data.medicationName}</p>
          <p style="margin: 4px 0;"><strong>Dosage:</strong> ${data.dosage}</p>
          <p style="margin: 4px 0;"><strong>Frequency:</strong> ${data.frequency}</p>
          ${data.instructions ? `<p style="margin: 4px 0; color: #047857;"><strong>Directions:</strong> ${data.instructions}</p>` : ""}
          ${data.scheduledTime ? `<p style="margin: 4px 0; color: #475569;"><strong>Scheduled Time:</strong> ${data.scheduledTime}</p>` : ""}
        </div>

        <p style="font-size: 13px; color: #64748b;">
          Always take your medication with a full glass of water unless otherwise instructed. If you experience unexpected side effects, contact the clinic immediately.
        </p>

        <p style="margin-top: 24px;">Wishing you good health,<br/><strong>Healthcare Clinic Care Team</strong></p>
      </div>
    </div>
  `;

  const text = `
Medication Reminder

Dear ${data.patientName},

This is a reminder to take your medication:
- Medication: ${data.medicationName}
- Dosage: ${data.dosage}
- Frequency: ${data.frequency}
${data.instructions ? `- Instructions: ${data.instructions}` : ""}

Prescribed by: Dr. ${data.doctorName}
  `.trim();

  return { subject, html, text };
}
