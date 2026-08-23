import { inngest } from "../inngest-client";
import { runEmailRetriesJob } from "../runner";

export const emailRetriesFunction = inngest.createFunction(
  {
    id: "retry-failed-email-notifications",
    name: "Retry Failed Email Notifications",
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async ({ step }: { step: { run: <T>(name: string, fn: () => Promise<T>) => Promise<T> } }) => {
    const result = await step.run("retry-failed-notifications", async () => {
      return await runEmailRetriesJob(3);
    });

    return { success: true, result };
  }
);
