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

// Assets statiques
app.use(express.static(path.join(__dirname, '../public')));

// Views
app.use('/views', express.static(path.join(__dirname, 'views')));

// Routes (à brancher au fur et à mesure)
// app.use('/auth',    require('./routes/auth'));
// app.use('/tickets', require('./routes/tickets'));
// app.use('/gate',    require('./routes/gate'));
// app.use('/flag',    require('./routes/flag'));

// Route racine
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
