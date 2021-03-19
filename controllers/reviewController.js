const Review = require('./../models/reviewModel.js');
const factory = require('./handlerFactory.js');

exports.setTourUserIds = (req, res, next) => {
  //look at createReview and getReviews
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user._id;
  next();
};
exports.createReview = factory.createOne(Review);
exports.getReviews = factory.getAll(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.getReview = factory.getOne(Review);
