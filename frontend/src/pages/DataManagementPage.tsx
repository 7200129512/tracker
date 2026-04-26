import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

// ── Column aliases ────────────────────────────────────────────────────────────
const COL_MAP: Record<string, string> = {
  instrument: 'symbol', symbol: 'symbol', ticker: 'symbol',
  stock: 'symbol', scrip: 'symbol', name: 'symbol',
  'stock name': 'symbol', 'stock symbol': 'symbol',

  qty: 'qty', quantity: 'qty', shares: 'qty', units: 'qty', 'qty.': 'qty',

  'avg. cost': 'avgCost', 'avg cost': 'avgCost', 'average cost': 'avgCost',
  'avg price': 'avgCost', 'average price': 'avgCost',
  'buy price': 'avgCost', 'purchase price': 'avgCost',

  ltp: 'ltp', 'last price': 'ltp', 'current price': 'ltp', price: 'ltp',

  invested: 'invested', 'invested amount': 'invested',
  'total invested': 'invested', 'buy value': 'invested',

  'cur. val': 'curVal', 'cur val': 'curVal', 'current value': 'curVal',
  'market value': 'curVal', value: 'curVal',

  'p&l': 'pnl', pnl: 'pnl', 'profit & loss': 'pnl',
  'profit/loss': 'pnl', 'unrealised p&l': 'pnl', gain: 'pnl', 'gain/loss': 'pnl',

  'net chg.': 'netChg', 'net chg': 'netChg', 'net change': 'netChg',
  'day chg.': 'dayChg', 'day chg': 'dayChg', 'day change': 'dayChg', 'day %': 'dayChg',
};

interface ParsedRow {
  symbol: string;
  qty: number;
  avgCost: number;
  ltp: number;
  invested: number;
  curVal: number;
  pnl: number;
  netChg: number;
  dayChg: number;
}

interface ParseResult {
  rows: ParsedRow[];
  detectedHeaders: string[];   // raw headers found in file
  mappedCols: Record<string, number>; // canonical → col index
}

function normaliseHeader(h: unknown): string {
  if (h === null || h === undefined) return '';
  return h.toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

/** Scan first 5 rows to find the header row (the one containing a symbol-column keyword) */
function findHeaderRowIndex(rawRows: unknown[][]): number {
  const symbolKeys = new Set(
    Object.entries(COL_MAP).filter(([, v]) => v === 'symbol').map(([k]) => k)
  );
  for (let i = 0; i < Math.min(5, rawRows.length); i++) {
    for (const cell of rawRows[i] as unknown[]) {
      if (cell && symbolKeys.has(normaliseHeader(cell))) return i;
    }
  }
  return 0;
}

function parseRows(rawRows: unknown[][]): ParseResult {
  if (rawRows.length < 2) return { rows: [], detectedHeaders: [], mappedCols: {} };

  const headerIdx = findHeaderRowIndex(rawRows);
  const rawHeaders = (rawRows[headerIdx] as unknown[]);
  const headers = rawHeaders.map(normaliseHeader);
  const detectedHeaders = rawHeaders.map(h => String(h ?? '').trim());

  const colIndex: Record<string, number> = {};
  headers.forEach((h, i) => {
    const canonical = COL_MAP[h];
    if (canonical && !(canonical in colIndex)) colIndex[canonical] = i;
  });

  const results: ParsedRow[] = [];
  for (let r = headerIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r] as unknown[];
    const get = (key: string) => (colIndex[key] !== undefined ? row[colIndex[key]] : undefined);

    const symbol = String(get('symbol') ?? '').trim();
    if (!symbol || symbol === '0') continue;

    results.push({
      symbol,
      qty:      toNum(get('qty')),
      avgCost:  toNum(get('avgCost')),
      ltp:      toNum(get('ltp')),
      invested: toNum(get('invested')),
      curVal:   toNum(get('curVal')),
      pnl:      toNum(get('pnl')),
      netChg:   toNum(get('netChg')),
      dayChg:   toNum(get('dayChg')),
    });
  }
  return { rows: results, detectedHeaders, mappedCols: colIndex };
}

