const express = require('express');
const router = express.Router();
const db = require('../database');
const { generateToken, verifyToken } = require('../middleware/auth');

// Generate OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Check phone exists
router.post('/check-phone', (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone required' });
  }

  db.get('SELECT id, full_name, phone, role, language, profile_photo FROM users WHERE phone = ?', [phone], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ exists: !!user, user: user || null });
  });
});

// Register / Send OTP
router.post('/register', (req, res) => {
  const { phone, full_name, role } = req.body;
  
  if (!phone || !full_name || !role) {
    return res.status(400).json({ error: 'Phone, name and role required' });
  }

  const otp = generateOTP();
  
  db.get('SELECT * FROM users WHERE phone = ?', [phone], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (user) {
      // Update existing user with new OTP
      db.run('UPDATE users SET otp = ? WHERE phone = ?', [otp, phone], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'OTP sent', otp }); // In production, send via SMS
      });
    } else {
      // Create new user
      db.run(
        'INSERT INTO users (full_name, phone, role, otp) VALUES (?, ?, ?, ?)',
        [full_name, phone, role, otp],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: 'User registered', otp, userId: this.lastID });
        }
      );
    }
  });
});

// Verify OTP and Login
router.post('/verify', (req, res) => {
  const { phone, otp } = req.body;
  
  db.get('SELECT * FROM users WHERE phone = ? AND otp = ?', [phone, otp], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    // Clear OTP after verification
    db.run('UPDATE users SET otp = NULL WHERE id = ?', [user.id]);

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        language: user.language
      }
    });
  });
});

// Get current user
router.get('/me', verifyToken, (req, res) => {
  db.get('SELECT id, full_name, phone, role, language, profile_photo FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });
});

// Update language
router.put('/language', verifyToken, (req, res) => {
  const { language } = req.body;
  db.run('UPDATE users SET language = ? WHERE id = ?', [language, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Language updated' });
  });
});

// Update profile
router.put('/me', verifyToken, (req, res) => {
  const { full_name, profile_photo } = req.body;
  db.run('UPDATE users SET full_name = ?, profile_photo = ? WHERE id = ?', [full_name, profile_photo, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT id, full_name, phone, role, language, profile_photo FROM users WHERE id = ?', [req.user.id], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ user });
    });
  });
});

// Change password (for future use)
router.put('/password', verifyToken, (req, res) => {
  // Placeholder for password change functionality
  res.json({ message: 'Password updated' });
});

module.exports = router;
