const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel.js');
const catchAsync = require('./../utils/catchAsync.js');
const AppError = require('./../utils/appError.js');
const Email = require('./../utils/email.js');

const cookieOptions = {
  expires: new Date(
    Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  ),
  // secure: true, //only send when using HTTPS
  httpOnly: true, //cannot be accessed by the browser
};

const signToken = (id) => {
  //sign(payload, secret, options)
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  //cookieOptions.secure = true means that cookie can only be send in https connection
  if (req.secure || req.headers['x-forwarded-proto'] === 'https')
    cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  //not displaying password - in response
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token, //for Postman, reading jwt token from response
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  //   const newUser = await User.create(req.body);
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  //wysylanie maila powitalnego

  //in dev: http://127.0.0.1:3000
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //console.log(req.body);
  //1) check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  //2) check if user exists && password is correct
  const user = await User.findOne({ email: email }).select('+password'); //+ => add something that is not defaultly selected
  // const correct = await user.correctPassword(password, user.password);

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  //3) If everything is ok, send JWT to client
  createSendToken(user, 200, req, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //1) Getting token and check of it's there
  let token;
  if (
    //adding authorization header to the GET request header
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]; //string looks like: Bearer jwska23343dks
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in!', 401)); //401- not authenticated
  }
  //2)Verification of token
  //throws error if token not valid or token expired
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3) Check if user still exists - user got deleted in meantime
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to the token no longer exists')
    );
  }
  //4) Check if user changed password after the JWT was issued/granted
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    ///issued/granted at
    return next(
      new AppError('User recently changed password! Please log in again', 401)
    );
  }
  //access granted
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

//Only for rendered pages, no errors
exports.isLoggedIn = async (req, res, next) => {
  //check token
  if (req.cookies.jwt) {
    try {
      //catching errors locally because we dont want jwt.verify to throw errors (przy wylogowywaniu się token zostaje zamieniony na stringa i ta funckja wywali błąd bo nie moze rozkodowac)
      //verify the token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }
      //4) Check if user changed password after the JWT was issued/granted
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        ///issued/granted at
        return next();
      }
      //access granted
      //every pug template has access to res.locals - as a variable
      res.locals.user = currentUser;
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      ); //403 - forbidden
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with this email', 404));
  }
  //2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  //no validation because e.g passwordConfirm is not stored in DB and needs to be present during validation
  await user.save({ validateBeforeSave: false });
  //3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submita PATCH request with your new password and passConfim to ${resetURL}`;
  try {
    await new Email(user, resetURL).sendPasswordReset();
  } catch (err) {
    //resetting
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('There was an error sending the email!'));
  }

  res.status(200).json({
    status: 'success',
    message: 'Token sent to email!',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get user base on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  //2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //3) Update changedPasswordAt property for the user

  //4) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1. Get user from the collection

  //req.user coming from protect function
  const currentUser = await User.findById(req.user._id).select('+password');

  if (!currentUser) {
    return next(new AppError(`Could not find user with this email`));
  }
  //2. Check if the POSTed password is correct
  if (
    !(await currentUser.correctPassword(
      req.body.passwordCurrent,
      currentUser.password
    ))
  ) {
    return next(new AppError(`The password is incorrect`, 401));
  }
  //3. If so, update the password
  currentUser.password = req.body.password;
  currentUser.passwordConfirm = req.body.passwordConfirm;
  await currentUser.save();

  //4. Log user in, send JWT
  createSendToken(currentUser, 201, req, res);
});
