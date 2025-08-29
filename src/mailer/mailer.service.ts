import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_FROM'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

  async sendEmailVerification(to: string, token: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const link = `${frontendUrl}/email-verification?token=${token}`;

    const mailOptions = {
      from: `"No Reply" <${this.configService.get<string>('EMAIL_FROM')}>`,
      to,
      subject: 'Verifikasi Email Anda',
      html: `
      <h3>Verifikasi Email</h3>
      <p>Klik tombol di bawah ini untuk memverifikasi email Anda:</p>
      <a href="${link}">
        <button style="padding: 10px 15px; background: #6366f1; color: white; border: none; border-radius: 5px;">Verifikasi Email</button>
      </a>
      <p>Link ini akan kedaluwarsa dalam 1 jam.</p>
    `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendResetPasswordEmail(to: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL'); // e.g., http://localhost:3000
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"No Reply" <${this.configService.get<string>('EMAIL_FROM')}>`,
      to,
      subject: 'Reset Password Anda',
      html: `
        <h3>Permintaan Reset Password</h3>
        <p>Kami menerima permintaan untuk mereset password Anda. Klik link di bawah ini untuk melanjutkan:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Link ini hanya berlaku selama 1 jam.</p>
        <p>Abaikan email ini jika Anda tidak merasa melakukan permintaan ini.</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Reset password email sent to ${to}`);
    } catch (error) {
      console.error('Error sending reset password email:', error);
      throw error;
    }
  }
}
