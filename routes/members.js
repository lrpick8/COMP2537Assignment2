const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

function authMiddleware(req, res, next) {
  if (!req.session.userId) return res.redirect('/');
  next();
}

router.get('/', authMiddleware, (req, res) => {
  const images = fs.readdirSync(path.join(__dirname, '..', 'public'));
  const randomImage = images[Math.floor(Math.random() * images.length)];
  res.render('members', { name: req.session.name, image: randomImage });
});

module.exports = router;
