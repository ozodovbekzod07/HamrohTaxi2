const express = require('express');
const router = express.Router();
const db = require('../database');
const { verifyToken, requireRole } = require('../middleware/auth');

// Search trips
router.get('/trips', verifyToken, requireRole('passenger'), (req, res) => {
  const { from, to, date } = req.query;
  
  let query = `
    SELECT t.*, d.car_model, d.car_number, u.full_name as driver_name, u.phone as driver_phone,
           (t.total_seats - COUNT(b.id)) as available_seats
    FROM trips t
    JOIN drivers d ON t.driver_id = d.id
    JOIN users u ON d.user_id = u.id
    LEFT JOIN bookings b ON t.id = b.trip_id AND b.booking_status != 'cancelled'
    WHERE t.trip_status = 'active'
  `;
  const params = [];

  if (from) {
    query += ' AND t.from_location LIKE ?';
    params.push(`%${from}%`);
  }
  if (to) {
    query += ' AND t.to_location LIKE ?';
    params.push(`%${to}%`);
  }
  if (date) {
    query += ' AND DATE(t.departure_time) = ?';
    params.push(date);
  }

  query += ' GROUP BY t.id ORDER BY t.departure_time ASC';

  db.all(query, params, (err, trips) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(trips);
  });
});

// Book trip
router.post('/book', verifyToken, requireRole('passenger'), (req, res) => {
  const { trip_id, selected_seats } = req.body;
  const passenger_id = req.user.id;

  if (!trip_id || !selected_seats || selected_seats.length === 0) {
    return res.status(400).json({ error: 'Trip ID and seats required' });
  }

  // Check trip availability
  db.get('SELECT * FROM trips WHERE id = ? AND trip_status = ?', [trip_id, 'active'], (err, trip) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    // Check if seats are available
    const seatsArray = JSON.parse(selected_seats);
    db.all('SELECT selected_seats FROM bookings WHERE trip_id = ? AND booking_status != ?', [trip_id, 'cancelled'], (err, bookings) => {
      if (err) return res.status(500).json({ error: err.message });

      const bookedSeats = bookings.flatMap(b => JSON.parse(b.selected_seats));
      const conflict = seatsArray.some(seat => bookedSeats.includes(seat));

      if (conflict) {
        return res.status(400).json({ error: 'Seats already booked' });
      }

      const total_price = seatsArray.length * trip.price;

      // Create booking
      db.run(
        'INSERT INTO bookings (trip_id, passenger_id, selected_seats, total_price) VALUES (?, ?, ?, ?)',
        [trip_id, passenger_id, selected_seats, total_price],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });

          // Emit real-time update
          const io = req.app.get('io');
          io.to(`trip-${trip_id}`).emit('seat-update', {
            trip_id,
            seats: seatsArray,
            passenger_id
          });

          res.json({ message: 'Booking successful', booking_id: this.lastID });
        }
      );
    });
  });
});

// Get my bookings
router.get('/bookings', verifyToken, requireRole('passenger'), (req, res) => {
  db.all(`
    SELECT b.*, t.from_location, t.to_location, t.departure_time, t.price,
           u.full_name as driver_name, d.car_model
    FROM bookings b
    JOIN trips t ON b.trip_id = t.id
    JOIN drivers d ON t.driver_id = d.id
    JOIN users u ON d.user_id = u.id
    WHERE b.passenger_id = ?
    ORDER BY b.created_at DESC
  `, [req.user.id], (err, bookings) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(bookings);
  });
});

// Cancel booking
router.put('/bookings/:id/cancel', verifyToken, requireRole('passenger'), (req, res) => {
  db.run(
    'UPDATE bookings SET booking_status = ? WHERE id = ? AND passenger_id = ?',
    ['cancelled', req.params.id, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Booking not found' });
      res.json({ message: 'Booking cancelled' });
    }
  );
});

// Report lost item
router.post('/lost-items', verifyToken, requireRole('passenger'), (req, res) => {
  const { item_name, item_type, trip_id, description } = req.body;
  
  db.run(
    'INSERT INTO lost_items (reporter_id, item_name, item_type, trip_id, description) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, item_name, item_type, trip_id, description],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Lost item reported', id: this.lastID });
    }
  );
});

// Get my lost items
router.get('/lost-items', verifyToken, requireRole('passenger'), (req, res) => {
  db.all('SELECT * FROM lost_items WHERE reporter_id = ? ORDER BY created_at DESC', [req.user.id], (err, items) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(items);
  });
});

module.exports = router;
