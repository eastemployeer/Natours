// const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const AppError = require('../utils/appError.js');
const Tour = require('./../models/tourModel.js');
const catchAsync = require('./../utils/catchAsync.js');
const factory = require('./handlerFactory.js');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  //cb == true jesli filtr sie zgadza a false jesli nie
  //check if file is an image
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

//will create req.files
exports.uploadTourImages = upload.fields([
  {
    name: 'imageCover', //creates array, even when its set to 1
    maxCount: 1,
  },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  // console.log(req.files);
  /*
  {
    imageCover: [{
      fieldname: 'imageCover,
      originalname: ....
      encoding: ...
      mimetyoe: ...
      buffer: ...
    }],
    images: [{
      ......
    }]
  }
  */
  if (!req.files.imageCover || !req.files.images) return next();

  //1)cover image
  const imageCoverFilename = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${imageCoverFilename}`); //kompresja

  //potrzebne w funkcji ktora aktualizuje wycieczkę, nastepny middleware (bierze req.body)
  req.body.imageCover = imageCoverFilename;

  //2)images
  req.body.images = [];

  //WAŻNE!!!!!!!!!!!!!!!!!!!!!
  //funkcja asynchroniczna jest callbackiem. Z tego powodu ona sama nie zakonczy się od razu tylko zwróci od razu promise'a. Zatem req.files.images będzie najpierw wypełnione promise'ami.
  // Może się tak zdarzyć że next() zostanie wywołane jeszcze przed resolve tego promise'a (każdego)
  // z tego powodu trzeba poczekać na resolve każdego promise'a z tej funkcji (zrobić await wszystkich promise'ów czyli całej tablicy req.files.images)
  await Promise.all(
    req.files.images.map(async (file, i) => {
      //^^^^funkcja asynchro ktora jest cb
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(req.files.images[i].buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`); //kompresja

      req.body.images.push(filename);
    })
  );
  next();
});
//jesli mielibysmy tylko jedno pole do zdjęć w ktorym mialo by byc wiele zdjec to:
// upload.array('images', 5);

// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

// exports.checkBody = (req, res, next) => {
//   if (!(req.body.price && req.body.name)) {
//     return res.status(400).json({
//       status: 'Bad request',
//     });
//   }
//   next();
// };
// exports.checkId = (req, res, next, val) => {
//   if (Number(req.params.id) > tours.length) {
//     return res.status(404).json({
//       //return makes send response immediately
//       status: 'Not found',
//     });
//   }
//   next();
// };

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};
exports.getAllTours = factory.getAll(Tour);
// exports.getAllTours = catchAsync(async (req, res, next) => {
//   // try {
//   // //1a)filtering
//   // const queryObj = { ...req.query };
//   // const excludedFields = ['page', 'sort', 'limit', 'fields']; //query, które są nieistotne jesli chodzi o wyszukiwanie obiektu
//   // excludedFields.forEach((el) => delete queryObj[el]); //deleting part of object

//   // //1b)advanced filtering - gte,lte etc.
//   // let queryStr = JSON.stringify(queryObj);
//   // //konwersja wynika z faktu ze queryObj bedzie mial strukture np. {duration: {lte: 5}}, czyli bez $ przed lte
//   // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); // \b - exactly this strings

//   // console.log(JSON.parse(queryStr));

//   //BUILDING QUERY
//   //let query = Tour.find(JSON.parse(queryStr)); //returns query

//   //2)SORTING
//   // if (req.query.sort) {
//   //   const sortBy = req.query.sort.split(',').join(' ');
//   //   query = query.sort(sortBy);
//   //   //sorting after 2 vars = sort('price ranking')
//   // } else {
//   //   query = query.sort('-createdAt');
//   // }
//   //3)FIELD LIMITING
//   // if (req.query.fields) {
//   //   const fields = req.query.fields.split(',').join(' ');
//   //   query = query.select(fields);
//   // } else {
//   //   query = query.select('-__v'); //-something => excludes this thing
//   // }

//   //4)PAGINATION
//   // const page = Number(req.query.page) || 1;
//   // const limit = Number(req.query.limit) || 100;
//   // const skip = (page - 1) * limit;
//   // //page=2&limit=10
//   // query = query.skip(skip).limit(limit); //skip some number of results and display some number of results (limit)

//   // if (req.query.page) {
//   //   const numTours = await Tour.countDocuments();
//   //   if (skip >= numTours) throw new Error('This page does not exist');
//   // }

//   //EXECUTING QUERY
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();
//   const tours = await features.query;

//   // const tours = await Tour.find()
//   //   .where('duration')
//   //   .equals(5)
//   //   .where('difficulty')
//   //   .equals('easy');

//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours,
//     },
//   });
//   // } catch (err) {
//   //   console.log(err);
//   //   res.status(404).json({
//   //     status: 'fail',
//   //     message: err,
//   //   });
//   // }
// });

