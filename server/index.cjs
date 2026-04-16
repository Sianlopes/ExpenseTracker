const express = require('express')
const session = require('express-session')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const authRoutes = require('./routes/auth.cjs')
const transactionRoutes = require('./routes/transactions.cjs')
const connectDB = require('./db.cjs')

const app = express()
const PORT = process.env.PORT || 3001
const isProduction = process.env.NODE_ENV === 'production'
const clientUrl = process.env.CLIENT_URL
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:3000',
  clientUrl,
].filter(Boolean))

connectDB()

if (isProduction) {
  app.set('trust proxy', 1)
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
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
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}))

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRoutes)
app.use('/api/transactions', transactionRoutes)

const distPath = path.join(__dirname, '..', 'dist')
const indexPath = path.join(distPath, 'index.html')

if (fs.existsSync(indexPath)) {
  app.use(express.static(distPath))

  app.get('{*path}', (req, res) => {
    res.sendFile(indexPath)
  })
}

app.listen(PORT, () => {
  console.log(`Expense Tracker running at http://localhost:${PORT}`)
})
