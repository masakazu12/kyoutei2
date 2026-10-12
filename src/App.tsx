/**
 * Kyotei Analyzer Pro 5
 * Windows 10 / 11 競艇予想・資金配分・収支シミュレーション・投票支援アプリケーション
 * Ver. 1.0 (Clean-room implementation based on official specification)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { MenuBar } from './components/MenuBar';
import { RaceHeaderSection } from './components/RaceHeaderSection';
import { BoatTable } from './components/BoatTable';
import { PredictionSection } from './components/PredictionSection';
import { AllocationPanel } from './components/AllocationPanel';
import { StatusStamp } from './components/StatusStamp';
import { StatisticsBar } from './components/StatisticsBar';
import { ResultModal } from './components/ResultModal';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { FetchRaceModal } from './components/FetchRaceModal';
import { ExeDistributionModal } from './components/ExeDistributionModal';
import { AutoVoteModal } from './components/AutoVoteModal';
import { AIPredictionModal } from './components/AIPredictionModal';
import { AutoPilotControlBar } from './components/AutoPilotControlBar';
import { AutoPilotModal } from './components/AutoPilotModal';
import { generateAIPrediction, AIPredictionResult } from './services/aiPredictionService';
import {
  AutoVoteConfig,
  VoteLogItem,
  DEFAULT_AUTOVOTE_CONFIG,
  executeAutoVote,
} from './services/teleboatService';
import {
  playAutoPilotSound,
  evaluateAutoPilotSafety,
  AUTOPILOT_STAGE_META,
} from './services/autopilotService';

import {
  RaceInfo,
  BoatData,
  WeatherCondition,
  BetCandidate,
  AppSettings,
  RaceHistoryRecord,
  AllocationMode,
  AppStatus,
  BetType,
  BET_TYPE_LABELS,
  VenueStatistics,
  AutoPilotConfig,
  AutoPilotStage,
  AutoPilotLogItem,
  DEFAULT_AUTOPILOT_CONFIG,
} from './types/kyotei';
import { DEFAULT_SETTINGS, VENUES } from './constants/venues';
import { PRESET_RACES } from './data/presetRaces';
import { REAL_OFFICIAL_HISTORY_PACK } from './data/realRaceDataset';
import {
  calculateBoatScores,
  generateFivePointBets,
  generateBetsByType,
  simulateRealisticOdds,
} from './services/predictionEngine';
import { allocateMoney, AllocationResult } from './services/moneyAllocator';
import { evaluateRaceStatus, JudgmentResult } from './services/judgmentEngine';
import { calculateStatistics, calculateVenueStatistics } from './services/statisticsService';
import { isBetHit, getEstimatedOfficialPayout } from './services/betEvaluationHelper';
import { exportHistoryToCsv } from './services/csvExportService';
import { fetchRaceCard, fetchRaceResult } from './services/raceDataProvider';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Award,
  ArrowRight,
  Trash2,
  Zap,
  RefreshCw,
  X,
} from 'lucide-react';

export interface LatestResultNotice {
  venue: string;
  raceNo: number;
  raceTitle: string;
  finishOrder: string;
  first: number;
  second: number;
  third: number;
  winningTechnique: string;
  officialPayout: number;
  popularityRank: number;
  isHit: boolean;
  totalStake: number;
  totalReturn: number;
  profit: number;
  hitCombination?: string;
}

export default function App() {
  // 1. 設定の永続化ステート
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('kyotei_analyzer_settings_v1');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Settings load error:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // 2. 履歴の永続化ステート（公式確定実データパックを標準搭載）
  const [history, setHistory] = useState<RaceHistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem('kyotei_analyzer_history_v2');
      if (saved !== null) {
        return JSON.parse(saved);
      }
      const savedV1 = localStorage.getItem('kyotei_analyzer_history_v1');
      if (savedV1 !== null) {
        const parsed = JSON.parse(savedV1);
        if (parsed.length >= 8) return parsed;
      }
    } catch (e) {
      console.error('History load error:', e);
    }
    try {
      localStorage.setItem('kyotei_analyzer_history_v2', JSON.stringify(REAL_OFFICIAL_HISTORY_PACK));
    } catch (e) {}
    return REAL_OFFICIAL_HISTORY_PACK;
  });

  // 履歴変更時の自動永続化
  useEffect(() => {
    try {
      localStorage.setItem('kyotei_analyzer_history_v2', JSON.stringify(history));
    } catch (e) {
      console.error('History sync error:', e);
    }
  }, [history]);

  // 3. 現在のレースデータ
  const [race, setRace] = useState<RaceInfo>(() => PRESET_RACES[0]);

  // 4. 手動STOPフラグ
  const [manualStop, setManualStop] = useState<boolean>(false);

  // 5. 買い目候補とオッズ・券種・点数
  const [selectedBetType, setSelectedBetType] = useState<BetType>(() => settings.defaultBetType || '3t');
  const [selectedPointCount, setSelectedPointCount] = useState<number>(() => settings.defaultPointCount || 5);
  const [selectedVenueFilter, setSelectedVenueFilter] = useState<string | null>(null);

  const [candidates, setCandidates] = useState<BetCandidate[]>([]);
  const [allocationInfo, setAllocationInfo] = useState<AllocationResult>({
    updatedCandidates: [],
    totalStake: 0,
    totalExpectedReturnMin: 0,
    totalExpectedReturnMax: 0,
    isOverBudget: false,
    overBudgetAmount: 0,
  });

  // 6. 直前の確定ステータス
  const [lastFinishedStatus, setLastFinishedStatus] = useState<AppStatus | null>(null);

  // 7. ローディング & 結果速報ステート
  const [isFetchingRace, setIsFetchingRace] = useState<boolean>(false);
  const [isFetchingResult, setIsFetchingResult] = useState<boolean>(false);
  const [latestResultNotice, setLatestResultNotice] = useState<LatestResultNotice | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState<boolean>(false);

  // トースト表示ヘルパー
  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 3200);
  }, []);

  // 8. テレボート自動投票ステート
  const [autoVoteConfig, setAutoVoteConfig] = useState<AutoVoteConfig>(() => {
    try {
      const saved = localStorage.getItem('kyotei_autovote_config_v1');
      if (saved) {
        return { ...DEFAULT_AUTOVOTE_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_AUTOVOTE_CONFIG;
  });
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const [voteLogs, setVoteLogs] = useState<VoteLogItem[]>(() => {
    try {
      const saved = localStorage.getItem('kyotei_autovote_logs_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // 自動投票設定の保存
  useEffect(() => {
    try {
      localStorage.setItem('kyotei_autovote_config_v1', JSON.stringify(autoVoteConfig));
    } catch (e) {}
  }, [autoVoteConfig]);

  // 投票ログの保存
  useEffect(() => {
    try {
      localStorage.setItem('kyotei_autovote_logs_v1', JSON.stringify(voteLogs));
    } catch (e) {}
  }, [voteLogs]);

  // 8.5 AI予想ステート (Gemini 3.8 Flash)
  const [aiPredictionResult, setAiPredictionResult] = useState<AIPredictionResult | null>(null);
  const [isAILoading, setIsAILoading] = useState<boolean>(false);

  // 8.8 全自動運転 (Autopilot) ステート
  const [autoPilotConfig, setAutoPilotConfig] = useState<AutoPilotConfig>(() => {
    try {
      const saved = localStorage.getItem('kyotei_autopilot_config_v1');
      if (saved) return { ...DEFAULT_AUTOPILOT_CONFIG, ...JSON.parse(saved) };
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_AUTOPILOT_CONFIG;
  });

  const [autoPilotStage, setAutoPilotStage] = useState<AutoPilotStage>('STOPPED');
  const [autoPilotMessage, setAutoPilotMessage] = useState<string>('');
  const [autoPilotCountdown, setAutoPilotCountdown] = useState<number>(0);
  const [autoPilotLogs, setAutoPilotLogs] = useState<AutoPilotLogItem[]>(() => {
    try {
      const saved = localStorage.getItem('kyotei_autopilot_logs_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });
  const [autoSessionRaces, setAutoSessionRaces] = useState<number>(0);
  const [autoSessionHits, setAutoSessionHits] = useState<number>(0);
  const [autoSessionProfit, setAutoSessionProfit] = useState<number>(0);
  const [consecutiveLosses, setConsecutiveLosses] = useState<number>(0);

  // 自動運転設定の保存
  useEffect(() => {
    try {
      localStorage.setItem('kyotei_autopilot_config_v1', JSON.stringify(autoPilotConfig));
    } catch (e) {}
  }, [autoPilotConfig]);

  // 自動運転ログの保存
  useEffect(() => {
    try {
      localStorage.setItem('kyotei_autopilot_logs_v1', JSON.stringify(autoPilotLogs));
    } catch (e) {}
  }, [autoPilotLogs]);

  // 9. モーダル表示管理
  const [activeModal, setActiveModal] = useState<
    'result' | 'history' | 'settings' | 'help' | 'fetchRace' | 'exe' | 'autoVote' | 'aiPrediction' | 'autoPilot' | null
  >(null);

  // 統計集計 (全体および全国24場別)
  const stats = useMemo(() => calculateStatistics(history), [history]);
  const venueStats = useMemo(() => calculateVenueStatistics(history), [history]);

  // 実データ一括インポート機能
  const handleImportRealData = useCallback(() => {
    setHistory((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const toAdd = REAL_OFFICIAL_HISTORY_PACK.filter((r) => !existingIds.has(r.id));
      return [...toAdd, ...prev];
    });
    showToast('全国主要場の公式確定実データパックをインポートしました！会場別統計に即時反映されています');
  }, [showToast]);

  // 艇スコア計算 (仕様 7.3)
  const scoredBoats = useMemo(() => {
    return calculateBoatScores(race.boats, settings);
  }, [race.boats, settings]);

  // 見送り・停止・NG判定 (仕様 9)
  const judgment: JudgmentResult = useMemo(() => {
    if (lastFinishedStatus) {
      return {
        status: lastFinishedStatus,
        isStopped: false,
        isSkipped: false,
        isNg: false,
        reasonTitle: lastFinishedStatus === 'Teki2' ? 'レース的中！' : '不的中',
        reasonDetail:
          lastFinishedStatus === 'Teki2'
            ? '予想買い目が的中しました。確定払戻金が集計に反映されています。'
            : '確定着順が予想外でした。次レースへ向けて準備します。',
      };
    }
    return evaluateRaceStatus({
      race,
      candidates,
      settings,
      dailyProfit: stats.netProfit,
      manualStop,
    });
  }, [race, candidates, settings, stats.netProfit, manualStop, lastFinishedStatus]);

  // 予想実行処理 (可変券種・可変点数対応)
  const handleRunPrediction = useCallback(() => {
    setLastFinishedStatus(null);
    const existingOddsMap: Record<string, number> = {};
    candidates.forEach((c) => {
      if (c.odds > 0) existingOddsMap[c.combination] = c.odds;
    });

    const generated = generateBetsByType(scoredBoats, selectedBetType, selectedPointCount, existingOddsMap);

    // オッズが未設定の場合はリアルな市場オッズを自動シミュレート
    const oddsMap = simulateRealisticOdds(generated, selectedBetType);
    generated.forEach((c) => {
      if (!c.odds || c.odds <= 0) {
        c.odds = oddsMap[c.combination] || 5.0;
      }
    });

    // 直ちに資金配分も初期実行
    const alloc = allocateMoney(generated, settings);
    setCandidates(alloc.updatedCandidates);
    setAllocationInfo(alloc);
  }, [scoredBoats, selectedBetType, selectedPointCount, candidates, settings]);

  // 券種切り替えハンドラ
  const handleChangeBetType = useCallback((newType: BetType) => {
    setSelectedBetType(newType);
    const maxPts = BET_TYPE_LABELS[newType]?.maxPoints ?? 12;
    const newPts = Math.min(selectedPointCount, maxPts);
    setSelectedPointCount(newPts);
    setLastFinishedStatus(null);

    const generated = generateBetsByType(scoredBoats, newType, newPts);
    const oddsMap = simulateRealisticOdds(generated, newType);
    generated.forEach((c) => {
      c.odds = oddsMap[c.combination] || 5.0;
    });
    const alloc = allocateMoney(generated, settings);
    setCandidates(alloc.updatedCandidates);
    setAllocationInfo(alloc);
    showToast(`舟券種別を【${BET_TYPE_LABELS[newType].label}】(${newPts}点) に設定しました`);
  }, [scoredBoats, selectedPointCount, settings, showToast]);

  // 購入点数切り替えハンドラ
  const handleChangePointCount = useCallback((newPts: number) => {
    setSelectedPointCount(newPts);
    setLastFinishedStatus(null);

    const generated = generateBetsByType(scoredBoats, selectedBetType, newPts);
    const oddsMap = simulateRealisticOdds(generated, selectedBetType);
    generated.forEach((c) => {
      c.odds = oddsMap[c.combination] || 5.0;
    });
    const alloc = allocateMoney(generated, settings);
    setCandidates(alloc.updatedCandidates);
    setAllocationInfo(alloc);
    showToast(`購入点数を【${newPts}点】に変更しました`);
  }, [scoredBoats, selectedBetType, settings, showToast]);

  // 初回マウント時に自動予想生成
  useEffect(() => {
    if (candidates.length === 0 && scoredBoats.length > 0) {
      handleRunPrediction();
    }
  }, []);

  // オッズ手動・ステップ変更 (F04)
  const handleUpdateOdds = useCallback(
    (combination: string, odds: number) => {
      setCandidates((prev) => {
        const next = prev.map((c) => {
          if (c.combination === combination) {
            return { ...c, odds };
          }
          return c;
        });
        const alloc = allocateMoney(next, settings);
        setAllocationInfo(alloc);
        return alloc.updatedCandidates;
      });
    },
    [settings]
  );

  // オッズ自動シミュレート実行
  const handleSimulateOdds = useCallback(() => {
    if (candidates.length === 0) return;
    const simMap = simulateRealisticOdds(candidates, selectedBetType);
    setCandidates((prev) => {
      const next = prev.map((c) => ({
        ...c,
        odds: simMap[c.combination] || c.odds,
      }));
      const alloc = allocateMoney(next, settings);
      setAllocationInfo(alloc);
      return alloc.updatedCandidates;
    });
  }, [candidates, selectedBetType, settings]);

  // 資金配分実行 (F05)
  const handleCalculateAllocation = useCallback(() => {
    if (candidates.length === 0) return;
    const alloc = allocateMoney(candidates, settings);
    setCandidates(alloc.updatedCandidates);
    setAllocationInfo(alloc);
  }, [candidates, settings]);

  // レース情報・天候更新
  const handleUpdateRace = (updated: Partial<RaceInfo>) => {
    setLastFinishedStatus(null);
    setRace((prev) => ({ ...prev, ...updated }));
  };

  const handleUpdateWeather = (updated: Partial<WeatherCondition>) => {
    setLastFinishedStatus(null);
    setRace((prev) => ({
      ...prev,
      weather: { ...prev.weather, ...updated },
    }));
  };

  // 出走艇データ更新 (F02)
  const handleUpdateBoat = (boatNumber: number, fields: Partial<BoatData>) => {
    setLastFinishedStatus(null);
    setRace((prev) => ({
      ...prev,
      boats: prev.boats.map((b) => (b.boatNumber === boatNumber ? { ...b, ...fields } : b)),
    }));
  };

  // 展示タイム一括補正
  const handleQuickSimulateExhibition = () => {
    setLastFinishedStatus(null);
    setRace((prev) => ({
      ...prev,
      boats: prev.boats.map((b) => {
        const base = 6.65 + (b.boatNumber - 1) * 0.02;
        const rand = Number((Math.random() * 0.08 - 0.04).toFixed(2));
        return {
          ...b,
          exhibitionTime: Number((base + rand).toFixed(2)),
        };
      }),
    }));
  };

  // プリセット番組選択 (F14)
  const handleSelectPreset = (presetId: string) => {
    setLastFinishedStatus(null);
    const target = PRESET_RACES.find((p) => p.id === presetId);
    if (target) {
      setRace(JSON.parse(JSON.stringify(target)));
      // 新規番組読み込み後に自動予想を再計算
      setTimeout(() => {
        const newScored = calculateBoatScores(target.boats, settings);
        const generated = generateFivePointBets(newScored);
        const oddsMap = simulateRealisticOdds(generated);
        generated.forEach((c) => {
          c.odds = oddsMap[c.combination] || 5.0;
        });
        const alloc = allocateMoney(generated, settings);
        setCandidates(alloc.updatedCandidates);
        setAllocationInfo(alloc);
      }, 50);
    }
  };

  // 既定値レースへリセット
  const handleResetToDefaultRace = () => {
    handleSelectPreset(PRESET_RACES[0].id);
  };

  // レース結果確定登録 (F08)
  const handleConfirmResult = (resultData: {
    finishOrder: string;
    officialPayout: number;
    isHit: boolean;
    hitCombination?: string;
    totalStake: number;
    totalReturn: number;
    profit: number;
  }) => {
    const newRecord: RaceHistoryRecord = {
      id: `rec-${Date.now()}`,
      timestamp: new Date().toLocaleString('ja-JP'),
      date: race.date,
      venue: race.venue,
      raceNo: race.raceNo,
      raceTitle: race.raceTitle,
      status: resultData.isHit ? 'Teki2' : 'Hazure',
      betType: selectedBetType,
      pointCount: selectedPointCount,
      bets: candidates.map((c) => ({
        combination: c.combination,
        odds: c.odds,
        stake: c.stake,
        expectedReturn: c.expectedReturn,
        isHit: isBetHit(c.combination, c.betType || selectedBetType, resultData.finishOrder),
      })),
      totalStake: resultData.totalStake,
      finishOrder: resultData.finishOrder,
      officialPayout: resultData.officialPayout,
      totalReturn: resultData.totalReturn,
      profit: resultData.profit,
      isHit: resultData.isHit,
    };

    setHistory((prev) => [newRecord, ...prev]);
    setLastFinishedStatus(resultData.isHit ? 'Teki2' : 'Hazure');
    setActiveModal(null);
  };

  // CSVエクスポート (F11)
  const handleExportCsv = () => {
    exportHistoryToCsv(history, race.date);
  };

  // 外部開催レースデータ取得完了時ハンドラ (F14)
  const handleRaceFetched = (newRace: RaceInfo) => {
    setLastFinishedStatus(null);
    setLatestResultNotice(null);
    setRace(newRace);
    setTimeout(() => {
      const newScored = calculateBoatScores(newRace.boats, settings);
      const generated = generateBetsByType(newScored, selectedBetType, selectedPointCount);
      const oddsMap = simulateRealisticOdds(generated, selectedBetType);
      generated.forEach((c) => {
        c.odds = oddsMap[c.combination] || 5.0;
      });
      const alloc = allocateMoney(generated, settings);
      setCandidates(alloc.updatedCandidates);
      setAllocationInfo(alloc);
      showToast(`【${newRace.venue}】第${newRace.raceNo}R の出走表・番組データを反映しました`);
    }, 50);
  };

  // 指定開催場・レース番号の出走表番組データを取得 (F14)
  const handleFetchRace = useCallback(
    async (venueName: string, raceNo: number) => {
      setIsFetchingRace(true);
      try {
        const newRace = await fetchRaceCard({
          date: race.date,
          venueName,
          raceNo,
        });
        setLastFinishedStatus(null);
        setLatestResultNotice(null);
        setRace(newRace);

        const newScored = calculateBoatScores(newRace.boats, settings);
        const generated = generateBetsByType(newScored, selectedBetType, selectedPointCount);
        const oddsMap = simulateRealisticOdds(generated, selectedBetType);
        generated.forEach((c) => {
          c.odds = oddsMap[c.combination] || 5.0;
        });
        const alloc = allocateMoney(generated, settings);
        setCandidates(alloc.updatedCandidates);
        setAllocationInfo(alloc);
        showToast(`【${venueName}】第${raceNo}R の出走表番組データを取得しました`);
      } catch (err) {
        console.error('Fetch race error:', err);
        showToast('番組データの取得に失敗しました', 'error');
      } finally {
        setIsFetchingRace(false);
      }
    },
    [race.date, selectedBetType, selectedPointCount, settings, showToast]
  );

  // 次のレースへ進むハンドラ
  const handleNextRace = () => {
    const nextR = race.raceNo < 12 ? race.raceNo + 1 : 1;
    handleFetchRace(race.venue, nextR);
  };

  // 履歴クリア (F10)
  const handleClearHistory = () => {
    setHistory([]);
    setLastFinishedStatus(null);
    setLatestResultNotice(null);
    setShowClearHistoryConfirm(false);
    try {
      localStorage.setItem('kyotei_analyzer_history_v2', JSON.stringify([]));
    } catch (e) {
      console.error(e);
    }
    showToast('すべての収支履歴を消去しました（0件）');
  };

  // 履歴1件削除
  const handleDeleteRecord = (id: string) => {
    setHistory((prev) => prev.filter((r) => r.id !== id));
    showToast('指定した履歴レコードを削除しました');
  };

  // テレボート投票実行ハンドラ
  const handleExecuteVote = async () => {
    if (judgment.isStopped) {
      showToast('STOP判定発令中のため投票できません (手動または日次限度)', 'error');
      return;
    }
    if (judgment.isSkipped) {
      showToast('見送り判定発令中のため投票できません (強風・高波・低オッズ)', 'error');
      return;
    }

    setIsVoting(true);
    try {
      // 買い目・配分が未設定の場合は自動配分
      let currentCandidates = candidates;
      if (currentCandidates.length === 0 || currentCandidates.every((c) => c.stake === 0)) {
        const scored = calculateBoatScores(race.boats, settings);
        const generated = generateFivePointBets(scored);
        const oddsMap = simulateRealisticOdds(generated);
        generated.forEach((c) => {
          c.odds = oddsMap[c.combination] || 5.0;
        });
        const alloc = allocateMoney(generated, settings);
        currentCandidates = alloc.updatedCandidates;
        setCandidates(alloc.updatedCandidates);
        setAllocationInfo(alloc);
      }

      const result = await executeAutoVote({
        race,
        candidates: currentCandidates,
        config: autoVoteConfig,
      });

      if (!result.success) {
        showToast(result.error || '投票処理に失敗しました', 'error');
        return;
      }

      // ログ追加
      setVoteLogs((prev) => [...result.logs, ...prev]);

      // 残高更新 (実投票時またはシミュレーション時)
      setAutoVoteConfig((prev) => ({
        ...prev,
        accountBalance: Math.max(0, prev.accountBalance - result.totalVoted),
      }));

      // サウンド再生 (Web Audio API)
      if (autoVoteConfig.soundAlert && typeof window !== 'undefined') {
        try {
          const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          }
        } catch (e) {
          console.error(e);
        }
      }

      const modeText = autoVoteConfig.testMode ? '[テスト投票完了]' : '[実投票完了]';
      showToast(
        `${modeText} ${race.venue}${race.raceNo}R 3連単${result.logs.length}点 (計¥${result.totalVoted.toLocaleString()}) の投票を受付しました`
      );
    } catch (err) {
      console.error('Vote execute error:', err);
      showToast('投票処理中にエラーが発生しました', 'error');
    } finally {
      setIsVoting(false);
    }
  };

  // AI予想実行ハンドラ (Gemini 3.8 Flash)
  const handleRunAIPrediction = async () => {
    setIsAILoading(true);
    setActiveModal('aiPrediction');
    try {
      const res = await generateAIPrediction({
        race,
        scoredBoats,
        settings,
      });
      setAiPredictionResult(res);
      showToast(`【${race.venue} ${race.raceNo}R】Gemini AI予想・水面展開分析が完了しました`, 'success');
    } catch (err) {
      console.error('AI prediction error:', err);
      showToast('AI予想の生成に失敗しました', 'error');
    } finally {
      setIsAILoading(false);
    }
  };

  // AI予想買い目をメイン買い目テーブルに反映
  const handleApplyAICandidates = () => {
    if (!aiPredictionResult || aiPredictionResult.aiCandidates.length === 0) return;
    setCandidates(aiPredictionResult.aiCandidates);
    const alloc = allocateMoney(aiPredictionResult.aiCandidates, settings);
    setCandidates(alloc.updatedCandidates);
    setAllocationInfo(alloc);
    setActiveModal(null);
    showToast(`AI特選買い目（5点）をメイン画面に適用しました`, 'success');
  };

  // レース確定結果の自動取得 (F08 + 自動データ取得)
  const handleAutoFetchResult = async () => {
    setIsFetchingResult(true);
    try {
      // 予想買い目が未生成の場合は自動実行
      let currentCandidates = candidates;
      if (currentCandidates.length === 0) {
        const scored = calculateBoatScores(race.boats, settings);
        const generated = generateBetsByType(scored, selectedBetType, selectedPointCount);
        const oddsMap = simulateRealisticOdds(generated, selectedBetType);
        generated.forEach((c) => {
          c.odds = oddsMap[c.combination] || 5.0;
        });
        const alloc = allocateMoney(generated, settings);
        currentCandidates = alloc.updatedCandidates;
        setCandidates(alloc.updatedCandidates);
        setAllocationInfo(alloc);
      }

      // 資金配分が0円の場合は標準配分を即時補填
      let totalStake = currentCandidates.reduce((sum, c) => sum + (c.stake || 0), 0);
      if (totalStake === 0) {
        const alloc = allocateMoney(currentCandidates, settings);
        currentCandidates = alloc.updatedCandidates;
        setCandidates(alloc.updatedCandidates);
        setAllocationInfo(alloc);
        totalStake = alloc.totalStake;
      }

      const res = await fetchRaceResult({
        date: race.date,
        venueName: race.venue,
        raceNo: race.raceNo,
        boats: race.boats,
      });

      const matchedCandidate = currentCandidates.find(
        (c) => isBetHit(c.combination, c.betType || selectedBetType, res.finishOrder) && c.stake > 0
      );
      const isHit = !!matchedCandidate;

      // 券種に応じた確定払戻金の計算
      let payout100 = res.officialPayout;
      if (selectedBetType !== '3t' && matchedCandidate) {
        payout100 = getEstimatedOfficialPayout(res.officialPayout, selectedBetType, matchedCandidate.odds);
      }

      const totalReturn = isHit && matchedCandidate
        ? Math.floor((matchedCandidate.stake * payout100) / 100)
        : 0;
      const profit = totalReturn - totalStake;

      const newRecord: RaceHistoryRecord = {
        id: `rec-${Date.now()}`,
        timestamp: new Date().toLocaleString('ja-JP'),
        date: race.date,
        venue: race.venue,
        raceNo: race.raceNo,
        raceTitle: race.raceTitle,
        status: isHit ? 'Teki2' : 'Hazure',
        betType: selectedBetType,
        pointCount: selectedPointCount,
        bets: currentCandidates.map((c) => ({
          combination: c.combination,
          odds: c.odds,
          stake: c.stake,
          expectedReturn: c.expectedReturn,
          isHit: isBetHit(c.combination, c.betType || selectedBetType, res.finishOrder),
        })),
        totalStake,
        finishOrder: res.finishOrder,
        officialPayout: payout100,
        totalReturn,
        profit,
        isHit,
      };

      setHistory((prev) => [newRecord, ...prev]);
      setLastFinishedStatus(isHit ? 'Teki2' : 'Hazure');

      setLatestResultNotice({
        venue: race.venue,
        raceNo: race.raceNo,
        raceTitle: race.raceTitle,
        finishOrder: res.finishOrder,
        first: res.first,
        second: res.second,
        third: res.third,
        winningTechnique: res.winningTechnique,
        officialPayout: res.officialPayout,
        popularityRank: res.popularityRank,
        isHit,
        totalStake,
        totalReturn,
        profit,
        hitCombination: matchedCandidate?.combination,
      });

      showToast(
        isHit
          ? `★ 的中！ 確定着順 ${res.finishOrder} (${res.officialPayout}円)`
          : `確定着順 ${res.finishOrder} (${res.officialPayout}円) - 不的中`,
        isHit ? 'success' : 'info'
      );
    } catch (e) {
      console.error('Auto fetch result error:', e);
      showToast('公式確定結果の取得に失敗しました', 'error');
    } finally {
      setIsFetchingResult(false);
    }
  };

  // 8.9 全自動運転 (Autopilot) ログ追加ヘルパー
  const addAutoPilotLog = useCallback(
    (type: AutoPilotLogItem['type'], message: string, details?: string) => {
      const item: AutoPilotLogItem = {
        id: `ap-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
        venue: race.venue,
        raceNo: race.raceNo,
        type,
        message,
        details,
      };
      setAutoPilotLogs((prev) => [item, ...prev.slice(0, 199)]);
    },
    [race.venue, race.raceNo]
  );

  // 全自動運転 START / STOP 切替
  const handleToggleAutoPilot = useCallback(() => {
    if (autoPilotConfig.enabled) {
      setAutoPilotConfig((prev) => ({ ...prev, enabled: false }));
      setAutoPilotStage('STOPPED');
      setAutoPilotCountdown(0);
      setAutoPilotMessage('全自動運転を停止しました');
      if (autoPilotConfig.soundAlert) playAutoPilotSound('stop');
      addAutoPilotLog('STOP', '手動操作により全自動運転を停止しました');
      showToast('全自動運転を停止しました', 'info');
    } else {
      setAutoPilotConfig((prev) => ({ ...prev, enabled: true }));
      setAutoPilotStage('ANALYZING');
      setAutoPilotCountdown(0);
      setAutoPilotMessage(`【${race.venue} ${race.raceNo}R】条件判定・番組解析中...`);
      setConsecutiveLosses(0);
      if (autoPilotConfig.soundAlert) playAutoPilotSound('start');
      addAutoPilotLog(
        'INFO',
        `全自動運転を開始しました (${autoPilotConfig.targetMode === 'single_venue' ? '会場連続巡回' : '全国横断巡回'})`
      );
      showToast('全自動運転を開始しました！自動サイクルが稼働します', 'success');
    }
  }, [
    autoPilotConfig.enabled,
    autoPilotConfig.soundAlert,
    autoPilotConfig.targetMode,
    race.venue,
    race.raceNo,
    addAutoPilotLog,
    showToast,
  ]);

  // 次レース・待機の強制スキップ
  const handleForceNextRace = useCallback(() => {
    if (autoPilotStage === 'WAITING_RESULT') {
      setAutoPilotCountdown(0);
      setAutoPilotStage('FETCHING_RESULT');
    } else if (autoPilotStage === 'NEXT_RACE_WAIT') {
      setAutoPilotCountdown(0);
    } else {
      handleNextRace();
    }
  }, [autoPilotStage, handleNextRace]);

  // グローバルショートカットキー (F9: 自動運転, F12: 設定, Escape: モーダル閉じる)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        handleToggleAutoPilot();
      } else if (e.key === 'F12') {
        e.preventDefault();
        setActiveModal((prev) => (prev === 'settings' ? null : 'settings'));
      } else if (e.key === 'Escape') {
        setActiveModal(null);
        setShowClearHistoryConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleAutoPilot]);

  // 全自動運転 (Autopilot) サイクル制御エンジン
  useEffect(() => {
    if (!autoPilotConfig.enabled || autoPilotStage === 'STOPPED' || autoPilotStage === 'SAFETY_STOP') {
      return;
    }

    let isCancelled = false;

    // ステージ 1: ANALYZING (番組・気象条件検査)
    if (autoPilotStage === 'ANALYZING') {
      const safety = evaluateAutoPilotSafety({
        stats,
        config: autoPilotConfig,
        consecutiveLosses,
        currentBalance: autoVoteConfig.accountBalance,
      });

      if (safety.shouldStop) {
        setAutoPilotStage('SAFETY_STOP');
        setAutoPilotConfig((prev) => ({ ...prev, enabled: false }));
        setAutoPilotMessage(`安全停止: ${safety.reason}`);
        if (autoPilotConfig.soundAlert) playAutoPilotSound('stop');
        addAutoPilotLog('STOP', `安全停止: ${safety.reason}`);
        showToast(`安全装置作動: ${safety.reason}`, 'error');
        return;
      }

      if (judgment.isStopped) {
        setAutoPilotStage('SAFETY_STOP');
        setAutoPilotConfig((prev) => ({ ...prev, enabled: false }));
        setAutoPilotMessage(`STOP発令: ${judgment.reasonTitle}`);
        if (autoPilotConfig.soundAlert) playAutoPilotSound('stop');
        addAutoPilotLog('STOP', `STOP発令: ${judgment.reasonTitle}`);
        return;
      }

      if (judgment.isSkipped) {
        setAutoPilotMessage(`気象見送り (${race.weather.windSpeed}m/s, ${race.weather.waveHeight}cm)。次Rへ待機移行`);
        addAutoPilotLog('SKIP', `【${race.venue} ${race.raceNo}R】${judgment.reasonTitle} により見送り`);
        setAutoPilotStage('NEXT_RACE_WAIT');
        setAutoPilotCountdown(3);
        return;
      }

      const timer = setTimeout(() => {
        if (!isCancelled) {
          setAutoPilotStage('PREDICTING');
          setAutoPilotMessage(`【${race.venue} ${race.raceNo}R】予想生成・資金配分を計算中...`);
        }
      }, 700);
      return () => {
        isCancelled = true;
        clearTimeout(timer);
      };
    }

    // ステージ 2: PREDICTING (予想・配分計算)
    if (autoPilotStage === 'PREDICTING') {
      const timer = setTimeout(async () => {
        if (isCancelled) return;
        try {
          let currentCands: BetCandidate[] = [];
          if (autoPilotConfig.useAIEnhanced) {
            setAutoPilotMessage(`Gemini AI深層展開分析を実行中...`);
            const aiRes = await generateAIPrediction({ race, scoredBoats, settings });
            if (aiRes && aiRes.aiCandidates.length > 0) {
              setAiPredictionResult(aiRes);
              currentCands = aiRes.aiCandidates;
            }
          }

          if (currentCands.length === 0) {
            const scored = calculateBoatScores(race.boats, settings);
            const generated = generateBetsByType(scored, selectedBetType, selectedPointCount);
            const oddsMap = simulateRealisticOdds(generated, selectedBetType);
            generated.forEach((c) => {
              c.odds = oddsMap[c.combination] || 5.0;
            });
            currentCands = generated;
          }

          const alloc = allocateMoney(currentCands, settings);
          setCandidates(alloc.updatedCandidates);
          setAllocationInfo(alloc);

          addAutoPilotLog(
            'PREDICT',
            `【${race.venue} ${race.raceNo}R】予想生成: ${BET_TYPE_LABELS[selectedBetType].label} ${selectedPointCount}点`,
            `総投資予定: ¥${alloc.totalStake.toLocaleString()}`
          );

          if (autoPilotConfig.executeAutoVote) {
            setAutoPilotStage('VOTING');
            setAutoPilotMessage(`テレボートへ自動投票リクエスト送信中...`);
          } else {
            setAutoPilotStage('WAITING_RESULT');
            setAutoPilotCountdown(3);
            setAutoPilotMessage(`【${race.venue} ${race.raceNo}R】レース発走待機中...`);
          }
        } catch (e) {
          console.error('Autopilot predict error:', e);
          setAutoPilotStage('NEXT_RACE_WAIT');
          setAutoPilotCountdown(3);
        }
      }, 700);
      return () => {
        isCancelled = true;
        clearTimeout(timer);
      };
    }

    // ステージ 3: VOTING (テレボート自動投票)
    if (autoPilotStage === 'VOTING') {
      const timer = setTimeout(async () => {
        if (isCancelled) return;
        try {
          const voteResult = await executeAutoVote({
            race,
            candidates,
            config: autoVoteConfig,
          });

          if (!isCancelled) {
            if (voteResult.success) {
              setVoteLogs((prev) => [...voteResult.logs, ...prev]);
              if (autoPilotConfig.soundAlert) playAutoPilotSound('vote');
              addAutoPilotLog(
                'VOTE',
                `テレボート投票完了 (${autoVoteConfig.testMode ? 'テスト' : '本番'})`,
                `投票計 ¥${voteResult.totalVoted.toLocaleString()}`
              );
            } else {
              addAutoPilotLog('VOTE', `投票結果: ${voteResult.error}`);
            }

            setAutoPilotStage('WAITING_RESULT');
            setAutoPilotCountdown(3);
            setAutoPilotMessage(`【${race.venue} ${race.raceNo}R】レース発走・確定着順待機中...`);
          }
        } catch (e) {
          console.error('Autopilot vote error:', e);
          setAutoPilotStage('WAITING_RESULT');
          setAutoPilotCountdown(3);
        }
      }, 600);
      return () => {
        isCancelled = true;
        clearTimeout(timer);
      };
    }

    // ステージ 4: WAITING_RESULT (レース進行・カウントダウン待機)
    if (autoPilotStage === 'WAITING_RESULT') {
      if (autoPilotCountdown > 0) {
        const timer = setTimeout(() => {
          setAutoPilotCountdown((prev) => prev - 1);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        setAutoPilotStage('FETCHING_RESULT');
        setAutoPilotMessage(`【${race.venue} ${race.raceNo}R】公式確定結果を取得・照合中...`);
      }
    }

    // ステージ 5: FETCHING_RESULT (確定結果取得 & 的中照合)
    if (autoPilotStage === 'FETCHING_RESULT') {
      const timer = setTimeout(async () => {
        if (isCancelled) return;
        try {
          const res = await fetchRaceResult({
            date: race.date,
            venueName: race.venue,
            raceNo: race.raceNo,
            boats: race.boats,
          });

          if (isCancelled) return;

          const matchedCandidate = candidates.find(
            (c) => isBetHit(c.combination, c.betType || selectedBetType, res.finishOrder) && c.stake > 0
          );
          const isHit = !!matchedCandidate;

          let payout100 = res.officialPayout;
          if (selectedBetType !== '3t' && matchedCandidate) {
            payout100 = getEstimatedOfficialPayout(res.officialPayout, selectedBetType, matchedCandidate.odds);
          }

          const totalStake = candidates.reduce((sum, c) => sum + (c.stake || 0), 0);
          const totalReturn = isHit && matchedCandidate ? Math.floor((matchedCandidate.stake * payout100) / 100) : 0;
          const profit = totalReturn - totalStake;

          const newRecord: RaceHistoryRecord = {
            id: `ap-rec-${Date.now()}`,
            timestamp: new Date().toLocaleString('ja-JP'),
            date: race.date,
            venue: race.venue,
            raceNo: race.raceNo,
            raceTitle: race.raceTitle,
            status: isHit ? 'Teki2' : 'Hazure',
            betType: selectedBetType,
            pointCount: selectedPointCount,
            bets: candidates.map((c) => ({
              combination: c.combination,
              odds: c.odds,
              stake: c.stake,
              expectedReturn: c.expectedReturn,
              isHit: isBetHit(c.combination, c.betType || selectedBetType, res.finishOrder),
            })),
            totalStake,
            finishOrder: res.finishOrder,
            officialPayout: payout100,
            totalReturn,
            profit,
            isHit,
          };

          setHistory((prev) => [newRecord, ...prev]);
          setLastFinishedStatus(isHit ? 'Teki2' : 'Hazure');

          setLatestResultNotice({
            venue: race.venue,
            raceNo: race.raceNo,
            raceTitle: race.raceTitle,
            finishOrder: res.finishOrder,
            first: res.first,
            second: res.second,
            third: res.third,
            winningTechnique: res.winningTechnique,
            officialPayout: res.officialPayout,
            popularityRank: res.popularityRank,
            isHit,
            totalStake,
            totalReturn,
            profit,
            hitCombination: matchedCandidate?.combination,
          });

          setAutoSessionRaces((prev) => prev + 1);
          setAutoSessionProfit((prev) => prev + profit);

          if (isHit) {
            setAutoSessionHits((prev) => prev + 1);
            setConsecutiveLosses(0);
            if (autoPilotConfig.soundAlert) playAutoPilotSound('hit');
            addAutoPilotLog('HIT', `★ 的中！ 着順 ${res.finishOrder} (${payout100}円)`, `純利益 +¥${profit.toLocaleString()}`);
            showToast(`★ 的中！【${race.venue} ${race.raceNo}R】着順 ${res.finishOrder} (+¥${profit.toLocaleString()})`, 'success');
          } else {
            setConsecutiveLosses((prev) => prev + 1);
            addAutoPilotLog('MISS', `不的中 着順 ${res.finishOrder}`, `投資損 -¥${totalStake.toLocaleString()}`);
            showToast(`確定着順 ${res.finishOrder} - 不的中 (-¥${totalStake.toLocaleString()})`, 'info');
          }

          const safetyAfter = evaluateAutoPilotSafety({
            stats: calculateStatistics([newRecord, ...history]),
            config: autoPilotConfig,
            consecutiveLosses: isHit ? 0 : consecutiveLosses + 1,
            currentBalance: autoVoteConfig.accountBalance,
          });

          if (safetyAfter.shouldStop) {
            setAutoPilotStage('SAFETY_STOP');
            setAutoPilotConfig((prev) => ({ ...prev, enabled: false }));
            setAutoPilotMessage(`安全停止: ${safetyAfter.reason}`);
            if (autoPilotConfig.soundAlert) playAutoPilotSound('stop');
            addAutoPilotLog('STOP', `安全停止: ${safetyAfter.reason}`);
            showToast(`セーフティ安全装置作動: ${safetyAfter.reason}`, 'error');
            return;
          }

          setAutoPilotStage('NEXT_RACE_WAIT');
          setAutoPilotCountdown(autoPilotConfig.advanceDelaySeconds || 4);
          setAutoPilotMessage(`次レースへ移行待機中 (${autoPilotConfig.advanceDelaySeconds || 4}秒)...`);
        } catch (e) {
          console.error('Autopilot fetch result error:', e);
          setAutoPilotStage('NEXT_RACE_WAIT');
          setAutoPilotCountdown(3);
        }
      }, 700);
      return () => {
        isCancelled = true;
        clearTimeout(timer);
      };
    }

    // ステージ 6: NEXT_RACE_WAIT (次レースへ自動移行)
    if (autoPilotStage === 'NEXT_RACE_WAIT') {
      if (autoPilotCountdown > 0) {
        const timer = setTimeout(() => {
          setAutoPilotCountdown((prev) => prev - 1);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        const nextR = race.raceNo < autoPilotConfig.endRaceNo ? race.raceNo + 1 : autoPilotConfig.startRaceNo;
        handleFetchRace(race.venue, nextR);
        setAutoPilotStage('ANALYZING');
        setAutoPilotMessage(`【${race.venue} ${nextR}R】番組データ同期完了。解析開始...`);
      }
    }
  }, [
    autoPilotConfig,
    autoPilotStage,
    autoPilotCountdown,
    stats,
    judgment,
    race,
    candidates,
    selectedBetType,
    selectedPointCount,
    settings,
    autoVoteConfig,
    consecutiveLosses,
    history,
    scoredBoats,
    handleFetchRace,
    addAutoPilotLog,
    showToast,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none relative">
      {/* グローバルトースト通知 */}
      {toast && (
        <div
          className={`fixed top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md shadow-2xl text-xs font-bold flex items-center gap-2 border transition-all animate-in fade-in slide-in-from-top-3 ${
            toast.type === 'error'
              ? 'bg-rose-950 border-rose-500 text-rose-200'
              : toast.type === 'info'
              ? 'bg-slate-900 border-blue-500 text-blue-200'
              : 'bg-emerald-950 border-emerald-500 text-emerald-200'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* 履歴全削除確認モーダル（グローバル） */}
      {showClearHistoryConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border-2 border-rose-600 rounded-lg p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0 text-rose-400" />
              <h4 className="text-sm font-bold text-white">収支履歴の全件削除確認</h4>
            </div>

            <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <p>
                現在記録されているすべてのレース予想・収支シミュレーション履歴（全{' '}
                <strong className="text-amber-300 font-mono text-sm">{history.length}件</strong>
                ）を完全に消去しますか？
              </p>
              <p className="text-[11px] text-rose-300 bg-rose-950/60 p-2 rounded border border-rose-900">
                ※削除を実行すると、投資額・払戻額・回収率・純利益の集計データおよび推移グラフもすべて初期化（0件）されます。この操作は取り消せません。
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowClearHistoryConfirm(false)}
                className="px-3 py-1.5 rounded text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 font-medium cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-4 py-1.5 rounded text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>完全に全消去する</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Windows 11 Fluent タイトルバー */}
      <TitleBar
        currentVenue={race.venue}
        currentRaceNo={race.raceNo}
        manualStop={manualStop}
        onToggleManualStop={() => setManualStop(!manualStop)}
        onOpenSettings={() => setActiveModal('settings')}
        onOpenHelp={() => setActiveModal('help')}
        onExportCsv={handleExportCsv}
        onSelectPreset={handleSelectPreset}
        onOpenFetchRace={() => setActiveModal('fetchRace')}
        onOpenExeModal={() => setActiveModal('exe')}
        onOpenAutoVote={() => setActiveModal('autoVote')}
        isAutoVoteEnabled={autoVoteConfig.enabled}
        onOpenAIPrediction={handleRunAIPrediction}
        onOpenAutoPilot={() => setActiveModal('autoPilot')}
        isAutoPilotRunning={autoPilotConfig.enabled && autoPilotStage !== 'STOPPED' && autoPilotStage !== 'SAFETY_STOP'}
      />

      {/* 2. メニューバー */}
      <MenuBar
        onExportCsv={handleExportCsv}
        onClearHistory={() => setShowClearHistoryConfirm(true)}
        onRunPrediction={handleRunPrediction}
        onRunAIPrediction={handleRunAIPrediction}
        onSimulateOdds={handleSimulateOdds}
        onChangeAllocationMode={(mode: AllocationMode) => {
          setSettings((prev) => ({ ...prev, allocationMode: mode }));
          const alloc = allocateMoney(candidates, { ...settings, allocationMode: mode });
          setCandidates(alloc.updatedCandidates);
          setAllocationInfo(alloc);
        }}
        onOpenSettings={() => setActiveModal('settings')}
        onOpenHelp={() => setActiveModal('help')}
        onOpenHistory={() => setActiveModal('history')}
        onResetToDefaultRace={handleResetToDefaultRace}
        onOpenFetchRace={() => setActiveModal('fetchRace')}
        onAutoFetchResult={handleAutoFetchResult}
        onOpenExeModal={() => setActiveModal('exe')}
        onOpenAutoVote={() => setActiveModal('autoVote')}
        onImportRealData={handleImportRealData}
        onOpenAutoPilot={() => setActiveModal('autoPilot')}
        onToggleAutoPilot={handleToggleAutoPilot}
        isAutoPilotRunning={autoPilotConfig.enabled && autoPilotStage !== 'STOPPED' && autoPilotStage !== 'SAFETY_STOP'}
      />

      {/* 3. 状態アラートバナー (見送り / STOP / NG 時のトップ案内) */}
      {(judgment.isStopped || judgment.isSkipped || judgment.isNg) && (
        <div
          className={`px-4 py-1.5 flex items-center justify-between text-xs font-medium border-b select-none transition-colors ${
            judgment.isStopped
              ? 'bg-red-950/80 border-red-700 text-red-200'
              : judgment.isSkipped
              ? 'bg-amber-950/80 border-amber-700 text-amber-200'
              : 'bg-rose-950/80 border-rose-700 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
            <strong className="font-bold">{judgment.reasonTitle}:</strong>
            <span>{judgment.reasonDetail}</span>
          </div>

          <div className="flex items-center gap-2">
            {judgment.isStopped && (
              <button
                onClick={() => setManualStop(false)}
                className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] shadow-sm cursor-pointer"
              >
                STOP解除
              </button>
            )}
            <button
              onClick={() => setActiveModal('settings')}
              className="text-[11px] underline text-slate-300 hover:text-white"
            >
              閾値設定確認
            </button>
          </div>
        </div>
      )}

      {/* 4. メインコンテンツ領域（スクロール可能） */}
      <main className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        {/* 全自動運転 コックピットHUDバー */}
        <AutoPilotControlBar
          config={autoPilotConfig}
          stage={autoPilotStage}
          currentMessage={autoPilotMessage}
          countdownSeconds={autoPilotCountdown}
          autoSessionRaces={autoSessionRaces}
          autoSessionHits={autoSessionHits}
          autoSessionProfit={autoSessionProfit}
          onToggleAutoPilot={handleToggleAutoPilot}
          onOpenAutoPilotModal={() => setActiveModal('autoPilot')}
          onForceNextRace={handleForceNextRace}
          onToggleSound={() =>
            setAutoPilotConfig((prev) => ({ ...prev, soundAlert: !prev.soundAlert }))
          }
        />

        {/* エリア A & D: 開催・レース情報 & 気象条件 (本日開催場クイックバー & 正確な締切電光盤) */}
        <RaceHeaderSection
          race={race}
          onUpdateRace={handleUpdateRace}
          onUpdateWeather={handleUpdateWeather}
          onFetchRace={handleFetchRace}
          onOpenFetchRace={() => setActiveModal('fetchRace')}
          onAutoFetchResult={handleAutoFetchResult}
          isFetchingRace={isFetchingRace}
          isFetchingResult={isFetchingResult}
          windThreshold={settings.windSpeedThreshold}
          waveThreshold={settings.waveHeightThreshold}
        />

        {/* 確定結果速報カード (結果取得後に自動表示) */}
        {latestResultNotice && (
          <div
            className={`p-3 rounded-lg border flex flex-wrap items-center justify-between gap-3 shadow-lg select-none animate-in fade-in slide-in-from-top-2 ${
              latestResultNotice.isHit
                ? 'bg-gradient-to-r from-amber-950/90 via-yellow-950/60 to-slate-900 border-amber-500 text-yellow-100'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`px-3 py-1.5 rounded font-black text-sm flex items-center gap-1.5 shadow-sm ${
                  latestResultNotice.isHit
                    ? 'bg-amber-400 text-slate-950 animate-bounce'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>{latestResultNotice.isHit ? '★ レース的中！' : '不的中'}</span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs">
                    {latestResultNotice.venue} {latestResultNotice.raceTitle}
                  </span>
                  <span className="text-[11px] text-slate-300">確定着順:</span>
                  <span className="font-mono font-black text-amber-300 text-base tracking-wider">
                    {latestResultNotice.finishOrder}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({latestResultNotice.winningTechnique} / {latestResultNotice.popularityRank}番人気)
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                  3連単確定払戻:{' '}
                  <strong className="text-amber-300">
                    {latestResultNotice.officialPayout.toLocaleString()}円
                  </strong>
                  <span className="mx-2 text-slate-600">|</span>
                  投資:{' '}
                  <strong>{latestResultNotice.totalStake.toLocaleString()}円</strong> → 払戻:{' '}
                  <strong className="text-amber-300">
                    {latestResultNotice.totalReturn.toLocaleString()}円
                  </strong>
                  <span className="mx-2 text-slate-600">|</span>
                  純利益:{' '}
                  <span
                    className={`font-black ${
                      latestResultNotice.profit > 0
                        ? 'text-emerald-400'
                        : latestResultNotice.profit < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {latestResultNotice.profit > 0
                      ? `+${latestResultNotice.profit.toLocaleString()}`
                      : latestResultNotice.profit.toLocaleString()}
                    円
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleNextRace}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs shadow-md flex items-center gap-1 cursor-pointer transition-colors"
                title="次のレースの番組表を取得して自動予想"
              >
                <span>次のレースへ進む</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setLatestResultNotice(null)}
                className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
                title="通知を閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 2カラムレイアウト: 左 艇データ(エリアB) / 右 状態スタンプ(エリアE) & 配分設定 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
          {/* 左カラム: 出走表 1〜6号艇データ */}
          <div className="lg:col-span-8">
            <BoatTable
              boats={race.boats}
              scoredBoats={scoredBoats}
              onUpdateBoat={handleUpdateBoat}
              onQuickSimulateExhibition={handleQuickSimulateExhibition}
            />
          </div>

          {/* 右カラム: 状態スタンプ(付録C) & 資金配分設定パネル */}
          <div className="lg:col-span-4 flex flex-col gap-2.5">
            {/* エリア E: 状態画像・スタンプ表示 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 flex items-center justify-around select-none">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block">システム判定状態</span>
                <span className="font-bold text-slate-200 text-xs">{judgment.reasonTitle}</span>
              </div>
              <StatusStamp
                status={judgment.status}
                size="md"
                reason={judgment.reasonDetail}
                showTextLabel={false}
              />
            </div>

            {/* 資金配分設定パネル */}
            <AllocationPanel
              settings={settings}
              onUpdateSettings={(updated) => {
                const next = { ...settings, ...updated };
                setSettings(next);
                if (candidates.length > 0) {
                  const alloc = allocateMoney(candidates, next);
                  setCandidates(alloc.updatedCandidates);
                  setAllocationInfo(alloc);
                }
              }}
              onRunAllocation={handleCalculateAllocation}
              warningMessage={allocationInfo.warningMessage}
              isOverBudget={allocationInfo.isOverBudget}
            />
          </div>
        </div>

        {/* エリア C: 可変券種・可変点数対応 予想候補 & 資金配分テーブル */}
        <PredictionSection
          candidates={candidates}
          currentBetType={selectedBetType}
          pointCount={selectedPointCount}
          onChangeBetType={handleChangeBetType}
          onChangePointCount={handleChangePointCount}
          onUpdateOdds={handleUpdateOdds}
          onRunPrediction={handleRunPrediction}
          onRunAIPrediction={handleRunAIPrediction}
          isAILoading={isAILoading}
          onSimulateOdds={handleSimulateOdds}
          onCalculateAllocation={handleCalculateAllocation}
          onOpenResultModal={() => setActiveModal('result')}
          onAutoFetchResult={handleAutoFetchResult}
          onOpenAutoVote={() => setActiveModal('autoVote')}
          isAutoVoteEnabled={autoVoteConfig.enabled}
          isSkipped={judgment.isSkipped}
          isStopped={judgment.isStopped}
          minOdds={settings.minOdds}
          maxOdds={settings.maxOdds}
        />
      </main>

      {/* 5. エリア F: 収支・統計管理バー (固定フッター & 全国24場別収支 & 10走推移グラフ) */}
      <footer className="p-2 border-t border-slate-800 bg-slate-950">
        <StatisticsBar
          stats={stats}
          venueStats={venueStats}
          history={history}
          dailyProfitTarget={settings.dailyProfitTarget}
          dailyLossLimit={settings.dailyLossLimit}
          onOpenHistory={() => setActiveModal('history')}
          onClearHistory={() => setShowClearHistoryConfirm(true)}
          onImportRealData={handleImportRealData}
          selectedVenueFilter={selectedVenueFilter}
          onSelectVenueFilter={setSelectedVenueFilter}
        />
      </footer>

      {/* モーダル群 */}
      {activeModal === 'result' && (
        <ResultModal
          race={race}
          candidates={candidates}
          onConfirmResult={handleConfirmResult}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'history' && (
        <HistoryModal
          history={history}
          onExportCsv={handleExportCsv}
          onClearHistory={handleClearHistory}
          onDeleteRecord={handleDeleteRecord}
          onImportRealData={handleImportRealData}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          settings={settings}
          onSaveSettings={(newSettings) => {
            setSettings(newSettings);
            const alloc = allocateMoney(candidates, newSettings);
            setCandidates(alloc.updatedCandidates);
            setAllocationInfo(alloc);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'help' && (
        <HelpModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'fetchRace' && (
        <FetchRaceModal
          currentDate={race.date}
          currentVenue={race.venue}
          currentRaceNo={race.raceNo}
          onRaceFetched={handleRaceFetched}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'exe' && (
        <ExeDistributionModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'autoVote' && (
        <AutoVoteModal
          race={race}
          candidates={candidates}
          config={autoVoteConfig}
          onUpdateConfig={setAutoVoteConfig}
          onExecuteVote={handleExecuteVote}
          isVoting={isVoting}
          voteLogs={voteLogs}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'aiPrediction' && (
        <AIPredictionModal
          race={race}
          aiResult={aiPredictionResult}
          isLoading={isAILoading}
          onApplyAICandidates={handleApplyAICandidates}
          onReGenerate={handleRunAIPrediction}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'autoPilot' && (
        <AutoPilotModal
          config={autoPilotConfig}
          stage={autoPilotStage}
          logs={autoPilotLogs}
          onUpdateConfig={(updated) => setAutoPilotConfig((prev) => ({ ...prev, ...updated }))}
          onToggleAutoPilot={handleToggleAutoPilot}
          onClearLogs={() => setAutoPilotLogs([])}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}
