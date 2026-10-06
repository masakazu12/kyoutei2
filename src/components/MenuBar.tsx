import React, { useState } from 'react';
import { Download, RefreshCw, Trash2, Sliders, Info, BookOpen, AlertCircle, Play, DollarSign, Globe, Zap, Monitor } from 'lucide-react';
import { AllocationMode } from '../types/kyotei';

interface MenuBarProps {
  onExportCsv: () => void;
  onClearHistory: () => void;
  onRunPrediction: () => void;
  onSimulateOdds: () => void;
  onChangeAllocationMode: (mode: AllocationMode) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenHistory: () => void;
  onResetToDefaultRace: () => void;
  onOpenFetchRace: () => void;
  onAutoFetchResult?: () => void;
  onOpenExeModal?: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  onExportCsv,
  onClearHistory,
  onRunPrediction,
  onSimulateOdds,
  onChangeAllocationMode,
  onOpenSettings,
  onOpenHelp,
  onOpenHistory,
  onResetToDefaultRace,
  onOpenFetchRace,
  onAutoFetchResult,
  onOpenExeModal,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const toggle = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const close = () => setActiveMenu(null);

  return (
    <nav className="h-7 bg-slate-900 border-b border-slate-800 flex items-center px-2 text-[12px] text-slate-300 relative select-none">
      {/* メニュー1: ファイル */}
      <div className="relative">
        <button
          onClick={() => toggle('file')}
          className={`px-2 py-0.5 rounded hover:bg-slate-800 transition-colors ${
            activeMenu === 'file' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          ファイル(F)
        </button>
        {activeMenu === 'file' && (
          <div className="absolute left-0 top-full mt-0.5 w-52 bg-slate-900 border border-slate-700 shadow-xl rounded py-1 z-50 text-xs">
            <button
              onClick={() => {
                onExportCsv();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>履歴CSVエクスポート (UTF-8 BOM)</span>
            </button>
            <button
              onClick={() => {
                onOpenSettings();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>環境設定 (F12)</span>
            </button>
            {onOpenExeModal && (
              <button
                onClick={() => {
                  onOpenExeModal();
                  close();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-cyan-300 font-bold"
              >
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                <span>Windows版 (EXE) 配布・インストール</span>
              </button>
            )}
            <div className="border-t border-slate-800 my-1"></div>
            <button
              onClick={() => {
                onClearHistory();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-red-950/60 text-rose-300 flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>収支履歴全消去</span>
            </button>
          </div>
        )}
      </div>

      {/* メニュー2: レース */}
      <div className="relative">
        <button
          onClick={() => toggle('race')}
          className={`px-2 py-0.5 rounded hover:bg-slate-800 transition-colors ${
            activeMenu === 'race' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          レース(R)
        </button>
        {activeMenu === 'race' && (
          <div className="absolute left-0 top-full mt-0.5 w-56 bg-slate-900 border border-slate-700 shadow-xl rounded py-1 z-50 text-xs">
            <button
              onClick={() => {
                onOpenFetchRace();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-blue-300 font-bold cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>開催レース情報を取得 (G)</span>
            </button>
            <div className="border-t border-slate-800 my-1"></div>
            <button
              onClick={() => {
                onResetToDefaultRace();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>出走表を既定値にリセット</span>
            </button>
            <button
              onClick={() => {
                onOpenHistory();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>過去レース履歴一覧表示</span>
            </button>
          </div>
        )}
      </div>

      {/* メニュー3: 予想 */}
      <div className="relative">
        <button
          onClick={() => toggle('prediction')}
          className={`px-2 py-0.5 rounded hover:bg-slate-800 transition-colors ${
            activeMenu === 'prediction' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          予想(P)
        </button>
        {activeMenu === 'prediction' && (
          <div className="absolute left-0 top-full mt-0.5 w-56 bg-slate-900 border border-slate-700 shadow-xl rounded py-1 z-50 text-xs">
            <button
              onClick={() => {
                onRunPrediction();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>本命5点予想エンジン実行</span>
            </button>
            <button
              onClick={() => {
                onSimulateOdds();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>実オッズ自動シミュレート</span>
            </button>
            {onAutoFetchResult && (
              <>
                <div className="border-t border-slate-800 my-1"></div>
                <button
                  onClick={() => {
                    onAutoFetchResult();
                    close();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-amber-300 font-bold cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  <span>公式確定結果を自動取得</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* メニュー4: 資金配分 */}
      <div className="relative">
        <button
          onClick={() => toggle('allocation')}
          className={`px-2 py-0.5 rounded hover:bg-slate-800 transition-colors ${
            activeMenu === 'allocation' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          資金配分(M)
        </button>
        {activeMenu === 'allocation' && (
          <div className="absolute left-0 top-full mt-0.5 w-48 bg-slate-900 border border-slate-700 shadow-xl rounded py-1 z-50 text-xs">
            <button
              onClick={() => {
                onChangeAllocationMode('equal');
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
              <span>均等配分方式 (推奨)</span>
            </button>
            <button
              onClick={() => {
                onChangeAllocationMode('target');
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>目標払戻配分方式</span>
            </button>
            <button
              onClick={() => {
                onChangeAllocationMode('fixed');
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              <span>固定額方式</span>
            </button>
          </div>
        )}
      </div>

      {/* メニュー5: ヘルプ */}
      <div className="relative">
        <button
          onClick={() => toggle('help')}
          className={`px-2 py-0.5 rounded hover:bg-slate-800 transition-colors ${
            activeMenu === 'help' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          ヘルプ(H)
        </button>
        {activeMenu === 'help' && (
          <div className="absolute left-0 top-full mt-0.5 w-60 bg-slate-900 border border-slate-700 shadow-xl rounded py-1 z-50 text-xs">
            <button
              onClick={() => {
                onOpenHelp();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>仕様書・操作ガイド・計算式</span>
            </button>
            <button
              onClick={() => {
                onOpenHelp();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-300"
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>免責事項（実投票非対応の確認）</span>
            </button>
          </div>
        )}
      </div>

      {/* オーバーレイ（メニュー外クリックで閉じる） */}
      {activeMenu && (
        <div className="fixed inset-0 z-40" onClick={close} />
      )}
    </nav>
  );
};