exports.getTour = factory.getOne(Tour, { path: 'reviews' });
// exports.getTour = catchAsync(async (req, res, next) => {
//   // const tour = tours.find((el) => el.id === Number(req.params.id));
//   // try {
//   //populating virtual field - sposob na wyswietlenie wszystkich recenzji dotyczacych jednego Toura. Jednoczesnie nie trzymane w bazie więc parent referncing zachowany
//   const tour = await Tour.findById(req.params.id).populate('reviews');
//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }
//   //Tour.findOne({_id: req.params.id})

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour: tour,
//     },
//   });
//   // } catch (err) {
//   //   res.status(404).json({
//   //     status: 'fail',
//   //     message: err,
//   //   });
//   // }
// });

exports.createTour = factory.createOne(Tour);
// exports.createTour = catchAsync(async (req, res, next) => {
//   // try {
//   const newTour = await Tour.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour,
//     },
//   });
//   // } catch (err) {
//   //   res.status(400).json({
//   //     status: 'fail',
//   //     message: err,
//   //   });
//   // }
// });
// exports.createTour = (req, res) => {
//   // console.log(req.body);
//   const newId = tours[tours.length - 1].id + 1;
//   const newTour = { id: newId, ...req.body }; //merging two objects
//   tours.push(newTour);
//   fs.writeFile(
//     `${__dirname}/dev-data/data/tours-simple.json`,
//     JSON.stringify(tours),
//     // eslint-disable-next-line no-unused-vars
//     (err) => {
//       res.status(201).json({
//         status: 'success',
//         data: {
//           tour: newTour,
//         },
//       });
//     }
//   );
// };

exports.updateTour = factory.updateOne(Tour);
// exports.updateTour = catchAsync(async (req, res, next) => {
//   // try {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true, //updated document will be returned
//     runValidators: true, //run validators specified in the schema while updating
//   });

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour,
//     },
//   });
//   // } catch (err) {
//   //   res.status(400).json({
//   //     status: 'fail',
//   //     message: 'Invalid data sent!',
//   //   });
//   // }
// });

exports.deleteTour = factory.deleteOne(Tour);

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   // try {
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(204).json({
//     status: 'success',
//     data: 'null',
//   });
//   // } catch (err) {
//   //   res.status(404).json({
//   //     status: 'fail',
//   //     message: 'Invalid data sent!',
//   //   });
//   // }
// });
exports.getTourStats = catchAsync(async (req, res, next) => {
  // try {
  const stats = await Tour.aggregate([
    //stages
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: '$difficulty', //specyfing the field that we want to group by
        numTours: { $sum: 1 }, //1 in every tour
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: {
        avgPrice: 1, //1-ascending -1 - descending
      },
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } }, //ne - not equal
    // },
  ]);
  res.status(200).json({
    status: 'success',
    data: stats,
  });
  // } catch (err) {
  //   res.status(404).json({
  //     status: 'fail',
  //     message: 'Invalid data sent!',
  //   });
  // }
});
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  // try {
  const year = Number(req.params.year);
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates', //jesli w dokumencie/rekordzie bedą naprzyklad 3 startDates to utowrzy 3 nowe dokumenty gdzie kazdy bedzie mial 1 startDate
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }, //array of name fields of documents that match other rules
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0, //0 - field no longer shows up
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    // {
    //   $limit: 6,
    // },
  ]);
  res.status(200).json({
    status: 'success',
    data: plan,
  });
  // } catch (err) {
  //   res.status(404).json({
  //     status: 'fail',
  //     message: 'Invalid data sent!',
  //   });
  // }
});
//tours-within/:distance/center/:latlng/unit/:unit
//tours-within/233/center/-40,45/unit/km
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  //radius - promień, odległość od punktu centralnego wyrażona w radianach (dystans/promien ziemi [mile/km])
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(new AppError('Please provide lattitude and longitude', 400));
  }
  //$geoWithin => geo location that is in certain area specified in filter
  const tours = await Tour.find({
    //to make geospatial queries need to make an index of the field which we query for (this case, startLocation)
    //$centerSphere -> okresl przestrzen poprzez dlugos i szerokosc geograficzna i promien
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(new AppError('Please provide lattitude and longitude', 400));
  }
  //obliczanie dystansów wszystkich lokacji (podanych jako startLocation) od podanego przez uzytkownika punktu
  const distances = await Tour.aggregate([
    {
      //needs to be the first while aggregating geospatial data,
      //$geoNear requires field that is an index!
      //if more than one geospatial index, need to specify which one we want by key values (pewnie cos w rodzaj $geoNear: {keys: '$startLocation'})
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance', //tak bedzie sie nazywalo pole ktore bedzie trzymało wyniki (wszystkie dystanse od podanego wczesniej punktu) w metrach
        distanceMultiplier: multiplier, //konwersja na km
      },
    },
    {
      $project: {
        //select only specified fields
        distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
