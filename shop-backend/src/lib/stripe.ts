import Stripe from 'stripe';

// Stripe is optional — payments will be simulated if key is not set
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    })
  : null;

export default stripe;
