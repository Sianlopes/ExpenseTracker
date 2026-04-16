import { useEffect, useState, useCallback } from 'react'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Dividends', 'Business', 'Capital Gains', 'Other Income']
const EXPENSE_CATEGORIES = [
  'Needs',
  'Health',
  'Insurance',
  'Investment',
  'Savings',
  'Self-Development',
  'Debt Payment',
  'Leisure',
  'Other Expense',
]
const PRIORITY_COLORS = ['#48a8f0', '#d11f20', '#97d852', '#64dae8', '#7f3ad4', '#f59e0b', '#22c55e']

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const amountFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
})

const todayIso = () => new Date().toISOString().slice(0, 10)

const toMonthIndex = (dateValue) => {
  if (!dateValue || typeof dateValue !== 'string') {
    return null
  }

  const parts = dateValue.split('-')
  if (parts.length < 2) {
    return null
  }

  const index = Number(parts[1]) - 1
  return Number.isInteger(index) && index >= 0 && index < 12 ? index : null
}

const toYear = (dateValue) => {
  if (!dateValue || typeof dateValue !== 'string') {
    return null
  }

  const parts = dateValue.split('-')
  if (parts.length < 1) {
    return null
  }

  const year = Number(parts[0])
  return Number.isInteger(year) && year > 1900 ? year : null
}

const defaultFormState = {
  description: '',
  amount: '',
  type: 'income',
  category: INCOME_CATEGORIES[0],
  date: todayIso(),
}

const createConicGradient = (items, total) => {
  if (!items.length || total <= 0) {
    return 'conic-gradient(#2f3b4f 0 100%)'
  }

  let current = 0
  const slices = items.map((item, index) => {
    const start = (current / total) * 100
    current += item.amount
    const end = (current / total) * 100
    return `${PRIORITY_COLORS[index % PRIORITY_COLORS.length]} ${start}% ${end}%`
  })

  return `conic-gradient(${slices.join(', ')})`
}

/* ─── API helper ─── */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const api = async (url, options = {}) => {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'include',
  })
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(
      API_BASE_URL
        ? 'Server unavailable. Check that the deployed backend URL is correct and online.'
        : 'Server unavailable. Make sure the backend is running locally with `npm run server`.',
    )
  }
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong.')
  }
  return data
}

