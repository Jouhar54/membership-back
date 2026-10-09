import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Drop legacy unique index on joinLink if it exists
    try {
      await mongoose.connection.collection('batches').dropIndex('joinLink_1');
      console.log('Obsolete joinLink_1 index dropped from batches collection');
    } catch (indexErr) {
      // Index does not exist or already dropped, ignore
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
