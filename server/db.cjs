const mongoose = require('mongoose')
const dns = require('dns')

require('dotenv').config()

// Use public resolvers to avoid SRV lookup issues on some networks.
dns.setServers(['8.8.8.8', '8.8.4.4'])

const connectDB = async () => {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('MONGODB_URI is not set.')
  }

  try {
    await mongoose.connect(uri)
    console.log('MongoDB connected')
  } catch (error) {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  }
}

module.exports = connectDB
