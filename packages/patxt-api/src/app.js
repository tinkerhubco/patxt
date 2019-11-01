const axios = require('axios');
const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');

const utils = require('./utils');

const MONGO_DB_CONNECTION_STRING = process.env.MONGO_DB_CONNECTION_STRING;
const GLOBE_APP_SHORT_CODE_SUFFIX = process.env.GLOBE_APP_SHORT_CODE_SUFFIX;

mongoose.connect(MONGO_DB_CONNECTION_STRING, {
  useNewUrlParser: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected to MongoDB.');
});

const userSchema = new mongoose.Schema(
  {
    smsAccessToken: String,
    phoneNumber: String,
    createdAt: { type: Date, default: Date.now },
    modifiedAt: { type: Date, default: Date.now },
  },
  { collection: 'user' },
);

const User = mongoose.model('User', userSchema);

const app = express();

// parse application/json from request body
app.use(bodyParser.json());

app.get('/ping', (req, res) => res.send('Ping!'));

app.get('/webhooks/globelabsapi/redirecturi', async (req, res) => {
  const {
    access_token: accessCode,
    subscriber_number: subscriberNumber,
  } = req.query;

  const formattedPhoneNumber = utils.formatToE164PhoneNumber(subscriberNumber);

  const newUserRecord = await User.create({
    phoneNumber: formattedPhoneNumber,
    smsAccessToken: accessCode,
    createdAt: new Date().toJSON(),
    modifiedAt: new Date().toJSON(),
  });

  console.log('Created user record: ', newUserRecord);

  const responseData = {
    success: true,
  };

  res.send(responseData);
});

app.post('/webhooks/globelabsapi/notifyuri', async (req, res) => {
  const {
    inboundSMSMessageList: { inboundSMSMessage },
  } = req.body;

  await Promise.all(
    inboundSMSMessage.map(async ({ message: inboundMessage }) => {
      const [
        action,
        recipientPhoneNumber,
        ...messageParts
      ] = inboundMessage.split(' ');

      const formattedDestinationPhoneNumber = utils.formatToE164PhoneNumber(
        recipientPhoneNumber,
      );

      const recipientUser = await User.findOne({
        phoneNumber: formattedDestinationPhoneNumber,
      });

      if (action.toLowerCase() === 'send') {
        if (!recipientUser) {
          // TODO: Handle gracefully
          return;
        }

        const { smsAccessToken } = recipientUser;

        await axios.post(
          `https://devapi.globelabs.com.ph/smsmessaging/v1/outbound/${GLOBE_APP_SHORT_CODE_SUFFIX}/requests?access_token=${smsAccessToken}`,
          {
            outboundSMSMessageRequest: {
              address: formattedDestinationPhoneNumber,
              // TODO: Should be auto-generated and unique for each message
              clientCorrelator: '123456',
              outboundSMSTextMessage: { message: messageParts.join(' ') },
              senderAddress: GLOBE_APP_SHORT_CODE_SUFFIX,
            },
          },
        );

        console.log('Message sent to: ', formattedDestinationPhoneNumber);
      }
    }),
  );

  const responseData = {
    success: true,
  };

  res.send(responseData);
});

app.get('/webhooks/messenger/callback', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log(req.query);

  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = 'test';

  // Checks if a token and mode is in the query string of the request
  let responseData;
  if (mode && token) {
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      // res.status(200).send(challenge);
      responseData = challenge;
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      // res.sendStatus(403);
      responseData = {
        success: false,
      };
    }
  }

  res.status(200).send(responseData);
});

app.post('/webhooks/messenger/callback', async (req, res) => {
  const requestBody = req.body;

  const [
    action,
    recipientPhoneNumber,
    ...messageParts
  ] = requestBody.entry[0].messaging[0].message.text.split(' ');

  const formattedDestinationPhoneNumber = utils.formatToE164PhoneNumber(
    recipientPhoneNumber,
  );

  const recipientUser = await User.findOne({
    phoneNumber: formattedDestinationPhoneNumber,
  });

  if (action.toLowerCase() === 'send') {
    if (!recipientUser) {
      // TODO: Handle gracefully
      return;
    }

    const { smsAccessToken } = recipientUser;

    await axios.post(
      `https://devapi.globelabs.com.ph/smsmessaging/v1/outbound/${GLOBE_APP_SHORT_CODE_SUFFIX}/requests?access_token=${smsAccessToken}`,
      {
        outboundSMSMessageRequest: {
          address: formattedDestinationPhoneNumber,
          // TODO: Should be auto-generated and unique for each message
          clientCorrelator: '123456',
          outboundSMSTextMessage: { message: messageParts.join(' ') },
          senderAddress: GLOBE_APP_SHORT_CODE_SUFFIX,
        },
      },
    );

    console.log('Message sent to: ', formattedDestinationPhoneNumber);

    // TODO: Log/Save message sent
  }

  const responseData = {
    success: true,
  };

  res.send(responseData);
});

const NODE_ENV = process.env.NODE_ENV || 'development';

// The aws-serverless-express library creates a server and listens on a Unix
// Domain Socket for us, so we can remove the usual call to app.listen.
// app.listen(3000) and just run it on development mode
if (NODE_ENV === 'development') {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => console.log(`Server is listening on port ${PORT}!`));
}

module.exports = app;
