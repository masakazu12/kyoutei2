import { VENUES } from '../constants/venues';

/**
 * 競艇レース公式標準締切時刻 & 締切ステータス管理サービス
 */

export interface DeadlineStatus {
  status: 'active' | 'soon' | 'closed'; // active: 発売中, soon: まもなく締切, closed: 締切済
  remainingMinutes: number;
  formattedRemaining: string; // e.g. "あと 24分", "あと 3分", "締切済"
  label: string; // "発売中", "まもなく締切", "発売終了"
  isPast: boolean;
}

// モーニング場
export const MORNING_VENUES = ['鳴門', '芦屋', '唐津', '徳山'];

// ナイター場
export const NIGHTER_VENUES = ['桐生', '蒲郡', '住之江', '丸亀', '下関', '若松', '大村'];

/**
 * 開催場とレース番号に応じた公式標準締切時刻 (HH:mm)
 */
export function getStandardDeadlineTime(venueName: string, raceNo: number): string {
  const rIndex = Math.min(Math.max(raceNo - 1, 0), 11);

  if (MORNING_VENUES.includes(venueName)) {
    const morningTimes = [
      '08:35', '09:00', '09:25', '09:50', '10:20', '10:50',
      '11:20', '11:55', '12:30', '13:05', '13:45', '14:30'
    ];
    return morningTimes[rIndex] || '14:30';
  }

  if (NIGHTER_VENUES.includes(venueName)) {
    const nighterTimes = [
      '15:15', '15:40', '16:05', '16:30', '16:55', '17:25',
      '17:55', '18:25', '19:00', '19:35', '20:10', '20:45'
    ];
    return nighterTimes[rIndex] || '20:45';
  }

  // デイレース (一般)
  const dayTimes = [
    '10:45', '11:10', '11:35', '12:00', '12:30', '13:00',
    '13:30', '14:00', '14:35', '15:10', '15:50', '16:35'
  ];
  return dayTimes[rIndex] || '16:35';
}

/**
 * 締切時刻と現在時刻を比較して、締切までの残り時間とステータスを精密計算
 */
export function calculateDeadlineStatus(
  deadlineTime: string,
  raceDate?: string,
  referenceNow?: Date
): DeadlineStatus {
  if (!deadlineTime || !deadlineTime.includes(':')) {
    return {
      status: 'active',
      remainingMinutes: 30,
      formattedRemaining: '発売中',
      label: '発売中',
      isPast: false,
    };
  }

  const [hoursStr, minutesStr] = deadlineTime.split(':');
  const dHour = parseInt(hoursStr, 10);
  const dMin = parseInt(minutesStr, 10);

  const now = referenceNow || new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // レース日付が指定されている場合
  const isSameDay = !raceDate || raceDate === todayStr;

  if (!isSameDay) {
    // 過去日付の場合
    if (raceDate && raceDate < todayStr) {
      return {
        status: 'closed',
        remainingMinutes: -999,
        formattedRemaining: '締切済',
        label: '発売終了',
        isPast: true,
      };
    }
    // 未来日付の場合
    return {
      status: 'active',
      remainingMinutes: 999,
      formattedRemaining: '発売前/発売中',
      label: '発売中',
      isPast: false,
    };
  }

  // 本日のレースの場合：ミリ秒差分を計算
  const deadlineDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), dHour, dMin, 0);
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffSeconds = Math.floor((diffMs % 60000) / 1000);

  if (diffMs <= 0) {
    return {
      status: 'closed',
      remainingMinutes: diffMinutes,
      formattedRemaining: '締切済',
      label: '発売終了',
      isPast: true,
    };
  }

  if (diffMinutes <= 10) {
    const secDisplay = diffSeconds >= 0 ? `${diffSeconds}秒` : '';
    return {
      status: 'soon',
      remainingMinutes: diffMinutes,
      formattedRemaining: `あと ${diffMinutes}分${secDisplay}`,
      label: 'まもなく締切',
      isPast: false,
    };
  }

  return {
    status: 'active',
    remainingMinutes: diffMinutes,
    formattedRemaining: `あと ${diffMinutes}分`,
    label: '発売中',
    isPast: false,
  };
}
