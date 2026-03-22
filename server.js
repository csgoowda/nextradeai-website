require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const app = express();
const port = process.env.PORT || 3000;
const VERSION = "1.2.0";

// 1. Security & Performance Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Set to false to allow external scripts like Lucide icons easily, or configure specifically
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(morgan('combined')); // Structured logging

// 2. Session Management (In-memory for simplicity)
app.set('trust proxy', 1); // CRITICAL: Required for secure cookies behind Railway proxy
app.use(session({
    secret: process.env.SESSION_SECRET || 'nxt_secret_dev_123',
    resave: false,
    saveUninitialized: false,
    name: 'nextrade_session', // Custom name for less obvious fingerprints
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // Matches environment
        httpOnly: true,
        sameSite: 'lax', // Needed for cross-domain redirects if any
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// 3. Rate Limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { error: "Too many requests, please try again later." }
});
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // Stricter limit for lead submissions
    message: { error: "Spam detected. Please wait before submitting again." }
});
app.use('/api/', globalLimiter);

// 4. Admin Authentication Middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.status(401).json({ error: "Unauthorized access. Please login." });
};

// --- ROUTES ---

// Public Legal Pages
app.get('/privacy-policy', (req, res) => res.sendFile(path.join(__dirname, 'privacy-policy.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, 'terms.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'contact.html')));

// Admin Auth Routes
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    // For simplicity, we use env vars. In a multi-user system, this would be a DB check.
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        req.session.isAdmin = true;
        return res.json({ success: true, message: "Logged in successfully" });
    }
    res.status(401).json({ error: "Invalid credentials" });
});

app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Admin Dashboard (Protected UI)
app.get('/admin', (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/login.html');
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Admin Data API (Protected)
app.get('/api/admin/data', requireAuth, (req, res) => {
    db.all(`SELECT * FROM users ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ users: rows });
    });
});

// Public Lead API (Validated & Rate Limited)
app.post('/api/lead', apiLimiter, [
    body('fullName').trim().isLength({ min: 2, max: 100 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('phone').trim().isLength({ min: 7, max: 20 }).escape(),
    body('country').trim().isLength({ min: 2, max: 50 }).escape(),
    body('mt5Account').trim().isNumeric().isLength({ min: 1, max: 20 }).escape()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Invalid input provided.", details: errors.array() });
    }

    const { fullName, email, country, mt5Account, phone, source } = req.body;
    
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (row) {
            let updatedSource = row.source || '';
            if (!updatedSource.includes(source)) {
                updatedSource = updatedSource ? `${updatedSource},${source}` : source;
            }
            db.run(`UPDATE users SET fullName = ?, country = ?, mt5Account = ?, phone = ?, source = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [fullName, country, mt5Account, phone, updatedSource, row.id],
                function (updateErr) {
                    if (updateErr) return res.status(500).json({ error: 'Update failed' });
                    res.status(200).json({ success: true, message: 'User updated' });
                }
            );
        } else {
            db.run(`INSERT INTO users (fullName, email, country, mt5Account, phone, source) VALUES (?, ?, ?, ?, ?, ?)`,
                [fullName, email, country, mt5Account, phone, source],
                function (insertErr) {
                    if (insertErr) return res.status(500).json({ error: 'Creation failed' });
                    res.status(201).json({ success: true, message: 'User created' });
                }
            );
        }
    });
});

// View Tracking (Simple counters)
app.post('/api/view', globalLimiter, (req, res) => {
    db.run(`INSERT INTO page_views DEFAULT VALUES`, (err) => {
        if (err) return res.status(500).json({ error: 'Logging failed' });
        res.status(200).json({ success: true });
    });
});

// Static Middleware
app.use(express.static(path.join(__dirname, '.')));

// Fallback to Index (Express 5 fix: use a direct Regex object)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 5. Database Initialization
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.resolve(dataDir, 'database.sqlite');
const oldDbPath = path.resolve(__dirname, 'database.sqlite');

if (fs.existsSync(oldDbPath) && !fs.existsSync(dbPath) && oldDbPath !== dbPath) {
    try {
        fs.copyFileSync(oldDbPath, dbPath);
        fs.unlinkSync(oldDbPath);
        console.log('Database migrated to data folder.');
    } catch (e) {
        console.warn('Migration failed, using root database.');
    }
}

const finalDbPath = fs.existsSync(dbPath) ? dbPath : oldDbPath;
const db = new sqlite3.Database(finalDbPath, (err) => {
    if (err) console.error('Error opening database', err.message);
    else {
        console.log(`Connected to database at ${finalDbPath}`);
        db.run(`CREATE TABLE IF NOT EXISTS page_views (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT, email TEXT, country TEXT, mt5Account TEXT, phone TEXT, source TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.stack);
    res.status(500).json({ error: 'An unexpected internal server error occurred.' });
});

app.listen(port, () => {
    console.log(`NexTradeAI Server v${VERSION} running at http://localhost:${port}`);
});
