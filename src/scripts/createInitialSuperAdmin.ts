import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB (Uncomment & ensure MONGO_URI is set)
    // if (!process.env.MONGO_URI) {
    //   throw new Error('MongoDB connection string is not defined');
    // }
    await mongoose.connect("mongodb://admin:password@localhost:27017/moi_software_db?authSource=admin");
    console.log('MongoDB Connected');

    // Check if a superadmin already exists
    const existingSuperAdmin = await User.findOne({ isSuperAdmin: true });
    if (existingSuperAdmin) {
      console.log('A superadmin already exists:', existingSuperAdmin.email);
      process.exit(0);
    }

    // Create superadmin credentials
    const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@gmail.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || '12345678';
    const username = 'SuperAdmin';

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // Promote existing user to superadmin
      existingUser.isSuperAdmin = true;
      existingUser.isAdmin = true;
      await existingUser.save();
      console.log(`Existing user ${existingUser.email} promoted to superadmin`);
    } else {
      // Create a new superadmin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await User.create({
        username,
        email,
        password: hashedPassword,
        isAdmin: true,
        isSuperAdmin: true,
        created_at: Date.now()
      });

      console.log(`Superadmin created with email: ${email}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating superadmin:', error);
    process.exit(1);
  }
};

createSuperAdmin();

// Run the script
// npx ts-node src/scripts/createInitialSuperAdmin.ts