/**
 * Get the current date in UK timezone (YYYY-MM-DD format).
 * Handles BST/GMT transitions.
 */
export function getUkLocalDate(): string {
  const now = new Date();
  const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const year = ukTime.getFullYear();
  const month = String(ukTime.getMonth() + 1).padStart(2, '0');
  const day = String(ukTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if current time is within quiet hours for a user.
 */
export function isQuietHours(startTime: string, endTime: string): boolean {
  const now = new Date();
  const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const currentHour = ukTime.getHours();
  const currentMinute = ukTime.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (startMinutes < endMinutes) {
    return currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
  } else {
    // Crosses midnight
    return currentTimeMinutes >= startMinutes || currentTimeMinutes < endMinutes;
  }
}
