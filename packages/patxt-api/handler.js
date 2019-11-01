'use strict';
const awsServerlessExpress = require('aws-serverless-express');
const app = require('./index');
const server = awsServerlessExpress.createServer(app);

module.exports.api = (event, context) => {
  awsServerlessExpress.proxy(server, event, context);
};
