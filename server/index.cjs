const express = require('express')
const session = require('express-session')
const cors = require('cors')
const path = require('path')

const authRoutes = require('./routes/auth.cjs')
const transactionRoutes = require('./routes/transactions.cjs')

const app = express()
const PORT = 3001

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json())

app.use(session({
  secret: 'expense-tracker-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // set true in production with HTTPS
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}))

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/transactions', transactionRoutes)

// Start server
app.listen(PORT, () => {
  console.log(`✅ Expense Tracker API running at http://localhost:${PORT}`)
})
