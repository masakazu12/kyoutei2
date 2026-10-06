import { BoatData, BoatGrade, RaceInfo, WeatherCondition, WindDirection, WeatherType } from '../types/kyotei';
import { VENUES } from '../constants/venues';

/**
 * 11.3 & F14: 開催レース外部データ取得サービス (IRaceDataProvider)
 * 全国24場の公式番組・出走表・直前気配（展示）・気象条件・オッズデータ連携インターフェース
 */

export interface ActiveVenueSchedule {
  venueName: string;
  code: string;
  category: 'モーニング' | 'デイ' | 'ナイター';
  grade: 'SG' | 'G1' | 'G2' | 'G3' | '一般戦';
  title: string;
  status: '開催中' | '直前情報' | '発売中' | '終了';
  currentRaceNo: number;
}

export interface OfficialRaceResult {
  raceId: string;
  finishOrder: string; // e.g. "1-2-3"
  first: number;
  second: number;
  third: number;
  officialPayout: number; // 3連単確定払戻金 (100円あたり)
  popularityRank: number; // 人気順位 (e.g. 1番人気)
  winningTechnique: string; // 決まり手 (逃げ, 差し, まくり, まくり差し, 抜き)
  date: string;
  venueName: string;
  raceNo: number;
  weatherAtFinish: WeatherCondition;
}

// 選手マスターデータベース（実在する有力選手・一般選手）
const RACER_POOL: { name: string; reg: string; branch: string; grade: BoatGrade; winRate: number; secondRate: number }[] = [
  { name: '峰 竜太', reg: '4320', branch: '佐賀', grade: 'A1', winRate: 8.68, secondRate: 64.5 },
  { name: '毒島 誠', reg: '4238', branch: '群馬', grade: 'A1', winRate: 8.12, secondRate: 58.7 },
  { name: '馬場 貴也', reg: '4262', branch: '滋賀', grade: 'A1', winRate: 8.24, secondRate: 59.1 },
  { name: '白井 英治', reg: '3897', branch: '山口', grade: 'A1', winRate: 7.95, secondRate: 54.3 },
  { name: '茅原 悠紀', reg: '4418', branch: '岡山', grade: 'A1', winRate: 7.88, secondRate: 53.9 },
  { name: '桐生 順平', reg: '4444', branch: '埼玉', grade: 'A1', winRate: 8.05, secondRate: 57.8 },
  { name: '石野 貴之', reg: '4168', branch: '大阪', grade: 'A1', winRate: 7.82, secondRate: 53.0 },
  { name: '池田 浩二', reg: '3941', branch: '愛知', grade: 'A1', winRate: 7.90, secondRate: 55.2 },
  { name: '菊地 孝平', reg: '3960', branch: '静岡', grade: 'A1', winRate: 7.78, secondRate: 54.0 },
  { name: '西山 貴浩', reg: '4371', branch: '福岡', grade: 'A1', winRate: 7.46, secondRate: 49.8 },
  { name: '平本 真之', reg: '4337', branch: '愛知', grade: 'A1', winRate: 7.41, secondRate: 50.4 },
  { name: '井口 佳典', reg: '4024', branch: '三重', grade: 'A1', winRate: 7.50, secondRate: 51.9 },
  { name: '守屋 美穂', reg: '4482', branch: '岡山', grade: 'A1', winRate: 7.62, secondRate: 55.4 },
  { name: '遠藤 エミ', reg: '4502', branch: '滋賀', grade: 'A1', winRate: 7.74, secondRate: 56.1 },
  { name: '瓜生 正義', reg: '3783', branch: '福岡', grade: 'A1', winRate: 7.35, secondRate: 50.1 },
  { name: '吉川 元浩', reg: '3854', branch: '兵庫', grade: 'A1', winRate: 7.28, secondRate: 49.0 },
  { name: '深谷 知博', reg: '4524', branch: '静岡', grade: 'A1', winRate: 7.39, secondRate: 50.5 },
  { name: '中島 孝平', reg: '4013', branch: '福井', grade: 'A1', winRate: 7.35, secondRate: 51.2 },
  { name: '羽野 直也', reg: '4831', branch: '福岡', grade: 'A1', winRate: 7.45, secondRate: 52.8 },
  { name: '関 浩哉', reg: '4851', branch: '群馬', grade: 'A1', winRate: 7.52, secondRate: 53.6 },
  { name: '田口 節子', reg: '4050', branch: '岡山', grade: 'A1', winRate: 7.21, secondRate: 49.5 },
  { name: '平高 奈菜', reg: '4450', branch: '香川', grade: 'A1', winRate: 7.38, secondRate: 52.0 },
  { name: '鎌倉 涼', reg: '4456', branch: '大阪', grade: 'A1', winRate: 7.15, secondRate: 48.2 },
  { name: '大峯 豊', reg: '4237', branch: '山口', grade: 'A2', winRate: 6.42, secondRate: 43.5 },
  { name: '江口 晃生', reg: '3159', branch: '群馬', grade: 'A1', winRate: 7.12, secondRate: 50.2 },
  { name: '秋山 直之', reg: '3996', branch: '群馬', grade: 'A1', winRate: 6.95, secondRate: 46.1 },
  { name: '小野 生奈', reg: '4530', branch: '福岡', grade: 'A2', winRate: 6.85, secondRate: 44.8 },
  { name: '湯川 浩司', reg: '4044', branch: '大阪', grade: 'A1', winRate: 7.22, secondRate: 48.9 },
  { name: '山崎 智也', reg: '3622', branch: '群馬', grade: 'B1', winRate: 6.10, secondRate: 39.5 },
  { name: '山田 哲也', reg: '4297', branch: '高知', grade: 'A2', winRate: 6.62, secondRate: 46.3 },
  { name: '渡邉 雄朗', reg: '4686', branch: '東京', grade: 'A2', winRate: 6.48, secondRate: 44.1 },
  { name: '佐藤 翼', reg: '4573', branch: '埼玉', grade: 'A1', winRate: 7.10, secondRate: 48.0 },
  { name: '上野 真之介', reg: '4503', branch: '佐賀', grade: 'A1', winRate: 7.25, secondRate: 49.2 },
  { name: '島村 隆幸', reg: '4545', branch: '徳島', grade: 'A1', winRate: 7.30, secondRate: 50.8 },
  { name: '宮之原 輝紀', reg: '4939', branch: '東京', grade: 'A1', winRate: 7.18, secondRate: 47.9 },
  { name: '菅 章哉', reg: '4571', branch: '徳島', grade: 'A1', winRate: 6.92, secondRate: 46.8 },
];

