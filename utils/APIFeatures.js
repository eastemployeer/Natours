class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    //1a)filtering
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields']; //query, które są nieistotne jesli chodzi o wyszukiwanie obiektu
    excludedFields.forEach((el) => delete queryObj[el]); //deleting part of object

    //1b)advanced filtering - gte,lte etc.
    let queryStr = JSON.stringify(queryObj);
    //konwersja wynika z faktu ze queryObj bedzie mial strukture np. {duration: {lte: 5}}, czyli bez $ przed lte
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); // \b - exactly this strings
    // let query = Tour.find(JSON.parse(queryStr));
    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
      //sorting after 2 vars = sort('price ranking')
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this; //whole object
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields); //select('price rating)
    } else {
      this.query = this.query.select('-__v'); //-something => excludes this thing
    }
    return this;
  }

  paginate() {
    const page = Number(this.queryString.page) || 1;
    const limit = Number(this.queryString.limit) || 100;
    const skip = (page - 1) * limit;
    //page=2&limit=10
    this.query = this.query.skip(skip).limit(limit); //skip some number of results and display some number of results (limit)
    return this;
  }
}
module.exports = APIFeatures;
