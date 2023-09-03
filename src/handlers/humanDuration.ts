import humanizeDurationFn from 'humanize-duration';

export const humanizeDuration = (duration: number) =>
  humanizeDurationFn(duration, { language: 'en', units: ['h', 'm', 's', 'ms'], round: true });
