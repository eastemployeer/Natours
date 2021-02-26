const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AppError = require('../utils/appError.js');
const Tour = require('./../models/tourModel.js');
const User = require('./../models/userModel.js');
const Booking = require('./../models/bookingModel.js');
const catchAsync = require('./../utils/catchAsync.js');
const factory = require('./handlerFactory.js');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  //1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  //2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    //added query to this route and it will be used to make a booking,
    //its not safe to do this like this because everyone who knows this url can make a booking. It's before implementing stripe webhooks
    //summary: in this version booking is made after this route with this query is reached

    //VERSION 1 OF CREATING NEW BOOKING AND CONFIRMING PAYMENT (viewRoutes.js)
    // success_url: `${req.protocol}://${req.get('host')}/?tour=${
    //   req.params.tourId
    // }&user=${req.user._id}&price=${tour.price}`, //as soon as payment is successful, user will be redirected to this url
    success_url: `${req.protocol}://${req.get('host')}/my-tour?alert=booking`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`, //when payment is cancelled
    //we have access to req.user because protect middleware gets fired before
    customer_email: req.user.email,
    //custom fields - we will get access to them while the purchase is successful
    //all fields are declared in stripe!!!! nie mozna dawac jakichs swoich customowych
    client_reference_id: req.params.tourId,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [
          `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`,
        ],
        amount: tour.price * 100, //musi byc w centach dlatego 1 euro * 100
        currency: 'usd',
        quantity: 1,
      },
    ],
  });
  //3)Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
  //part of session object:
  /*
  "session": {
        "id": "cs_test_a13F4usEuT55fl2tTtrTzbFAdehhyX6Dq5OlEBCe6l1YL90hvMImdDZevL",
        "object": "checkout.session",
        "allow_promotion_codes": null,
        "amount_subtotal": 49700,
        "amount_total": 49700,
        "billing_address_collection": null,
        "cancel_url": "http://127.0.0.1:3000/tour/the-sea-explorer",
        "client_reference_id": "5c88fa8cf4afda39709c2955",
        "currency": "usd",
        "customer": null,
        "customer_details": null,
        "customer_email": "laura@example.com",
        "livemode": false,
        "locale": null,

  */
});

//VERSION 1 OF CREATING NEW BOOKING AND CONFIRMING PAYMENT (viewRoutes.js)
// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//   //Only temporary
//   const { tour, user, price } = req.query;

//   if (!tour || !user || !price) return next();

//   await Booking.create({
//     tour,
//     user,
//     price,
//   });
//   //redirect na url bez query, dzieki temu bedzie nieco bezpieczniej
//   res.redirect(req.originalUrl.split('?')[0]); //->will go again the same middleware circle (but url has now no query)
// });

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);

const createBookingCheckout = async (session) => {
  //session object -> can be seen in stripe --> dev --> webhooks
  const tourID = session.client_reference_id;
  const userID = (await User.findOne({ email: session.customer_email }))._id;
  const price = session.amount_total / 100;
  console.log(tourID, userID, price);
  await Booking.create({
    tour: tourID,
    user: userID,
    price,
  });
};

exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  let event;
  try {
    //req.body here as a stream (raw)
    //event will hold the session info
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`); //this response will be received by stripe because it is stripe who called this URL
  }

  if (event.type === 'checkout.session.completed')
    //type defined in stripe webhook website
    createBookingCheckout(event.data.object); //here session is stored

  res.status(200).json({ received: true });
};
