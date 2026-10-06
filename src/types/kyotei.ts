/**
 * Kyotei Analyzer Pro 5
 * Type definitions matching the application specification (Ver 1.0)
 */

export type BoatGrade = 'A1' | 'A2' | 'B1' | 'B2';

export interface BoatData {
  boatNumber: 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  registrationNumber?: string;
  branch: string; // 支部
  grade: BoatGrade;
  winRate: number; // 全国勝率 (%) e.g. 7.45
  secondRate: number; // 2連対率 (%) e.g. 54.2
  motorNumber: number; // モーター番号
  motorSecondRate: number; // モーター2連対率 (%) e.g. 38.6
  boatSecondRate: number; // ボート2連対率 (%) e.g. 35.0
  exhibitionTime: number; // 展示タイム (秒) e.g. 6.68
  course: 1 | 2 | 3 | 4 | 5 | 6; // 進入コース
  st?: number; // 平均スタートタイミング (秒) e.g. 0.14
}

export type WindDirection = '向かい風' | '追い風' | '左横風' | '右横風' | '無風';
export type WeatherType = '晴' | '曇' | '雨' | '雪';

export interface WeatherCondition {
  weather: WeatherType;
  windDirection: WindDirection;
  windSpeed: number; // m/s
  waveHeight: number; // cm
  temperature: number; // ℃
  waterTemperature: number; // ℃
}

export interface VenueInfo {
  code: string;
  name: string;
  region: '関東' | '東海' | '近畿' | '四国' | '中国' | '九州';
  waterType: '淡水' | '海水' | '汽水';
  characteristics: string;
}

export interface RaceInfo {
  id: string;
  date: string; // YYYY-MM-DD
  venue: string; // 開催場名 (e.g. "住之江")
  raceNo: number; // 1〜12
  raceTitle: string; // e.g. "第12R 優勝戦"
  deadlineTime: string; // HH:mm
  weather: WeatherCondition;
  boats: BoatData[];
}

export interface ScoredBoat extends BoatData {
  rawScore: number;
  rank: number;
}

export interface BetCandidate {
  rank: number; // 1〜5
  combination: string; // e.g. "1-2-3"
  first: number;
  second: number;
  third: number;
  score: number;
  relativeProb: number; // 予測確率 (%)
  odds: number; // オッズ (倍)
  stake: number; // 推奨金額 (100円単位)
  expectedReturn: number; // 想定払戻 (円)
  expectedValue: number; // 期待値 (EV)
  isExcludedByOdds?: boolean;
}

export type AllocationMode = 'equal' | 'target' | 'fixed';

export interface AppSettings {
  baseStake: number; // 1点あたり基準額 (円) 初期値 100
  maxRaceBudget: number; // 1レース上限 (円) 初期値 2000
  minOdds: number; // 最低オッズ (倍) 初期値 2.0
  maxOdds: number; // 最高オッズ (倍) 初期値 50.0
  targetReturn: number; // 目標払戻額 (円) 初期値 3000
  windSpeedThreshold: number; // 風速見送り (m/s) 初期値 8.0
  waveHeightThreshold: number; // 波高見送り (cm) 初期値 10
  dailyProfitTarget: number; // 日次利益目標 (円) 初期値 5000 (0で無効)
  dailyLossLimit: number; // 日次損失上限 (円) 初期値 5000 (0で無効)
  allocationMode: AllocationMode;
  autoScaleBudget: boolean; // 上限超過時に自動縮小するか

  // 評価スコア重み (仕様書 7.3)
  winRateWeight: number; // 勝率重み (初期値 20)
  secondRateWeight: number; // 2連率重み (初期値 8)
  motorWeight: number; // モーター重み (初期値 5)
  exhibitionWeight: number; // 展示補正重み (初期値 15)
  courseWeights: [number, number, number, number, number, number]; // コース補正 [120, 35, 25, 20, 10, 0]
}

export type AppStatus = 'Taiki' | 'Skip' | 'Stop' | 'NG' | 'Teki2' | 'Hazure';

export interface RaceHistoryRecord {
  id: string;
  timestamp: string;
  date: string;
  venue: string;
  raceNo: number;
  raceTitle: string;
  status: AppStatus;
  skipReason?: string;
  stopReason?: string;
  bets: {
    combination: string;
    odds: number;
    stake: number;
    expectedReturn: number;
    isHit: boolean;
  }[];
  totalStake: number;
  finishOrder: string; // e.g. "1-2-3"
  officialPayout: number; // 確定払戻金 (100円あたり)
  totalReturn: number;
  profit: number;
  isHit: boolean;
}

export interface DayStatistics {
  totalStake: number;
  totalReturn: number;
  netProfit: number;
  hitCount: number;
  betCount: number;
  skipCount: number;
  totalRaces: number;
  hitRate: number; // %
  recoveryRate: number; // %
  skipRate: number; // %
}
