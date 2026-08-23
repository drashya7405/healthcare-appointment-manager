interface LeaveConflictData {
  patientName: string;
  doctorName: string;
  specialization: string;
  originalDate: string;
  originalTime: string;
  leaveReason?: string | null;
}

export function renderDoctorLeaveConflict(data: LeaveConflictData) {
  const subject = `Urgent Schedule Update: Appointment with Dr. ${data.doctorName} on ${data.originalDate}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
      <div style="background-color: #7c3aed; padding: 20px; border-radius: 8px 8px 0 0; color: white;">
        <h1 style="margin: 0; font-size: 20px;">Doctor Schedule Interruption</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Dear <strong>${data.patientName}</strong>,</p>
        <p>
          We regret to inform you that Dr. <strong>${data.doctorName}</strong> will be away on official leave during your scheduled appointment time.
        </p>
        
        <div style="background-color: #faf5ff; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #e9d5ff;">
          <p style="margin: 4px 0;"><strong>Doctor:</strong> Dr. ${data.doctorName} (${data.specialization})</p>
          <p style="margin: 4px 0;"><strong>Affected Date:</strong> ${data.originalDate}</p>
          <p style="margin: 4px 0;"><strong>Affected Time:</strong> ${data.originalTime}</p>
          ${data.leaveReason ? `<p style="margin: 4px 0; color: #6b21a8;"><strong>Note:</strong> ${data.leaveReason}</p>` : ""}
        </div>

        <p style="font-weight: bold; color: #7c3aed;">
          Priority Rescheduling Assistance:
        </p>
        <p style="font-size: 13px; color: #475569;">
          Please log in to your patient dashboard to choose an alternative open slot with Dr. ${data.doctorName} or any of our other available specialists. Your previous booking status has been updated to reflect this schedule change.
        </p>

        <p style="margin-top: 24px;">Sincerely,<br/><strong>Healthcare Clinic Administration</strong></p>
      </div>
    </div>
  `;

  const text = `
Doctor Schedule Interruption

Dear ${data.patientName},

Dr. ${data.doctorName} will be away on official leave during your scheduled appointment time on ${data.originalDate} at ${data.originalTime}.

Please log in to your patient portal to choose an alternative slot or specialist.
  `.trim();

  return { subject, html, text };
}
