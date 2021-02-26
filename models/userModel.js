const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minLength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'], //required just input - not stricte to DB (can be removed in middleware)
    validate: {
      validator: function (el) {
        //works only on SAVE/CREATE
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); //encrypting password only in situation when changed or created

  //hashing with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined; //this won't go to DB
  next();
});

userSchema.pre('save', function (next) {
  //isNew -> newly created document
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000; //to prevent making token before password changed
  next();
});

userSchema.pre(/^find/, function (next) {
  //this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

//instance method - can be called on query results
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  //this points to current document
  //cant use this.password because password is not selectable (select: false)
  return await bcrypt.compare(candidatePassword, userPassword); //retruns true or false
};
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    ); // ms /1000 => seconds (because JWTTimestamp is in seconds)
    // console.log(this.passwordChangedAt, JWTTimestamp);
    //true if password was changed after token was granted
    return JWTTimestamp < changedTimestamp;
  }
  //false means not changed
  return false;
};
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //milisekundy

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
