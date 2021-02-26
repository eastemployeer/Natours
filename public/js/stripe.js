/* eslint-disable */

import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async (tourId) => {
  try {
    //public key
    const stripe = Stripe(
      'pk_test_51IOi4VGOO1NWTN9sDcB2MgrUSKMjDtIGoesEGXohj4nx6fIlWyCdXrupVzrqNeq8ZOKn3o8m66wPCnH4lGtihctP00SacDiGj0'
    );
    //1) Get the checkout session from the server
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    // console.log(session);

    //2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
