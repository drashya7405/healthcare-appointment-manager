import { inngest } from "../inngest-client";
import { runAppointmentRemindersJob } from "../runner";

export const appointmentRemindersFunction = inngest.createFunction(
  {
    id: "send-appointment-reminders",
    name: "Send Upcoming Appointment Reminders",
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }: { step: { run: <T>(name: string, fn: () => Promise<T>) => Promise<T> } }) => {
    const result = await step.run("scan-and-send-appointment-reminders", async () => {
      return await runAppointmentRemindersJob(24);
    });

    return { success: true, result };
  }
);
