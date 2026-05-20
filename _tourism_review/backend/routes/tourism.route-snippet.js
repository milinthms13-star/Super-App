// Add these snippets to backend/routes/tourism.js after your existing booking/vendor/admin routes.
// Adjust store function names if your tourismStore uses different helpers.

router.post('/custom-requests', (req, res) => {
  const payload = req.body || {};
  const phone = String(payload.phone || '').replace(/\D/g, '');

  if (!payload.travelerName || phone.length < 10 || !payload.destination) {
    return res.status(400).json({ success: false, message: 'Traveler name, phone and destination are required.' });
  }

  const lead = tourismStore.createLead({
    ...payload,
    id: `lead-${Date.now()}`,
    source: 'custom_request',
    status: 'new',
    createdAt: new Date().toISOString(),
    priority: Number(payload.estimatedBudget || 0) >= 50000 ? 'hot' : 'normal',
  });

  return res.status(201).json({ success: true, data: { lead } });
});

router.post('/payments/intent', (req, res) => {
  const { bookingId, amount, paymentType } = req.body || {};
  if (!bookingId || Number(amount || 0) <= 0) {
    return res.status(400).json({ success: false, message: 'Valid bookingId and amount are required.' });
  }

  // Replace this mock object with Razorpay order creation in production.
  return res.json({
    success: true,
    data: {
      provider: 'manual_or_razorpay_pending',
      orderId: `TOUR-PAY-${Date.now()}`,
      bookingId,
      amount: Number(amount),
      paymentType: paymentType || 'advance',
      status: 'created',
    },
  });
});

router.post('/packages/:packageId/report', (req, res) => {
  const complaint = tourismStore.createComplaint({
    id: `cmp-${Date.now()}`,
    packageId: req.params.packageId,
    reason: req.body?.reason || 'Package issue reported',
    contact: req.body?.contact || '',
    status: 'open',
    createdAt: new Date().toISOString(),
  });

  return res.status(201).json({ success: true, data: { complaint } });
});
