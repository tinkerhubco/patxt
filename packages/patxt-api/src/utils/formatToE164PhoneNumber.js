const libphonenumber= require('libphonenumber-js');

const DEFAULT_COUNTRY_CODE = 'PH';

const formatToE164PhoneNumber = str => {
  const parsedStr = libphonenumber.parsePhoneNumberFromString(
    str,
    DEFAULT_COUNTRY_CODE,
  );

  const formattedPhoneNumber = parsedStr && parsedStr.number;

  return formattedPhoneNumber;
};

module.exports = formatToE164PhoneNumber;
