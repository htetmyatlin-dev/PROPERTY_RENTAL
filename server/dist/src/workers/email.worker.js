import { Worker } from "bullmq";
import { bullConnection } from "@/lib/redis";
import { sendEmail } from "@/utils/email";
export const emailWorker = new Worker("email", async (job) => {
    const { to, subject, text } = job.data;
    console.log(`Processing email job [${job.name}] → ${to}`);
    await sendEmail(to, subject, text);
    console.log(`Email sent to ${to}`);
}, {
    connection: bullConnection,
    concurrency: 5,
});
emailWorker.on("completed", (job) => {
    console.log(`Job ${job.id} (${job.name}) completed`);
});
emailWorker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} (${job?.name}) failed:`, err.message);
});
