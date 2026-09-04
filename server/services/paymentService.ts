import { Payment, PaymentStatus } from '../models/Payment.js';
import { Job, JobStatus } from '../models/Job.js';
import { Provider } from '../models/Provider.js';
import { User } from '../models/User.js';
import { NotificationService } from './notificationService.js';
import { WalletService } from './walletService.js';

export class PaymentService {
  /**
   * Release escrow payment for a completed job
   */
  static async releasePayment(jobId: string) {
    const job = await Job.findById(jobId);
    if (!job) {
      return { success: false, message: 'Job not found' };
    }

    if (job.status === JobStatus.COMPLETED) {
      return { success: false, message: 'Payment has already been released for this job' };
    }

    if (!job.providerId) {
      return { success: false, message: 'Cannot release payment: No provider assigned to this job' };
    }

    const amount = job.finalPrice || job.estimatedPrice || 0;
    if (amount <= 0) {
      return { success: false, message: 'Job price must be greater than zero to release payment' };
    }

    // Release escrow via WalletService
    let releaseResult;
    try {
      releaseResult = await WalletService.releaseEscrowToProvider({
        customerId: job.customerId,
        providerId: job.providerId,
        amount,
        platformFeeRate: 0.1,
        jobId: job._id,
        jobTitle: job.title,
      });
    } catch (err: any) {
      return { success: false, message: `Escrow release failed: ${err.message}` };
    }

    const { providerEarnings, platformFee } = releaseResult;

    // Update Job status
    job.status = JobStatus.COMPLETED;
    job.completedAt = new Date();
    await job.save();

    // Update Provider metrics
    try {
      const provider = await Provider.findOne({ userId: job.providerId });
      if (provider) {
        provider.totalJobsCompleted = (provider.totalJobsCompleted || 0) + 1;
        provider.totalEarnings = (provider.totalEarnings || 0) + providerEarnings;
        await provider.save();
      }
    } catch (pErr) {
      console.warn('Could not update provider stats:', pErr);
    }

    // Update any Payment record if one exists
    try {
      const payment = await Payment.findOne({ jobId: job._id });
      if (payment) {
        payment.status = PaymentStatus.RELEASED;
        payment.releasedAt = new Date();
        payment.providerEarnings = providerEarnings;
        payment.platformFee = platformFee;
        await payment.save();
      }
    } catch (payErr) {
      console.warn('Could not update payment doc:', payErr);
    }

    // Send Notification / SMS
    try {
      const providerUser = await User.findById(job.providerId);
      if (providerUser && providerUser.phone) {
        await NotificationService.sendPaymentReceivedSms(
          providerUser.phone,
          providerEarnings,
          job.title
        );
      }
    } catch (smsErr) {
      console.warn('Could not send payment SMS:', smsErr);
    }

    return {
      success: true,
      message: 'Payment released from Escrow successfully',
      data: {
        providerEarnings,
        platformFee,
      },
    };
  }
}
