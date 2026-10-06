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

import {
  RaceInfo,
  BoatData,
  WeatherCondition,
  BetCandidate,
  AppSettings,
  RaceHistoryRecord,
  AllocationMode,
  AppStatus,
} from './types/kyotei';
import { DEFAULT_SETTINGS, VENUES } from './constants/venues';
import { PRESET_RACES } from './data/presetRaces';
import {
  calculateBoatScores,
  generateFivePointBets,
  simulateRealisticOdds,
} from './services/predictionEngine';
import { allocateMoney, AllocationResult } from './services/moneyAllocator';
import { evaluateRaceStatus, JudgmentResult } from './services/judgmentEngine';
import { calculateStatistics } from './services/statisticsService';
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

  // 2. 履歴の永続化ステート（初回のみサンプル投入、一度クリアされたら[]を保持）
  const [history, setHistory] = useState<RaceHistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem('kyotei_analyzer_history_v1');
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('History load error:', e);
    }
    // 初回起動時のサンプル履歴データ
    const initialSample: RaceHistoryRecord[] = [
      {
        id: 'sample-4',
        timestamp: '2026/10/06 18:30:00',
        date: '2026-10-06',
        venue: '大村',
        raceNo: 10,
        raceTitle: '第10R 発祥地特賞',
        status: 'Teki2',
        bets: [
          { combination: '1-2-3', odds: 6.8, stake: 500, expectedReturn: 3400, isHit: true },
          { combination: '1-2-4', odds: 11.2, stake: 400, expectedReturn: 4480, isHit: false },
          { combination: '1-3-2', odds: 14.5, stake: 300, expectedReturn: 4350, isHit: false },
          { combination: '1-3-4', odds: 21.0, stake: 200, expectedReturn: 4200, isHit: false },
          { combination: '2-1-3', odds: 28.5, stake: 200, expectedReturn: 5700, isHit: false },
        ],
        totalStake: 1600,
        finishOrder: '1-2-3',
        officialPayout: 680,
        totalReturn: 3400,
        profit: 1800,
        isHit: true,
      },
      {
        id: 'sample-3',
        timestamp: '2026/10/06 17:15:00',
        date: '2026-10-06',
        venue: '住之江',
        raceNo: 9,
        raceTitle: '第9R 予選特選',
        status: 'Teki2',
        bets: [
          { combination: '1-2-3', odds: 5.2, stake: 600, expectedReturn: 3120, isHit: false },
          { combination: '1-2-4', odds: 8.4, stake: 400, expectedReturn: 3360, isHit: true },
          { combination: '1-3-2', odds: 12.0, stake: 300, expectedReturn: 3600, isHit: false },
          { combination: '1-3-4', odds: 18.5, stake: 200, expectedReturn: 3700, isHit: false },
          { combination: '2-1-3', odds: 24.0, stake: 200, expectedReturn: 4800, isHit: false },
        ],
        totalStake: 1700,
        finishOrder: '1-2-4',
        officialPayout: 840,
        totalReturn: 3360,
        profit: 1660,
        isHit: true,
      },
      {
        id: 'sample-2',
        timestamp: '2026/10/06 16:00:00',
        date: '2026-10-06',
        venue: '平和島',
        raceNo: 8,
        raceTitle: '第8R 予選',
        status: 'Hazure',
        bets: [
          { combination: '1-2-3', odds: 7.5, stake: 500, expectedReturn: 3750, isHit: false },
          { combination: '1-2-4', odds: 10.8, stake: 400, expectedReturn: 4320, isHit: false },
          { combination: '1-3-2', odds: 13.2, stake: 300, expectedReturn: 3960, isHit: false },
          { combination: '1-3-4', odds: 19.5, stake: 200, expectedReturn: 3900, isHit: false },
          { combination: '2-1-3', odds: 26.0, stake: 200, expectedReturn: 5200, isHit: false },
        ],
        totalStake: 1600,
        finishOrder: '3-1-4',
        officialPayout: 4520,
        totalReturn: 0,
        profit: -1600,
        isHit: false,
      },
      {
        id: 'sample-1',
        timestamp: '2026/10/06 14:45:00',
        date: '2026-10-06',
        venue: '桐生',
        raceNo: 6,
        raceTitle: '第6R 昼特選',
        status: 'Teki2',
        bets: [
          { combination: '1-2-3', odds: 6.2, stake: 500, expectedReturn: 3100, isHit: true },
          { combination: '1-2-4', odds: 9.8, stake: 400, expectedReturn: 3920, isHit: false },
          { combination: '1-3-2', odds: 11.5, stake: 300, expectedReturn: 3450, isHit: false },
          { combination: '1-3-4', odds: 17.0, stake: 200, expectedReturn: 3400, isHit: false },
          { combination: '2-1-3', odds: 22.5, stake: 200, expectedReturn: 4500, isHit: false },
        ],
        totalStake: 1600,
        finishOrder: '1-2-3',
        officialPayout: 620,
        totalReturn: 3100,
        profit: 1500,
        isHit: true,
      },
    ];
    try {
      localStorage.setItem('kyotei_analyzer_history_v1', JSON.stringify(initialSample));
    } catch (e) {}
    return initialSample;
  });

  // 3. 現在のレースデータ
  const [race, setRace] = useState<RaceInfo>(() => PRESET_RACES[0]);

  // 4. 手動STOPフラグ
  const [manualStop, setManualStop] = useState<boolean>(false);

  // 5. 買い目候補とオッズ
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

  // 8. モーダル表示管理
  const [activeModal, setActiveModal] = useState<
    'result' | 'history' | 'settings' | 'help' | 'fetchRace' | 'exe' | null
  >(null);

  // 設定変更時の永続化
  useEffect(() => {
    try {
      localStorage.setItem('kyotei_analyzer_settings_v1', JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  }, [settings]);

  // 履歴更新時の永続化
  useEffect(() => {
    try {
      localStorage.setItem('kyotei_analyzer_history_v1', JSON.stringify(history));
    } catch (e) {
      console.error(e);
    }
  }, [history]);

  // 統計集計
  const stats = useMemo(() => calculateStatistics(history), [history]);

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

  // 予想実行処理 (F03)
  const handleRunPrediction = useCallback(() => {
    setLastFinishedStatus(null);
    // スコア済み艇から本命5点を生成
    const existingOddsMap: Record<string, number> = {};
    candidates.forEach((c) => {
      if (c.odds > 0) existingOddsMap[c.combination] = c.odds;
    });

    const generated = generateFivePointBets(scoredBoats, existingOddsMap);

    // オッズが未設定の場合はリアルなオッズを初期生成
    const oddsMap = simulateRealisticOdds(generated);
    generated.forEach((c) => {
      if (!c.odds || c.odds <= 0) {
        c.odds = oddsMap[c.combination] || 5.0;
      }
    });

    // 直ちに資金配分も初期実行
    const alloc = allocateMoney(generated, settings);
    setCandidates(alloc.updatedCandidates);
    setAllocationInfo(alloc);
  }, [scoredBoats, candidates, settings]);

  // 初回マウント時に自動予想生成
  useEffect(() => {
    if (candidates.length === 0 && scoredBoats.length > 0) {
      handleRunPrediction();
    }
  }, []); // Run once on startup

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
        // オッズ変更に伴い配分も再計算
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
    const simMap = simulateRealisticOdds(candidates);
    setCandidates((prev) => {
      const next = prev.map((c) => ({
        ...c,
        odds: simMap[c.combination] || c.odds,
      }));
      const alloc = allocateMoney(next, settings);
      setAllocationInfo(alloc);
      return alloc.updatedCandidates;
    });
  }, [candidates, settings]);

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
      bets: candidates.map((c) => ({
        combination: c.combination,
        odds: c.odds,
        stake: c.stake,
        expectedReturn: c.expectedReturn,
        isHit: c.combination === resultData.finishOrder,
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
      const generated = generateFivePointBets(newScored);
      const oddsMap = simulateRealisticOdds(generated);
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
        const generated = generateFivePointBets(newScored);
        const oddsMap = simulateRealisticOdds(generated);
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
    [race.date, settings, showToast]
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
      localStorage.setItem('kyotei_analyzer_history_v1', JSON.stringify([]));
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

  // レース確定結果の自動取得 (F08 + 自動データ取得)
  const handleAutoFetchResult = async () => {
    setIsFetchingResult(true);
    try {
      // 予想買い目が未生成の場合は自動実行
      let currentCandidates = candidates;
      if (currentCandidates.length === 0) {
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
        (c) => c.combination === res.finishOrder && c.stake > 0
      );
      const isHit = !!matchedCandidate;
      const totalReturn = isHit && matchedCandidate
        ? Math.floor((matchedCandidate.stake * res.officialPayout) / 100)
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
        bets: currentCandidates.map((c) => ({
          combination: c.combination,
          odds: c.odds,
          stake: c.stake,
          expectedReturn: c.expectedReturn,
          isHit: c.combination === res.finishOrder,
        })),
        totalStake,
        finishOrder: res.finishOrder,
        officialPayout: res.officialPayout,
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
      />

      {/* 2. メニューバー */}
      <MenuBar
        onExportCsv={handleExportCsv}
        onClearHistory={() => setShowClearHistoryConfirm(true)}
        onRunPrediction={handleRunPrediction}
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

        {/* エリア C: 本命5点型 3連単 予想候補 & 資金配分テーブル */}
        <PredictionSection
          candidates={candidates}
          onUpdateOdds={handleUpdateOdds}
          onRunPrediction={handleRunPrediction}
          onSimulateOdds={handleSimulateOdds}
          onCalculateAllocation={handleCalculateAllocation}
          onOpenResultModal={() => setActiveModal('result')}
          onAutoFetchResult={handleAutoFetchResult}
          isSkipped={judgment.isSkipped}
          isStopped={judgment.isStopped}
          minOdds={settings.minOdds}
          maxOdds={settings.maxOdds}
        />
      </main>

      {/* 5. エリア F: 収支・統計管理バー (固定フッター & 10走推移グラフ & 全消去ショートカット) */}
      <footer className="p-2 border-t border-slate-800 bg-slate-950">
        <StatisticsBar
          stats={stats}
          history={history}
          dailyProfitTarget={settings.dailyProfitTarget}
          dailyLossLimit={settings.dailyLossLimit}
          onOpenHistory={() => setActiveModal('history')}
          onClearHistory={() => setShowClearHistoryConfirm(true)}
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
    </div>
  );
}
