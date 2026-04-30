const express = require('express');
const router = express.Router();
const db = require('../database');
const { verifyToken, requireRole } = require('../middleware/auth');

// Create trip
router.post('/trips', verifyToken, requireRole('driver'), (req, res) => {
  const { from_location, to_location, departure_time, arrival_time, available_seats, price } = req.body;
  
  // Get driver ID from user
  db.get('SELECT id FROM drivers WHERE user_id = ?', [req.user.id], (err, driver) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    db.run(
      `INSERT INTO trips (driver_id, from_location, to_location, departure_time, arrival_time, available_seats, total_seats, price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [driver.id, from_location, to_location, departure_time, arrival_time, available_seats, available_seats, price],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });

        // Emit real-time update
        const io = req.app.get('io');
        io.emit('trip-update', { trip_id: this.lastID, action: 'created' });

        res.json({ message: 'Trip created', trip_id: this.lastID });
      }
    );
  });
});

// Get my trips
router.get('/trips', verifyToken, requireRole('driver'), (req, res) => {
  db.get('SELECT id FROM drivers WHERE user_id = ?', [req.user.id], (err, driver) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    db.all('SELECT * FROM trips WHERE driver_id = ? ORDER BY departure_time DESC', [driver.id], (err, trips) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(trips);
    });
  });
});

// Get trip bookings
router.get('/trips/:id/bookings', verifyToken, requireRole('driver'), (req, res) => {
  db.all(`
    SELECT b.*, u.full_name as passenger_name, u.phone as passenger_phone
    FROM bookings b
    JOIN users u ON b.passenger_id = u.id
    WHERE b.trip_id = ?
    ORDER BY b.created_at DESC
  `, [req.params.id], (err, bookings) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(bookings);
  });
});

// Update trip status
router.put('/trips/:id/status', verifyToken, requireRole('driver'), (req, res) => {
  const { trip_status } = req.body;
  
  db.run('UPDATE trips SET trip_status = ? WHERE id = ?', [trip_status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    const io = req.app.get('io');
    io.emit('trip-update', { trip_id: req.params.id, status: trip_status });
    
    res.json({ message: 'Trip status updated' });
  });
});

// Get earnings
router.get('/earnings', verifyToken, requireRole('driver'), (req, res) => {
  db.get('SELECT id FROM drivers WHERE user_id = ?', [req.user.id], (err, driver) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    db.all(`
      SELECT t.id, t.from_location, t.to_location, t.price, COUNT(b.id) as bookings,
             SUM(b.total_price) as total_earnings
      FROM trips t
      LEFT JOIN bookings b ON t.id = b.trip_id AND b.booking_status != 'cancelled'
      WHERE t.driver_id = ? AND t.trip_status = 'completed'
      GROUP BY t.id
    `, [driver.id], (err, earnings) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const total = earnings.reduce((sum, e) => sum + (e.total_earnings || 0), 0);
      res.json({ earnings, total });
    });
  });
});

// Accept parcel
router.put('/parcels/:id/accept', verifyToken, requireRole('driver'), (req, res) => {
  db.get('SELECT id FROM drivers WHERE user_id = ?', [req.user.id], (err, driver) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    db.run(
      'UPDATE parcels SET driver_id = ?, parcel_status = ? WHERE id = ? AND parcel_status = ?',
      [driver.id, 'accepted', req.params.id, 'pending'],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(400).json({ error: 'Parcel not available' });

        const io = req.app.get('io');
        io.emit('parcel-update', { parcel_id: req.params.id, status: 'accepted' });

        res.json({ message: 'Parcel accepted' });
      }
    );
  });
});

// Update parcel status
router.put('/parcels/:id/status', verifyToken, requireRole('driver'), (req, res) => {
  const { parcel_status } = req.body;
  
  db.run('UPDATE parcels SET parcel_status = ? WHERE id = ?', [parcel_status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });

    const io = req.app.get('io');
    io.emit('parcel-update', { parcel_id: req.params.id, status: parcel_status });

    res.json({ message: 'Parcel status updated' });
  });
});

// Get available parcels
router.get('/parcels', verifyToken, requireRole('driver'), (req, res) => {
  db.all(`
    SELECT p.*, u.full_name as sender_name, u.phone as sender_phone
    FROM parcels p
    JOIN users u ON p.sender_id = u.id
    WHERE p.parcel_status = 'pending' OR p.driver_id = ?
    ORDER BY p.created_at DESC
  `, [req.user.id], (err, parcels) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(parcels);
  });
});

// Get lost items
router.get('/lost-items', verifyToken, requireRole('driver'), (req, res) => {
  db.all('SELECT * FROM lost_items WHERE status != ?', ['returned'], (err, items) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(items);
  });
});

// Update lost item status
router.put('/lost-items/:id/status', verifyToken, requireRole('driver'), (req, res) => {
  const { status } = req.body;
  
  db.run('UPDATE lost_items SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Lost item status updated' });
  });
});

module.exports = router;
