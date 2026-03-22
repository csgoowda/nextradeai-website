const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const VERSION = "1.0.5";
console.log(`Starting NexTradeAI Server v${VERSION}`);

// Explicit routes for HTML files (placed BEFORE static middleware)
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '.'))); 

// Debug: Log files in directory to help find admin.html on Railway
const fs = require('fs');
console.log('Production Files:', fs.readdirSync(__dirname));

// Initialize SQLite database
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    console.log(`Creating database directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, 'database.sqlite');
console.log(`Database Location: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('CRITICAL: Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database successfully.');
        
        // Create views table
        db.run(`CREATE TABLE IF NOT EXISTS page_views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT,
            email TEXT,
            country TEXT,
            mt5Account TEXT,
            phone TEXT,
            source TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// Endpoint to register a page view
app.post('/api/view', (req, res) => {
    db.run(`INSERT INTO page_views DEFAULT VALUES`, function (err) {
        if (err) {
            console.error('Error inserting view:', err.message);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.status(200).json({ success: true, id: this.lastID });
    });
});

// Endpoint to save or update lead/user data
app.post('/api/lead', (req, res) => {
    const { fullName, email, country, mt5Account, phone, source } = req.body;

    if (!fullName || !email || !country || !mt5Account || !phone) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    // Check if user with this email or phone already exists
    // We'll treat email as the primary key for checking
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }

        if (row) {
            // User exists, update source if not already included
            let updatedSource = row.source || '';
            if (!updatedSource.includes(source)) {
                updatedSource = updatedSource ? `${updatedSource},${source}` : source;
            }

            db.run(`UPDATE users SET fullName = ?, country = ?, mt5Account = ?, phone = ?, source = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [fullName, country, mt5Account, phone, updatedSource, row.id],
                function (updateErr) {
                    if (updateErr) {
                        console.error(`UPDATE ERROR for ${email}:`, updateErr.message);
                        return res.status(500).json({ error: 'Error updating user in database' });
                    }
                    console.log(`SUCCESS: Updated user: ${email} (New Source: ${updatedSource})`);
                    res.status(200).json({ success: true, message: 'User updated', source: updatedSource });
                }
            );

        } else {
            // New user, insert
            db.run(`INSERT INTO users (fullName, email, country, mt5Account, phone, source) VALUES (?, ?, ?, ?, ?, ?)`,
                [fullName, email, country, mt5Account, phone, source],
                function (insertErr) {
                    if (insertErr) {
                        console.error(`INSERT ERROR for ${email}:`, insertErr.message);
                        return res.status(500).json({ error: 'Error inserting user into database' });
                    }
                    console.log(`SUCCESS: Created new user: ${email} (Source: ${source})`);
                    res.status(201).json({ success: true, message: 'User created' });
                }
            );
        }
    });
});

// Endpoint to view all user data easily
app.get('/api/admin/data', (req, res) => {
    db.all(`SELECT * FROM users`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ users: rows });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
