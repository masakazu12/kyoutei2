import { DayStatistics, RaceHistoryRecord } from '../types/kyotei';

/**
 * 10. 統計管理サービス
 * 収支・的中率・回収率の集計ロジック
 */

export function calculateStatistics(history: RaceHistoryRecord[]): DayStatistics {
  if (!history || history.length === 0) {
    return {
      totalStake: 0,
      totalReturn: 0,
      netProfit: 0,
      hitCount: 0,
      betCount: 0,
      skipCount: 0,
      totalRaces: 0,
      hitRate: 0,
      recoveryRate: 0,
      skipRate: 0,
    };
  }

  let totalStake = 0;
  let totalReturn = 0;
  let hitCount = 0;
  let betCount = 0;
  let skipCount = 0;

  history.forEach(item => {
    if (item.status === 'Skip') {
      skipCount++;
    }

    if (item.totalStake > 0) {
      betCount++;
      totalStake += item.totalStake;
      totalReturn += item.totalReturn;
      if (item.isHit) {
        hitCount++;
      }
    }
  });

  const netProfit = totalReturn - totalStake;
  const hitRate = betCount > 0 ? Number(((hitCount / betCount) * 100).toFixed(1)) : 0;
  const recoveryRate = totalStake > 0 ? Number(((totalReturn / totalStake) * 100).toFixed(1)) : 0;
  const skipRate = history.length > 0 ? Number(((skipCount / history.length) * 100).toFixed(1)) : 0;

  return {
    totalStake,
    totalReturn,
    netProfit,
    hitCount,
    betCount,
    skipCount,
    totalRaces: history.length,
    hitRate,
    recoveryRate,
    skipRate,
  };
}
