// POST /api/paypal/capture-order  Body: { orderID }
// Captures the approved order server-side and returns what PayPal actually charged.
const { paypal, readBody } = require('../_paypal');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { orderID } = readBody(req);
  if (!orderID || !/^[A-Z0-9]{8,40}$/.test(orderID)) {
    return res.status(400).json({ error: 'Invalid order.' });
  }

  try {
    const r = await paypal('/v2/checkout/orders/' + orderID + '/capture');
    const d = r.data || {};
    // Card declined inside PayPal — let the buyer pick another funding source.
    const issue = d.details && d.details[0] && d.details[0].issue;
    if (issue === 'INSTRUMENT_DECLINED') return res.status(422).json({ restart: true, error: 'Your payment method was declined. Please try another.' });
    if (!r.ok) {
      console.error('capture failed', r.status, JSON.stringify(d));
      return res.status(502).json({ error: 'The payment could not be completed. You have not been charged.' });
    }

    const unit = (d.purchase_units || [])[0] || {};
    const cap = ((unit.payments || {}).captures || [])[0] || {};
    return res.status(200).json({
      status: cap.status || d.status,          // COMPLETED or PENDING
      orderId: d.id,
      captureId: cap.id,
      invoice: cap.invoice_id || unit.reference_id,
      amount: cap.amount,
      payer: d.payer ? { name: [d.payer.name?.given_name, d.payer.name?.surname].filter(Boolean).join(' '), email: d.payer.email_address } : null,
      time: cap.create_time
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Payment service is unavailable right now.' });
  }
};
