require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const path = require('path');

const app = express();

// MongoDB User model
const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    email: String,
    password: String
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
    console.log('MongoDB connected');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        autoRemove: 'native',
        ttl: 60 * 60
    }),
    cookie: { maxAge: 60 * 60 * 1000 }
}));

// Home Page
app.get('/', (req, res) => {
    const user = req.session.user;
    res.render('index', { user });
});

// Sign Up
app.get('/signup', (req, res) => {
    res.render('signup', { error: null });
});

app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    const schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(5).required()
    });

    const { error } = schema.validate({ name, email, password });
    if (error) {
        return res.render('signup', { error: error.details[0].message });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashedPassword });

    req.session.user = { name };
    res.redirect('/members');
});

// Log In
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });

    const { error } = schema.validate({ email, password });
    if (error) {
        return res.render('login', { error: error.details[0].message });
    }

    const user = await User.findOne({ email });
    if (!user) {
        return res.render('login', { error: 'User and password not found' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
        return res.render('login', { error: 'User and password not found' });
    }

    req.session.user = { name: user.name };
    res.redirect('/members');
});

// Members Only
app.get('/members', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }

    const images = ['Brucey of Thrones.jpg', 'Brucey Potter.jpg', 'Trailer Park Brucey.jpg'];
    const randomImage = images[Math.floor(Math.random() * images.length)];
    res.render('members', { user: req.session.user, image: randomImage });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// 404 fallback
app.use((req, res) => {
    res.status(404).render('404');
});

// Start Server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
