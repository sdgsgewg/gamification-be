/**
 * Output: `Nov 3, 2025`
 */
export function getDate(date: Date): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Output: `3 November 2025 (13:29)`
 */
export function getDateTime(date: Date): string {
  if (!date) return '';

  const monthsShort = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];

  const day = date.getDate().toString().padStart(2, '0');
  const month = monthsShort[date.getMonth()];
  const year = date.getFullYear();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day} ${month} ${year} (${hours}:${minutes})`;
}

/**
 * Output: `1 Month 2 Weeks 3 Day 1 Hour 40 Minutes`
 */
export function getTimePeriod(startTime: Date, endTime: Date): string {
  if (!startTime || !endTime) return '';

  const diffMs = endTime.getTime() - startTime.getTime();
  if (diffMs <= 0) return '0 Menit';

  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  const months = Math.floor(diffMinutes / (60 * 24 * 30)); // asumsi 30 hari per bulan
  const weeks = Math.floor((diffMinutes % (60 * 24 * 30)) / (60 * 24 * 7));
  const days = Math.floor((diffMinutes % (60 * 24 * 7)) / (60 * 24));
  const hours = Math.floor((diffMinutes % (60 * 24)) / 60);
  const minutes = diffMinutes % 60;

  const parts: string[] = [];
  if (months > 0) parts.push(`${months} ${months > 1 ? `Months` : `Month`}`);
  if (weeks > 0) parts.push(`${weeks} ${weeks > 1 ? `Weeks` : `Week`}`);
  if (days > 0) parts.push(`${days} ${days > 1 ? `Days` : `Day`}`);
  if (hours > 0) parts.push(`${hours} ${hours > 1 ? `Hours` : `Hour`}`);
  if (minutes > 0)
    parts.push(`${minutes} ${minutes > 1 ? `Minutes` : `Minute`}`);

  return parts.join(' ');
}

/**
 * Output: `Admin 1 (3 November 2025 (13:29 WIB))`
 */
export function getDateTimeWithName(date: Date, name?: string): string {
  if (!date) return '';

  const monthsShort = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];

  const day = date.getDate().toString().padStart(2, '0');
  const month = monthsShort[date.getMonth()];
  const year = date.getFullYear();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${name} (${day} ${month} ${year}, ${hours}:${minutes} WIB)`;
}

/**
 * Output: `11:30 AM`
 * Output: `11:30 PM`
 */
export function getTime(date: Date): string {
  if (!date) return '';

  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  // ubah jam ke format 12 jam, tapi biarkan 00 untuk jam 0
  let displayHours = hours % 12;
  if (hours === 0)
    displayHours = 0; // jam 0 (tengah malam)
  else if (hours > 12) displayHours = hours - 12;
  else if (hours === 12) displayHours = 12; // jam 12 siang

  const hoursStr = displayHours.toString().padStart(2, '0');

  return `${hoursStr}:${minutes} ${ampm}`;
}
