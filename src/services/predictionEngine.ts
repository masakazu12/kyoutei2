import { AppSettings, BetCandidate, BoatData, ScoredBoat } from '../types/kyotei';

/**
 * 7. 本命5点型予想エンジン
 * 仕様書に完全準拠したスコアリングおよび買い目生成ロジック
 */

export function calculateBoatScores(boats: BoatData[], settings: AppSettings): ScoredBoat[] {
  if (!boats || boats.length === 0) return [];

  // 展示タイムの平均と差分を計算（展示タイムが速い＝数値が小さいほど高評価）
  const validExhibitionTimes = boats.filter(b => b.exhibitionTime > 5.0 && b.exhibitionTime < 8.0);
  const avgExhibition = validExhibitionTimes.length > 0
    ? validExhibitionTimes.reduce((acc, b) => acc + b.exhibitionTime, 0) / validExhibitionTimes.length
    : 6.75;

  const scored: ScoredBoat[] = boats.map((b) => {
    // 1. 勝率補正 (全国勝率 × winRateWeight)
    const winRatePt = (b.winRate || 0) * settings.winRateWeight;

    // 2. 2連対率補正 (2連対率 × secondRateWeight)
    const secondRatePt = (b.secondRate || 0) * settings.secondRateWeight;

    // 3. モーター2連対率補正 (モーター2連対率 × motorWeight)
    const motorPt = (b.motorSecondRate || 0) * settings.motorWeight;

    // 4. 展示タイム補正 (基準タイムからの速さに応じて加減点)
    // 0.01秒速いごとに settings.exhibitionWeight pt加算
    let exhibitionPt = 0;
    if (b.exhibitionTime > 5.0 && b.exhibitionTime < 8.0) {
      const diff = avgExhibition - b.exhibitionTime;
      exhibitionPt = Math.round(diff * 100 * (settings.exhibitionWeight / 10));
    }

    // 5. コース補正 (1コース〜6コース)
    const courseIndex = Math.min(Math.max((b.course || b.boatNumber) - 1, 0), 5);
    const coursePt = settings.courseWeights[courseIndex] ?? 0;

    // トータルスコア
    const rawScore = Math.max(Math.round(winRatePt + secondRatePt + motorPt + exhibitionPt + coursePt), 10);

    return {
      ...b,
      rawScore,
      rank: 1, // 後でソートして設定
    };
  });

  // スコア降順にソートして順位付け
  scored.sort((a, b) => b.rawScore - a.rawScore);
  scored.forEach((boat, index) => {
    boat.rank = index + 1;
  });

  return scored;
}

/**
 * 7.4 買い目生成ルール
 * - 評価1位艇を1着軸の基本候補とする
 * - 評価2〜4位艇を2着・3着候補として組み合わせる
 * - 2位艇を1着に置く逆転候補を最大1点含めることができる
 * - 重複禁止、最大5点
 */
