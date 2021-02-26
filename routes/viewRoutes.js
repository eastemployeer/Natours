const express = require('express');
const viewsController = require('../controllers/viewsController.js');
const authController = require('../controllers/authController.js');
const bookingController = require('../controllers/bookingController.js');

const viewRouter = express.Router();

// viewRouter.get('/', (req, res) => {
//   res.status(200).render('base.pug', {
//     tour: 'The Forest Hiker', //local pug file variables
//     user: 'Jonas',
//   }); //bedzie szukalo tego pliku w folderze views, wczesniej okreslonym jako wlasciwy dla widoków - plików .pug
// });

//used only in /my-tours for now but made it reusable
viewRouter.use(viewsController.alerts);

viewRouter.get('/me', authController.protect, viewsController.getAccount);

//bookings
viewRouter.get('/my-tours', authController.protect, viewsController.getMyTours);

//update user data with html forms
viewRouter.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData
);

viewRouter.get(
  '/',
  //VERSION 1 OF CREATING NEW BOOKING AND CONFIRMING PAYMENT
  // bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewsController.getOverview
);
viewRouter.get(
  '/tour/:slug',
  authController.isLoggedIn,
  viewsController.getTour
);
viewRouter.get(
  '/login',
  authController.isLoggedIn,
  viewsController.getLoginForm
);

module.exports = viewRouter;
