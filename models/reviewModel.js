const mongoose = require('mongoose');
const Tour = require('./tourModel.js');

const reviewSchema = mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review con not be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must have an author'],
    },
  },
  {
    //extra options - enables virtuals
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
reviewSchema.index({ tour: 1, user: 1 }, { unique: true, dropDups: true }); //polaczenie user-tour musi byc unikalne (wyłącza możliwość tworzenia wielu recenzji przez jednego użytkownika do jednej trasy)

reviewSchema.pre(/^find/, function (next) {
  //   this.populate({
  //     path: 'tour',
  //     select: 'name',
  //   }).populate({
  //     path: 'user',
  //     select: 'name photo',
  //   });
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  //this points to current model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // console.log(stats);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    //if 0 reviews left
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};
//aktualizowanie ratingów po każdym create/save
reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.tour); //constructor points to model, so the constructor of the document
});
//aktualizowanie ratingów po każdym update
//findOneAndUpdate or findOneAndDelete [MongoDB] == findByIdAndUpdate or findByIdAndDelete [Mongoose]
reviewSchema.pre(/^findOneAnd/, async function (next) {
  //HOW THIS PROBABLY WORKS: await this.findOne() => query = Review.findOneAnd_(some limitations) => await query.findOne()
  this.r = await this.findOne(); //this.r -> way of passing data from pre to post middleware
  next();
});
reviewSchema.post(/^findOneAnd/, async function () {
  //this nie wskazuje juz na query bo został wykonany
  //aktualizacja statystyk w tym miejscu a nie w pre poniewaz dopiero tutaj w bazie jest nowy review
  await this.r.constructor.calcAverageRatings(this.r.tour);
});
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