/**
 * 開催場とレース番号に応じた公式標準締切時刻を算出
 */
export function getStandardDeadlineTime(venueName: string, raceNo: number): string {
  const nighterVenues = ['桐生', '蒲郡', '住之江', '丸亀', '下関', '若松', '大村'];
  const morningVenues = ['鳴門', '芦屋', '唐津', '徳山'];

  const rIndex = Math.min(Math.max(raceNo - 1, 0), 11);

  if (morningVenues.includes(venueName)) {
    const morningTimes = [
      '08:35', '09:00', '09:25', '09:50', '10:20', '10:50',
      '11:20', '11:55', '12:30', '13:05', '13:45', '14:30'
    ];
    return morningTimes[rIndex] || '14:30';
  }

  if (nighterVenues.includes(venueName)) {
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
 * 本日の開催場一覧を取得
 */
export async function fetchActiveVenues(dateStr?: string): Promise<ActiveVenueSchedule[]> {
  // 通信遅延シミュレーション (300ms)
  await new Promise((resolve) => setTimeout(resolve, 300));

  // 全国24場から本日開催中の主要場をピックアップ（モーニング、デイ、ナイター）
  return [
    {
      venueName: '住之江',
      code: '12',
      category: 'ナイター',
      grade: 'SG',
      title: '第39回 SG グランプリ',
      status: '発売中',
      currentRaceNo: 12,
    },
    {
      venueName: '大村',
      code: '24',
      category: 'ナイター',
      grade: 'G1',
      title: '開設74周年記念 海の王者決定戦',
      status: '発売中',
      currentRaceNo: 11,
    },
    {
      venueName: '桐生',
      code: '01',
      category: 'ナイター',
      grade: 'G1',
      title: '開設68周年記念 赤城雷神杯',
      status: '発売中',
      currentRaceNo: 10,
    },
    {
      venueName: '平和島',
      code: '04',
      category: 'デイ',
      grade: 'G1',
      title: 'トーキョー・ベイ・カップ',
      status: '発売中',
      currentRaceNo: 9,
    },
    {
      venueName: '戸田',
      code: '02',
      category: 'デイ',
      grade: '一般戦',
      title: 'ウインビーカップ',
      status: '発売中',
      currentRaceNo: 8,
    },
    {
      venueName: '蒲郡',
      code: '07',
      category: 'ナイター',
      grade: '一般戦',
      title: 'ガマの陣 ナイター特選',
      status: '発売中',
      currentRaceNo: 7,
    },
    {
      venueName: '江戸川',
      code: '03',
      category: 'デイ',
      grade: '一般戦',
      title: 'ゴールデンカップ（波高注意）',
      status: '直前情報',
      currentRaceNo: 7,
    },
    {
      venueName: '鳴門',
      code: '14',
      category: 'モーニング',
      grade: '一般戦',
      title: '鳴門モーニング第5戦',
      status: '発売中',
      currentRaceNo: 6,
    },
    {
      venueName: '芦屋',
      code: '21',
      category: 'モーニング',
      grade: '一般戦',
      title: 'サンライズレース アサモ特選',
      status: '発売中',
      currentRaceNo: 5,
    },
    {
      venueName: '唐津',
      code: '23',
      category: 'モーニング',
      grade: '一般戦',
      title: 'ズバッとモーニング戦',
      status: '発売中',
      currentRaceNo: 4,
    },
  ];
}

/**
 * 指定開催場・レース番号の出走表番組データを取得
 */
export async function fetchRaceCard(params: {
  date: string;
  venueName: string;
  raceNo: number;
}): Promise<RaceInfo> {
  const { date, venueName, raceNo } = params;

  // 通信遅延シミュレーション (500ms)
  await new Promise((resolve) => setTimeout(resolve, 500));

  const venueMeta = VENUES.find((v) => v.name === venueName) || VENUES[0];

  // レースタイトルの決定
  let raceTitle = `第${raceNo}R 予選`;
  if (raceNo === 12) raceTitle = `第12R 優勝戦`;
  else if (raceNo === 11) raceTitle = `第11R 準優勝戦`;
  else if (raceNo === 10) raceTitle = `第10R 特別選抜戦`;
  else if (raceNo === 9) raceTitle = `第9R 予選特選`;
  else if (raceNo === 1) raceTitle = `第1R 朝ガチモーニング`;

  // 締切時刻の算出（場とレース番号に応じた公式標準 timetable）
  const deadlineTime = getStandardDeadlineTime(venueName, raceNo);

  // 気象条件（開催場の特性を反映）
  const isEdogawa = venueName === '江戸川';
  const windSpeed = isEdogawa ? 8.5 : Number((1.5 + Math.random() * 3.5).toFixed(1));
  const waveHeight = isEdogawa ? 11 : Math.round(1 + Math.random() * 4);
  const windDirections: WindDirection[] = ['向かい風', '追い風', '左横風', '右横風', '無風'];
  const windDirection = windDirections[Math.floor(Math.random() * windDirections.length)];

  const weather: WeatherCondition = {
    weather: isEdogawa ? '雨' : '晴',
    windDirection,
    windSpeed,
    waveHeight,
    temperature: 18.2,
    waterTemperature: 19.0,
  };

  // 選手選定（開催場名とレース番号のハッシュから一貫した6艇を生成）
  const hash = (venueName.charCodeAt(0) * 17 + raceNo * 31) % RACER_POOL.length;
  const selectedRacers = [];
  for (let i = 0; i < 6; i++) {
    const idx = (hash + i * 5) % RACER_POOL.length;
    selectedRacers.push(RACER_POOL[idx]);
  }

  // 1号艇を最も実力派（A1）に寄せる（本命型の自然な番組構成）
  const boats: BoatData[] = selectedRacers.map((racer, idx) => {
    const boatNum = (idx + 1) as 1 | 2 | 3 | 4 | 5 | 6;
    const motorNo = (10 + ((boatNum * 13 + raceNo * 7) % 65));
    const motorRate = Number((32.0 + Math.random() * 16.0).toFixed(1));
    const boatRate = Number((30.0 + Math.random() * 14.0).toFixed(1));
    const exhibition = Number((6.64 + idx * 0.02 + (Math.random() * 0.04 - 0.02)).toFixed(2));

    return {
      boatNumber: boatNum,
      name: racer.name,
      registrationNumber: racer.reg,
      branch: racer.branch,
      grade: racer.grade,
      winRate: racer.winRate,
      secondRate: racer.secondRate,
      motorNumber: motorNo,
      motorSecondRate: motorRate,
      boatSecondRate: boatRate,
      exhibitionTime: exhibition,
      course: boatNum,
      st: Number((0.12 + Math.random() * 0.05).toFixed(2)),
    };
  });

  return {
    id: `race-${venueMeta.code}-${date}-${raceNo}`,
    date,
    venue: venueName,
    raceNo,
    raceTitle,
    deadlineTime,
    weather,
    boats,
  };
}

/**
 * 公式レース確定結果（確定着順・払戻金・決まり手）を自動取得
 */
export async function fetchRaceResult(params: {
  date: string;
  venueName: string;
  raceNo: number;
  boats: BoatData[];
}): Promise<OfficialRaceResult> {
  const { date, venueName, raceNo, boats } = params;

  // 通信遅延シミュレーション (400ms)
  await new Promise((resolve) => setTimeout(resolve, 400));

  // ボートデータから有力艇のスコア順序を特定
  const sortedByAbility = [...boats].sort((a, b) => {
    // 進入1コースへのアドバンテージと全国勝率を考慮
    const scoreA = a.winRate * 10 + (a.course === 1 ? 50 : (6 - a.course) * 5);
    const scoreB = b.winRate * 10 + (b.course === 1 ? 50 : (6 - b.course) * 5);
    return scoreB - scoreA;
  });

  const b1 = sortedByAbility[0]?.boatNumber ?? 1;
  const b2 = sortedByAbility[1]?.boatNumber ?? 2;
  const b3 = sortedByAbility[2]?.boatNumber ?? 3;
  const b4 = sortedByAbility[3]?.boatNumber ?? 4;

  // シナリオ生成（自然な競艇結果分布：1号艇逃げが約6割、2〜4号艇差し捲りが約4割）
  const rand = Math.random();
  let first: number = b1;
  let second: number = b2;
  let third: number = b3;
  let technique = '逃げ';
  let popRank = 1;
  let payout = 780;

  if (rand < 0.52) {
    // 王道本命決着: 1位 - 2位 - 3位
    first = b1;
    second = b2;
    third = b3;
    technique = first === 1 ? '逃げ' : '差し';
    popRank = 1;
    payout = 640 + Math.floor(Math.random() * 280);
  } else if (rand < 0.72) {
    // 対抗決着: 1位 - 2位 - 4位
    first = b1;
    second = b2;
    third = b4;
    technique = first === 1 ? '逃げ' : 'まくり';
    popRank = 2;
    payout = 1120 + Math.floor(Math.random() * 450);
  } else if (rand < 0.85) {
    // 2着ヒモ荒れ: 1位 - 3位 - 2位
    first = b1;
    second = b3;
    third = b2;
    technique = '逃げ';
    popRank = 3;
    payout = 1450 + Math.floor(Math.random() * 580);
  } else if (rand < 0.94) {
    // 逆転決着（2位艇の差し）: 2位 - 1位 - 3位
    first = b2;
    second = b1;
    third = b3;
    technique = first === 2 ? '差し' : first === 3 ? 'まくり' : 'まくり差し';
    popRank = 5;
    payout = 2650 + Math.floor(Math.random() * 1100);
  } else {
    // 中穴・波乱決着: 1位 - 3位 - 4位
    first = b1;
    second = b3;
    third = b4;
    technique = '逃げ';
    popRank = 4;
    payout = 1980 + Math.floor(Math.random() * 800);
  }

  // 1着、2着、3着が万一重複した際のフォールバック安全策
  if (first === second) second = (first % 6) + 1;
  if (first === third || second === third) {
    const remainders = [1, 2, 3, 4, 5, 6].filter(n => n !== first && n !== second);
    third = remainders[0] || 3;
  }

  const finishOrder = `${first}-${second}-${third}`;

  return {
    raceId: `race-${venueName}-${date}-${raceNo}`,
    finishOrder,
    first,
    second,
    third,
    officialPayout: payout,
    popularityRank: popRank,
    winningTechnique: technique,
    date,
    venueName,
    raceNo,
    weatherAtFinish: {
      weather: '晴',
      windDirection: '追い風',
      windSpeed: 2.0,
      waveHeight: 2,
      temperature: 18.5,
      waterTemperature: 19.0,
    },
  };
}
