import React from 'react';
import { BookOpen, ShieldAlert, CheckCircle, Info } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-lg shadow-2xl flex flex-col max-h-[88vh] select-none animate-in fade-in zoom-in-95 duration-150 text-slate-200">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Kyotei Analyzer Pro 5 操作説明書・システム仕様 (Ver 1.0)
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 text-sm font-bold">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed">
          {/* 免責事項・安全性 */}
          <div className="p-3 bg-amber-950/40 border border-amber-600/70 rounded text-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>重要：利用上の注意・免責事項</span>
            </div>
            <p>
              本アプリケーションは「競艇予想・資金配分・収支シミュレーション・投票支援ツール」です。
              実際の金銭投票を自動実行する機能は搭載しておらず、投票行為は利用者自身がテレボート等の公認窓口で判断・実施する必要があります。
              予想結果や的中・利益を保証するものではありません。舟券の購入は余裕資金の範囲内で自己責任において行ってください。
            </p>
          </div>

          {/* 1. 基本操作フロー */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-blue-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>1. 基本的な操作手順</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
              <li>
                <strong className="text-white">開催場・レース選択：</strong>
                画面上部から全国24場および1R〜12Rを選択、または上部メニューの「サンプル番組」を読み込みます。
              </li>
              <li>
                <strong className="text-white">出走表確認・編集：</strong>
                1〜6号艇の全国勝率、2連対率、モーター2連対率、進入コース、展示タイム等を確認します（直接編集も可能）。
              </li>
              <li>
                <strong className="text-white">「5点予想実行」：</strong>
                本命5点型エンジンが艇評価指数を計算し、1着軸・有力艇流し・逆転候補の合計最大5点を自動生成します。
              </li>
              <li>
                <strong className="text-white">オッズ入力 & 資金配分：</strong>
                オッズを確認・調整（または「オッズ生成」）後、「配分計算」をクリックして均等または目標払戻額に応じた100円単位の推奨金額を算出します。
              </li>
              <li>
                <strong className="text-white">見送り・STOP判定確認：</strong>
                風速（8.0m/s以上）や波高（10cm以上）、低オッズ、または利益目標・損失上限に達している場合は状態スタンプが「見送り」や「停止」に切り替わります。
              </li>
              <li>
                <strong className="text-white">結果入力・履歴保存：</strong>
                レース終了後、「結果入力(確定)」から確定着順と払戻金を入力すると、的中判定が行われ、純利益・回収率がリアルタイムに更新されます。
              </li>
            </ol>
          </div>

          {/* 2. 本命5点型予想エンジンロジック */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-blue-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>2. 本命5点型予想エンジンの仕様 (仕様書 第7章)</span>
            </h4>
            <p className="text-slate-300">
              各艇の評価スコアは以下の標準式で算出されます（設定から重み変更可能）：
            </p>
            <div className="p-2 bg-slate-950 rounded font-mono text-cyan-300 text-[11px] border border-slate-800">
              Score = 勝率×20 + 2連対率×8 + モーター2連対率×5 + 展示補正 + コース補正
            </div>
            <p className="text-slate-300">
              コース補正はインが最も有利（1コース:+120pt, 2コース:+35pt, 3コース:+25pt, 4コース:+20pt, 5コース:+10pt, 6コース:0pt）とし、
              展示タイムが全体平均より速い艇にはボーナス点が加算されます。
              買い目は評価1位を軸とし、1-2-3, 1-2-4, 1-3-2, 1-3-4、および2位艇が差し抜ける逆転候補（2-1-3）の最大5点が生成されます。
            </p>
          </div>

          {/* 3. 資金配分方式 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-blue-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>3. 資金配分方式の仕様 (仕様書 第8章)</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
              <li><strong className="text-white">均等配分：</strong>1レース上限予算を候補点数で均等に割り振り、100円単位に丸めます。</li>
              <li><strong className="text-white">目標払戻配分：</strong>各オッズに対し `ceil(目標払戻額 ÷ オッズ ÷ 100) × 100` で必要最小額を算出します。</li>
              <li><strong className="text-white">固定額：</strong>各買い目に指定基準額（例: 1,000円）を均一に配分します。</li>
              <li><strong className="text-white">自動縮小機能：</strong>目標払戻計算などで上限予算を超過した場合、予算内に収まるよう自動比率圧縮します。</li>
            </ul>
          </div>

          {/* 4. 状態スタンプの意味 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-blue-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>4. 状態スタンプの意味 (仕様書 付録C)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-cyan-400">待機 (Taiki)</span>
                <p className="text-[10px] text-slate-400">条件適合中。予想または確定待ち。</p>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-amber-400">見送り (Skip/Misyri)</span>
                <p className="text-[10px] text-slate-400">強風・高波・低オッズ等により除外。</p>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-rose-500">停止 (Stop)</span>
                <p className="text-[10px] text-slate-400">日次利益目標達成または損失上限到達。</p>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-yellow-300">的中 (Teki2)</span>
                <p className="text-[10px] text-slate-400">予想買い目が確定着順と一致。</p>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-slate-400">不的中 (Hazure)</span>
                <p className="text-[10px] text-slate-400">確定着順が予想外。</p>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-rose-400">NG</span>
                <p className="text-[10px] text-slate-400">出走艇データ欠落等の入力エラー。</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
