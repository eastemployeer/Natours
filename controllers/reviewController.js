const Review = require('./../models/reviewModel.js');
// const APIFeatures = require('./../utils/APIFeatures.js');
// const catchAsync = require('./../utils/catchAsync.js');
const factory = require('./handlerFactory.js');

exports.setTourUserIds = (req, res, next) => {
  //look at createReview and getReviews
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user._id;
  next();
};
exports.createReview = factory.createOne(Review);
// exports.createReview = catchAsync(async (req, res, next) => {
//   //allow nested routes
//   if (!req.body.tour) req.body.tour = req.params.tourId;
//   if (!req.body.user) req.body.user = req.user._id;
//   const newReview = await Review.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       review: newReview,
//     },
//   });
// });

exports.getReviews = factory.getAll(Review);
// exports.getReviews = catchAsync(async (req, res, next) => {
//   //if nested route then --> reviews for one specific tour
//   let filter = {};
//   if (req.params.tourId) filter = { tour: req.params.tourId };

//   const reviews = await Review.find(filter);

//   res.status(200).json({
//     status: 'success',
//     results: reviews.length,
//     data: {
//       reviews,
//     },
//   });
// });

exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.getReview = factory.getOne(Review);
