require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Connexion MongoDB
connectDB();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 } // 1h
}));

// Frontend (HTML/CSS/JS)
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/auth',    require('./routes/auth'));
app.use('/billets', require('./routes/billets'));
app.use('/gate',    require('./routes/gate'));
app.use('/flag',    require('./routes/flag'));

// Route racine → sert le frontend/index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
