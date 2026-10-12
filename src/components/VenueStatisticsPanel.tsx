import React, { useState, useMemo } from 'react';
import { VenueStatistics } from '../types/kyotei';
import {
  Trophy,
  TrendingUp,
  Percent,
  DollarSign,
  ArrowUpDown,
  Building2,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Award,
} from 'lucide-react';

interface VenueStatisticsPanelProps {
  venueStats: VenueStatistics[];
  selectedVenueFilter?: string | null;
  onSelectVenueFilter?: (venue: string | null) => void;
  onImportRealData?: () => void;
}

type SortField = 'recoveryRate' | 'netProfit' | 'hitRate' | 'totalRaces';

export const VenueStatisticsPanel: React.FC<VenueStatisticsPanelProps> = ({
  venueStats,
  selectedVenueFilter = null,
  onSelectVenueFilter,
  onImportRealData,
}) => {
  const [sortField, setSortField] = useState<SortField>('recoveryRate');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const sortedStats = useMemo(() => {
    return [...venueStats].sort((a, b) => {
      let diff = 0;
      if (sortField === 'recoveryRate') diff = b.recoveryRate - a.recoveryRate;
      else if (sortField === 'netProfit') diff = b.netProfit - a.netProfit;
      else if (sortField === 'hitRate') diff = b.hitRate - a.hitRate;
      else if (sortField === 'totalRaces') diff = b.totalRaces - a.totalRaces;
      return sortAsc ? -diff : diff;
    });
  }, [venueStats, sortField, sortAsc]);

  // 主要サマリー指標
  const topRoiVenue = useMemo(() => {
    const withBets = venueStats.filter((v) => v.betRaces > 0);
    if (withBets.length === 0) return null;
    return [...withBets].sort((a, b) => b.recoveryRate - a.recoveryRate)[0];
  }, [venueStats]);

  const topProfitVenue = useMemo(() => {
    const withBets = venueStats.filter((v) => v.betRaces > 0);
    if (withBets.length === 0) return null;
    return [...withBets].sort((a, b) => b.netProfit - a.netProfit)[0];
  }, [venueStats]);

  const topHitVenue = useMemo(() => {
    const withBets = venueStats.filter((v) => v.betRaces > 0);
    if (withBets.length === 0) return null;
    return [...withBets].sort((a, b) => b.hitRate - a.hitRate)[0];
  }, [venueStats]);

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs select-none shadow-md space-y-3">
      {/* 1. ヘッダー & トップ会場ハイライトカード */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-cyan-400" />
          <h4 className="font-bold text-slate-100 text-sm">
            全国24場別 収支・的中率・回収率 分析
          </h4>
          <span className="text-[11px] text-slate-400">
            （集計対象: {venueStats.length} 開催場）
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedVenueFilter && onSelectVenueFilter && (
            <button
              onClick={() => onSelectVenueFilter(null)}
              className="flex items-center gap-1 px-2 py-1 bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-600 rounded text-[11px] font-bold cursor-pointer"
            >
              <span>絞り込み解除: {selectedVenueFilter}</span>
              <span className="text-blue-300">✕</span>
            </button>
          )}

          {onImportRealData && (
            <button
              onClick={onImportRealData}
              className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded shadow-sm cursor-pointer transition-colors"
              title="全国24場の公式過去レース確定実データを一括インポートして会場別統計を拡充"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>公式確定実データインポート</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. 最優秀会場ハイライトバッジ */}
      {venueStats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* 回収率トップ */}
          <div className="bg-slate-900/80 border border-slate-800 rounded p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">回収率 No.1 会場</div>
                <div className="font-bold text-slate-200 text-xs">
                  {topRoiVenue ? topRoiVenue.venueName : '---'}
                </div>
              </div>
            </div>
            <div className="text-right font-mono">
              <div className="text-emerald-400 font-black text-sm">
                {topRoiVenue ? `${topRoiVenue.recoveryRate}%` : '---'}
              </div>
              <div className="text-[10px] text-slate-500">
                {topRoiVenue ? `(損益 +${topRoiVenue.netProfit.toLocaleString()}円)` : ''}
              </div>
            </div>
          </div>

          {/* 純利益トップ */}
          <div className="bg-slate-900/80 border border-slate-800 rounded p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">最高純利益 会場</div>
                <div className="font-bold text-slate-200 text-xs">
                  {topProfitVenue ? topProfitVenue.venueName : '---'}
                </div>
              </div>
            </div>
            <div className="text-right font-mono">
              <div
                className={`font-black text-sm ${
                  topProfitVenue && topProfitVenue.netProfit > 0
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                {topProfitVenue
                  ? `${topProfitVenue.netProfit > 0 ? '+' : ''}${topProfitVenue.netProfit.toLocaleString()}円`
                  : '---'}
              </div>
              <div className="text-[10px] text-slate-500">
                {topProfitVenue ? `(${topProfitVenue.betRaces}戦 ${topProfitVenue.hitCount}勝)` : ''}
              </div>
            </div>
          </div>

          {/* 的中率トップ */}
          <div className="bg-slate-900/80 border border-slate-800 rounded p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">的中率 No.1 会場</div>
                <div className="font-bold text-slate-200 text-xs">
                  {topHitVenue ? topHitVenue.venueName : '---'}
                </div>
              </div>
            </div>
            <div className="text-right font-mono">
              <div className="text-cyan-400 font-black text-sm">
                {topHitVenue ? `${topHitVenue.hitRate}%` : '---'}
              </div>
              <div className="text-[10px] text-slate-500">
                {topHitVenue ? `(${topHitVenue.hitCount}/${topHitVenue.betRaces} 的中)` : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. 会場別マトリクステーブル */}
      {sortedStats.length === 0 ? (
        <div className="py-8 text-center text-slate-400 space-y-2 border border-dashed border-slate-800 rounded">
          <Building2 className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-xs">会場別集計データがありません</p>
          {onImportRealData && (
            <button
              onClick={onImportRealData}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs cursor-pointer"
            >
              実データパックを読み込む
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-semibold text-[11px]">
              <tr>
                <th className="py-2 px-3">開催場名</th>
                <th className="py-2 px-2">地区</th>
                <th
                  onClick={() => handleToggleSort('totalRaces')}
                  className="py-2 px-2 cursor-pointer hover:text-slate-200 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>レース数</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleSort('hitRate')}
                  className="py-2 px-3 cursor-pointer hover:text-slate-200 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>的中数 / 的中率</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2 px-3 text-right">総投資額</th>
                <th className="py-2 px-3 text-right">総払戻額</th>
                <th
                  onClick={() => handleToggleSort('netProfit')}
                  className="py-2 px-3 cursor-pointer hover:text-slate-200 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>純利益 (損益)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleSort('recoveryRate')}
                  className="py-2 px-3 cursor-pointer hover:text-slate-200 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>回収率</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2 px-3 text-right">最高払戻</th>
                <th className="py-2 px-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-950 font-mono text-xs">
              {sortedStats.map((item) => {
                const isSelected = selectedVenueFilter === item.venueName;
                const isProfit = item.netProfit > 0;
                const isLoss = item.netProfit < 0;

                return (
                  <tr
                    key={item.venueName}
                    className={`hover:bg-slate-900/60 transition-colors ${
                      isSelected ? 'bg-blue-950/40 ring-1 ring-blue-500/50' : ''
                    }`}
                  >
                    {/* 開催場名 */}
                    <td className="py-2 px-3 font-sans font-bold text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                      <span>{item.venueName}</span>
                    </td>

                    {/* 地区 */}
                    <td className="py-2 px-2 font-sans text-slate-400 text-[11px]">
                      {item.region}
                    </td>

                    {/* レース数 */}
                    <td className="py-2 px-2 text-right text-slate-300">
                      {item.totalRaces}
                      <span className="text-[10px] text-slate-500 font-sans ml-0.5">R</span>
                    </td>

                    {/* 的中率 */}
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-baseline justify-end gap-1.5">
                        <span
                          className={`font-bold ${
                            item.hitRate >= 50
                              ? 'text-cyan-400'
                              : item.hitRate > 0
                              ? 'text-slate-200'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.hitRate}%
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ({item.hitCount}/{item.betRaces})
                        </span>
                      </div>
                    </td>

                    {/* 総投資額 */}
                    <td className="py-2 px-3 text-right text-slate-300">
                      {item.totalStake.toLocaleString()}円
                    </td>

                    {/* 総払戻額 */}
                    <td className="py-2 px-3 text-right text-amber-300 font-bold">
                      {item.totalReturn.toLocaleString()}円
                    </td>

                    {/* 損益 */}
                    <td className="py-2 px-3 text-right font-black">
                      <span
                        className={`${
                          isProfit
                            ? 'text-emerald-400'
                            : isLoss
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {isProfit ? `+${item.netProfit.toLocaleString()}` : item.netProfit.toLocaleString()}円
                      </span>
                    </td>

                    {/* 回収率 */}
                    <td className="py-2 px-3 text-right">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded font-black text-xs ${
                          item.recoveryRate >= 120
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                            : item.recoveryRate >= 100
                            ? 'bg-emerald-900/50 text-emerald-400'
                            : item.recoveryRate >= 75
                            ? 'bg-yellow-950 text-yellow-300 border border-yellow-700'
                            : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {item.recoveryRate}%
                      </span>
                    </td>

                    {/* 最高払戻 */}
                    <td className="py-2 px-3 text-right text-slate-400 text-[11px]">
                      {item.maxPayout > 0 ? `${item.maxPayout.toLocaleString()}円` : '-'}
                    </td>

                    {/* 操作 */}
                    <td className="py-2 px-2 text-center">
                      {onSelectVenueFilter && (
                        <button
                          onClick={() =>
                            onSelectVenueFilter(isSelected ? null : item.venueName)
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isSelected ? '選択中' : '抽出'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
