import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Play,
  Square,
  Settings as SettingsIcon,
  HelpCircle,
  FileSpreadsheet,
  RefreshCw,
  Globe,
  Monitor,
} from 'lucide-react';
import { PRESET_RACES } from '../data/presetRaces';

interface TitleBarProps {
  currentVenue: string;
  currentRaceNo: number;
  manualStop: boolean;
  onToggleManualStop: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onExportCsv: () => void;
  onSelectPreset: (presetId: string) => void;
  onOpenFetchRace: () => void;
  onOpenExeModal?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  currentVenue,
  currentRaceNo,
  manualStop,
  onToggleManualStop,
  onOpenSettings,
  onOpenHelp,
  onExportCsv,
  onSelectPreset,
  onOpenFetchRace,
  onOpenExeModal,
}) => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-10 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-3 text-xs select-none">
      {/* 左エリア: アプリアイコン・名称・現在選択中レース */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-100">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white text-[10px] font-black shadow-sm">
            K5
          </div>
          <span className="tracking-tight text-slate-100 font-semibold">Kyotei Analyzer Pro 5</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-blue-400 rounded font-mono border border-slate-700">
            Ver 1.0
          </span>
        </div>

        <span className="text-slate-600">|</span>

        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <span className="text-emerald-400 font-bold">{currentVenue}</span>
          <span className="font-mono text-amber-300 font-bold">{currentRaceNo}R</span>
        </div>

        {/* 開催レース情報取得ボタン & プリセットクイック選択 & Windows EXEボタン */}
        <div className="flex items-center gap-1.5 ml-2">
          <button
            onClick={onOpenFetchRace}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-900/90 hover:bg-blue-800 text-blue-200 border border-blue-500 font-bold text-[11px] transition-colors shadow-sm cursor-pointer"
            title="本日の開催レース番組表・出走表を取得"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-300" />
            <span>開催レース取得</span>
          </button>

          {onOpenExeModal && (
            <button
              onClick={onOpenExeModal}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 hover:border-cyan-500 font-bold text-[11px] transition-colors shadow-xs cursor-pointer"
              title="Windows 10 / 11 向け EXEファイル化 / デスクトップアプリ インストール"
            >
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span>Windows版(EXE)</span>
            </button>
          )}

          <div className="hidden xl:flex items-center gap-1">
            <span className="text-slate-500 text-[11px]">番組:</span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onSelectPreset(e.target.value);
                }
              }}
              defaultValue=""
              className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] rounded px-2 py-0.5 focus:outline-none focus:border-blue-500"
            >
              <option value="" disabled>
                サンプル出走表を選択
              </option>
              {PRESET_RACES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.venue} {p.raceTitle}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 中央エリア: STOP緊急制御 & ステータスインジケーター */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleManualStop}
          className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold text-[11px] transition-colors border ${
            manualStop
              ? 'bg-red-600 text-white border-red-500 shadow-sm shadow-red-900/50 animate-pulse'
              : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
          }`}
          title={manualStop ? '手動停止中。クリックで解除' : '手動で即座にSTOP（処理中断）します'}
        >
          {manualStop ? (
            <>
              <Square className="w-3 h-3 fill-current" />
              <span>停止中 (STOP解除)</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-3 h-3 text-red-400" />
              <span>緊急STOP切替</span>
            </>
          )}
        </button>

        <div className="hidden md:flex items-center text-slate-400 font-mono text-[11px] px-2 py-0.5 bg-slate-900 rounded border border-slate-800 tabular-nums">
          {currentTime}
        </div>
      </div>

      {/* 右エリア: クイックアクション & Windowsコントロールボタン */}
      <div className="flex items-center gap-1">
        <button
          onClick={onExportCsv}
          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
          title="履歴をCSV出力 (UTF-8 BOM)"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
          title="設定 (F12)"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenHelp}
          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
          title="仕様書・ヘルプ"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        <span className="text-slate-700 mx-1">|</span>

        {/* Windows 11 ウィンドウ最小化・最大化・閉じるボタンのシミュレーション */}
        <div className="flex items-center text-slate-400">
          <div className="w-7 h-6 flex items-center justify-center hover:bg-slate-800 rounded text-slate-400 cursor-default" title="最小化">
            ―
          </div>
          <div className="w-7 h-6 flex items-center justify-center hover:bg-slate-800 rounded text-slate-400 cursor-default text-[10px]" title="最大化">
            □
          </div>
          <div className="w-7 h-6 flex items-center justify-center hover:bg-red-600 hover:text-white rounded text-slate-400 cursor-default text-xs" title="終了">
            ✕
          </div>
        </div>
      </div>
    </header>
  );
};
