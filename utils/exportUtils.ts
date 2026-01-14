
import * as XLSX from 'xlsx';
import { Utterance } from '../types';
import { 
  formatTimeDisplay, 
  formatTimeForASS, 
  formatTimeForSRT, 
  formatTimeForVTT, 
  pad 
} from './timeUtils';

function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToExcel(utterances: Utterance[], filename: string) {
  const data = [
    ['Speaker', 'Start', 'End', 'Transcript', 'Emotion', 'Language', 'Locale', 'Accent'],
    ...utterances.map(u => [
      u.speaker,
      formatTimeDisplay(u.start_time),
      formatTimeDisplay(u.end_time),
      u.transcript,
      u.emotion,
      u.language,
      u.locale,
      u.accent
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 50 },
    { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 20 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transcript');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, `${filename}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

export function exportToJSON(utterances: Utterance[], filename: string) {
  const output = {
    audio_name: filename,
    utterances: utterances.map(u => ({
      speaker: u.speaker,
      start_time: u.start_time.toFixed(2),
      end_time: u.end_time.toFixed(2),
      transcript: u.transcript,
      non_speech_events: [{ emotion: u.emotion }],
      Language_Attributes: [{
        Language: u.language,
        Locale: u.locale,
        Accent: u.accent
      }]
    }))
  };
  downloadFile(JSON.stringify(output, null, 2), `${filename}.json`, 'application/json');
}

export function exportToASS(utterances: Utterance[], filename: string) {
  const speakers = Array.from(new Set(utterances.map(u => u.speaker)));
  const colors = ['&H00FFFFFF', '&H000088EF', '&H00EF8800', '&H0088EF00', '&H0000CC00', '&H00CC00CC'];

  let ass = '[Script Info]\n';
  ass += `Title: Transcript - ${filename}\n`;
  ass += 'ScriptType: v4.00+\n\n';

  ass += '[V4+ Styles]\n';
  ass += 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n';
  
  speakers.forEach((speaker, i) => {
    const color = colors[i % colors.length];
    ass += `Style: ${speaker},Noto Sans Devanagari,48,${color},&H000000FF,&H00000000,&H00666666,-1,0,0,0,100,100,0,0,1,2,1,2,10,10,10,1\n`;
  });

  ass += '\n[Events]\n';
  ass += 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';

  utterances.forEach(u => {
    const start = formatTimeForASS(u.start_time);
    const end = formatTimeForASS(u.end_time);
    const text = u.transcript.replace(/\n/g, '\\N');
    ass += `Dialogue: 0,${start},${end},${u.speaker},${u.speaker},0,0,0,,${text}\n`;
  });

  downloadFile(ass, `${filename}.ass`, 'text/plain');
}

export function exportToSRT(utterances: Utterance[], filename: string) {
  let srt = '';
  utterances.forEach((u, i) => {
    srt += `${i + 1}\n`;
    srt += `${formatTimeForSRT(u.start_time)} --> ${formatTimeForSRT(u.end_time)}\n`;
    srt += `[${u.speaker}] ${u.transcript}\n\n`;
  });
  downloadFile(srt, `${filename}.srt`, 'text/plain');
}

export function exportToVTT(utterances: Utterance[], filename: string) {
  let vtt = 'WEBVTT\n\n';
  utterances.forEach((u, i) => {
    vtt += `${i + 1}\n`;
    vtt += `${formatTimeForVTT(u.start_time)} --> ${formatTimeForVTT(u.end_time)}\n`;
    vtt += `<v ${u.speaker}>${u.transcript}\n\n`;
  });
  downloadFile(vtt, `${filename}.vtt`, 'text/vtt');
}

export function exportToTXT(utterances: Utterance[], filename: string) {
  let txt = '';
  utterances.forEach(u => {
    const time = formatTimeDisplay(u.start_time);
    txt += `[${time}] ${u.speaker}: ${u.transcript}\n\n`;
  });
  downloadFile(txt, `${filename}.txt`, 'text/plain');
}
