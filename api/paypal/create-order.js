// POST /api/paypal/create-order
// Body: { currency, client:{name,email,company,phone,country}, items:[{service,description,amount}], note }
// The amount is set by the customer, so the server's job is to re-validate every line,
// recompute the total itself, and build an itemised PayPal order under the service names.
const { CURRENCIES, MAX_TOTAL, MAX_ITEMS, paypal, clean, toCents, money, readBody, invoiceId } = require('../_paypal');

const SERVICES = [
  'AI & automation', 'Private AI agents', 'Web development', 'Website maintenance',
  'Mobile app development', 'Digital marketing', 'SEO', 'Social media marketing',
  'IT managed services', 'IT support', 'Hosting & domain', 'Custom web service'
];

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = readBody(req);
  const currency = CURRENCIES.includes(body.currency) ? body.currency : 'USD';
  const c = body.client || {};
  const client = {
    name: clean(c.name, 80),
    email: clean(c.email, 120),
    company: clean(c.company, 100),
    phone: clean(c.phone, 30),
    country: clean(c.country, 60)
  };
  if (!client.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
    return res.status(400).json({ error: 'Please enter your name and a valid email.' });
  }

  const raw = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS) : [];
  const items = [];
  let total = 0;
  for (const it of raw) {
    const service = SERVICES.includes(it.service) ? it.service : 'Custom web service';
    const description = clean(it.description, 120);
    const cents = toCents(it.amount);
    if (!Number.isFinite(cents) || cents < 100) {
      return res.status(400).json({ error: 'Each line needs an amount of at least 1.00.' });
    }
    total += cents;
    items.push({
      name: clean('Web service — ' + service, 127),
      description: description || service,
      quantity: '1',
      category: 'DIGITAL_GOODS',
      unit_amount: { currency_code: currency, value: money(cents) }
    });
  }
  if (!items.length) return res.status(400).json({ error: 'Add at least one service line.' });
  if (total > MAX_TOTAL * 100) {
    return res.status(400).json({ error: 'For payments above ' + MAX_TOTAL + ' ' + currency + ', please contact info@softweblab.net for a bank invoice.' });
  }

  const invoice = invoiceId();
  const note = clean(body.note, 200);
  const order = {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: invoice,
      invoice_id: invoice,
      custom_id: clean(client.email, 127),
      description: clean('SoftWebLab web services' + (client.company ? ' — ' + client.company : ''), 127),
      soft_descriptor: 'SOFTWEBLAB',
      amount: {
        currency_code: currency,
        value: money(total),
        breakdown: { item_total: { currency_code: currency, value: money(total) } }
      },
      items
    }],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: 'SoftWebLab',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW'
        }
      }
    }
  };
  if (note) order.purchase_units[0].description = clean(order.purchase_units[0].description + ' | ' + note, 127);

  try {
    const r = await paypal('/v2/checkout/orders', order);
    if (!r.ok) {
      console.error('create-order failed', r.status, JSON.stringify(r.data));
      return res.status(502).json({ error: 'PayPal could not create the order. Please try again.' });
    }
    return res.status(200).json({ id: r.data.id, invoice, total: money(total), currency });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Payment service is unavailable right now.' });
  }
};
