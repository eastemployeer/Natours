const express = require('express');

const userController = require('./../controllers/userController.js');
const authController = require('./../controllers/authController.js');

// const upload = multer({ dest: 'public/img/users' }); //dest -> destination of uploaded file

const userRouter = express.Router();

userRouter.post('/signup', authController.signup);
userRouter.post('/login', authController.login);
userRouter.get('/logout', authController.logout);
userRouter.post('/forgotPassword', authController.forgotPassword);
userRouter.patch('/resetPassword/:token', authController.resetPassword);

//all routes under this will first use this middleware (so authcontroller.protect)
userRouter.use(authController.protect);

userRouter.patch('/updateMyPassword', authController.updatePassword);
userRouter.delete('/deleteMe', userController.deleteMe);

//upload.single('photo) -> przesylanie pojedynczego pliku, plik bedzie sie znajdowal w polu nazwanym photo (w requestcie)
//przeslane zdjecie bedzie sie znajdowalo w req.file
// userRouter.patch('/updateMe', upload.single('photo'), userController.updateMe);

userRouter.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);

userRouter.get('/me', userController.getMe, userController.getUser);

userRouter.use(authController.restrictTo('admin')); //restricting operations under this middleware just to admin

userRouter
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
userRouter
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = userRouter;
