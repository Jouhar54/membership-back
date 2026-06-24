import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// Validate required environment variables before running
const requiredEnv = [
  'SUPER_ADMIN_EMAIL',
  'SUPER_ADMIN_PHONE',
  'SUPER_ADMIN_PASSWORD',
  'MONGO_URI',
];

for (const env of requiredEnv) {
  if (!process.env[env]) {
    console.error(`Error: Missing required environment variable ${env}`);
    process.exit(1);
  }
}

const seedAdmin = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);

    // Check if a user with role "admin" already exists
    const adminExists = await User.findOne({ role: 'admin' });

    if (adminExists) {
      console.log('Admin already exists');
      return;
    }

    console.log('Creating super admin...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD, salt);

    await User.create({
      fullName: 'SUPER ADMIN'.toUpperCase(),
      email: process.env.SUPER_ADMIN_EMAIL,
      phone: process.env.SUPER_ADMIN_PHONE,
      password: hashedPassword,
      role: 'admin',
    });

    console.log('Super admin created successfully');
  } catch (error) {
    console.error('Error during seeding:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected');
  }
};

seedAdmin();
