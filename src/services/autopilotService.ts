/**
 * 12. 全自動運転 (Autopilot) 制御サービス
 * 番組巡回・条件判定・予想・オッズ配分・自動投票・結果取得・安全停止の自動サイクル制御
 */

import { AutoPilotConfig, AutoPilotStage, AutoPilotLogItem, DayStatistics } from '../types/kyotei';

export interface StageMeta {
  stage: AutoPilotStage;
  label: string;
  badgeClass: string;
  dotClass: string;
  description: string;
}

export const AUTOPILOT_STAGE_META: Record<AutoPilotStage, StageMeta> = {
  STOPPED: {
    stage: 'STOPPED',
    label: '停止中',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    dotClass: 'bg-slate-500',
    description: '自動運転は待機しています。STARTボタンで開始します。',
  },
  FETCHING_CARD: {
    stage: 'FETCHING_CARD',
    label: '番組同期中',
    badgeClass: 'bg-teal-950/80 text-teal-300 border-teal-600',
    dotClass: 'bg-teal-400 animate-spin',
    description: '次会場の出走表・展示・番組データを受信・解析準備中...',
  },
  ANALYZING: {
    stage: 'ANALYZING',
    label: '番組・気象解析',
    badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-600',
    dotClass: 'bg-cyan-400 animate-ping',
    description: '出走表・展示タイム・気象条件（風速・波高）を取得・検査中...',
  },
  PREDICTING: {
    stage: 'PREDICTING',
    label: '予想・資金配分',
    badgeClass: 'bg-blue-950/80 text-blue-300 border-blue-600',
    dotClass: 'bg-blue-400 animate-pulse',
    description: '指定券種・点数に応じた買い目選定および最適資金配分を計算中...',
  },
  VOTING: {
    stage: 'VOTING',
    label: 'テレボート自動投票',
    badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-600',
    dotClass: 'bg-purple-400 animate-ping',
    description: 'テレボートAPIへ投票リクエストを送信中...',
  },
  WAITING_RESULT: {
    stage: 'WAITING_RESULT',
    label: 'レース発走・結果待機',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-600',
    dotClass: 'bg-amber-400 animate-pulse',
    description: 'レース発走および公式確定着順の発表を待機中...',
  },
  FETCHING_RESULT: {
    stage: 'FETCHING_RESULT',
    label: '確定結果取得・照合',
    badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-600',
    dotClass: 'bg-indigo-400 animate-ping',
    description: '公式確定結果を取得し、的中判定・払戻収支を自動登録中...',
  },
  NEXT_RACE_WAIT: {
    stage: 'NEXT_RACE_WAIT',
    label: '次レース移行準備',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-600',
    dotClass: 'bg-emerald-400 animate-pulse',
    description: 'インターバル待機中。次の対象レースへ自動移行します...',
  },
  SAFETY_STOP: {
    stage: 'SAFETY_STOP',
    label: '安全停止 (セーフティ作動)',
    badgeClass: 'bg-rose-950/90 text-rose-300 border-rose-600',
    dotClass: 'bg-rose-500 animate-ping',
    description: '目標利益達成または損失限度・連続不的中安全装置が作動し停止しました。',
  },
};

/**
 * Web Audio API 音声効果音（ブラウザネイティブ、外部ファイル不要）
 */
export function playAutoPilotSound(type: 'start' | 'vote' | 'hit' | 'miss' | 'stop' | 'skip') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'start') {
      // 起動音: 上昇アルペジオ (440 -> 660 -> 880Hz)
      [440, 660, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.12);
      });
    } else if (type === 'vote') {
      // 投票音: 2トーンピピッ (780 -> 1040Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(780, ctx.currentTime);
      osc.frequency.setValueAtTime(1040, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'hit') {
      // 的中ファンファーレ (523 -> 659 -> 783 -> 1046Hz)
      [523, 659, 783, 1046].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + idx * 0.09 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.09);
        osc.stop(ctx.currentTime + idx * 0.09 + 0.25);
      });
    } else if (type === 'stop') {
      // 停止警告音: 下降トーン (600 -> 300Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.38);
    }
  } catch (e) {
    // AudioContext政策等で制限された場合は静かに無視
  }
}

/**
 * 自動運転セーフティ判定
 */
