const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const User = require('../models/user');

function authMiddleware(req, res, next) {
  if (!req.session.userId) return res.redirect('/');
  next();
}

router.get('/', authMiddleware, (req, res) => {
  const images = fs.readdirSync(path.join(__dirname, '..', 'public'));
  const randomImage = images[Math.floor(Math.random() * images.length)];
  res.render('members', { user: req.session.user, image: randomImage });
});

router.get('/admin', authMiddleware, async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('Access Denied');
  }

  const users = await User.find({});
  res.render('admin', { users });
});

module.exports = router;
