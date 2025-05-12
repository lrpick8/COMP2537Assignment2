const express = require('express');
const router = express.Router();
const Joi = require('joi');
const User = require('../models/user');

router.get('/', (req, res) => {
    if(req.session.userId) {
        res.render('home', { name: req.session.name });
    } else {
        res.render('home', { name: null });
    }
});

router.get('/signup', (req, res) => {
    res.render('signup', { error: null });
});

router.post('/signup', async (req, res) => {
    const schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });

const { error } = schema.validate(req.body);
    if (error) {
        return res.render('signup', { error: error.details[0].message });
    }

    try {
        const { name, email, password } = req.body;
        const user = await User.create({ name, email, password });
        req.session.userId = user._id;
        req.session.name = user.name;
        res.redirect('/members');
    } catch (err) {
        res.render('signup', { error: 'Email already exists or a server error.' });
    }
});

router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.render('login', { error: 'Email and Password are required.' });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
        return res.render('login', { error: 'User and Password are not found.' });
    }

    req.session.userId = user._id;
    req.session.name = user.name;
    res.redirect('/members');
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

module.exports = router;