async function parseSpreadsheet(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  return parseRows(raw);
}

async function parseCsvText(file: File): Promise<ParseResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const raw = lines.map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
  return parseRows(raw);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DataManagementPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [mappedCols, setMappedCols] = useState<Record<string, number>>({});
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [importProgress, setImportProgress] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    setRows([]);
    setDetectedHeaders([]);
    setMappedCols({});
    setImportMsg('');
    setImportProgress('');

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      let result: ParseResult;

      if (ext === 'csv') {
        result = await parseCsvText(file);
      } else if (['xlsx', 'xls', 'ods'].includes(ext)) {
        result = await parseSpreadsheet(file);
      } else if (['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
        setParseError('PDF/image files are not supported. Please export as CSV or Excel from your broker.');
        return;
      } else {
        result = await parseCsvText(file);
      }

      setDetectedHeaders(result.detectedHeaders);
      setMappedCols(result.mappedCols);

      if (result.rows.length === 0) {
        setParseError(
          `No data rows found. Headers detected: [${result.detectedHeaders.join(', ')}]. ` +
          `Mapped columns: ${JSON.stringify(result.mappedCols)}. ` +
          `Make sure the file has Instrument/Symbol and Qty./Qty columns.`
        );
        return;
      }
      setRows(result.rows);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse file');
    }
  };

  /** Delete ALL existing holdings for this user, then insert fresh rows */
  const handleReplaceAll = async () => {
    if (!user?.id) { setImportMsg('❌ Not logged in'); return; }
    if (rows.length === 0) return;
    if (!window.confirm(`This will DELETE all existing holdings and replace with ${rows.length} rows from the file. Continue?`)) return;

    setImporting(true);
    setImportMsg('');
    setImportProgress('Step 1/2 — Deleting existing holdings…');

    try {
      // 1. Delete all existing holdings for this user
      await supabaseClient.delete(`/investment_holdings?user_id=eq.${user.id}`);

      setImportProgress('Step 2/2 — Importing new holdings…');

      // 2. Bulk insert all rows at once via Supabase REST
      const payload = rows.map((r) => ({
        user_id:        user.id,
        stock_symbol:   r.symbol,
        stock_name:     r.symbol,
        quantity:       r.qty,
        purchase_price: r.avgCost > 0 ? r.avgCost : (r.ltp > 0 ? r.ltp : 0.01),
        purchase_date:  new Date().toISOString().slice(0, 10),
        is_closed:      false,
      }));

      await supabaseClient.post('/investment_holdings', payload, {
        headers: { Prefer: 'return=minimal' },
      });

      // 3. Invalidate cache so Investments page refreshes
      qc.invalidateQueries({ queryKey: ['investments'] });

      setImportProgress('');
      setImportMsg(`✅ ${rows.length} holding(s) imported successfully. Go to the Investments tab to view them.`);
      setRows([]);
      setFileName('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setImportProgress('');
      setImportMsg(`❌ Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImporting(false);
    }
  };

  const handleClear = () => {
    setRows([]);
    setDetectedHeaders([]);
    setMappedCols({});
    setFileName('');
    setParseError('');
    setImportMsg('');
    setImportProgress('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#1e293b' }}>Data Management</h2>

      {/* ── Upload card ─────────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: 6 }}>Import Holdings from File</h3>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 14 }}>
          Upload your broker's holdings export — <strong>CSV</strong> or <strong>Excel (.xlsx / .xls)</strong>.
          Columns expected: <em>Instrument, Qty, Avg. cost, LTP, Invested, Cur. val, P&amp;L</em>.
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={uploadLabelStyle}>
            📂 Choose File
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,.ods"
              onChange={handleFile}
              style={{ display: 'none' }}
            />
          </label>
          {fileName && <span style={{ fontSize: 13, color: '#475569' }}>{fileName}</span>}
          {rows.length > 0 && !importing && (
            <>
              <button onClick={handleReplaceAll} style={btnStyle('#ef4444')}>
                🔄 Replace All Holdings ({rows.length} rows)
              </button>
              <button onClick={handleClear} style={btnStyle('#94a3b8')}>✕ Clear</button>
            </>
          )}
        </div>

        {rows.length > 0 && !importing && (
          <p style={{ fontSize: 12, color: '#b45309', marginTop: 8, background: '#fffbeb', padding: '6px 10px', borderRadius: 6, border: '1px solid #fde68a' }}>
            ⚠️ "Replace All Holdings" will delete your existing holdings and insert these {rows.length} rows fresh.
          </p>
        )}

        {/* Show detected headers for debugging */}
        {detectedHeaders.length > 0 && rows.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#475569', background: '#f8fafc', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <strong>Detected columns:</strong> {detectedHeaders.filter(Boolean).join(' | ')}
            {' · '}
            <strong>Qty mapped:</strong> {'qty' in mappedCols ? `✅ col ${mappedCols['qty']}` : '❌ NOT FOUND'}
            {' · '}
            <strong>Symbol mapped:</strong> {'symbol' in mappedCols ? `✅ col ${mappedCols['symbol']}` : '❌ NOT FOUND'}
          </div>
        )}

        {importProgress && (
          <div style={alertStyle('#eff6ff', '#1d4ed8', '#bfdbfe')}>
            ⏳ {importProgress}
          </div>
        )}

        {parseError && (
          <div style={alertStyle('#fef2f2', '#dc2626', '#fecaca')}>
            ❌ {parseError}
          </div>
        )}

        {importMsg && (
          <div style={alertStyle(
            importMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
            importMsg.startsWith('✅') ? '#166534' : '#dc2626',
            importMsg.startsWith('✅') ? '#bbf7d0' : '#fecaca',
          )}>
            {importMsg}
          </div>
        )}
      </div>

      {/* ── Preview table ────────────────────────────────────────────────────── */}
      {rows.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Preview — {rows.length} row(s) detected</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Instrument', 'Qty', 'Avg. Cost', 'LTP', 'Invested', 'Cur. Val', 'P&L', 'Net Chg.', 'Day Chg.'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{r.symbol}</td>
                    <td style={tdStyle}>{r.qty.toLocaleString('en-IN')}</td>
                    <td style={tdStyle}>{r.avgCost.toFixed(2)}</td>
                    <td style={tdStyle}>{r.ltp.toFixed(2)}</td>
                    <td style={tdStyle}>{r.invested.toFixed(2)}</td>
                    <td style={tdStyle}>{r.curVal.toFixed(2)}</td>
                    <td style={{ ...tdStyle, color: r.pnl >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {r.pnl.toFixed(2)}
                    </td>
                    <td style={{ ...tdStyle, color: r.netChg >= 0 ? '#16a34a' : '#dc2626' }}>
                      {r.netChg.toFixed(2)}
                    </td>
                    <td style={{ ...tdStyle, color: r.dayChg >= 0 ? '#16a34a' : '#dc2626' }}>
                      {r.dayChg.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 10, padding: 20,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};
const uploadLabelStyle: React.CSSProperties = {
  display: 'inline-block', background: '#3b82f6', color: '#fff',
  border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 14,
};
const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 6,
  padding: '8px 16px', cursor: 'pointer', fontSize: 14,
});
const alertStyle = (bg: string, color: string, border: string): React.CSSProperties => ({
  marginTop: 12, background: bg, border: `1px solid ${border}`,
  color, borderRadius: 8, padding: '10px 16px', fontSize: 14,
});
const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontWeight: 600,
  color: '#475569', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '8px 12px', color: '#334155', whiteSpace: 'nowrap',
};
