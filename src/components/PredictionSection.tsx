import React from 'react';
import { BetCandidate } from '../types/kyotei';
import { BOAT_COLORS } from '../constants/venues';
import { Play, Calculator, RefreshCw, CheckCircle, TrendingUp, AlertCircle, Zap } from 'lucide-react';

interface PredictionSectionProps {
  candidates: BetCandidate[];
  onUpdateOdds: (combination: string, odds: number) => void;
  onRunPrediction: () => void;
  onSimulateOdds: () => void;
  onCalculateAllocation: () => void;
  onOpenResultModal: () => void;
  onAutoFetchResult?: () => void;
  isSkipped: boolean;
  isStopped: boolean;
  minOdds: number;
  maxOdds: number;
}

export const PredictionSection: React.FC<PredictionSectionProps> = ({
  candidates,
  onUpdateOdds,
  onRunPrediction,
  onSimulateOdds,
  onCalculateAllocation,
  onOpenResultModal,
  onAutoFetchResult,
  isSkipped,
  isStopped,
  minOdds,
  maxOdds,
}) => {
  const renderBoatBadge = (num: number) => {
    const color = BOAT_COLORS[num] || BOAT_COLORS[1];
    return (
      <span
        key={num}
        className={`inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-black border shadow-xs ${color.bg} ${color.text} ${color.border}`}
      >
        {num}
      </span>
    );
  };

  const totalStake = candidates.reduce((sum, c) => sum + (c.stake || 0), 0);
  const hasBets = candidates.length > 0;
  const hasAllocations = candidates.some((c) => c.stake > 0);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded p-3 select-none">
      {/* セクション見出し & コマンドボタン群 */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-100 text-xs">本命5点型 3連単 予想候補 & 資金配分</span>
          <span className="text-[11px] text-slate-400">
            （軸艇＋有力艇流し＋逆転1点、最大5点絞り込み）
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onRunPrediction}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs shadow transition-colors cursor-pointer"
            title="出走表から本命5点を生成"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>5点予想実行</span>
          </button>

          <button
            onClick={onSimulateOdds}
            disabled={!hasBets}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-medium text-xs transition-colors disabled:opacity-40 cursor-pointer"
            title="リアルなオッズを自動設定"
          >
            <RefreshCw className="w-3 h-3 text-cyan-400" />
            <span>オッズ生成</span>
          </button>

          <button
            onClick={onCalculateAllocation}
            disabled={!hasBets || isStopped}
            className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs shadow transition-colors disabled:opacity-40 cursor-pointer"
            title="設定された方式に基づき資金を配分"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>配分計算</span>
          </button>

          {/* 結果自動取得ボタン */}
          {onAutoFetchResult && (
            <button
              onClick={onAutoFetchResult}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded font-black text-xs shadow transition-colors cursor-pointer"
              title="公式レース確定結果（確定着順・払戻金・決まり手）を自動取得して的中判定（未配分の場合は自動配分されます）"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>結果自動取得</span>
            </button>
          )}

          <button
            onClick={onOpenResultModal}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-bold text-xs transition-colors cursor-pointer"
            title="確定着順と払戻金を手動入力して的中判定"
          >
            <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>手動確定</span>
          </button>
        </div>
      </div>

      {/* 買い目テーブル */}
      {candidates.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded bg-slate-950/40">
          「5点予想実行」ボタンを押すと、艇評価指数に基づく本命5点の買い目とオッズが生成されます。
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px]">
                <th className="py-1 px-2 w-12 text-center">順位</th>
                <th className="py-1 px-3">3連単 買い目</th>
                <th className="py-1 px-2 text-right">評価スコア</th>
                <th className="py-1 px-2 text-right">予測確率</th>
                <th className="py-1 px-3 text-right">オッズ(倍)</th>
                <th className="py-1 px-3 text-right bg-emerald-950/20 text-emerald-300">推奨金額</th>
                <th className="py-1 px-3 text-right">想定払戻額</th>
                <th className="py-1 px-2 text-right">期待値(EV)</th>
                <th className="py-1 px-2 text-center w-20">判定</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {candidates.map((c) => {
                const isOddsLow = c.odds > 0 && c.odds < minOdds;
                const isOddsHigh = c.odds > maxOdds;

                return (
                  <tr
                    key={c.combination}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      c.stake > 0 ? 'bg-emerald-950/10' : ''
                    }`}
                  >
                    {/* 順位 */}
                    <td className="py-1.5 px-2 text-center">
                      <span className="font-bold text-slate-300">#{c.rank}</span>
                    </td>

                    {/* 買い目（3連単） */}
                    <td className="py-1.5 px-3 font-sans">
                      <div className="flex items-center gap-1">
                        {renderBoatBadge(c.first)}
                        <span className="text-slate-500 font-bold">-</span>
                        {renderBoatBadge(c.second)}
                        <span className="text-slate-500 font-bold">-</span>
                        {renderBoatBadge(c.third)}
                        <span className="ml-2 font-mono text-xs font-bold text-slate-200">
                          {c.combination}
                        </span>
                        {c.rank === 5 && (
                          <span className="text-[10px] text-amber-400 font-sans ml-1">
                            (逆転候補)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 評価スコア */}
                    <td className="py-1.5 px-2 text-right text-slate-300 tabular-nums">
                      {c.score}
                    </td>

                    {/* 予測確率 */}
                    <td className="py-1.5 px-2 text-right text-slate-200 font-bold tabular-nums">
                      {c.relativeProb}%
                    </td>

                    {/* オッズ入力 (手入力 & ステッパー) */}
                    <td className="py-1.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onUpdateOdds(c.combination, Math.max(Number((c.odds - 0.5).toFixed(1)), 1.0))}
                          className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center font-mono"
                          title="-0.5倍"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step="0.1"
                          min="1.0"
                          max="999.9"
                          value={c.odds}
                          onChange={(e) => onUpdateOdds(c.combination, parseFloat(e.target.value) || 0)}
                          className={`w-14 bg-slate-950 border text-right rounded px-1 py-0.5 text-xs font-bold tabular-nums focus:outline-none focus:border-blue-500 ${
                            isOddsLow ? 'border-amber-500 text-amber-300' : 'border-slate-700 text-yellow-400'
                          }`}
                        />
                        <button
                          onClick={() => onUpdateOdds(c.combination, Number((c.odds + 0.5).toFixed(1)))}
                          className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center font-mono"
                          title="+0.5倍"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* 推奨購入金額 */}
                    <td className="py-1.5 px-3 text-right bg-emerald-950/20 font-bold text-emerald-300 tabular-nums text-sm">
                      {c.stake > 0 ? `${c.stake.toLocaleString()}円` : '-'}
                    </td>

                    {/* 想定払戻額 */}
                    <td className="py-1.5 px-3 text-right text-slate-200 tabular-nums font-semibold">
                      {c.expectedReturn > 0 ? `${c.expectedReturn.toLocaleString()}円` : '-'}
                    </td>

                    {/* 期待値 */}
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      <span
                        className={`font-bold ${
                          c.expectedValue >= 1.0 ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {c.expectedValue > 0 ? c.expectedValue.toFixed(2) : '-'}
                      </span>
                    </td>

                    {/* 判定備考 */}
                    <td className="py-1.5 px-2 text-center text-[10px]">
                      {isOddsLow ? (
                        <span className="text-amber-400">低オッズ</span>
                      ) : isOddsHigh ? (
                        <span className="text-rose-400">高オッズ除外</span>
                      ) : c.stake > 0 ? (
                        <span className="text-emerald-400 font-bold">購入対象</span>
                      ) : (
                        <span className="text-slate-500">配分待機</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-950 text-slate-200 border-t border-slate-700 font-bold text-xs">
                <td colSpan={5} className="py-2 px-3 text-right">
                  合計購入予定額:
                </td>
                <td className="py-2 px-3 text-right text-emerald-400 font-black font-mono text-sm">
                  {totalStake.toLocaleString()} 円
                </td>
                <td colSpan={3} className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                  {candidates.length}点登録中
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
