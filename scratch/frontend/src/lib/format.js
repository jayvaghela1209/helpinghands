/**
 * Formats decimal worked hours into human-readable hours and minutes.
 * Displays only minutes if total time is less than 60 minutes.
 * Otherwise, displays hours and minutes.
 */
export const formatWorkedHours = (hoursVal) => {
  if (hoursVal === null || hoursVal === undefined || isNaN(hoursVal)) {
    return '0 minutes';
  }
  const totalMinutes = Math.round(Number(hoursVal) * 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `${hours} hour${hours === 1 ? '' : 's'} ${mins} minute${mins === 1 ? '' : 's'}`;
};
