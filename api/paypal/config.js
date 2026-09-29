// GET /api/paypal/config — public client ID for the PayPal JS SDK.
const { ENV, CURRENCIES } = require('../_paypal');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) return res.status(503).json({ error: 'Payments are not configured yet.' });
  res.status(200).json({ clientId, env: ENV, currencies: CURRENCIES });
};
