import { useState } from 'react';
import { exportData, importData, confirmImport, resetData } from '../api/dataManagement';

export default function DataManagementPage() {
  const [importErrors, setImportErrors] = useState<{ row: number; field: string; reason: string }[]>([]);
  const [importReady, setImportReady] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!importFile) return;
    setLoading(true);
    setMessage('');
    setImportErrors([]);
    try {
      const result = await importData(importFile);
      if (result.errors && result.errors.length > 0) {
        setImportErrors(result.errors);
        setImportReady(false);
      } else {
        setImportReady(true);
        setMessage('File validated successfully. Click "Confirm Import" to apply.');
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!window.confirm('This will replace ALL existing data. Are you sure?')) return;
    setLoading(true);
    try {
      await confirmImport();
      setMessage('✅ Data imported successfully.');
      setImportReady(false);
      setImportFile(null);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Confirm failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('This will reset ALL data to defaults. Are you sure?')) return;
    setLoading(true);
    try {
      await resetData();
      setMessage('✅ Data reset to defaults.');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#1e293b' }}>Data Management</h2>

      {message && (
        <div style={{ background: '#f0fdf4', border: '1px solid #22c55e', color: '#166534', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 14 }}>
          {message}
        </div>
      )}

      {/* Export */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: 8 }}>Export Data</h3>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 12 }}>
          Download all your financial data as a CSV file.
        </p>
        <button onClick={exportData} style={btnStyle('#22c55e')}>⬇️ Export CSV</button>
      </div>

      {/* Import */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Import Data</h3>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 12 }}>
          Upload a previously exported CSV file. This will replace all existing data after confirmation.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportReady(false); setImportErrors([]); }}
            style={{ fontSize: 14 }}
          />
          <button onClick={handleImport} disabled={!importFile || loading} style={btnStyle('#3b82f6')}>
            {loading ? 'Validating…' : 'Validate'}
          </button>
          {importReady && (
            <button onClick={handleConfirm} disabled={loading} style={btnStyle('#f59e0b')}>
              Confirm Import
            </button>
          )}
        </div>
        {importErrors.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: 8 }}>
              ❌ {importErrors.length} validation error(s):
            </p>
            <table style={{ fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fef2f2' }}>
                  <th style={thStyle}>Row</th>
                  <th style={thStyle}>Field</th>
                  <th style={thStyle}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {importErrors.map((err, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #fecaca' }}>
                    <td style={tdStyle}>{err.row}</td>
                    <td style={tdStyle}>{err.field}</td>
                    <td style={tdStyle}>{err.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reset */}
      <div style={{ ...cardStyle, marginTop: 16, border: '1px solid #fecaca' }}>
        <h3 style={{ marginBottom: 8, color: '#dc2626' }}>Reset Data</h3>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 12 }}>
          Reset all data to the pre-populated defaults (salary, car loan, fixed expenses). This cannot be undone.
        </p>
        <button onClick={handleReset} disabled={loading} style={btnStyle('#ef4444')}>
          🗑️ Reset to Defaults
        </button>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
const btnStyle = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 14 });
const thStyle: React.CSSProperties = { padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' };
const tdStyle: React.CSSProperties = { padding: '6px 12px', color: '#334155' };
