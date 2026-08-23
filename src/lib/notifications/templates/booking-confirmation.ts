interface PatientBookingData {
  patientName: string;
  doctorName: string;
  specialization: string;
  formattedDate: string;
  formattedTime: string;
  symptoms: string;
}

export function renderPatientBookingConfirmation(data: PatientBookingData) {
  const subject = `Confirmed: Appointment with Dr. ${data.doctorName} on ${data.formattedDate}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
      <div style="background-color: #0d9488; padding: 20px; border-radius: 8px 8px 0 0; color: white;">
        <h1 style="margin: 0; font-size: 20px;">Appointment Confirmed</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Dear <strong>${data.patientName}</strong>,</p>
        <p>Your medical appointment has been successfully scheduled. Here are the consultation details:</p>
        
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p style="margin: 4px 0;"><strong>Doctor:</strong> Dr. ${data.doctorName} (${data.specialization})</p>
          <p style="margin: 4px 0;"><strong>Date:</strong> ${data.formattedDate}</p>
          <p style="margin: 4px 0;"><strong>Time:</strong> ${data.formattedTime}</p>
          <p style="margin: 4px 0;"><strong>Recorded Symptoms:</strong> ${data.symptoms}</p>
        </div>

        <p style="font-size: 13px; color: #64748b;">
          Please arrive 10 minutes prior to your consultation. You can view your visit details and pre-visit brief anytime from your patient dashboard.
        </p>

        <p style="margin-top: 24px;">Warm regards,<br/><strong>Healthcare Clinic Care Team</strong></p>
      </div>
    </div>
  `;

  const text = `
Appointment Confirmed

Dear ${data.patientName},

Your appointment with Dr. ${data.doctorName} (${data.specialization}) has been confirmed.

Date: ${data.formattedDate}
Time: ${data.formattedTime}
Recorded Symptoms: ${data.symptoms}

Please arrive 10 minutes before your scheduled time.
  `.trim();

  return { subject, html, text };
}

interface DoctorBookingData {
  doctorName: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string | null;
  formattedDate: string;
  formattedTime: string;
  symptoms: string;
}

export function renderDoctorBookingNotification(data: DoctorBookingData) {
  const subject = `New Appointment: ${data.patientName} on ${data.formattedDate}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
      <div style="background-color: #2563eb; padding: 20px; border-radius: 8px 8px 0 0; color: white;">
        <h1 style="margin: 0; font-size: 20px;">New Patient Consultation Booked</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Hello Dr. <strong>${data.doctorName}</strong>,</p>
        <p>A new patient consultation has been scheduled in your calendar:</p>
        
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p style="margin: 4px 0;"><strong>Patient:</strong> ${data.patientName} (${data.patientEmail}${data.patientPhone ? ` · ${data.patientPhone}` : ""})</p>
          <p style="margin: 4px 0;"><strong>Date:</strong> ${data.formattedDate}</p>
          <p style="margin: 4px 0;"><strong>Time:</strong> ${data.formattedTime}</p>
          <p style="margin: 4px 0;"><strong>Chief Complaint / Symptoms:</strong> ${data.symptoms}</p>
        </div>

        <p style="font-size: 13px; color: #64748b;">
          An automated AI pre-visit briefing with urgency assessment and suggested clinical questions is being prepared and will be accessible on your doctor dashboard.
        </p>

        <p style="margin-top: 24px;">Best regards,<br/><strong>Clinic Scheduling System</strong></p>
      </div>
    </div>
  `;

  const text = `
New Patient Consultation Booked

Hello Dr. ${data.doctorName},

A new appointment has been scheduled:
Patient: ${data.patientName} (${data.patientEmail})
Date: ${data.formattedDate}
Time: ${data.formattedTime}
Symptoms: ${data.symptoms}
  `.trim();

  return { subject, html, text };
}
