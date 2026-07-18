import { Job, Worker } from 'bullmq';
import logger from '../logger';
import sendEmail from '../utils/sendEmail';
import {
  EMAIL_QUEUE_NAME,
  EmailJobData,
  OUTBID_EMAIL_JOB,
  OutbidEmailJobData,
} from './email.queue';
import { addEmailDeadLetterJob } from './email.dlq';
import { redisConnection } from './redis.connection';

let emailWorker: Worker<EmailJobData> | null = null;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

const buildOutbidEmailHtml = (data: OutbidEmailJobData) => {
  const productUrl = `${data.frontendUrl.replace(/\/$/, '')}/auction-products/${data.auctionProductId}`;

  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
      <h2 style="margin: 0 0 16px;">You have been outbid</h2>
      <p>Hello ${escapeHtml(data.previousBidderName)},</p>
      <p>
        Another bidder, ${escapeHtml(data.newBidderName)}, placed a higher bid on
        <strong>${escapeHtml(data.productTitle)}</strong>.
      </p>
      <p>
        Your previous bid: <strong>${formatCurrency(data.previousBidAmount)}</strong><br />
        New highest bid: <strong>${formatCurrency(data.newBidAmount)}</strong>
      </p>
      <p>
        <a href="${productUrl}" style="color: #2563eb;">View the auction product</a>
      </p>
      <p style="color: #6b7280; font-size: 13px;">
        If you still want this item, you can place a new bid while the auction is active.
      </p>
    </div>
  `;
};

const processEmailJob = async (job: Job<EmailJobData>) => {
  if (job.name !== OUTBID_EMAIL_JOB) {
    throw new Error(`Unsupported email job type: ${job.name}`);
  }

  const data = job.data as OutbidEmailJobData;
  const result = await sendEmail({
    to: data.previousBidderEmail,
    subject: `You have been outbid on ${data.productTitle}`,
    html: buildOutbidEmailHtml(data),
  });

  if (!result.success) {
    throw new Error(result.error || 'Email provider failed to send the outbid email');
  }

  return { sentTo: data.previousBidderEmail };
};

export const initializeEmailWorker = () => {
  if (emailWorker) return emailWorker;

  emailWorker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, processEmailJob, {
    connection: redisConnection,
    concurrency: 5,
  });

  emailWorker.on('completed', (job) => {
    logger.info({ jobId: job.id, jobName: job.name }, 'Email queue job completed');
  });

  emailWorker.on('failed', async (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        jobName: job?.name,
        attemptsMade: job?.attemptsMade,
        attempts: job?.opts.attempts,
        error,
      },
      'Email queue job failed',
    );

    if (!job || job.attemptsMade < Number(job.opts.attempts ?? 1)) return;

    try {
      await addEmailDeadLetterJob({
        originalQueue: EMAIL_QUEUE_NAME,
        originalJobId: job.id,
        originalJobName: job.name,
        originalJobData: job.data,
        failedReason: error.message,
        stacktrace: job.stacktrace ?? undefined,
        attemptsMade: job.attemptsMade,
        failedAt: new Date().toISOString(),
      });
    } catch (dlqError) {
      logger.error({ dlqError, originalJobId: job.id }, 'Failed to add email job to DLQ');
    }
  });

  emailWorker.on('error', (error) => {
    logger.error({ error }, 'Email worker error');
  });

  logger.info('Email worker initialized');
  return emailWorker;
};
