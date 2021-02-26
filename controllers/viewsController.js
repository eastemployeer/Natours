const Tour = require('./../models/tourModel.js');
const User = require('./../models/userModel.js');
const Booking = require('./../models/bookingModel.js');
const catchAsync = require('./../utils/catchAsync.js');
const AppError = require('./../utils/appError.js');

exports.alerts = (req, res, next) => {
  //coming from success_url from stripe (bookingController) (for now only from here): /my-tour route (viewRoutes)
  const { alert } = req.query;
  if (alert === 'booking') {
    res.locals.alert =
      'Your booking was succesful! Please check your email for confirmation.';
  }
  next();
};

exports.getOverview = catchAsync(async (req, res, next) => {
  //1) Get tour data from collection
  const tours = await Tour.find();
  //2) Build template

  //3)Render that template using tour data from 1)
  res.status(200).render('overview.pug', {
    title: 'All tours',
    tours,
  });
});
exports.getTour = catchAsync(async (req, res, next) => {
  //1) Get the data for the requested tour
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    select: 'review rating user',
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }
  //2) Build template

  //3) Render
  res
    .status(200)
    // .set(
    //   'Content-Security-Policy',
    //   "default-src 'self' https://*.mapbox.com https://*.stripe.com ;base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src https://cdnjs.cloudflare.com https://api.mapbox.com https://js.stripe.com/v3/ 'self' blob: ;script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests;"
    // )
    .render('tour.pug', {
      title: tour.name,
      tour,
    });
});

exports.getLoginForm = (req, res) => {
  res
    .status(200)
    // .set(
    //   'Content-Security-Policy',
    //   "connect-src 'self' https://cdnjs.cloudflare.com"
    // )
    .render('login.pug', {
      title: 'Log into your account',
    });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account.pug', {
    title: 'Your account',
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  //1) Find all bookings
  const bookings = await Booking.find({ user: req.user._id });
  //2) Find tours with the returned IDs
  //tour got popullated in bookingModel so not really need to do it here like this, we can populate more values (now populating only name --> see bookingModel) and don't search for tours with await Tour.find()
  //console.log(bookings);
  //bookings: [
  /*{
    createdAt: 2021-02-25T21:10:04.641Z,
    paid: true,
    _id: 6038131223e0dabf594d8406,
    tour: {
      guides: [Array],
      _id: 5c88fa8cf4afda39709c2966,
      name: 'The Sports Lover',
      durationWeeks: NaN,
      id: '5c88fa8cf4afda39709c2966'
    }, .....*/
  const tourIDs = bookings.map((el) => el.tour._id);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview.pug', {
    title: 'My Tours',
    tours,
  });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  // console.log(req.body);
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      name: req.body.name, //names given in html form => account.pug
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).render('account.pug', {
    title: 'Your account',
    user: updatedUser,
  });
});
