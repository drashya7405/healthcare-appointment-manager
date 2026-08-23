interface ReminderData {
  patientName: string;
  doctorName: string;
  specialization: string;
  formattedDate: string;
  formattedTime: string;
}

export function renderAppointmentReminder(data: ReminderData) {
  const subject = `Reminder: Upcoming Consultation with Dr. ${data.doctorName} on ${data.formattedDate}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
      <div style="background-color: #0d9488; padding: 20px; border-radius: 8px 8px 0 0; color: white;">
        <h1 style="margin: 0; font-size: 20px;">Appointment Reminder</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Dear <strong>${data.patientName}</strong>,</p>
        <p>This is a gentle reminder of your upcoming medical consultation:</p>
        
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p style="margin: 4px 0;"><strong>Doctor:</strong> Dr. ${data.doctorName} (${data.specialization})</p>
          <p style="margin: 4px 0;"><strong>Date:</strong> ${data.formattedDate}</p>
          <p style="margin: 4px 0;"><strong>Time:</strong> ${data.formattedTime}</p>
        </div>

        <p><strong>Preparation Checklist:</strong></p>
        <ul style="color: #475569; font-size: 14px;">
          <li>Bring a list of current medications and allergies.</li>
          <li>Prepare any questions you wish to ask Dr. ${data.doctorName}.</li>
          <li>Log in 5-10 minutes prior to your scheduled time.</li>
        </ul>

        <p style="margin-top: 24px;">Warm regards,<br/><strong>Healthcare Clinic Care Team</strong></p>
      </div>
    </div>
  `;

  const text = `
Appointment Reminder

Dear ${data.patientName},

Reminder of your upcoming appointment with Dr. ${data.doctorName} (${data.specialization}).

Date: ${data.formattedDate}
Time: ${data.formattedTime}

Please have your current medication details ready.
  `.trim();

  return { subject, html, text };
}
