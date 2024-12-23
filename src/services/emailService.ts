import { Resend } from "resend";
import type { FishingWindow } from "../triggers/weatherCheck";
import FishingReport from "../emails/FishingReport";
import { logger } from "@trigger.dev/sdk/v3";
import type { ReactElement } from "react";

export class EmailService {
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    this.resend = new Resend(apiKey);
  }

  async sendFishingReport(to: string, windows: FishingWindow[]) {
    try {
      const hasPassingConditions = windows.some(
        (window) => window.overallScore === 100
      );
      const statusEmoji = hasPassingConditions ? "✅" : "❌";

      const data = await this.resend.emails.send({
        from: "Can I Fish? <onboarding@resend.dev>",
        to: [to],
        subject: `${statusEmoji} Norah Head Fishing Report ${new Date().toLocaleString()}`,
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
