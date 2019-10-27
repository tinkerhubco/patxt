console.warn(
  'MONGO_DB_CONNECTION_STRING: ',
  process.env.MONGO_DB_CONNECTION_STRING,
);

export const config = {
  name: 'mongodb',
  connector: 'mongodb',
  url: process.env.MONGO_DB_CONNECTION_STRING,
};
