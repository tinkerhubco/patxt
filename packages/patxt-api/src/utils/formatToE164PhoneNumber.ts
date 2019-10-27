import { parsePhoneNumberFromString } from 'libphonenumber-js';

const DEFAULT_COUNTRY_CODE = 'PH';

export const formatToE164PhoneNumber = (str: string) => {
  const parsedStr = parsePhoneNumberFromString(str, DEFAULT_COUNTRY_CODE);

  const formattedPhoneNumber = parsedStr && parsedStr.number;

  return formattedPhoneNumber as string;
};
