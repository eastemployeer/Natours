const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const AppError = require('./utils/appError.js');
const globalErrorHandler = require('./controllers/errorController.js');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const APIFeatures = require('./utils/APIFeatures.js');

const app = express();

app.set('view engine', 'pug'); //template engine - no need to specify really
//SCIEŻKA DO WIDOKOW - PLIKÓW PUG
app.set('views', path.join(__dirname, 'views')); //pug templates are (always) called 'views'. And the path to them is: __dirname/views

//MIDDLEWARE - rzeczy ktore sie dzieja z requestami po przyjsciu do serwera

//serving static files
app.use(express.static(`${__dirname}/public`));

//security HTTTP headers - locate somewhere in the top of middlewares

// app.use(helmet());
// app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", 'data:', 'blob:', 'https:', 'ws:'],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        scriptSrc: [
          "'self'",
          'https:',
          'http:',
          'blob:',
          'https://*.mapbox.com',
          'https://js.stripe.com',
          'https://m.stripe.network',
          'https://*.cloudflare.com',
        ],
        frameSrc: ["'self'", 'https://js.stripe.com'],
        objectSrc: ["'none'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        workerSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://*.tiles.mapbox.com',
          'https://api.mapbox.com',
          'https://events.mapbox.com',
          'https://m.stripe.network',
        ],
        childSrc: ["'self'", 'blob:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        formAction: ["'self'"],
        connectSrc: [
          "'self'",
          "'unsafe-inline'",
          'data:',
          'blob:',
          'https://*.stripe.com',
          'https://*.mapbox.com',
          'https://*.cloudflare.com/',
          'https://bundle.js:*',
          'ws://127.0.0.1:*/',
        ],
        upgradeInsecureRequests: [],
      },
    },
  })
);

if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, //allow 100 request per 1 hour from 1 ip
  message: 'Too many requests from this IP, please try again in an hour',
});

//will affect all routes begining with /api - limit rate
app.use('/api', limiter);

//body parser, reding data from body into req.body
//limit - limiting body size, if greater then request won't be accepted
app.use(express.json({ limit: '10kb' })); //middleware - can modify incoming request data

//parsing cookies - we can now use req.cookies
app.use(cookieParser());

//parsing data coming from HTML FORMS (in name attribute) to req.body
//extended - jakies bardziej złożone dane
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

//Data sanitization against NoSQL injection
//mongoSanitize - removes $ signs from operators (in query it is done automatically, without it (GET requests))
app.use(mongoSanitize());

//Data sanitization against XSS
app.use(xss());

//Parameter pollution czyli np. query: ...?sort=duration&sort=price, usunie wartosci zduplikowane. Zapisze jedynie drugi
//ale czasami chcemy dac atrybutowi kilka opcji np. ?duration=5&duration=7 od tego jest whitelist
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'price',
      'difficulty',
      'ratingsAverage',
      'maxGroupSize',
    ],
  })
);

app.use((req, res, next) => {
  // console.log('Hello from middleware');
  //console.log(req.cookies);
  next();
});

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  //console.log(req.headers);
  next(); //calling next middleware on the stack
});

//ALL TOURS
// app.get("/api/v1/tours", getAllTours);

//TOUR BY ID
//app.get("/api/v1/tours/:id?" - optional parameter
// app.get("/api/v1/tours/:id", getTour);

//CREATE NEW TOUR
// app.post("/api/v1/tours", createTour);
//UPDATING DATA
//PUT - full object
//PATCH - just some properties of updating object
// app.patch("/api/v1/tours/:id", updateTour);

//DELETE DATA
// app.delete("/api/v1/tours/:id", deleteTour);

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  //all = all types of requests
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl}`,
  // });

  //wersja 2
  // const err = new Error(`Can't find ${req.originalUrl}`);
  // err.status = 'fail';
  // err.statusCode = 404;

  //wersja 3
  next(new AppError(`Can't find ${req.originalUrl}`, 404)); //always argument is an error, goes straight to error handler if error appears
});

app.use(globalErrorHandler);
module.exports = app;
