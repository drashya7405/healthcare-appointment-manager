import { serve } from "inngest/next";
import { inngest } from "@/lib/jobs/inngest-client";
import { appointmentRemindersFunction } from "@/lib/jobs/functions/appointment-reminders";
import { medicationRemindersFunction } from "@/lib/jobs/functions/medication-reminders";
import { emailRetriesFunction } from "@/lib/jobs/functions/email-retries";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    appointmentRemindersFunction,
    medicationRemindersFunction,
    emailRetriesFunction,
  ],
});
