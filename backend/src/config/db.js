import mongoose from "mongoose";

export async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    // Log host and database name so it's clear which Atlas DB we're using
    const dbName = conn.connection?.db?.databaseName || "(unknown)";
    console.log(`MongoDB connected: host=${conn.connection.host} db=${dbName}`);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}