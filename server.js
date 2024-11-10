require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const { Client } = require('pg');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use((req, res, next) => {
    console.log(`Requested URL: ${req.url}`); // Log the requested URL
    next();
});
app.use(cors({
    origin: ['http://localhost:3000', 'https://task-management-six-rust.vercel.app'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Database connection
const dbClient = new Client({
    connectionString: process.env.DB_CONNECTION_STRING,
    ssl: {
        rejectUnauthorized: false, // This setting allows SSL connections without verification.
    },
});

dbClient.connect().catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
});

// Add a blacklist for invalidated tokens
const tokenBlacklist = new Set();

// Authentication middleware
const authenticateUser = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Please login first' });
    }
    next();
};

// Update the authenticateToken middleware to check for blacklisted tokens
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
        return res.status(401).json({ error: 'Token is no longer valid' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Optional: Cleanup blacklist periodically
setInterval(() => {
    // Clear blacklist every 24 hours
    tokenBlacklist.clear();
}, 24 * 60 * 60 * 1000);

// Routes
app.post('https://task-management-six-rust.vercel.app/login', async (req, res) => {
    console.log('POST /login'); // Log the route
    try {
        const { username, password } = req.body;
        const result = await dbClient.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user.id;

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: user.id,
                    username: user.username
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                token: token,
                user: {
                    id: user.id,
                    username: user.username
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('https://task-management-six-rust.vercel.app/register', async (req, res) => {
    console.log('POST /register'); // Log the route
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await dbClient.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
            [username, email, hashedPassword]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === '23505') { // Unique violation
            res.status(400).json({ success: false, message: 'Username or email already exists' });
        } else {
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
});

// Add the logout route
app.post('https://task-management-six-rust.vercel.app/logout', authenticateToken, (req, res) => {
    console.log('POST /logout'); // Log the route
    try {
        // Get the token from the authorization header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        // Add the token to blacklist
        if (token) {
            tokenBlacklist.add(token);
        }

        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('https://task-management-six-rust.vercel.app/logout', (req, res) => {
    console.log('POST /logout'); // Log the route
    req.session.destroy(err => {
        if (err) {
            res.status(500).json({ success: false, message: 'Error logging out' });
        } else {
            res.json({ success: true });
        }
    });
});

app.get('https://task-management-six-rust.vercel.app/getTasks', authenticateUser, async (req, res) => {
    console.log('GET /getTasks'); // Log the route
    try {
        const result = await dbClient.query(
            'SELECT * FROM tasks WHERE user_id = $1 ORDER BY due_date ASC',
            [req.session.userId]
        );
        res.json({ success: true, tasks: result.rows });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ success: false, message: 'Error fetching tasks' });
    }
});

app.post('https://task-management-six-rust.vercel.app/addTask', authenticateUser, async (req, res) => {
    console.log('POST /addTask'); // Log the route
    try {
        const { task_name, description, due_date, priority } = req.body;
        await dbClient.query(
            'INSERT INTO tasks (task_name, description, due_date, priority, user_id) VALUES ($1, $2, $3, $4, $5)',
            [task_name, description, due_date, priority, req.session.userId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Add task error:', error);
        res.status(500).json({ success: false, message: 'Error adding task' });
    }
});

app.delete('https://task-management-six-rust.vercel.app/deleteTask/:id', authenticateUser, async (req, res) => {
    console.log(`DELETE /deleteTask/${req.params.id}`); // Log the route
    try {
        const result = await dbClient.query(
            'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
            [req.params.id, req.session.userId]
        );

        if (result.rowCount === 0) {
            res.status(404).json({ success: false, message: 'Task not found' });
        } else {
            res.json({ success: true });
        }
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ success: false, message: 'Error deleting task' });
    }
});

// Add before the error handling middleware
app.get('https://task-management-six-rust.vercel.app/api/verify-token', authenticateToken, (req, res) => {
    console.log('GET /api/verify-token'); // Log the route
    res.json({
        valid: true,
        user: req.user
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Something broke!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    dbClient.end();
    process.exit(0);
});
