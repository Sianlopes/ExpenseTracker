const express = require('express')
const session = require('express-session')
const cors = require('cors')
const path = require('path')

const authRoutes = require('./routes/auth.cjs')
const transactionRoutes = require('./routes/transactions.cjs')

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true)
    } else {
      callback(null, true) // Allow all origins in production (same server)
    }
  },
  credentials: true,
}))

app.use(express.json())

app.use(session({
  secret: process.env.SESSION_SECRET || 'expense-tracker-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}))

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/transactions', transactionRoutes)

// Serve React frontend (production build)
const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))

// Fallback: any non-API route serves index.html (for React client-side routing)
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

// Start server
app.listen(PORT, () => {
  console.log(`✅ Expense Tracker running at http://localhost:${PORT}`)
})
