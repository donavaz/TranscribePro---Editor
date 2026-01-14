
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Play, 
  Pause, 
  Search, 
  Columns, 
  Upload, 
  FileAudio, 
  Loader2,
  ChevronDown,
  Volume2,
  X,
  FileUp,
  Table as TableIcon,
  PlayCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Utterance, ExportFormat } from './types';
import { LANGUAGES, LANGUAGE_LIST, EMOTIONS, FONT_MAPPING } from './constants';
import { 
  formatTimeDisplay, 
  parseTimeToSeconds 
} from './utils/timeUtils';
import { 
  exportToExcel, 
  exportToJSON, 
  exportToASS, 
  exportToSRT, 
  exportToVTT, 
  exportToTXT 
} from './utils/exportUtils';

const App: React.FC = () => {
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(['Speaker', 'Start', 'End', 'Transcript', 'Emotion', 'Language', 'Locale', 'Accent']));
  const [leftWidth, setLeftWidth] = useState(40); // Percentage
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Column resizing state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    '#': 60,
    'Speaker': 120,
    'Start': 110,
    'End': 110,
    'Transcript': 400,
    'Emotion': 120,
    'Language': 140,
    'Locale': 100,
    'Accent': 140,
    'Actions': 48
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Split panel resize handler
  const handleMouseDown = useCallback(() => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth >= 25 && newWidth <= 70) {
      setLeftWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Column resize handler
  const handleColumnResize = (column: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[column];
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setColumnWidths(prev => ({
        ...prev,
        [column]: Math.max(50, startWidth + deltaX)
      }));
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Improved Time Sync: Update active row when time changes
  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const time = e.currentTarget.currentTime;
    setCurrentTime(time);
    
    const active = utterances.find(u => time >= u.start_time && time < u.end_time);
    if (active && active.id !== activeRowId) {
      setActiveRowId(active.id);
      const rowEl = document.getElementById(`row-${active.id}`);
      if (rowEl && tableRef.current) {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else if (!active && activeRowId !== null) {
      setActiveRowId(null);
    }
  }, [utterances, activeRowId]);

  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      setFileUrl(URL.createObjectURL(selected));
    }
  };

  const handleDataImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const extension = file.name.split('.').pop()?.toLowerCase();

    reader.onload = (event) => {
      try {
        let importedUtterances: Utterance[] = [];

        if (extension === 'json') {
          const json = JSON.parse(event.target?.result as string);
          if (json.utterances) {
            importedUtterances = json.utterances.map((u: any) => ({
              id: crypto.randomUUID(),
              speaker: u.speaker || 'speaker_01',
              start_time: parseFloat(u.start_time) || 0,
              end_time: parseFloat(u.end_time) || 0,
              transcript: u.transcript || '',
              emotion: u.non_speech_events?.[0]?.emotion || 'neutral',
              language: u.Language_Attributes?.[0]?.Language || 'Hindi',
              locale: u.Language_Attributes?.[0]?.Locale || 'hi_in',
              accent: u.Language_Attributes?.[0]?.Accent || 'Standard hindi'
            }));
          }
        } else if (extension === 'xlsx' || extension === 'xls') {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

          importedUtterances = rows.slice(1).map((row) => ({
            id: crypto.randomUUID(),
            speaker: String(row[0] || 'speaker_01'),
            start_time: parseTimeToSeconds(String(row[1])),
            end_time: parseTimeToSeconds(String(row[2])),
            transcript: String(row[3] || ''),
            emotion: String(row[4] || 'neutral'),
            language: String(row[5] || 'Hindi'),
            locale: String(row[6] || 'hi_in'),
            accent: String(row[7] || 'Standard hindi')
          }));
        }

        if (importedUtterances.length > 0) {
          setUtterances(importedUtterances);
        } else {
          alert("Could not find any valid transcription data in the file.");
        }
      } catch (err) {
        console.error("Import error:", err);
        alert("Failed to parse file. Please ensure it follows the correct format.");
      }
    };

    if (extension === 'json') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
    e.target.value = '';
  };

  const addRow = () => {
    const lastRow = utterances[utterances.length - 1];
    const newRow: Utterance = {
      id: crypto.randomUUID(),
      speaker: lastRow ? lastRow.speaker : 'speaker_01',
      start_time: lastRow ? lastRow.end_time : (videoRef.current?.currentTime || 0),
      end_time: lastRow ? lastRow.end_time + 2 : (videoRef.current?.currentTime || 0) + 2,
      transcript: '',
      emotion: 'neutral',
      language: lastRow ? lastRow.language : 'Hindi',
      locale: lastRow ? lastRow.locale : 'hi_in',
      accent: lastRow ? lastRow.accent : 'Standard hindi'
    };
    setUtterances([...utterances, newRow]);
  };

  const deleteRow = (id: string) => {
    if (confirm("Delete this row?")) {
      setUtterances(utterances.filter(u => u.id !== id));
    }
  };

  const updateRow = (id: string, updates: Partial<Utterance>) => {
    setUtterances(prev => prev.map(u => {
      if (u.id === id) {
        const updated = { ...u, ...updates };
        if (updates.language) {
          const cfg = LANGUAGES[updates.language];
          if (cfg) {
            updated.locale = cfg.locale;
            updated.accent = cfg.accent;
          }
        }
        if (updates.transcript) {
          for (const lang of LANGUAGE_LIST) {
            const cfg = LANGUAGES[lang];
            if (cfg.unicodeRange && cfg.unicodeRange.test(updates.transcript)) {
              updated.language = lang;
              updated.locale = cfg.locale;
              updated.accent = cfg.accent;
              break;
            }
          }
        }
        return updated;
      }
      return u;
    }));
  };

  const jumpToTime = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      if (videoRef.current.paused) {
        videoRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
    }
  }, []);

  const toggleColumn = (col: string) => {
    const next = new Set(visibleColumns);
    if (next.has(col)) next.delete(col);
    else next.add(col);
    setVisibleColumns(next);
  };

  const handleExport = (format: ExportFormat) => {
    if (!utterances.length) return;
    const baseName = file?.name.replace(/\.[^/.]+$/, "") || "transcript";
    switch (format) {
      case 'xlsx': exportToExcel(utterances, baseName); break;
      case 'json': exportToJSON(utterances, baseName); break;
      case 'ass': exportToASS(utterances, baseName); break;
      case 'srt': exportToSRT(utterances, baseName); break;
      case 'vtt': exportToVTT(utterances, baseName); break;
      case 'txt': exportToTXT(utterances, baseName); break;
    }
    setShowExportMenu(false);
  };

  const filteredUtterances = useMemo(() => {
    return utterances.filter(u => 
      u.transcript.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.speaker.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [utterances, searchTerm]);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden">
      <input 
        type="file" 
        ref={importInputRef}
        className="hidden" 
        accept=".xlsx,.xls,.json"
        onChange={handleDataImport}
      />

      <div 
        style={{ width: `${leftWidth}%` }}
        className="flex flex-col border-r border-slate-200 bg-white"
      >
        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
              <TableIcon className="w-6 h-6" />
              TranscribePro Editor
            </h1>
          </div>

          {!fileUrl ? (
            <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 cursor-pointer transition-all">
              <Upload className="w-12 h-12 text-slate-400 mb-4" />
              <p className="text-slate-600 font-medium">Upload Media for Playback</p>
              <p className="text-slate-400 text-sm mt-1">MP4, MP3, WAV supported</p>
              <input type="file" className="hidden" accept="video/*,audio/*" onChange={handleMediaFileChange} />
            </label>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="relative group rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center shadow-inner">
                <video 
                  ref={videoRef}
                  src={fileUrl}
                  className="w-full h-full"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                {!isPlaying && (
                  <button 
                    onClick={() => { videoRef.current?.play(); setIsPlaying(true); }}
                    className="absolute inset-0 m-auto w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Play className="w-8 h-8 fill-current" />
                  </button>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <span className="mono text-xs text-slate-500 w-16">{formatTimeDisplay(currentTime)}</span>
                  <input 
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={currentTime}
                    onChange={(e) => {
                      const t = parseFloat(e.target.value);
                      if (videoRef.current) videoRef.current.currentTime = t;
                      setCurrentTime(t);
                    }}
                    className="flex-1 h-1 bg-slate-200 rounded-full appearance-none accent-indigo-600 cursor-pointer"
                  />
                  <span className="mono text-xs text-slate-500 w-16 text-right">{formatTimeDisplay(duration)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        if (isPlaying) videoRef.current?.pause();
                        else videoRef.current?.play();
                      }}
                      className="p-2 hover:bg-white rounded-lg text-slate-600 transition-colors"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>
                    <div className="flex items-center gap-2 ml-4">
                      <Volume2 className="w-4 h-4 text-slate-400" />
                      <input 
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        value={volume}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (videoRef.current) videoRef.current.volume = v;
                          setVolume(v);
                        }}
                        className="w-20 h-1 bg-slate-200 rounded-full appearance-none accent-indigo-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <select 
                      value={playbackSpeed}
                      onChange={(e) => {
                        const s = parseFloat(e.target.value);
                        if (videoRef.current) videoRef.current.playbackRate = s;
                        setPlaybackSpeed(s);
                      }}
                      className="bg-transparent text-xs font-semibold text-slate-600 outline-none cursor-pointer"
                    >
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => <option key={s} value={s}>{s}x</option>)}
                    </select>
                    <button onClick={() => { setFileUrl(''); setFile(null); }} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-col gap-4">
            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
              <FileUp className="w-5 h-5" />
              Editor Instructions
            </h3>
            <ul className="text-sm text-indigo-700 space-y-2 list-disc pl-4">
              <li>Upload a <strong>Media file</strong> for context playback.</li>
              <li>Import an <strong>Excel (.xlsx)</strong> or <strong>JSON</strong> transcript.</li>
              <li>Row index acts as a <strong>Play</strong> button for that segment.</li>
              <li>Editing timestamps updates the segment bounds instantly.</li>
            </ul>
          </div>
        </div>
      </div>

      <div 
        onMouseDown={handleMouseDown}
        className="w-1 hover:w-2 hover:bg-indigo-400 cursor-col-resize bg-slate-200 transition-all z-10"
      />

      <div 
        style={{ width: `${100 - leftWidth}%` }}
        className="flex flex-col bg-white"
      >
        <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => importInputRef.current?.click()}
              className="flex items-center gap-2 py-2 px-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <FileUp className="w-4 h-4" />
              Import Data
            </button>
            <button 
              onClick={addRow}
              className="flex items-center gap-2 py-2 px-4 bg-indigo-50 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Row
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="flex items-center gap-2 py-2 px-4 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
              >
                <Columns className="w-4 h-4" />
                Columns
                <ChevronDown className="w-4 h-4" />
              </button>
              {showColumnMenu && (
                <div className="absolute top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-30">
                  {['Speaker', 'Start', 'End', 'Transcript', 'Emotion', 'Language', 'Locale', 'Accent'].map(col => (
                    <label key={col} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.has(col)} 
                        onChange={() => toggleColumn(col)}
                        className="w-4 h-4 accent-indigo-600"
                      />
                      <span className="text-sm font-medium text-slate-700">{col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search transcript..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 w-48 xl:w-64 transition-all"
              />
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 py-2 px-4 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors shadow-lg"
              >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className="w-4 h-4" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 z-30">
                  <div className="text-[10px] font-bold text-slate-400 px-3 py-2 uppercase tracking-wider">Formats</div>
                  {[
                    { id: 'xlsx', label: 'Excel (.xlsx)' },
                    { id: 'json', label: 'JSON' },
                    { id: 'ass', label: 'ASS (SubStation Alpha)' },
                    { id: 'srt', label: 'SRT (SubRip)' },
                    { id: 'vtt', label: 'WebVTT' },
                    { id: 'txt', label: 'Plain Text' }
                  ].map(fmt => (
                    <button 
                      key={fmt.id}
                      onClick={() => handleExport(fmt.id as ExportFormat)}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div ref={tableRef} className="flex-1 overflow-auto bg-white scroll-smooth pb-20">
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col style={{ width: columnWidths['#'] }} />
              {visibleColumns.has('Speaker') && <col style={{ width: columnWidths['Speaker'] }} />}
              {visibleColumns.has('Start') && <col style={{ width: columnWidths['Start'] }} />}
              {visibleColumns.has('End') && <col style={{ width: columnWidths['End'] }} />}
              {visibleColumns.has('Transcript') && <col style={{ width: columnWidths['Transcript'] }} />}
              {visibleColumns.has('Emotion') && <col style={{ width: columnWidths['Emotion'] }} />}
              {visibleColumns.has('Language') && <col style={{ width: columnWidths['Language'] }} />}
              {visibleColumns.has('Locale') && <col style={{ width: columnWidths['Locale'] }} />}
              {visibleColumns.has('Accent') && <col style={{ width: columnWidths['Accent'] }} />}
              <col style={{ width: columnWidths['Actions'] }} />
            </colgroup>
            <thead className="sticky top-0 bg-slate-50 z-20 border-b border-slate-200 shadow-sm">
              <tr>
                <th className="relative px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider overflow-hidden">
                  <div className="flex items-center gap-1"># <PlayCircle className="w-3 h-3" /></div>
                  <div onMouseDown={(e) => handleColumnResize('#', e)} className="absolute right-0 top-0 bottom-0 w-1 bg-slate-200 cursor-col-resize hover:bg-indigo-400" />
                </th>
                {visibleColumns.has('Speaker') && (
                  <th className="relative px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider overflow-hidden">
                    Speaker
                    <div onMouseDown={(e) => handleColumnResize('Speaker', e)} className="absolute right-0 top-0 bottom-0 w-1 bg-slate-200 cursor-col-resize hover:bg-indigo-400" />
                  </th>
                )}
                {visibleColumns.has('Start') && (
                  <th className="relative px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider overflow-hidden">
                    Start
                    <div onMouseDown={(e) => handleColumnResize('Start', e)} className="absolute right-0 top-0 bottom-0 w-1 bg-slate-200 cursor-col-resize hover:bg-indigo-400" />
                  </th>
                )}
                {visibleColumns.has('End') && (
                  <th className="relative px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider overflow-hidden">
                    End
                    <div onMouseDown={(e) => handleColumnResize('End', e)} className="absolute right-0 top-0 bottom-0 w-1 bg-slate-200 cursor-col-resize hover:bg-indigo-400" />
                  </th>
                )}
                {visibleColumns.has('Transcript') && (
                  <th className="relative px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider overflow-hidden">
                    Transcript
                    <div onMouseDown={(e) => handleColumnResize('Transcript', e)} className="absolute right-0 top-0 bottom-0 w-1 bg-slate-200 cursor-col-resize hover:bg-indigo-400" />
                  </th>
                )}
                {visibleColumns.has('Emotion') && (
                  <th className="relative px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider overflow-hidden">
                    Emotion
                    <div onMouseDown={(e) => handleColumnResize('Emotion', e)} className="absolute right-0 top-0 bottom-0 w-1 bg-slate-200 cursor-col-resize hover:bg-indigo-400" />
                  </th>
                )}
                {visibleColumns.has('Language') && (
                  <th className="relative px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider overflow-hidden">
                    Language
                    <div onMouseDown={(e) => handleColumnResize('Language', e)} className="absolute right-0 top-0 bottom-0 w-1 bg-slate-200 cursor-col-resize hover:bg-indigo-400" />
                  </th>
                )}
                {visibleColumns.has('Locale') && (
                  <th className="relative px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider overflow-hidden">
                    Locale
                    <div onMouseDown={(e) => handleColumnResize('Locale', e)} className="absolute right-0 top-0 bottom-0 w-1 bg-slate-200 cursor-col-resize hover:bg-indigo-400" />
                  </th>
                )}
                {visibleColumns.has('Accent') && (
                  <th className="relative px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider overflow-hidden">
                    Accent
                    <div onMouseDown={(e) => handleColumnResize('Accent', e)} className="absolute right-0 top-0 bottom-0 w-1 bg-slate-200 cursor-col-resize hover:bg-indigo-400" />
                  </th>
                )}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUtterances.map((u, index) => (
                <tr 
                  key={u.id}
                  id={`row-${u.id}`}
                  className={`group transition-colors ${activeRowId === u.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                >
                  <td className="px-4 py-3 align-top">
                    <button 
                      onClick={() => jumpToTime(u.start_time)}
                      title="Jump to start time"
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all shadow-sm ${activeRowId === u.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}
                    >
                      <span className="group-hover:hidden text-xs font-bold">{index + 1}</span>
                      <Play className="hidden group-hover:block w-3 h-3 fill-current" />
                    </button>
                  </td>
                  {visibleColumns.has('Speaker') && (
                    <td className="px-4 py-3 align-top">
                      <input 
                        value={u.speaker}
                        onChange={(e) => updateRow(u.id, { speaker: e.target.value })}
                        className="w-full bg-transparent border-none outline-none text-sm font-semibold text-slate-700 truncate"
                      />
                    </td>
                  )}
                  {visibleColumns.has('Start') && (
                    <td className="px-4 py-3 align-top">
                      <input 
                        value={formatTimeDisplay(u.start_time)}
                        onChange={(e) => updateRow(u.id, { start_time: parseTimeToSeconds(e.target.value) })}
                        className="mono text-xs text-slate-500 w-full bg-transparent outline-none truncate focus:text-indigo-600"
                      />
                    </td>
                  )}
                  {visibleColumns.has('End') && (
                    <td className="px-4 py-3 align-top">
                      <input 
                        value={formatTimeDisplay(u.end_time)}
                        onChange={(e) => updateRow(u.id, { end_time: parseTimeToSeconds(e.target.value) })}
                        className="mono text-xs text-slate-500 w-full bg-transparent outline-none truncate focus:text-indigo-600"
                      />
                    </td>
                  )}
                  {visibleColumns.has('Transcript') && (
                    <td className="px-4 py-3 align-top">
                      <textarea 
                        rows={1}
                        value={u.transcript}
                        style={{ fontFamily: FONT_MAPPING[u.locale] || 'inherit', direction: u.locale === 'ur_in' ? 'rtl' : 'ltr' }}
                        onFocus={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onChange={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                          updateRow(u.id, { transcript: e.target.value });
                        }}
                        className="w-full bg-transparent border-none outline-none text-base resize-none overflow-hidden leading-relaxed text-slate-800 focus:bg-white focus:shadow-sm focus:rounded px-1 -mx-1 transition-all"
                      />
                    </td>
                  )}
                  {visibleColumns.has('Emotion') && (
                    <td className="px-4 py-3 align-top">
                      <select 
                        value={u.emotion}
                        onChange={(e) => updateRow(u.id, { emotion: e.target.value })}
                        className="w-full bg-transparent text-xs font-medium text-slate-600 outline-none capitalize truncate cursor-pointer hover:text-indigo-600"
                      >
                        {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </td>
                  )}
                  {visibleColumns.has('Language') && (
                    <td className="px-4 py-3 align-top">
                      <select 
                        value={u.language}
                        onChange={(e) => updateRow(u.id, { language: e.target.value })}
                        className="w-full bg-transparent text-xs font-medium text-slate-600 outline-none truncate cursor-pointer hover:text-indigo-600"
                      >
                        {LANGUAGE_LIST.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                      </select>
                    </td>
                  )}
                  {visibleColumns.has('Locale') && (
                    <td className="px-4 py-3 align-top">
                      <span className="mono text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded uppercase truncate inline-block">{u.locale}</span>
                    </td>
                  )}
                  {visibleColumns.has('Accent') && (
                    <td className="px-4 py-3 align-top">
                      <span className="text-[10px] text-slate-400 font-medium truncate inline-block">{u.accent}</span>
                    </td>
                  )}
                  <td className="px-4 py-3 align-top opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => deleteRow(u.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!utterances.length && (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
              <TableIcon className="w-12 h-12 opacity-20" />
              <p className="font-medium">No transcription data yet.</p>
              <p className="text-sm">Click "Import Data" to upload an Excel or JSON transcript.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