export function generateFivePointBets(
  scoredBoats: ScoredBoat[],
  defaultOddsMap: Record<string, number> = {}
): BetCandidate[] {
  if (scoredBoats.length < 3) return [];

  // スコア順の艇を取得
  const rank1 = scoredBoats[0].boatNumber;
  const rank2 = scoredBoats[1]?.boatNumber ?? 2;
  const rank3 = scoredBoats[2]?.boatNumber ?? 3;
  const rank4 = scoredBoats[3]?.boatNumber ?? 4;

  const rawCombos: { first: number; second: number; third: number; isReversal?: boolean }[] = [
    // 1. 本命王道: 1位 - 2位 - 3位
    { first: rank1, second: rank2, third: rank3 },
    // 2. 本命対抗: 1位 - 2位 - 4位
    { first: rank1, second: rank2, third: rank4 },
    // 3. 2着ヒモ荒れ: 1位 - 3位 - 2位
    { first: rank1, second: rank3, third: rank2 },
    // 4. 2着3着入れ替え: 1位 - 3位 - 4位
    { first: rank1, second: rank3, third: rank4 },
    // 5. 逆転候補（2位艇が差し/捲り）: 2位 - 1位 - 3位
    { first: rank2, second: rank1, third: rank3, isReversal: true },
  ];

  // 重複排除と有効性チェック
  const uniqueCombos: { first: number; second: number; third: number; isReversal?: boolean }[] = [];
  const seenKeys = new Set<string>();

  for (const c of rawCombos) {
    // 1着、2着、3着がすべて異なる艇であること
    if (c.first !== c.second && c.second !== c.third && c.first !== c.third) {
      const key = `${c.first}-${c.second}-${c.third}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueCombos.push(c);
      }
    }
  }

  // もし重複などで5点未満の場合、予備候補 (1位 - 4位 - 2位 / 2位 - 1位 - 4位) を補填
  if (uniqueCombos.length < 5) {
    const backupCandidates = [
      { first: rank1, second: rank4, third: rank2 },
      { first: rank2, second: rank1, third: rank4, isReversal: true },
      { first: rank1, second: rank4, third: rank3 },
    ];
    for (const bc of backupCandidates) {
      if (uniqueCombos.length >= 5) break;
      const key = `${bc.first}-${bc.second}-${bc.third}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueCombos.push(bc);
      }
    }
  }

  const boatMap = new Map<number, ScoredBoat>();
  scoredBoats.forEach(b => boatMap.set(b.boatNumber, b));

  // 各買い目のスコア計算
  const candidateList = uniqueCombos.slice(0, 5).map((combo, index) => {
    const combination = `${combo.first}-${combo.second}-${combo.third}`;
    const b1 = boatMap.get(combo.first)?.rawScore || 100;
    const b2 = boatMap.get(combo.second)?.rawScore || 80;
    const b3 = boatMap.get(combo.third)?.rawScore || 60;

    // 買い目スコア (1着の重みが最も高い)
    let comboScore = Math.round(b1 * 0.55 + b2 * 0.30 + b3 * 0.15);
    if (combo.isReversal) {
      comboScore = Math.round(comboScore * 0.92); // 逆転目は僅かに補正
    }

    const odds = defaultOddsMap[combination] ?? 0;

    return {
      rank: index + 1,
      combination,
      first: combo.first,
      second: combo.second,
      third: combo.third,
      score: comboScore,
      relativeProb: 0,
      odds,
      stake: 0,
      expectedReturn: 0,
      expectedValue: 0,
    };
  });

  // 相対確率（確率配分）の算出
  const totalScore = candidateList.reduce((sum, c) => sum + c.score, 0);
  candidateList.forEach(c => {
    c.relativeProb = totalScore > 0 ? Number(((c.score / totalScore) * 100).toFixed(1)) : 20.0;
    // 期待値 EV = (予測確率% / 100) * オッズ
    c.expectedValue = c.odds > 0 ? Number(((c.relativeProb / 100) * c.odds).toFixed(2)) : 0;
  });

  return candidateList;
}

/**
 * 実オッズのシミュレーション生成（実レースに近いリアルなオッズ計算）
 */
export function simulateRealisticOdds(candidates: BetCandidate[]): Record<string, number> {
  const result: Record<string, number> = {};
  
  // 本命度は順位に応じて 4.2倍〜32.5倍等の自然なオッズ分布
  const baseMultipliers = [5.6, 9.8, 12.4, 18.2, 24.5];

  candidates.forEach((c, idx) => {
    const base = baseMultipliers[idx] || (15.0 + idx * 5);
    // スコアに応じた微調整
    const variation = (Math.sin(c.first * 3 + c.second * 7 + c.third) * 1.5);
    const finalOdds = Math.max(Number((base + variation).toFixed(1)), 1.8);
    result[c.combination] = finalOdds;
  });

  return result;
}
