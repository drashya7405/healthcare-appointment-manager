interface RescheduleData {
  recipientName: string;
  doctorName: string;
  patientName: string;
  specialization: string;
  previousDate: string;
  previousTime: string;
  newDate: string;
  newTime: string;
}

export function renderAppointmentReschedule(data: RescheduleData) {
  const subject = `Rescheduled: Appointment with Dr. ${data.doctorName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
      <div style="background-color: #d97706; padding: 20px; border-radius: 8px 8px 0 0; color: white;">
        <h1 style="margin: 0; font-size: 20px;">Appointment Rescheduled</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Dear <strong>${data.recipientName}</strong>,</p>
        <p>Your appointment has been successfully moved to a new time:</p>
        
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p style="margin: 4px 0;"><strong>Doctor:</strong> Dr. ${data.doctorName} (${data.specialization})</p>
          <p style="margin: 4px 0;"><strong>Patient:</strong> ${data.patientName}</p>
          <p style="margin: 4px 0; text-decoration: line-through; color: #94a3b8;"><strong>Original Time:</strong> ${data.previousDate} at ${data.previousTime}</p>
          <p style="margin: 4px 0; color: #d97706; font-size: 15px;"><strong>New Scheduled Time:</strong> ${data.newDate} at ${data.newTime}</p>
        </div>

        <p style="font-size: 13px; color: #64748b;">
          Please update your calendar accordingly. Your submitted symptoms and health notes have been preserved for the new session.
        </p>

        <p style="margin-top: 24px;">Warm regards,<br/><strong>Healthcare Clinic Care Team</strong></p>
      </div>
    </div>
  `;

  const text = `
Appointment Rescheduled

Dear ${data.recipientName},

Your appointment with Dr. ${data.doctorName} has been rescheduled.
Previous: ${data.previousDate} at ${data.previousTime}
New Time: ${data.newDate} at ${data.newTime}
  `.trim();

  return { subject, html, text };
}
