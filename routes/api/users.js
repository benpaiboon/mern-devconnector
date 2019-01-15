const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const keys = require('../../config/keys');
const passport = require('passport');

// Load Input Validation
const validateRegisterInput = require('../../validation/register');
const validateLoginInput = require('../../validation/login');

const User = require('../../models/User');

// @route: GET /api/users/
router.get('/', (req, res) => {
  User.find({})
    .then(users => { res.status(200).json(users) })
    .catch(err => console.log(err));
});

// @route: POST /api/users/register
router.post('/register', (req, res) => {
  const { errors, isValid } = validateRegisterInput(req.body);

  // Check Validation
  if (!isValid) {
    res.status(400).json(errors);
  }
  else {
    User.findOne({ email: req.body.email })
      .then(user => {
        if (user) {
          errors.email = 'Email already exists';
          res.status(400).json(errors);
          // res.status(400).json({ email: 'Email already exits' });
        } else {
          const avatar = gravatar.url(req.body.email, {
            s: '200', // Size
            r: 'pg', // Rating
            d: 'mm' // Default
          });

          const newUser = new User({
            name: req.body.name,
            email: req.body.email,
            avatar,
            password: req.body.password
          });

          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newUser.password, salt, (err, hash) => {
              if (err) throw err;
              newUser.password = hash;
              newUser.save()
                .then(user => res.json(user))
                .catch(err => console.log(err));
            });
          })
        }
      })
  }
});

// @route: POST /api/users/login
router.post('/login', (req, res) => {
  const { errors, isValid } = validateLoginInput(req.body);

  // Check Validation
  if (!isValid) {
    return res.status(400).json(errors);
  }
  else {
    User.findOne({ email: req.body.email })
      .then(user => {
        if (!user || user === null) {
          errors.email = 'User not found!';
          res.status(404).json(errors);
          // res.status(404).json({ email: 'User not found!' })
        } else {
          bcrypt.compare(req.body.password, user.password)
            .then(isMatch => {
              if (isMatch) {
                // User Matched
                const payload = {
                  id: user._id,
                  name: user.name,
                  email: user.email,
                  avatar: user.avatar
                }
                // Sign Token
                jwt.sign(payload, keys.jwtSecret, { expiresIn: 3600 }, (err, token) => {
                  res.json({
                    success: true,
                    token: 'Bearer ' + token
                  });
                });
              } else {
                errors.password = 'Password incorrect.';
                res.status(400).json(errors);
              }
            });
        }
      });
  }
});

// @route: GET /api/users/current
router.get('/current', passport.authenticate('jwt', { session: false }), (req, res) => {
  // let loginUser = {
  //   id: req.user.id,
  //   name: req.user.name,
  //   email: req.user.email,
  //   avatar: req.user.avatar
  // }
  res.json(req.user);
});

module.exports = router;