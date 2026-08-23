interface CancellationData {
  recipientName: string;
  doctorName: string;
  patientName: string;
  formattedDate: string;
  formattedTime: string;
  reason?: string | null;
  isPatientRecipient: boolean;
}

export function renderAppointmentCancellation(data: CancellationData) {
  const subject = `Cancelled: Appointment on ${data.formattedDate}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
      <div style="background-color: #e11d48; padding: 20px; border-radius: 8px 8px 0 0; color: white;">
        <h1 style="margin: 0; font-size: 20px;">Appointment Cancellation Notice</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Dear <strong>${data.recipientName}</strong>,</p>
        <p>The following scheduled appointment has been cancelled:</p>
        
        <div style="background-color: #fff1f2; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #fecdd3;">
          <p style="margin: 4px 0;"><strong>Doctor:</strong> Dr. ${data.doctorName}</p>
          <p style="margin: 4px 0;"><strong>Patient:</strong> ${data.patientName}</p>
          <p style="margin: 4px 0;"><strong>Date:</strong> ${data.formattedDate}</p>
          <p style="margin: 4px 0;"><strong>Time:</strong> ${data.formattedTime}</p>
          ${data.reason ? `<p style="margin: 4px 0; color: #be123c;"><strong>Reason:</strong> ${data.reason}</p>` : ""}
        </div>

        ${
          data.isPatientRecipient
            ? `<p style="font-size: 13px; color: #64748b;">
                If you would like to reschedule or choose an alternative slot with Dr. ${data.doctorName} or another specialist, please visit your patient portal.
              </p>`
            : `<p style="font-size: 13px; color: #64748b;">
                This slot has been released back into your availability schedule.
              </p>`
        }

        <p style="margin-top: 24px;">Sincerely,<br/><strong>Healthcare Clinic Care Team</strong></p>
      </div>
    </div>
  `;

  const text = `
Appointment Cancellation Notice

Dear ${data.recipientName},

The appointment on ${data.formattedDate} at ${data.formattedTime} with Dr. ${data.doctorName} for ${data.patientName} has been cancelled.
${data.reason ? `Reason: ${data.reason}` : ""}
  `.trim();

  return { subject, html, text };
}
