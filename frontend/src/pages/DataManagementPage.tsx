import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useAddHolding } from '../api/investments';

// ── Column aliases ────────────────────────────────────────────────────────────
// Maps various header spellings → our canonical key
const COL_MAP: Record<string, string> = {
  // Symbol / Instrument
  instrument: 'symbol',
  symbol: 'symbol',
  ticker: 'symbol',
  stock: 'symbol',
  scrip: 'symbol',
  name: 'symbol',
  'stock name': 'symbol',
  'stock symbol': 'symbol',

  // Quantity
  qty: 'qty',
  quantity: 'qty',
  shares: 'qty',
  units: 'qty',

  // Average / Buy price
  'avg. cost': 'avgCost',
  'avg cost': 'avgCost',
  'average cost': 'avgCost',
  'avg price': 'avgCost',
  'average price': 'avgCost',
  'buy price': 'avgCost',
  'purchase price': 'avgCost',
  ltp: 'ltp',
  'last price': 'ltp',
  'current price': 'ltp',
  price: 'ltp',

  // Invested
  invested: 'invested',
  'invested amount': 'invested',
  'total invested': 'invested',
  'buy value': 'invested',

  // Current value
  'cur. val': 'curVal',
  'cur val': 'curVal',
  'current value': 'curVal',
  'market value': 'curVal',
  value: 'curVal',

  // P&L
  'p&l': 'pnl',
  pnl: 'pnl',
  'profit & loss': 'pnl',
  'profit/loss': 'pnl',
  'unrealised p&l': 'pnl',
  gain: 'pnl',
  'gain/loss': 'pnl',

  // Net change
  'net chg.': 'netChg',
  'net chg': 'netChg',
  'net change': 'netChg',

  // Day change
  'day chg.': 'dayChg',
  'day chg': 'dayChg',
  'day change': 'dayChg',
  'day %': 'dayChg',
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

function normaliseHeader(h: unknown): string {
  if (h === null || h === undefined) return '';
  return h.toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  // Handle numbers that Excel stores as actual numbers (not strings)
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

/** Find the header row index — scans up to first 5 rows for one that contains
 *  a known symbol-column keyword. Handles files where row 1 is blank or a title. */
function findHeaderRowIndex(rawRows: unknown[][]): number {
  const symbolKeys = new Set(
    Object.entries(COL_MAP)
      .filter(([, v]) => v === 'symbol')
      .map(([k]) => k)
  );
  for (let i = 0; i < Math.min(5, rawRows.length); i++) {
    const row = rawRows[i] as unknown[];
    for (const cell of row) {
      if (cell && symbolKeys.has(normaliseHeader(cell))) return i;
    }
  }
  return 0; // fallback: assume first row is header
}

/** Parse a 2-D array of rows into ParsedRow[] — auto-detects header row */
function parseRows(rawRows: unknown[][]): ParsedRow[] {
  if (rawRows.length < 2) return [];

  const headerIdx = findHeaderRowIndex(rawRows);
  const headers = (rawRows[headerIdx] as unknown[]).map(normaliseHeader);

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
    if (!symbol || symbol === '0') continue; // skip blank / zero rows

    results.push({
      symbol,
      qty: toNum(get('qty')),
      avgCost: toNum(get('avgCost')),
      ltp: toNum(get('ltp')),
      invested: toNum(get('invested')),
      curVal: toNum(get('curVal')),
      pnl: toNum(get('pnl')),
      netChg: toNum(get('netChg')),
      dayChg: toNum(get('dayChg')),
    });
  }
  return results;
}

/** Read XLSX / XLS / CSV via SheetJS */
async function parseSpreadsheet(file: File): Promise<ParsedRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  return parseRows(raw);
}

/** Read a plain CSV text file */
async function parseCsvText(file: File): Promise<ParsedRow[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const raw = lines.map((l) =>
    l.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
  );
  return parseRows(raw);
}

export default function DataManagementPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const addHolding = useAddHolding();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    setRows([]);
    setImportMsg('');

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      let parsed: ParsedRow[] = [];

      if (ext === 'csv') {
        parsed = await parseCsvText(file);
      } else if (['xlsx', 'xls', 'ods'].includes(ext)) {
        parsed = await parseSpreadsheet(file);
      } else if (['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
        setParseError(
          'PDF and image files require server-side OCR which is not yet configured. ' +
          'Please export your holdings as CSV or Excel from your broker and upload that instead.'
        );
        return;
      } else {
        // Try treating as CSV anyway
        parsed = await parseCsvText(file);
      }

      if (parsed.length === 0) {
        setParseError('No data rows found. Make sure the file has a header row and at least one data row.');
        return;
      }
      setRows(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse file');
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    setImportMsg('');
    let success = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await addHolding.mutateAsync({
          stockSymbol: row.symbol,
          stockName: row.symbol,
          quantity: row.qty,           // exact value from file — no fallback
          purchasePrice: row.avgCost,  // exact avg cost from file
          purchaseDate: new Date().toISOString().slice(0, 10),
        });
        success++;
      } catch {
        failed++;
      }
    }
    setImporting(false);
    setImportMsg(
      failed === 0
        ? `✅ ${success} holding(s) imported successfully. Go to the Investments tab to view them.`
        : `⚠️ ${success} imported, ${failed} failed.`
    );
    if (success > 0) {
      setRows([]);
      setFileName('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleClear = () => {
    setRows([]);
    setFileName('');
    setParseError('');
    setImportMsg('');
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
          The file should have columns like <em>Instrument, Qty, Avg. cost, LTP, Invested, Cur. val, P&amp;L</em>.
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={uploadLabelStyle}>
            📂 Choose File
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,.ods,.pdf,.png,.jpg,.jpeg,.webp"
              onChange={handleFile}
              style={{ display: 'none' }}
            />
          </label>
          {fileName && <span style={{ fontSize: 13, color: '#475569' }}>{fileName}</span>}
          {rows.length > 0 && (
            <>
              <button onClick={handleImport} disabled={importing} style={btnStyle('#22c55e')}>
                {importing ? 'Importing…' : `⬆️ Import ${rows.length} row(s) to Investments`}
              </button>
              <button onClick={handleClear} style={btnStyle('#94a3b8')}>✕ Clear</button>
            </>
          )}
        </div>

        {parseError && (
          <div style={alertStyle('#fef2f2', '#dc2626', '#fecaca')}>
            ❌ {parseError}
          </div>
        )}

        {importMsg && (
          <div style={alertStyle('#f0fdf4', '#166534', '#bbf7d0')}>
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
                    <td style={tdStyle}>{r.qty}</td>
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
  background: '#fff',
  borderRadius: 10,
  padding: 20,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};

const uploadLabelStyle: React.CSSProperties = {
  display: 'inline-block',
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: 14,
};

const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: 14,
});

const alertStyle = (bg: string, color: string, border: string): React.CSSProperties => ({
  marginTop: 12,
  background: bg,
  border: `1px solid ${border}`,
  color,
  borderRadius: 8,
  padding: '10px 16px',
  fontSize: 14,
});

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#475569',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  color: '#334155',
  whiteSpace: 'nowrap',
};
