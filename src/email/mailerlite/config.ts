import MailerLite from '@mailerlite/mailerlite-nodejs';
export const mailerLiteService = new MailerLite({ api_key: process.env.MAILERLITE_API_KEY ?? '' });
