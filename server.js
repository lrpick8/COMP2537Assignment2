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
    password: String,
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
}));


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(express.urlencoded({ extended: true }));

// Session setup
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

//Making user accessable in all views (doesn't give an access error)
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;  
    next();
});


//Middleware to check the user's role as either an admin or a regular user
function isAdmin(req, res, next) {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).render('403', { message: 'You are not listed as an admin, therefore you cannot access this page.' });
    }
    next();
}

// Home Page
app.get('/', (req, res) => {
    res.render('index', {
        user: req.session.user,
        pageTitle: 'Home'
    });
});

// Sign Up
app.get('/signup', (req, res) => {
    res.render('signup', {
        error: null,
        pageTitle: 'Sign Up'
    });
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
        return res.render('signup', {
            error: error.details[0].message,
            pageTitle: 'Sign Up'
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hashedPassword });

    req.session.user = { name: newUser.name, role: newUser.role };
    res.redirect('/members');

});

// Log In
app.get('/login', (req, res) => {
    res.render('login', {
        error: null,
        pageTitle: 'Log In'
    });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });

    const { error } = schema.validate({ email, password });
    if (error) {
        return res.render('login', {
            error: error.details[0].message,
            pageTitle: 'Log In'
        });
    }

    const user = await User.findOne({ email });
    if (!user) {
        return res.render('login', {
            error: 'User and password not found',
            pageTitle: 'Log In'
        });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
        return res.render('login', {
            error: 'User and password not found',
            pageTitle: 'Log In'
        });
    }

    req.session.user = { name: user.name, role: user.role };
    res.redirect('/members');
});

// Members Only
app.get('/members', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }

    const images = ['Brucey of Thrones.jpg', 'Brucey Potter.jpg', 'Trailer Park Brucey.jpg'];
    const randomImage = images[Math.floor(Math.random() * images.length)];

    res.render('members', {
        user: req.session.user,
        image: randomImage,
        pageTitle: 'Members Area'
    });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Admin Page
app.get('/admin', isAdmin, async (req, res) => {
    if (!req.session.user) {
            return res.redirect('/');  
        }

    const users = await User.find({});
    res.render('admin', { users });
});

// Promoting a user to admin
app.post('/admin/promote/:id', isAdmin, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { role: 'admin' });
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Demoting a user to regular user
app.post('/admin/demote/:id', isAdmin, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { role: 'user' });
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// 404 Page
app.use((req, res) => {
    res.status(404).render('404', {
        pageTitle: 'Page Not Found',
        user: req.session.user
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
