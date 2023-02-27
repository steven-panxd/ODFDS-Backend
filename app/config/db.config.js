const {
    MONGO_DB_USER,
    MONGO_DB_PASSWORD,
    MONGO_DB_HOST,
    MONGO_DB_PORT,
    MONGO_DB_NAME,
  } = process.env;
  
  module.exports = {
    url: `mongodb://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?authSource=admin`
  }