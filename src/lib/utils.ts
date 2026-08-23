export function isValidTimeRange(startTime: string, endTime: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) &&
    startTime < endTime;
}
