const express = require('express');
const router = express.Router();
const db = require('../database');
const { verifyToken, requireRole } = require('../middleware/auth');

// Create parcel order
router.post('/', verifyToken, (req, res) => {
  const { pickup_location, delivery_location, parcel_type, parcel_weight, parcel_size, description, delivery_time } = req.body;
  
  // Calculate price
  const sizeMultiplier = { small: 1, medium: 1.5, large: 2.5 };
  const basePrice = 15000;
  const price = Math.ceil(basePrice * parcel_weight * (sizeMultiplier[parcel_size] || 1.5));

  db.run(
    `INSERT INTO parcels (sender_id, pickup_location, delivery_location, parcel_type, parcel_weight, parcel_size, price, description, delivery_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, pickup_location, delivery_location, parcel_type, parcel_weight, parcel_size, price, description, delivery_time],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      const io = req.app.get('io');
      io.emit('parcel-update', { parcel_id: this.lastID, action: 'created' });

      res.json({ message: 'Parcel order created', parcel_id: this.lastID, price });
    }
  );
});

// Get my parcels
router.get('/my', verifyToken, (req, res) => {
  db.all(`
    SELECT p.*, d.car_model, u.full_name as driver_name, u.phone as driver_phone
    FROM parcels p
    LEFT JOIN drivers d ON p.driver_id = d.id
    LEFT JOIN users u ON d.user_id = u.id
    WHERE p.sender_id = ?
    ORDER BY p.created_at DESC
  `, [req.user.id], (err, parcels) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(parcels);
  });
});

// Track parcel
router.get('/track/:id', (req, res) => {
  db.get(`
    SELECT p.*, u.full_name as sender_name, u.phone as sender_phone,
           d.car_model, du.full_name as driver_name, du.phone as driver_phone
    FROM parcels p
    JOIN users u ON p.sender_id = u.id
    LEFT JOIN drivers d ON p.driver_id = d.id
    LEFT JOIN users du ON d.user_id = du.id
    WHERE p.id = ?
  `, [req.params.id], (err, parcel) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });
    res.json(parcel);
  });
});

// Cancel parcel
router.put('/:id/cancel', verifyToken, (req, res) => {
  db.run(
    'UPDATE parcels SET parcel_status = ? WHERE id = ? AND sender_id = ? AND parcel_status = ?',
    ['cancelled', req.params.id, req.user.id, 'pending'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(400).json({ error: 'Cannot cancel parcel' });

      const io = req.app.get('io');
      io.emit('parcel-update', { parcel_id: req.params.id, status: 'cancelled' });

      res.json({ message: 'Parcel cancelled' });
    }
  );
});

module.exports = router;