/* ─── Login Page Component ─── */
function LoginPage({ onLogin }) {
  const [view, setView] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [recoveryUser, setRecoveryUser] = useState(null)
  const [loading, setLoading] = useState(false)

  const clearForm = () => {
    setUsername('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    setError('')
    setSuccessMsg('')
    setRecoveryUser(null)
  }

  const switchView = (nextView) => {
    clearForm()
    setView(nextView)
  }

  /* ── Login / Signup handler ── */
  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (view === 'signup') {
        const trimmedEmail = email.trim().toLowerCase()
        if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
          setError('Please enter a valid email address.')
          setLoading(false)
          return
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.')
          setLoading(false)
          return
        }
        const data = await api('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username: username.trim(), email: trimmedEmail, password }),
        })
        onLogin(data.username)
      } else {
        const data = await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: username.trim(), password }),
        })
        onLogin(data.username)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /* ── Forgot password handler ── */
  const handleForgotSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const trimmedEmail = email.trim().toLowerCase()
      if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setError('Please enter a valid email address.')
        setLoading(false)
        return
      }

      const data = await api('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail }),
      })

      setRecoveryUser(data.username)
      setView('reset-success')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /* ── Reset password handler ── */
  const handleResetSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (newPassword.length < 4) {
        setError('Password must be at least 4 characters.')
        setLoading(false)
        return
      }
      if (newPassword !== confirmNewPassword) {
        setError('Passwords do not match.')
        setLoading(false)
        return
      }

      await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ username: recoveryUser, newPassword }),
      })

      setSuccessMsg('Password reset successfully! You can now log in.')
      setTimeout(() => switchView('login'), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /* ── Shared icon components ── */
  const UserIcon = () => (
    <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )

  const LockIcon = () => (
    <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )

  const EmailIcon = () => (
    <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 4L12 13 2 4" />
    </svg>
  )

  const ShieldIcon = () => (
    <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )

  const titles = {
    login: { title: 'Welcome Back', subtitle: 'Log in to your Expense Tracker' },
    signup: { title: 'Create Account', subtitle: 'Sign up to start tracking your finances' },
    forgot: { title: 'Forgot Password', subtitle: 'Enter your registered email to recover your account' },
    'reset-success': { title: 'Reset Password', subtitle: `Setting new password for "${recoveryUser}"` },
  }

  const { title, subtitle } = titles[view]

  return (
    <div className="login-page">
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />

      <div className="login-card">
        <div className="login-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="14" fill="url(#logoGrad)" />
            <path d="M14 32V20l10-8 10 8v12H28v-8h-8v8H14z" fill="#fff" fillOpacity="0.95" />
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="48">
                <stop stopColor="#00c165" />
                <stop offset="1" stopColor="#4eb6ff" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className="login-title">{title}</h1>
        <p className="login-subtitle">{subtitle}</p>

        {/* ── LOGIN FORM ── */}
        {view === 'login' && (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-user">Username</label>
              <div className="login-input-wrap">
                <UserIcon />
                <input id="login-user" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" autoComplete="username" />
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="login-pass">Password</label>
              <div className="login-input-wrap">
                <LockIcon />
                <input id="login-pass" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" />
                <button type="button" className="login-eye-btn" onClick={() => setShowPassword((p) => !p)}>{showPassword ? '🙈' : '👁️'}</button>
              </div>
            </div>
            <div className="login-forgot-row">
              <button type="button" className="login-forgot-btn" onClick={() => switchView('forgot')}>Forgot Password?</button>
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-submit-btn" disabled={loading}>{loading ? 'Logging in...' : 'Log In'}</button>
            <p className="login-toggle">Don't have an account?{' '}<button type="button" className="login-toggle-btn" onClick={() => switchView('signup')}>Sign Up</button></p>
          </form>
        )}

        {/* ── SIGNUP FORM ── */}
        {view === 'signup' && (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="signup-user">Username</label>
              <div className="login-input-wrap">
                <UserIcon />
                <input id="signup-user" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" autoComplete="username" />
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="signup-email">Email</label>
              <div className="login-input-wrap">
                <EmailIcon />
                <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" autoComplete="email" />
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="signup-pass">Password</label>
              <div className="login-input-wrap">
                <LockIcon />
                <input id="signup-pass" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" autoComplete="new-password" />
                <button type="button" className="login-eye-btn" onClick={() => setShowPassword((p) => !p)}>{showPassword ? '🙈' : '👁️'}</button>
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="signup-confirm">Confirm Password</label>
              <div className="login-input-wrap">
                <ShieldIcon />
                <input id="signup-confirm" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" autoComplete="new-password" />
              </div>
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-submit-btn" disabled={loading}>{loading ? 'Creating...' : 'Sign Up'}</button>
            <p className="login-toggle">Already have an account?{' '}<button type="button" className="login-toggle-btn" onClick={() => switchView('login')}>Log In</button></p>
          </form>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {view === 'forgot' && (
          <form className="login-form" onSubmit={handleForgotSubmit}>
            <div className="login-field">
              <label htmlFor="forgot-email">Registered Email</label>
              <div className="login-input-wrap">
                <EmailIcon />
                <input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your registered email" autoComplete="email" />
              </div>
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-submit-btn" disabled={loading}>{loading ? 'Searching...' : 'Find My Account'}</button>
            <p className="login-toggle">Remembered your password?{' '}<button type="button" className="login-toggle-btn" onClick={() => switchView('login')}>Back to Login</button></p>
          </form>
        )}

        {/* ── RESET PASSWORD ── */}
        {view === 'reset-success' && (
          <form className="login-form" onSubmit={handleResetSubmit}>
            <div className="login-success-banner">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00c165" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>Account found! Set your new password below.</span>
            </div>
            <div className="login-field">
              <label htmlFor="reset-new">New Password</label>
              <div className="login-input-wrap">
                <LockIcon />
                <input id="reset-new" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" autoComplete="new-password" />
                <button type="button" className="login-eye-btn" onClick={() => setShowPassword((p) => !p)}>{showPassword ? '🙈' : '👁️'}</button>
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="reset-confirm">Confirm New Password</label>
              <div className="login-input-wrap">
                <ShieldIcon />
                <input id="reset-confirm" type={showPassword ? 'text' : 'password'} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" />
              </div>
            </div>
            {error && <p className="login-error">{error}</p>}
            {successMsg && <p className="login-success-msg">{successMsg}</p>}
            <button type="submit" className="login-submit-btn" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
            <p className="login-toggle"><button type="button" className="login-toggle-btn" onClick={() => switchView('login')}>Back to Login</button></p>
          </form>
        )}
      </div>
    </div>
  )
}

/* ─── Main App ─── */
function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const [searchText, setSearchText] = useState('')
  const [listTypeFilter, setListTypeFilter] = useState('all')
  const [formState, setFormState] = useState(defaultFormState)
  const [errorMessage, setErrorMessage] = useState('')
  const [appLoading, setAppLoading] = useState(true)

  // Check session on mount
  useEffect(() => {
    api('/api/auth/me')
      .then((data) => setCurrentUser(data.username))
      .catch(() => setCurrentUser(null))
      .finally(() => setAppLoading(false))
  }, [])

  // Load transactions when user logs in
  const loadTransactions = useCallback(async () => {
    try {
      const data = await api('/api/transactions')
      setTransactions(data)
    } catch {
      setTransactions([])
    }
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadTransactions()
    } else {
      setTransactions([])
    }
  }, [currentUser, loadTransactions])

  const handleLogin = (username) => {
    setCurrentUser(username)
  }

  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    setCurrentUser(null)
    setTransactions([])
  }

  /* ─── Show loading spinner while checking session ─── */
  if (appLoading) {
    return (
      <div className="login-page">
        <p style={{ color: '#97a3b9', fontSize: '1.1rem' }}>Loading...</p>
      </div>
    )
  }

  /* ─── If not logged in, show login page ─── */
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />
  }

  const orderedTransactions = [...transactions].sort((left, right) => {
    const dateDiff = new Date(right.date).getTime() - new Date(left.date).getTime()
    if (dateDiff !== 0) {
      return dateDiff
    }
    return (right.id || '').localeCompare(left.id || '')
  })

  const availableYears = (() => {
    const yearSet = new Set()
    yearSet.add(new Date().getFullYear())
    for (const t of transactions) {
      const y = toYear(t.date)
      if (y !== null) yearSet.add(y)
    }
    return [...yearSet].sort((a, b) => b - a)
  })()

  const yearFilteredTransactions =
    selectedYear === 'ALL'
      ? orderedTransactions
      : orderedTransactions.filter((t) => toYear(t.date) === selectedYear)

  const monthFilteredTransactions =
    selectedMonth === 'ALL'
      ? yearFilteredTransactions
      : yearFilteredTransactions.filter((t) => toMonthIndex(t.date) === selectedMonth)

  const visibleTransactions = monthFilteredTransactions.filter((t) => {
    const matchesType = listTypeFilter === 'all' || t.type === listTypeFilter
    const needle = searchText.trim().toLowerCase()
    const haystack = `${t.description} ${t.category}`.toLowerCase()
    const matchesSearch = !needle || haystack.includes(needle)
    return matchesType && matchesSearch
  })

  const summary = monthFilteredTransactions.reduce(
    (acc, t) => {
      if (t.type === 'income') acc.income += t.amount
      else acc.expenses += t.amount
      return acc
    },
    { income: 0, expenses: 0 },
  )
  summary.balance = summary.income - summary.expenses

  const expensePressure = summary.income > 0 ? Math.min((summary.expenses / summary.income) * 100, 100) : 0

  const monthlySeries = (() => {
    const initial = MONTHS.map((label, index) => ({ label, index, income: 0, expense: 0 }))
    for (const t of yearFilteredTransactions) {
      const mi = toMonthIndex(t.date)
      if (mi === null) continue
      if (t.type === 'income') initial[mi].income += t.amount
      else initial[mi].expense += t.amount
    }
    return initial
  })()

  const incomeSourceBreakdown = (() => {
    const m = new Map()
    for (const t of monthFilteredTransactions) {
      if (t.type !== 'income') continue
      m.set(t.category, (m.get(t.category) ?? 0) + t.amount)
    }
    return [...m.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount)
  })()

  const priorities = (() => {
    const m = new Map()
    for (const t of monthFilteredTransactions) {
      if (t.type !== 'expense') continue
      m.set(t.category, (m.get(t.category) ?? 0) + t.amount)
    }
    return [...m.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount).slice(0, 7)
  })()

  const totalPriorities = priorities.reduce((sum, item) => sum + item.amount, 0)

  const highestIncomeMonth = monthlySeries.reduce((best, e) => (e.income > best.income ? e : best), { label: 'N/A', income: 0 })
  const highestExpenseMonth = monthlySeries.reduce((best, e) => (e.expense > best.expense ? e : best), { label: 'N/A', expense: 0 })

  const lineMaxValue = Math.max(1, ...monthlySeries.map((e) => Math.max(e.income, e.expense)))

  const graphWidth = 720
  const graphHeight = 270
  const padX = 30
  const padTop = 18
  const padBottom = 42

  const toPoint = (mi, value) => {
    const uw = graphWidth - padX * 2
    const uh = graphHeight - padTop - padBottom
    const x = padX + (uw / 11) * mi
    const y = graphHeight - padBottom - (value / lineMaxValue) * uh
    return `${x},${y}`
  }

  const incomePoints = monthlySeries.map((e, i) => toPoint(i, e.income)).join(' ')
  const expensePoints = monthlySeries.map((e, i) => toPoint(i, e.expense)).join(' ')

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormState((c) => ({ ...c, [name]: value }))
  }

  const handleTypeChange = (event) => {
    const nextType = event.target.value
    setFormState((c) => ({
      ...c,
      type: nextType,
      category: nextType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
    }))
  }

  const handleAddTransaction = async (event) => {
    event.preventDefault()

    const trimmedDescription = formState.description.trim()
    const parsedAmount = Number.parseFloat(formState.amount)

    if (!trimmedDescription) { setErrorMessage('Please enter a description.'); return }
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) { setErrorMessage('Amount must be a positive number.'); return }
    if (toMonthIndex(formState.date) === null) { setErrorMessage('Please choose a valid date.'); return }

    setErrorMessage('')

    try {
      const newTx = await api('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          description: trimmedDescription,
          amount: parsedAmount,
          type: formState.type,
          category: formState.category,
          date: formState.date,
        }),
      })
      setTransactions((current) => [newTx, ...current])
      setFormState((c) => ({
        ...defaultFormState,
        type: c.type,
        category: c.type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
        date: todayIso(),
      }))
    } catch (err) {
      setErrorMessage(err.message)
    }
  }

  const deleteTransaction = async (transactionId) => {
    try {
      await api(`/api/transactions/${transactionId}`, { method: 'DELETE' })
      setTransactions((current) => current.filter((t) => t.id !== transactionId))
    } catch (err) {
      alert(err.message)
    }
  }

  const clearTransactions = async () => {
    if (window.confirm('Delete all transactions?')) {
      try {
        await api('/api/transactions/clear', { method: 'DELETE' })
        setTransactions([])
      } catch (err) {
        alert(err.message)
      }
    }
  }

  const sourceMax = Math.max(1, ...incomeSourceBreakdown.map((item) => item.amount))

  return (
    <main className="dashboard-app">
      <div className="dashboard-shell">
        <section className="panel title-panel">
          <p className="eyebrow">Personal Finance</p>
          <h1>Personal Money Manager Dashboard</h1>
          <div className="title-row">
            <p className="subhead">Track income, control expenses, and keep monthly priorities in focus.</p>
            <div className="user-badge">
              <span className="user-avatar">{currentUser.charAt(0).toUpperCase()}</span>
              <span className="user-name">{currentUser}</span>
              <button type="button" className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </section>

        <section className="panel stat-panel">
          <p className="stat-label">Income</p>
          <p className="stat-value income-text">{currencyFormatter.format(summary.income)}</p>
        </section>

        <section className="panel stat-panel">
          <p className="stat-label">Needs</p>
          <p className="stat-value expense-text">{currencyFormatter.format(summary.expenses)}</p>
        </section>

        <div className="dashboard-grid">
          <aside className="panel month-panel" aria-label="Year and month filter">
            <div className="month-heading-row">
              <p className="month-title">Year</p>
              <button type="button" className={`tiny-filter ${selectedYear === 'ALL' ? 'is-active' : ''}`} onClick={() => setSelectedYear('ALL')}>ALL</button>
            </div>
            <div className="year-pills">
              {availableYears.map((year) => (
                <button key={year} type="button" className={`year-pill ${selectedYear === year ? 'is-active' : ''}`} onClick={() => setSelectedYear(year)}>{year}</button>
              ))}
            </div>

            <div className="month-heading-row">
              <p className="month-title">Months</p>
              <button type="button" className={`tiny-filter ${selectedMonth === 'ALL' ? 'is-active' : ''}`} onClick={() => setSelectedMonth('ALL')}>ALL</button>
            </div>
            <ul className="month-list">
              {MONTHS.map((month, index) => (
                <li key={month}>
                  <button type="button" className={`month-pill ${selectedMonth === index ? 'is-active' : ''}`} onClick={() => setSelectedMonth(index)}>{month}</button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="panel account-panel" aria-label="Account summary">
            <h2>Account Summary</h2>
            <p className="panel-context">
              Showing {selectedYear === 'ALL' ? 'all years' : selectedYear}{' · '}
              {selectedMonth === 'ALL' ? 'all months' : MONTHS[selectedMonth]}
            </p>
            <div className="account-content">
              <div className="balance-block">
                <p className="balance-label">Balance</p>
                <p className={`balance-value ${summary.balance < 0 ? 'expense-text' : 'income-text'}`}>{currencyFormatter.format(summary.balance)}</p>
                <div className="balance-row">
                  <div>
                    <p className="mini-label">Income</p>
                    <p className="income-text">{currencyFormatter.format(summary.income)}</p>
                  </div>
                  <div>
                    <p className="mini-label">Expenses</p>
                    <p className="expense-text">{currencyFormatter.format(summary.expenses)}</p>
                  </div>
                </div>
              </div>
              <div className="progress-wrap" aria-label="Expense pressure">
                <svg viewBox="0 0 120 120" className="progress-chart">
                  <circle cx="60" cy="60" r="48" className="progress-base" />
                  <circle cx="60" cy="60" r="48" className="progress-value" style={{ strokeDasharray: `${expensePressure * 3.02} 302` }} />
                </svg>
                <p className="progress-text">{amountFormatter.format(expensePressure)}%</p>
                <p className="progress-caption">Expense Pressure</p>
              </div>
            </div>
          </section>

          <section className="panel source-panel" aria-label="Source of income">
            <h2>Source of Income</h2>
            {incomeSourceBreakdown.length === 0 ? (
              <p className="empty-message">No income data in this view yet.</p>
            ) : (
              <div className="source-chart">
                {incomeSourceBreakdown.map((entry) => {
                  const height = Math.max(8, (entry.amount / sourceMax) * 100)
                  return (
                    <article key={entry.category} className="bar-item">
                      <p className="bar-value">{currencyFormatter.format(entry.amount)}</p>
                      <div className="bar-track">
                        <span className="bar-fill" style={{ height: `${height}%` }} />
                      </div>
                      <p className="bar-label">{entry.category}</p>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <section className="panel trend-panel" aria-label="Income vs expenses">
            <div className="trend-head">
              <h2>Income vs. Expenses</h2>
              <div className="trend-maxes">
                <p>Max Expense <span className="expense-text">{highestExpenseMonth.label}</span></p>
                <p>Max Income <span className="income-text">{highestIncomeMonth.label}</span></p>
              </div>
            </div>
            <div className="trend-legend">
              <span className="legend-item"><i className="legend-dot income-dot" /> Income</span>
              <span className="legend-item"><i className="legend-dot expense-dot" /> Expenses</span>
            </div>
            <div className="trend-svg-wrap">
              <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="trend-svg">
                {[0, 1, 2, 3, 4].map((step) => {
                  const value = (lineMaxValue / 4) * step
                  const y = graphHeight - padBottom - ((graphHeight - padTop - padBottom) / 4) * step
                  return (
                    <g key={step}>
                      <line x1={padX} y1={y} x2={graphWidth - padX} y2={y} className="grid-line" />
                      <text x={4} y={y + 4} className="grid-text">{amountFormatter.format(value)}</text>
                    </g>
                  )
                })}
                <polyline points={incomePoints} className="income-line" />
                <polyline points={expensePoints} className="expense-line" />
                {monthlySeries.map((e, i) => (
                  <circle key={`i-${e.label}`} cx={toPoint(i, e.income).split(',')[0]} cy={toPoint(i, e.income).split(',')[1]} r="4" className="income-point" />
                ))}
                {monthlySeries.map((e, i) => (
                  <circle key={`e-${e.label}`} cx={toPoint(i, e.expense).split(',')[0]} cy={toPoint(i, e.expense).split(',')[1]} r="4" className="expense-point" />
                ))}
              </svg>
              <div className="trend-months">
                {MONTHS.map((m) => (<span key={m}>{m}</span>))}
              </div>
            </div>
          </section>

          <section className="panel priorities-panel" aria-label="Financial priorities">
            <h2>Financial Priorities</h2>
            <div className="priorities-top">
              <div className="priority-ring" style={{ backgroundImage: createConicGradient(priorities, totalPriorities) }}>
                <span>{totalPriorities > 0 ? 'Top Expenses' : 'No Data'}</span>
              </div>
            </div>
            {priorities.length === 0 ? (
              <p className="empty-message">Add expense transactions to see priority split.</p>
            ) : (
              <ul className="priority-list">
                {priorities.map((entry, index) => (
                  <li key={entry.category}>
                    <span className="priority-meta">
                      <i style={{ backgroundColor: PRIORITY_COLORS[index % PRIORITY_COLORS.length] }} />
                      {entry.category}
                    </span>
                    <strong>{currencyFormatter.format(entry.amount)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel form-panel" aria-label="Transaction input form">
            <h2>Add Transaction</h2>
            <form className="transaction-form" onSubmit={handleAddTransaction}>
              <label>Description<input type="text" name="description" value={formState.description} onChange={handleInputChange} placeholder="Salary, Groceries, Insurance, etc." required /></label>
              <div className="form-row">
                <label>Amount<input type="number" name="amount" min="0.01" step="0.01" value={formState.amount} onChange={handleInputChange} placeholder="0.00" required /></label>
                <label>Type
                  <select name="type" value={formState.type} onChange={handleTypeChange}>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label>Category
                  <select name="category" value={formState.category} onChange={handleInputChange}>
                    {(formState.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </label>
                <label>Date<input type="date" name="date" value={formState.date} onChange={handleInputChange} required /></label>
              </div>
              {errorMessage && <p className="form-error">{errorMessage}</p>}
              <button type="submit" className="primary-btn">Add Transaction</button>
            </form>
          </section>

          <section className="panel transactions-panel" aria-label="Transaction list">
            <div className="transaction-head">
              <h2>Transactions</h2>
              <button type="button" className="ghost-btn" onClick={clearTransactions} disabled={transactions.length === 0}>Clear All</button>
            </div>
            <div className="transaction-filters">
              <input type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by description or category" />
              <select value={listTypeFilter} onChange={(e) => setListTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            {visibleTransactions.length === 0 ? (
              <p className="empty-message">No matching transactions in this view.</p>
            ) : (
              <ul className="transaction-list">
                {visibleTransactions.map((t) => (
                  <li key={t.id} className="transaction-item">
                    <div className="transaction-main">
                      <p className="transaction-desc">{t.description}</p>
                      <p className="transaction-meta">{t.category} | {t.date}</p>
                    </div>
                    <div className="transaction-side">
                      <p className={t.type === 'income' ? 'income-text' : 'expense-text'}>
                        {t.type === 'income' ? '+' : '-'}{currencyFormatter.format(t.amount)}
                      </p>
                      <button type="button" className="icon-delete" onClick={() => deleteTransaction(t.id)} aria-label={`Delete ${t.description}`}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

export default App
