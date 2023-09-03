import utils from '../utils/utils';
import superagent from 'superagent';

export const DEFAULT_ERROR_CHANNEL = 'server_errors';
const SLACK_URL_PREFIX = 'https://hooks.slack.com/services';

function addPrefixToSlackChannel(channel: string): string {
  if (!channel) return '';
  return channel.startsWith(SLACK_URL_PREFIX) ? channel : `${SLACK_URL_PREFIX}/${channel}`;
}

const CHANNELS: { [DEFAULT_ERROR_CHANNEL]: string; [otherChannels: string]: string } = {
  [DEFAULT_ERROR_CHANNEL]: addPrefixToSlackChannel(process.env.SLACK_ERROR_CHANNEL || ''),
};

export async function sendViaSlack(msg: string, fn = '', channel = ''): Promise<void> {
  const parsedMsg = msg.replace(/:\/\//i, '8//') + '\n' + new Date().toISOString(); /*.replace("T","_")*/
  const bodyPayload = {
    text: parsedMsg,
  };
  const url = CHANNELS[channel in CHANNELS ? channel : DEFAULT_ERROR_CHANNEL];
  try {
    await superagent
      .post(url)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(bodyPayload))
      .then((res1) => {
        // eslint-disable-next-line no-console
        console.log(`${fn} - Slack response:\n${utils.convertToString(res1).trim().split('\n').join('\\n ')}`);
      });
  } catch (err1: unknown) {
    // eslint-disable-next-line no-console
    console.error(`${fn} - Slack error:\n${utils.convertToString(err1).trim().split('\n').join('\\n ')}`);
  }
}
