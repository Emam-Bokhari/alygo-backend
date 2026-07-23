const mongoose = require('mongoose');

const url = 'mongodb+srv://alygo:bYS24SxkO0bLJI5s@cluster0.yfu6o7v.mongodb.net/alygo?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(url);
    const db = mongoose.connection.db;
    const result = await db.collection('systemconfigurations').updateOne({}, {
      $set: { 'aiSupport.model': 'gemini-2.5-flash' }
    });
    console.log('Successfully updated DB config model:', result);
    process.exit(0);
  } catch (err) {
    console.error('Error updating DB config:', err);
    process.exit(1);
  }
}

run();
