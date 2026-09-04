import { Notification } from '../models/Notification.js';

export class NotificationService {
  static async sendNotification(userId: string, title: string, message: string, type = 'info', data = {}) {
    try {
      await Notification.create({
        userId,
        title,
        message,
        type,
        data,
      });
      console.log(`🔔 Notification created for ${userId}: ${title}`);
      return true;
    } catch (error) {
      console.error('Failed to create notification:', error);
      return false;
    }
  }

  static async sendVerificationEmail(email: string, code: string) {
    console.log(`✉️ [Brevo Mail Mock] Sending verification code ${code} to ${email}`);
    return { success: true };
  }

  static async sendSms(phone: string, message: string) {
    console.log(`📱 [Brevo SMS Mock] Sending SMS to ${phone}: ${message}`);
    return { success: true };
  }

  static async sendJobNotification(phone: string, jobTitle: string, price: number) {
    return this.sendSms(phone, `🔔 New job available on RUSHNG: ${jobTitle}. Estimated: ₦${price.toLocaleString()}. Accept now!`);
  }

  static async sendProviderAssignedSms(phone: string, providerName: string, jobTitle: string) {
    return this.sendSms(phone, `✅ A provider has been assigned to your job '${jobTitle}'. ${providerName} will be there soon.`);
  }

  static async sendJobStartedSms(phone: string, jobTitle: string, providerName: string) {
    return this.sendSms(phone, `🔧 ${providerName} has started working on '${jobTitle}'. You will be notified when complete.`);
  }

  static async sendJobCompletedSms(phone: string, jobTitle: string, providerName: string) {
    return this.sendSms(phone, `✅ '${jobTitle}' has been completed by ${providerName}. Please confirm completion to release payment.`);
  }

  static async sendPaymentReceivedSms(phone: string, amount: number, jobTitle: string) {
    return this.sendSms(phone, `💰 Payment received! ₦${amount.toLocaleString()} has been credited for '${jobTitle}'.`);
  }
}
