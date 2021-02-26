const dotenv = require('dotenv');
const mongoose = require('mongoose');
//dotenv.config musi byc przed const app ponieważ niektóre rzeczy z tamteo modułu zależą od zmiennych środowiskowych ustawionych w configu
dotenv.config({ path: './config.env' }); //setting config

//has to be before app
//all exceptions from synchronous code that were not handled
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION!');
  process.exit(1);
});

const app = require('./app.js');

const port = process.env.PORT || 4000;

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    // console.log(con.connections);
    console.log('DB connection succesful');
  });

// const testTour = new Tour({
//   name: 'The Sea Explorer',
//   price: 497,
//   rating: 4.7,
// });
// testTour
//   .save()
//   .then((doc) => {
//     console.log(doc);
//   })
//   .catch((err) => {
//     console.log('ERROR', err);
//   });

const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

//unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(err.name);

  server.close(() => {
    process.exit(1);
  });
});
