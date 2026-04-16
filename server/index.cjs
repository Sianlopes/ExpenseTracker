const express = require('express')
const session = require('express-session')
const cors = require('cors')
const path = require('path')

const authRoutes = require('./routes/auth.cjs')
const transactionRoutes = require('./routes/transactions.cjs')
const connectDB = require('./db.cjs')

const app = express()
const PORT = process.env.PORT || 3001

connectDB()

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true)
    } else {
      callback(null, true)
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
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}))

app.use('/api/auth', authRoutes)
app.use('/api/transactions', transactionRoutes)

const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))

app.get('{*path}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Expense Tracker running at http://localhost:${PORT}`)
})
