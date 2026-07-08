const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

const app = express();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    const email = session.customer_email || (session.customer_details && session.customer_details.email);

    if (email) {
      try {
        await transporter.sendMail({
          from: '"TradeScribes" <hello@tradescribes.com>',
          to: email,
          subject: "You forgot something 👀",
          text: "Hey! You started signing up for TradeScribes but didn't finish. Use code LAUNCH30 for 30% off — try it free for 7 days at tradescribes.com",
          html: `<p>Hey!</p>
                 <p>You started signing up for TradeScribes but didn't finish.</p>
                 <p>Use code <strong>LAUNCH30</strong> for 30% off — <a href="https://tradescribes.com">try it free for 7 days at tradescribes.com</a></p>`
        });
      } catch (error) {
        console.error('Error sending email:', error);
      }
    }
  }

  res.json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
