import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardPaste, FileText, RotateCcw } from 'lucide-react';
import {
  mergeReservationImportIntoTripDetails,
  parseReservationText
} from '../../services/reservationImportService';
import { Badge, Button, Card, Field, Textarea } from '../ui';

const exampleText = `Hotel: ＦＬレジデンス新宿御苑V
Address: 〒169-0073 東京都新宿区百人町３丁目２１−8
Check-in: 2/23 16:00
Check-out: 2/28 10:00

Outbound flight: JX802
Date: 2026-02-23
TPE NRT
Departure: 10:40
Arrival: 14:20`;

const isEmptyObject = (value) => !value || Object.keys(value).length === 0;

const getPreviewSummary = (parsedResult) => {
  const accommodation = parsedResult.accommodation || {};
  const flightCount = Object.values(parsedResult.flights || {}).filter((flight) => !isEmptyObject(flight)).length;
  const pieces = [];
  if (!isEmptyObject(accommodation)) pieces.push('住宿');
  if (flightCount) pieces.push(`${flightCount} 段航班`);
  if (parsedResult.dateRange?.start || parsedResult.dateRange?.end) pieces.push('日期');
  return pieces.length ? pieces.join('、') : '尚未解析到可套用欄位';
};

const PreviewRow = ({ label, value }) => (
  <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-0.5 truncate text-sm font-black text-slate-900 dark:text-white" title={value || '未解析'}>
      {value || '未解析'}
    </p>
  </div>
);

const FlightPreview = ({ label, flight }) => {
  if (isEmptyObject(flight)) return null;
  const route = [flight.dep, flight.arr].filter(Boolean).join(' → ');
  const time = [flight.departureTime, flight.arrivalTime].filter(Boolean).join(' → ');

  return (
    <div className="rounded-lg border border-sky-100 bg-sky-50 p-3 dark:border-sky-900/60 dark:bg-sky-950/25">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info">{label}</Badge>
        <span className="font-mono text-sm font-black text-slate-900 dark:text-white">{flight.code || '未解析航班'}</span>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <PreviewRow label="日期" value={flight.date} />
        <PreviewRow label="機場" value={route} />
        <PreviewRow label="時間" value={time} />
      </div>
    </div>
  );
};

const ReservationImportCard = ({ tripDetails, setTripDetails }) => {
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [message, setMessage] = useState('');
  const hasInput = rawText.trim().length > 0;
  const parsedResult = parsed || { accommodation: {}, flights: {}, detectedCount: 0 };
  const hasParsedData = parsedResult.detectedCount > 0;

  const previewSummary = useMemo(() => getPreviewSummary(parsedResult), [parsedResult]);

  const handleParse = () => {
    const nextParsed = parseReservationText(rawText, { tripDetails });
    setParsed(nextParsed);
    setMessage(nextParsed.detectedCount > 0 ? `已解析：${getPreviewSummary(nextParsed)}` : '沒有解析到住宿或航班欄位，可調整文字格式後再試。');
  };

  const handleUseExample = () => {
    setRawText(exampleText);
    const nextParsed = parseReservationText(exampleText, { tripDetails });
    setParsed(nextParsed);
    setMessage('已載入範例格式，可以直接預覽解析結果。');
  };

  const handleApply = (overwrite = false) => {
    if (!hasParsedData) {
      setMessage('請先解析出可套用欄位。');
      return;
    }

    const result = mergeReservationImportIntoTripDetails(tripDetails, parsedResult, { overwrite });
    setTripDetails(result.tripDetails);
    setMessage(result.appliedFields.length
      ? `已套用 ${result.appliedFields.length} 個欄位。`
      : overwrite
        ? '沒有可套用的新欄位。'
        : '既有欄位已填寫，沒有空白欄位需要補。');
  };

  return (
    <Card className="p-3 sm:p-4">
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="tp-icon-chip bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
            <ClipboardPaste size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="tp-section-title">貼上訂單匯入</h3>
            <p className="tp-section-subtitle mt-1">
              貼上航班或住宿確認文字，先預覽再套用到旅程資訊。
            </p>
          </div>
        </div>
        <Badge variant={hasParsedData ? 'success' : 'muted'}>{hasParsedData ? '可套用' : 'MVP'}</Badge>
      </div>

      <div className="grid gap-3">
        <Field label="確認信或訂單文字" htmlFor="reservation-import-text" hint="目前支援常見中英文欄位：Hotel、Address、Check-in、Flight、Departure、Arrival、TPE/NRT 這類機場代碼。">
          <Textarea
            id="reservation-import-text"
            value={rawText}
            onChange={(event) => {
              setRawText(event.target.value);
              setMessage('');
            }}
            rows={7}
            placeholder="貼上 Booking.com、航空公司或活動平台的確認文字..."
          />
        </Field>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button onClick={handleParse} disabled={!hasInput} className="justify-center">
            <FileText size={16} />
            解析內容
          </Button>
          <Button variant="secondary" onClick={handleUseExample} className="justify-center">
            <RotateCcw size={16} />
            載入範例
          </Button>
          <Button variant="secondary" onClick={() => handleApply(false)} disabled={!hasParsedData} className="justify-center">
            <CheckCircle2 size={16} />
            套用到空白欄位
          </Button>
          <Button variant="ghost" onClick={() => handleApply(true)} disabled={!hasParsedData} className="justify-center">
            覆蓋套用
          </Button>
        </div>
      </div>

      {(parsed || message) && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex min-w-0 items-start gap-2">
            {hasParsedData ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
            ) : (
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
            )}
            <div className="min-w-0">
              <p className="font-black text-slate-900 dark:text-white">解析預覽</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {message || previewSummary}
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {!isEmptyObject(parsedResult.accommodation) && (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/25">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info">住宿</Badge>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {parsedResult.accommodation.name || '未解析飯店名稱'}
                  </span>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <PreviewRow label="地址" value={parsedResult.accommodation.address} />
                  <PreviewRow label="入住" value={parsedResult.accommodation.checkIn} />
                  <PreviewRow label="退房" value={parsedResult.accommodation.checkOut} />
                </div>
              </div>
            )}

            <FlightPreview label="去程" flight={parsedResult.flights?.outbound} />
            <FlightPreview label="回程" flight={parsedResult.flights?.inbound} />

            {isEmptyObject(parsedResult.accommodation) && isEmptyObject(parsedResult.flights?.outbound) && isEmptyObject(parsedResult.flights?.inbound) && (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                尚未解析到可預覽內容。
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ReservationImportCard;