export function evaluateAutoPilotSafety(params: {
  stats: DayStatistics;
  config: AutoPilotConfig;
  consecutiveLosses: number;
  currentBalance: number;
}): { shouldStop: boolean; reason: string } {
  const { stats, config, consecutiveLosses, currentBalance } = params;

  // 1. 目標利益達成チェック
  if (config.dailyProfitTarget > 0 && stats.netProfit >= config.dailyProfitTarget) {
    return {
      shouldStop: true,
      reason: `目標利益達成 (+${stats.netProfit.toLocaleString()}円 / 目標 ${config.dailyProfitTarget.toLocaleString()}円)。利益確保のため自動停止しました。`,
    };
  }

  // 2. 損失上限到達チェック
  if (config.dailyLossLimit > 0 && stats.netProfit <= -config.dailyLossLimit) {
    return {
      shouldStop: true,
      reason: `許容損失上限到達 (${stats.netProfit.toLocaleString()}円 / 限度 -${config.dailyLossLimit.toLocaleString()}円)。資産保護のため自動停止しました。`,
    };
  }

  // 3. 連続不的中チェック
  if (config.maxConsecutiveLosses > 0 && consecutiveLosses >= config.maxConsecutiveLosses) {
    return {
      shouldStop: true,
      reason: `連続不的中リミット到達 (${consecutiveLosses}回連続不的中)。トレンド転換まで一時停止しました。`,
    };
  }

  // 4. 残高不足チェック (実投票時)
  if (!config.testMode && currentBalance < 1000) {
    return {
      shouldStop: true,
      reason: `テレボート口座残高不足 (現在残高: ${currentBalance.toLocaleString()}円)。入金が必要です。`,
    };
  }

  return { shouldStop: false, reason: '' };
}

/**
 * 全国24競艇場 完全巡回リスト
 */
export const ALL_24_VENUES: string[] = [
  '住之江',
  '大村',
  '桐生',
  '平和島',
  '蒲郡',
  '戸田',
  '丸亀',
  '鳴門',
  '徳山',
  '尼崎',
  '児島',
  '宮島',
  '下関',
  '若松',
  '芦屋',
  '福岡',
  '唐津',
  '江戸川',
  '多摩川',
  '浜名湖',
  '常滑',
  '津',
  '三国',
  'びわこ',
];

export const DEFAULT_PATROL_VENUES: string[] = ALL_24_VENUES;

/**
 * 次の巡回対象レースおよび会場を決定（全会場巡回 vs 単一会場連続）
 * すでに投票済みの会場・レースを自動検知して別会場へスキップし、多重投票を完全抑止
 */
export function getNextPatrolTarget(params: {
  currentVenue: string;
  currentRaceNo: number;
  config: AutoPilotConfig;
  availableVenues?: string[];
  alreadyVotedKeys?: Set<string>;
}): { nextVenue: string; nextRaceNo: number; isRoundComplete: boolean } {
  const { currentVenue, currentRaceNo, config, availableVenues, alreadyVotedKeys } = params;

  // 1. 単一会場 連続運転モード (1R ➔ 12R)
  if (config.targetMode === 'single_venue') {
    const startR = config.startRaceNo || 1;
    const endR = config.endRaceNo || 12;
    let nextRaceNo = currentRaceNo < endR ? currentRaceNo + 1 : startR;
    let isRoundComplete = currentRaceNo >= endR;

    if (alreadyVotedKeys) {
      let attempts = 0;
      while (alreadyVotedKeys.has(`${currentVenue}-${nextRaceNo}`) && attempts < 12) {
        nextRaceNo = nextRaceNo < endR ? nextRaceNo + 1 : startR;
        if (nextRaceNo === startR) isRoundComplete = true;
        attempts++;
      }
    }

    return {
      nextVenue: currentVenue,
      nextRaceNo,
      isRoundComplete,
    };
  }

  // 2. 全国24場横断 巡回モード (全会場を1レースごとに切り替えて巡回)
  const venuePool =
    config.targetVenues && config.targetVenues.length > 0
      ? config.targetVenues
      : availableVenues && availableVenues.length > 0
      ? availableVenues
      : ALL_24_VENUES;

  const currentIdx = venuePool.indexOf(currentVenue);
  // 現在会場の次にある会場を選択（見つからない場合は先頭会場）
  let nextIdx = currentIdx >= 0 ? (currentIdx + 1) % venuePool.length : 0;
  let nextVenue = venuePool[nextIdx];

  // 全会場を1巡した場合はレース番号を進める
  let isRoundComplete = nextIdx === 0;
  let nextRaceNo = currentRaceNo;

  if (isRoundComplete) {
    const startR = config.startRaceNo || 1;
    const endR = config.endRaceNo || 12;
    nextRaceNo = currentRaceNo < endR ? currentRaceNo + 1 : startR;
  }

  // 既に投票済みの組み合わせはスキップして次の未投票会場・レースを探す
  if (alreadyVotedKeys && alreadyVotedKeys.size > 0) {
    let attempts = 0;
    const maxAttempts = venuePool.length * 12;
    while (alreadyVotedKeys.has(`${nextVenue}-${nextRaceNo}`) && attempts < maxAttempts) {
      nextIdx = (nextIdx + 1) % venuePool.length;
      nextVenue = venuePool[nextIdx];
      if (nextIdx === 0) {
        const startR = config.startRaceNo || 1;
        const endR = config.endRaceNo || 12;
        nextRaceNo = nextRaceNo < endR ? nextRaceNo + 1 : startR;
        isRoundComplete = true;
      }
      attempts++;
    }
  }

  return {
    nextVenue,
    nextRaceNo,
    isRoundComplete,
  };
}
