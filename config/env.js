import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_VARS = [
  'MONGODB_URI',
  'STOREFRONT_ORIGIN',
  'ADMIN_ORIGIN',
  'JWT_ACCESS_SECRET',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RESEND_API_KEY',
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key] || process.env[key].trim() === '');

if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error(
    `\n[FATAL] Missing required environment variable(s): ${missing.join(', ')}\n` +
      'Copy .env.example to .env and fill in real values before starting the server.\n',
  );
  process.exit(1);
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,

  mongodbUri: process.env.MONGODB_URI,

  // Comma-separated in .env so both localhost and deployed frontend
  // origins can be allowed at once, e.g.:
  // STOREFRONT_ORIGIN=http://localhost:3004,https://your-userside.vercel.app
  storefrontOrigins: process.env.STOREFRONT_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),
  adminOrigins: process.env.ADMIN_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromSupport: process.env.EMAIL_FROM_SUPPORT || 'BYND Official <support@byndofficial.in>',
    fromOrders: process.env.EMAIL_FROM_ORDERS || 'BYND Orders <orders@byndofficial.in>',
  },
};

export default env;