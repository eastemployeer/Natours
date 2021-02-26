const multer = require('multer');
const sharp = require('sharp');
const AppError = require('../utils/appError.js');
const User = require('./../models/userModel.js');
const catchAsync = require('./../utils/catchAsync.js');
const factory = require('./handlerFactory.js');

//defniniton of file name and destination
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     //file == req.file
//     cb(null, 'public/img/users'); //cb = callback, podobna do next() w middleware, pierwszy argument to error a drugi to destynacja
//   },
//   filename: (req, file, cb) => {
//     //konwencja: user-7767326[user_id]-34434343[timestamp].jpeg
//     const ext = file.mimetype.split('/')[1]; //mimetype: 'image/jpeg'
//     cb(null, `user-${req.user._id}-${Date.now()}.${ext}`);
//   },
// });

//image stored as buffer => photo available in req.file.buffer, na potrzeby resize'owania zdjęcia
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

//przeslane zdjecie bedzie sie znajdowalo w req.file (po przejsciu przez to middleware)
//natomiast zdjecie bedzie sie znadowalo w polu nazwanym 'photo' w requestcie
exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  //potrzebne w funkcji updateMe, wczesniej obiekt ten ustawiał multerStorage
  req.file.filename = `user-${req.user._id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`); //kompresja

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};
exports.getAllUsers = factory.getAll(User);
// exports.getAllUsers = catchAsync(async (req, res, next) => {
//   const users = await User.find();

//   // const tours = await Tour.find()
//   //   .where('duration')
//   //   .equals(5)
//   //   .where('difficulty')
//   //   .equals('easy');

//   res.status(200).json({
//     status: 'success',
//     results: users.length,
//     data: {
//       users,
//     },
//   });
// });
exports.getUser = factory.getOne(User);
// exports.getUser = (req, res) => {
//   res.status(500).json({
//     status: 'Error',
//     message: 'This route is not yet defined',
//   });
// };
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'Error',
    message: 'This route is not yet defined',
  });
};
exports.deleteUser = factory.deleteOne(User);
// exports.deleteUser = (req, res) => {
//   res.status(500).json({
//     status: 'Error',
//     message: 'This route is not yet defined',
//   });
// };
exports.updateUser = factory.updateOne(User);
// exports.updateUser = (req, res) => {
//   res.status(500).json({
//     //internal server error
//     status: 'Error',
//     message: 'This route is not yet defined',
//   });
// };

exports.updateMe = catchAsync(async (req, res, next) => {
  //1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route is not for password updates', 400));
  }
  //2)filtered req.body from not allowed fields
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;
  //2) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { active: false });
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getMe = (req, res, next) => {
  req.params.id = req.user._id;
  next();
};
