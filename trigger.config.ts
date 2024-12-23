import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_xclwbzqiuffwadydbecd",
  runtime: "node",
  logLevel: "info",
  // Set the maxDuration to 300 seconds for all tasks. See https://trigger.dev/docs/runs/max-duration
  // maxDuration: 300,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 1,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/triggers"],
});
