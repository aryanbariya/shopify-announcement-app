import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/shopify_announcement";

if (process.env.NODE_ENV !== "production") {
  if (!global.mongooseGlobal) {
    global.mongooseGlobal = mongoose.connect(MONGODB_URI).then((m) => m.connection);
  }
}

export default async function dbConnect() {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }
  
  if (process.env.NODE_ENV !== "production") {
    return global.mongooseGlobal;
  }
  
  const conn = await mongoose.connect(MONGODB_URI);
  return conn.connection;
}
