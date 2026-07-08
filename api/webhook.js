import Stripe from 'stripe';
import nodemailer from 'nodemailer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const config = {
  api: { bodyParser: false }
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(buf.toString(), sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    const email = session.customer_email || (session.customer_details && session.customer_details.email);

    if (email) {
      await transporter.sendMail({
        from: '"TradeScribes" <hello@tradescribes.com>',
        to: email,
        subject: "You forgot something 👀",
        text: "Hey! You started signing up for TradeScribes but didn't finish. Use code LAUNCH30 for 30% off — try it free for 7 days at tradescribes.com",
        html: `<p>Hey!</p>
               <p>You started signing up for TradeScribes but didn't finish.</p>
               <p>Use code <strong>LAUNCH30</strong> for 30% off — <a href="https://tradescribes.com">try it free for 7 days at tradescribes.com</a></p>`
      });
    }
  }

  res.json({ received: true });
}
