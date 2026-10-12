/**
 * TELEBOAT（テレボート）投票フォーマット連携 & 自動投票シミュレーションサービス
 */

import { BetCandidate, RaceInfo } from '../types/kyotei';
import { VENUES } from '../constants/venues';

export interface TeleboatCredentials {
  subscriberNo: string; // 加入者番号 (8桁)
  passcode: string;     // 暗証番号 (4桁)
  authPassword: string; // 認証用パスワード
  betPassword: string;  // 投票用パスワード
}

export interface TeleboatTicket {
  venueCode: string;
  venueName: string;
  raceNo: number;
  betType: '3T'; // 3連単
  first: number;
  second: number;
  third: number;
  combination: string;
  stake: number; // 円
}

export interface VoteLogItem {
  id: string;
  timestamp: string;
  venue: string;
  raceNo: number;
  combination: string;
  stake: number;
  odds: number;
  status: 'SUCCESS' | 'FAILED' | 'REJECTED';
  receptionNo?: string;
  message: string;
}

export interface AutoVoteConfig {
  enabled: boolean;          // 自動投票モード有効/無効
  testMode: boolean;         // テスト投票（シミュレーション）モード (デフォルトtrue: 安全第一)
  teleboatAccount: TeleboatCredentials;
  accountBalance: number;    // 口座残高 (円)
  minMinutesBeforeDeadline: number; // 締切何分前に自動投票を実行するか (例: 3分前)
  maxStakePerRace: number;   // 1レースあたりの投票上限 (円)
  confirmBeforeVote: boolean;// 投票直前に確認ポップアップを出すか (誤投票防止)
  soundAlert: boolean;       // 投票完了時に音声効果音を鳴らすか
}

export const DEFAULT_AUTOVOTE_CONFIG: AutoVoteConfig = {
  enabled: false,
  testMode: true,
  teleboatAccount: {
    subscriberNo: '88123456',
    passcode: '1234',
    authPassword: '••••••••',
    betPassword: '••••',
  },
  accountBalance: 50000,
  minMinutesBeforeDeadline: 3,
  maxStakePerRace: 3000,
  confirmBeforeVote: true,
  soundAlert: true,
};

/**
 * 買い目をテレボート専用フォーマットに変換
 */
export function buildTeleboatTickets(
  race: RaceInfo,
  candidates: BetCandidate[]
): TeleboatTicket[] {
  const venueObj = VENUES.find((v) => v.name === race.venue);
  const venueCode = venueObj ? venueObj.code : '00';

  const typeCodeMap: Record<string, '3T' | '3F' | '2T' | '2F' | '1T' | '1F' | 'WD'> = {
    '3t': '3T',
    '3f': '3F',
    '2t': '2T',
    '2f': '2F',
    '1t': '1T',
    '1f': '1F',
    'wide': 'WD',
  };

  return candidates
    .filter((c) => c.stake > 0)
    .map((c) => ({
      venueCode,
      venueName: race.venue,
      raceNo: race.raceNo,
      betType: (typeCodeMap[c.betType || '3t'] || '3T') as any,
      first: c.first,
      second: c.second,
      third: c.third,
      combination: c.combination,
      stake: c.stake,
    }));
}

/**
 * テレボート一括送信文字列（CSV/TXT）生成
 */
export function generateTeleboatBatchPayload(
  race: RaceInfo,
  candidates: BetCandidate[]
): string {
  const tickets = buildTeleboatTickets(race, candidates);
  const venueObj = VENUES.find((v) => v.name === race.venue);
  const venueCode = venueObj ? venueObj.code : '00';

  // テレボート標準CSVフォーマット:
  // 場コード,レースNo,式別(3T),1着,2着,3着,金額(100円単位)
  const lines = [
    '# TELEBOAT_VOTE_BATCH_PAYLOAD_V1',
    `# DATE:${race.date} VENUE:${race.venue}(${venueCode}) RACE:${race.raceNo}R`,
    '# 場コード,レースNo,券種,1着,2着,3着,投票金額(円)',
  ];

  tickets.forEach((t) => {
    lines.push(
      `${t.venueCode},${t.raceNo},${t.betType},${t.first},${t.second},${t.third},${t.stake}`
    );
  });

  return lines.join('\n');
}

/**
 * 自動投票のシミュレーション実行API
 */
export async function executeAutoVote({
  race,
  candidates,
  config,
}: {
  race: RaceInfo;
  candidates: BetCandidate[];
  config: AutoVoteConfig;
}): Promise<{
  success: boolean;
  totalVoted: number;
  logs: VoteLogItem[];
  error?: string;
}> {
  const validBets = candidates.filter((c) => c.stake > 0);
  const totalStake = validBets.reduce((sum, c) => sum + c.stake, 0);

  if (validBets.length === 0) {
    return {
      success: false,
      totalVoted: 0,
      logs: [],
      error: '投票対象の買い目・金額がありません (配分金額0円)',
    };
  }

  if (totalStake > config.maxStakePerRace) {
    return {
      success: false,
      totalVoted: 0,
      logs: [],
      error: `1レースの上限投票額 (¥${config.maxStakePerRace.toLocaleString()}) を超えています (必要額: ¥${totalStake.toLocaleString()})`,
    };
  }

  if (config.accountBalance < totalStake) {
    return {
      success: false,
      totalVoted: 0,
      logs: [],
      error: `テレボート口座残高不足です (残高: ¥${config.accountBalance.toLocaleString()} / 必要額: ¥${totalStake.toLocaleString()})`,
    };
  }

  // 投票処理の擬似遅延 (実サーバー・テレボート暗号通信シミュレーション)
  await new Promise((resolve) => setTimeout(resolve, 800));

  const now = new Date();
  const baseReceptionNo = Math.floor(10000000 + Math.random() * 90000000).toString();

  const logs: VoteLogItem[] = validBets.map((c, index) => {
    const receptionNo = `${baseReceptionNo}-${index + 1}`;
    return {
      id: `vote-${Date.now()}-${index}`,
      timestamp: now.toLocaleTimeString('ja-JP', { hour12: false }),
      venue: race.venue,
      raceNo: race.raceNo,
      combination: c.combination,
      stake: c.stake,
      odds: c.odds,
      status: 'SUCCESS',
      receptionNo,
      message: config.testMode
        ? `[テスト投票済] 受付番号: ${receptionNo} / 3連単 ${c.combination} ¥${c.stake.toLocaleString()}`
        : `[実投票完了] テレボート受付完了 / 受付番号: ${receptionNo}`,
    };
  });

  return {
    success: true,
    totalVoted: totalStake,
    logs,
  };
}
