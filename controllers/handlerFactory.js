const AppError = require('../utils/appError.js');
const APIFeatures = require('./../utils/APIFeatures.js');
const catchAsync = require('./../utils/catchAsync.js');

exports.deleteOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    // try {
    const document = await Model.findByIdAndDelete(req.params.id);

    if (!document) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: 'null',
    });
  });
};
exports.updateOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    // try {
    const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, //updated document will be returned
      runValidators: true, //run validators specified in the schema while updating
    });

    if (!document) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: document,
      },
    });
    // } catch (err) {
    //   res.status(400).json({
    //     status: 'fail',
    //     message: 'Invalid data sent!',
    //   });
    // }
  });
};

exports.createOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    // try {
    const newDoc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: newDoc,
      },
    });
    // } catch (err) {
    //   res.status(400).json({
    //     status: 'fail',
    //     message: err,
    //   });
    // }
  });
};
exports.getOne = (Model, popOptions) => {
  return catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    // const tour = tours.find((el) => el.id === Number(req.params.id));
    // try {
    //populating virtual field - sposob na wyswietlenie wszystkich recenzji dotyczacych jednego Toura. Jednoczesnie nie trzymane w bazie więc parent referncing zachowany
    const document = await query;
    if (!document) {
      return next(new AppError('No document found with that ID', 404));
    }
    //document.findOne({_id: req.params.id})

    res.status(200).json({
      status: 'success',
      data: {
        data: document,
      },
    });
    // } catch (err) {
    //   res.status(404).json({
    //     status: 'fail',
    //     message: err,
    //   });
    // }
  });
};
exports.getAll = (Model) => {
  return catchAsync(async (req, res, next) => {
    //2 next lines => just for nested routes
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    //EXECUTING QUERY
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const documents = await features.query;

    res.status(200).json({
      status: 'success',
      results: documents.length,
      data: {
        data: documents,
      },
    });
  });
};
