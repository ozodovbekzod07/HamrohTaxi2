const express = require('express');
const router = express.Router();
const db = require('../database');
const { verifyToken, requireRole } = require('../middleware/auth');

// Dashboard stats
router.get('/dashboard', verifyToken, requireRole('admin'), (req, res) => {
  const stats = {};
  
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    stats.users = row.count;
    
    db.get('SELECT COUNT(*) as count FROM drivers', (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      stats.drivers = row.count;
      
      db.get('SELECT COUNT(*) as count FROM trips WHERE trip_status = ?', ['active'], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.active_trips = row.count;
        
        db.get('SELECT COUNT(*) as count FROM bookings', (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          stats.bookings = row.count;
          
          db.get('SELECT COUNT(*) as count FROM parcels', (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.parcels = row.count;
            
          db.get('SELECT SUM(b.total_price) as total FROM bookings b WHERE b.payment_status = ?', ['paid'], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.revenue = row.total || 0;
            
            res.json(stats);
          });
          });
        });
      });
    });
  });
});

// Get all users
router.get('/users', verifyToken, requireRole('admin'), (req, res) => {
  db.all('SELECT id, full_name, phone, role, language, created_at FROM users ORDER BY created_at DESC', (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(users);
  });
});

// Block user
router.put('/users/:id/block', verifyToken, requireRole('admin'), (req, res) => {
  db.run('UPDATE users SET role = ? WHERE id = ?', ['blocked', req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'User blocked' });
  });
});

// Get all drivers
router.get('/drivers', verifyToken, requireRole('admin'), (req, res) => {
  db.all(`
    SELECT d.*, u.full_name, u.phone, u.profile_photo
    FROM drivers d
    JOIN users u ON d.user_id = u.id
    ORDER BY d.created_at DESC
  `, (err, drivers) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(drivers);
  });
});

// Verify driver
router.put('/drivers/:id/verify', verifyToken, requireRole('admin'), (req, res) => {
  db.run('UPDATE drivers SET verification_status = ? WHERE id = ?', ['verified', req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Driver verified' });
  });
});

// Get all trips
router.get('/trips', verifyToken, requireRole('admin'), (req, res) => {
  db.all(`
    SELECT t.*, d.car_model, d.car_number, u.full_name as driver_name
    FROM trips t
    JOIN drivers d ON t.driver_id = d.id
    JOIN users u ON d.user_id = u.id
    ORDER BY t.created_at DESC
    LIMIT 50
  `, (err, trips) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(trips);
  });
});

// Get all bookings
router.get('/bookings', verifyToken, requireRole('admin'), (req, res) => {
  db.all(`
    SELECT b.*, t.from_location, t.to_location, u.full_name as passenger_name
    FROM bookings b
    JOIN trips t ON b.trip_id = t.id
    JOIN users u ON b.passenger_id = u.id
    ORDER BY b.created_at DESC
    LIMIT 50
  `, (err, bookings) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(bookings);
  });
});

// Get all parcels
router.get('/parcels', verifyToken, requireRole('admin'), (req, res) => {
  db.all(`
    SELECT p.*, u.full_name as sender_name, d.car_model
    FROM parcels p
    JOIN users u ON p.sender_id = u.id
    LEFT JOIN drivers d ON p.driver_id = d.id
    ORDER BY p.created_at DESC
    LIMIT 50
  `, (err, parcels) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(parcels);
  });
});

// Get all lost items
router.get('/lost-items', verifyToken, requireRole('admin'), (req, res) => {
  db.all(`
    SELECT li.*, u.full_name as reporter_name
    FROM lost_items li
    JOIN users u ON li.reporter_id = u.id
    ORDER BY li.created_at DESC
  `, (err, items) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(items);
  });
});

// Get earnings report
router.get('/earnings', verifyToken, requireRole('admin'), (req, res) => {
  db.all(`
    SELECT DATE(created_at) as date, SUM(amount) as total
    FROM payments
    WHERE transaction_status = 'completed'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
  `, (err, earnings) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(earnings);
  });
});

module.exports = router;
