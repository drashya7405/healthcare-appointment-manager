import { inngest } from "../inngest-client";
import { runMedicationRemindersJob } from "../runner";

export const medicationRemindersFunction = inngest.createFunction(
  {
    id: "send-medication-reminders",
    name: "Send Scheduled Medication Reminders",
    triggers: [{ cron: "0 8,14,20 * * *" }],
  },
  async ({ step }: { step: { run: <T>(name: string, fn: () => Promise<T>) => Promise<T> } }) => {
    const result = await step.run("scan-and-send-medication-reminders", async () => {
      return await runMedicationRemindersJob();
    });

    return { success: true, result };
  }
);
