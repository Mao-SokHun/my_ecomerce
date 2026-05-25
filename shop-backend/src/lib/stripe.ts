import Stripe from 'stripe';

// Stripe is optional — payments will be simulated if key is not set
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export default stripe;
