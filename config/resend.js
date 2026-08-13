import { Resend } from 'resend';
import env from './env.js';

const resend = new Resend(env.resend.apiKey);

export default resend;
