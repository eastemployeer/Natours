const mongoose = require('mongoose');
const slugify = require('slugify');

const tourSchema = new mongoose.Schema(
  {
    //schemat - przepis na dokument/rekord - struktura
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxLength: [40, 'A tour name must have less or equal than 40 chars'],
      minLength: [10, 'A tour name must have more or equal than 10 chars'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must hava a difficulty'],
      enum: {
        //only for strings
        values: ['easy', 'medium', 'difficult'], //possible values
        message: 'Difficulty is either: easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => val.toFixed(1), //re runs everytime there is new value
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // this only points to current document on NEW document creation
          // val == prcieDiscount specified by user, this = document
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be lower than regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must habe a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, //won't get in response to Tour.find().select()
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //GeoJSON - type and coordinates are obligatory
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number], //longitude, lattitude - odwrotnie niz normalnie
      address: String,
      description: String,
    },
    locations: [
      //embedded document
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    //child referencing
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    //extra options - enables virtuals
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
//indexes
// tourSchema.index({ price: 1 }); //1 - ascending
//compound indexes -> also works as single index
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });
//virtuals cant be used in queries
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});
//virtual populate - twozenie virtualnego pola do operacji populate()
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', //foreign key (w Review w polu tour skladowane jest id)
  localField: '_id', //a w tym modelu (Tour) to samo pole jest w polu _id - localField z foreign są porównywane
});
//DOCUMENT MIDDLEWARE runs before .save() and .create()
//this points to current document - object
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

//embedding guides to tours
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   //every async function returns Promise so we have to await the result
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.pre('save', function (next) {
//   console.log('Will save doc');
// });
// tourSchema.post('save', function (doc, next) {
//   //after all pre middleware functions finished
//   console.log(doc);
//   next();
// });

//QUERY MIDDLEWARE
//this points to current query
tourSchema.pre(/^find/, function (next) {
  // regEx = all strings that starts with find
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  next();
});
//children reference
//populate -> fill up with real data from referenced table/collection
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

//AGGREGATION MIDDLEWARE
tourSchema.pre('aggregate', function (next) {
  if (!this.pipeline()[0].$geoNear)
    //geoNear must be the first in pipeline
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }); //this.pipeline() zwraca tablice ze wszystkimi agregacjami
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
