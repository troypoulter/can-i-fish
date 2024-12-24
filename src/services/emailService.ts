import { Resend } from "resend";
import type { FishingWindow } from "../triggers/weatherCheck";
import { FISHING_CONDITIONS } from "../triggers/weatherCheck";
import FishingReport from "../emails/FishingReport";
import { logger } from "@trigger.dev/sdk/v3";
import type { ReactElement } from "react";

const formatDateRange = (windows: FishingWindow[]) => {
  const dates = windows.map((w) => new Date(w.date));
  const startDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const endDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  return {
    start: startDate.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "numeric",
    }),
    end: endDate.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "numeric",
    }),
  };
};

export class EmailService {
  private resend: Resend;
  private recipients: string[];

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    const recipientString = process.env.EMAIL_RECIPIENTS;
    if (!recipientString) {
      throw new Error("EMAIL_RECIPIENTS environment variable is not set");
    }

    // Split by comma and trim whitespace from each email
    this.recipients = recipientString.split(",").map((email) => email.trim());
    if (this.recipients.length === 0) {
      throw new Error(
        "EMAIL_RECIPIENTS must contain at least one email address"
      );
    }

    this.resend = new Resend(apiKey);
  }

  async sendFishingReport(windows: FishingWindow[]) {
    try {
      const hasPassingConditions = windows.some(
        (window) =>
          window.overallScore >= FISHING_CONDITIONS.SCORING.PASS_THRESHOLD
      );
      const statusEmoji = hasPassingConditions ? "✅" : "❌";
      const dateRange = formatDateRange(windows);

      const data = await this.resend.emails.send({
        from: "Can I Fish? <noreply@noreply.troypoulter.com>",
        to: this.recipients,
        subject: `${statusEmoji} Norah Head 🐟 ${dateRange.start} - ${dateRange.end} ${process.env.NODE_ENV === "production" ? "" : `(${new Date().toLocaleTimeString()})`}`,
        react: FishingReport({ windows }) as ReactElement,
      });

      logger.info("Email sent successfully", { data });
      return { success: true, data };
    } catch (error) {
      logger.error("Failed to send email", { error });
      return { success: false, error };
    }
  }
}
