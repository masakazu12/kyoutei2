import React, { useState } from 'react';
import {
  Send,
  ShieldCheck,
  AlertTriangle,
  Play,
  Pause,
  Key,
  Wallet,
  CheckCircle2,
  Lock,
  Download,
  Copy,
  Clock,
  History,
  Info,
  DollarSign,
  Zap,
} from 'lucide-react';
import { RaceInfo, BetCandidate } from '../types/kyotei';
import {
  AutoVoteConfig,
  VoteLogItem,
  buildTeleboatTickets,
  generateTeleboatBatchPayload,
} from '../services/teleboatService';

interface AutoVoteModalProps {
  race: RaceInfo;
  candidates: BetCandidate[];
  config: AutoVoteConfig;
  onUpdateConfig: (newConfig: AutoVoteConfig) => void;
  onExecuteVote: () => void;
  isVoting: boolean;
  voteLogs: VoteLogItem[];
  onClose: () => void;
}

export const AutoVoteModal: React.FC<AutoVoteModalProps> = ({
  race,
  candidates,
  config,
  onUpdateConfig,
  onExecuteVote,
  isVoting,
  voteLogs,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'settings' | 'teleboat' | 'logs'>('status');
  const [copiedPayload, setCopiedPayload] = useState(false);

  const validBets = candidates.filter((c) => c.stake > 0);
  const totalStake = validBets.reduce((sum, c) => sum + c.stake, 0);

  const handleCopyPayload = () => {
    const payload = generateTeleboatBatchPayload(race, candidates);
    navigator.clipboard.writeText(payload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleDownloadPayload = () => {
    const payload = generateTeleboatBatchPayload(race, candidates);
    const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TELEBOAT_VOTE_${race.venue}_${race.raceNo}R.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* モーダルヘッダー */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center text-white">
              <Zap className="w-3.5 h-3.5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">
                  テレボート自動投票マネージャー (Auto-Voting System)
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                    config.enabled
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {config.enabled ? '自動投票 [有効/監視中]' : '自動投票 [停止中]'}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    config.testMode
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                      : 'bg-red-950 text-rose-300 border border-red-800 font-bold'
                  }`}
                >
                  {config.testMode ? 'テスト投票モード' : '実投票本番モード'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-1 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* タブナビゲーション */}
        <div className="flex border-b border-slate-800 bg-slate-950 text-xs px-3">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-2 px-3 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'status'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            本レース投票実行 (即時/自動)
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-3 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            自動投票ルール・安全制御
          </button>
          <button
            onClick={() => setActiveTab('teleboat')}
            className={`py-2 px-3 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'teleboat'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            テレボート口座・認証連携
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-3 border-b-2 font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>投票ログ・受付番号</span>
            {voteLogs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-mono">
                {voteLogs.length}
              </span>
            )}
          </button>
        </div>

        {/* タブコンテンツ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          {/* 1. 本レース投票実行タブ */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              {/* レース情報 & 投票概要カード */}
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-950 text-blue-300 font-black px-2.5 py-1.5 rounded border border-blue-800 text-sm">
                    {race.venue}
                  </div>
                  <div>
                    <div className="text-slate-200 font-bold text-sm">
                      {race.raceTitle} ({race.raceNo}R)
                    </div>
                    <div className="text-slate-400 text-[11px] font-mono flex items-center gap-2 mt-0.5">
                      <span>締切時刻: {race.deadlineTime}</span>
                      <span>|</span>
                      <span>日付: {race.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-900 px-3 py-2 rounded border border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400">対象点数</div>
                    <div className="text-base font-bold font-mono text-cyan-400">
                      {validBets.length} <span className="text-xs text-slate-400 font-normal">点</span>
                    </div>
                  </div>
                  <div className="border-l border-slate-700 pl-3">
                    <div className="text-[10px] text-slate-400">投票合計金額</div>
                    <div className="text-lg font-bold font-mono text-emerald-400">
                      ¥{totalStake.toLocaleString()}
                    </div>
                  </div>
                  <div className="border-l border-slate-700 pl-3">
                    <div className="text-[10px] text-slate-400">口座残高</div>
                    <div className="text-base font-bold font-mono text-amber-300">
                      ¥{config.accountBalance.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* 買い目プレビュー一覧 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-200">
                    投票対象の3連単買い目 (資金配分連動)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyPayload}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 cursor-pointer"
                      title="テレボート用CSVバッチデータをクリップボードにコピー"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedPayload ? 'コピー完了' : '送信データコピー'}</span>
                    </button>
                    <button
                      onClick={handleDownloadPayload}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 cursor-pointer"
                      title="テレボート一括送信TXTファイルをダウンロード"
                    >
                      <Download className="w-3 h-3" />
                      <span>TXT保存</span>
                    </button>
                  </div>
                </div>

                {validBets.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 bg-slate-950/60 rounded border border-dashed border-slate-800">
                    投票対象の買い目または配分金額がありません。メイン画面で「5点予想実行」または「配分計算」を行ってください。
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded overflow-hidden">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                        <tr>
                          <th className="py-1.5 px-3">買い目 (3連単)</th>
                          <th className="py-1.5 px-3 text-right">オッズ</th>
                          <th className="py-1.5 px-3 text-right">投票金額</th>
                          <th className="py-1.5 px-3 text-right">想定払戻</th>
                          <th className="py-1.5 px-3 text-center">テレボート規格</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                        {validBets.map((b) => (
                          <tr key={b.combination} className="hover:bg-slate-800/40">
                            <td className="py-1.5 px-3 font-bold text-slate-100">
                              3連単 <span className="text-amber-300 font-mono text-sm ml-1">{b.combination}</span>
                            </td>
                            <td className="py-1.5 px-3 text-right text-slate-300">
                              {b.odds.toFixed(1)}倍
                            </td>
                            <td className="py-1.5 px-3 text-right font-bold text-emerald-400">
                              ¥{b.stake.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-3 text-right text-slate-300">
                              ¥{(b.expectedReturn || Math.floor(b.stake * b.odds)).toLocaleString()}
                            </td>
                            <td className="py-1.5 px-3 text-center text-[10px] text-slate-400">
                              3T / {b.first}-{b.second}-{b.third}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 投票アクションボタン */}
              <div className="p-3 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    安全制御: 1R上限 ¥{config.maxStakePerRace.toLocaleString()} / 残高 ¥{config.accountBalance.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateConfig({ ...config, enabled: !config.enabled })}
                    className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                      config.enabled
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {config.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{config.enabled ? '自動投票を停止' : '自動投票を常時ON'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onExecuteVote}
                    disabled={isVoting || validBets.length === 0}
                    className="px-4 py-1.5 rounded font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${isVoting ? 'animate-spin' : ''}`} />
                    <span>{isVoting ? '投票送信中...' : '今すぐテレボートへ投票実行'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. 自動投票ルール・安全制御設定タブ */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-3">
                <h4 className="text-slate-200 font-bold border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>自動投票のトリガー・タイミング条件</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">
                      投票実行タイミング (締切何分前)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={config.minMinutesBeforeDeadline}
                        onChange={(e) =>
                          onUpdateConfig({
                            ...config,
                            minMinutesBeforeDeadline: parseInt(e.target.value) || 3,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                      />
                      <span className="text-slate-400 font-bold shrink-0">分前</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      ※直前展示タイム・確定オッズを反映した後に自動投票します
                    </span>
                  </div>

                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">
                      1レースあたり投票上限金額 (円)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="500"
                        min="500"
                        value={config.maxStakePerRace}
                        onChange={(e) =>
                          onUpdateConfig({
                            ...config,
                            maxStakePerRace: parseInt(e.target.value) || 3000,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                      />
                      <span className="text-slate-400 font-bold shrink-0">円</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      ※安全上限。この金額を超える買い目は誤操作防止のため投票を拒否します
                    </span>
                  </div>
                </div>
              </div>

              {/* セーフティ・スイッチ */}
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-3">
                <h4 className="text-slate-200 font-bold border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>セーフティ & モード切替</span>
                </h4>

                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 p-2 rounded bg-slate-900 hover:bg-slate-850 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.testMode}
                      onChange={(e) =>
                        onUpdateConfig({ ...config, testMode: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-bold text-slate-200">
                        シミュレーション・テスト投票モード (推奨)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        実際のテレボート口座から出金せず、仮想投票で受付番号の発行と投票履歴の記録を行います。
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2 rounded bg-slate-900 hover:bg-slate-850 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.confirmBeforeVote}
                      onChange={(e) =>
                        onUpdateConfig({ ...config, confirmBeforeVote: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-bold text-slate-200">
                        投票実行直前の確認ダイアログ表示
                      </div>
                      <div className="text-[10px] text-slate-400">
                        意図しない自動送信を防ぐため、送信直前に買い目・金額の最終確認ポップアップを表示します。
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2 rounded bg-slate-900 hover:bg-slate-850 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.soundAlert}
                      onChange={(e) =>
                        onUpdateConfig({ ...config, soundAlert: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-bold text-slate-200">投票完了時のサウンド通知</div>
                      <div className="text-[10px] text-slate-400">
                        投票が成功した際に通知音（Web Audio チャイム）を再生します。
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 3. テレボート口座・認証連携タブ */}
          {activeTab === 'teleboat' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <h4 className="text-slate-200 font-bold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>テレボート公式 会員アカウント情報連携</span>
                  </h4>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    AES-256 ローカル暗号化保持
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">
                      加入者番号 (8桁)
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={config.teleboatAccount.subscriberNo}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          teleboatAccount: {
                            ...config.teleboatAccount,
                            subscriberNo: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                      placeholder="88123456"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">暗証番号 (4桁)</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={config.teleboatAccount.passcode}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          teleboatAccount: {
                            ...config.teleboatAccount,
                            passcode: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                      placeholder="••••"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">認証用パスワード</label>
                    <input
                      type="password"
                      value={config.teleboatAccount.authPassword}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          teleboatAccount: {
                            ...config.teleboatAccount,
                            authPassword: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">投票用パスワード</label>
                    <input
                      type="password"
                      value={config.teleboatAccount.betPassword}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          teleboatAccount: {
                            ...config.teleboatAccount,
                            betPassword: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                      placeholder="••••"
                    />
                  </div>
                </div>

                {/* 仮想口座残高 */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-300 font-bold">テレボート口座残高 (連動)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="5000"
                      value={config.accountBalance}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          accountBalance: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-300 font-mono font-bold text-right"
                    />
                    <span className="text-slate-400 font-bold">円</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. 投票ログ・受付番号タブ */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">
                  テレボート投票履歴ログ (直近{voteLogs.length}件)
                </span>
                <span className="text-[11px] text-slate-400">
                  ※各投票の受付番号と確定ログを保持
                </span>
              </div>

              {voteLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 bg-slate-950/60 rounded border border-dashed border-slate-800">
                  まだ投票ログがありません。「今すぐテレボートへ投票実行」を押すとここに受付番号が記録されます。
                </div>
              ) : (
                <div className="border border-slate-800 rounded overflow-hidden max-h-80 overflow-y-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="py-1.5 px-3">時刻</th>
                        <th className="py-1.5 px-3">場・R</th>
                        <th className="py-1.5 px-3">買い目</th>
                        <th className="py-1.5 px-3 text-right">金額</th>
                        <th className="py-1.5 px-3">受付番号</th>
                        <th className="py-1.5 px-3 text-center">結果</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                      {voteLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/40">
                          <td className="py-1.5 px-3 text-slate-400">{log.timestamp}</td>
                          <td className="py-1.5 px-3 font-bold text-slate-200">
                            {log.venue} {log.raceNo}R
                          </td>
                          <td className="py-1.5 px-3 text-amber-300 font-bold">
                            3連単 {log.combination}
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-emerald-400">
                            ¥{log.stake.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-3 text-cyan-300 text-[11px]">
                            {log.receptionNo || '-'}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700">
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* モーダルフッター */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>
              テレボート公式API互換フォーマット | 3連単専用自動投票エンジン
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
