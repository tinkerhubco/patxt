import { repository } from '@loopback/repository';
import { get, param } from '@loopback/rest';

import { UserRepository } from '../repositories';
import { formatToE164PhoneNumber } from '../utils';

export class WebhooksController {
  constructor(
    @repository(UserRepository) private userRepository: UserRepository,
  ) {}

  @get('/webhooks/globelabsapi/redirecturi', {
    parameters: [
      { name: 'access_token', schema: { type: 'string' }, in: 'query' },
      { name: 'subscriber_number', schema: { type: 'string' }, in: 'query' },
    ],
    responses: {
      '200': {
        description: 'Globe Labs API - Redirect URI webhook response (Opt-in)',
        content: {
          'appication/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  })
  async optInRedirectUriWebhook(
    @param.query.string('access_token') accessCode: string,
    @param.query.string('subscriber_number') subscriberNumber: string,
  ) {
    const formattedPhoneNumber = formatToE164PhoneNumber(subscriberNumber);

    const newUserRecord = await this.userRepository.create({
      phoneNumber: formattedPhoneNumber,
      smsAccessToken: accessCode,
      createdAt: new Date().toJSON(),
      modifiedAt: new Date().toJSON(),
    });

    console.log('Created user record: ', newUserRecord);

    return {
      success: true,
    };
  }
}
