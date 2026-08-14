import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

mongoose.set('strictQuery', true);

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongodbUri);
    logger.info(`MongoDB connected — host: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    return conn;
  } catch (err) {
    logger.error(`MongoDB initial connection failed: ${err.message}`);
    // Fail fast — there is no useful degraded mode without a database.
    process.exit(1);
  }
};

export default connectDB;
// admin_db_user:aR8sHrtIsYZoF2J1(Mongodb connection password)