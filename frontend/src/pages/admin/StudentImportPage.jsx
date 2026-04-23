import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import PageLayout from '../../components/layout/PageLayout.jsx';
import GlassCard from '../../components/ui/GlassCard.jsx';
import Button from '../../components/ui/Button.jsx';

const SAMPLE_CSV = `registration_number,name,programme,branch,current_semester,admission_year,section,phone,email
23110625,ABHAY ABHINANDAN,B.Tech,Information Technology,6,2023,A,7000000000,abhay@college.edu
23110626,ABHIJIT PANDA,B.Tech,Information Technology,6,2023,A,7000000001,abhijit@college.edu`;

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return { rows: [], error: 'CSV must include a header row and at least one data row.' };

  const headers = lines[0].split(',').map((value) => value.trim().toLowerCase());
  const required = ['registration_number', 'name', 'programme', 'branch', 'current_semester', 'admission_year', 'section', 'phone', 'email'];
  const missing = required.filter((column) => !headers.includes(column));
  if (missing.length > 0) {
    return { rows: [], error: `Missing columns: ${missing.join(', ')}` };
  }

  const rows = lines.slice(1).map((line, index) => {
    const values = line.split(',').map((value) => value.trim());
    const row = {};
    headers.forEach((header, columnIndex) => {
      row[header] = values[columnIndex] || null;
    });

    return {
      name: row.name,
      email: row.email,
      registration_number: row.registration_number,
      role: 'student',
      programme: row.programme,
      branch: row.branch,
      current_semester: row.current_semester ? Number(row.current_semester) : null,
      admission_year: row.admission_year ? Number(row.admission_year) : null,
      section: row.section,
      phone: row.phone,
      source_row: index + 2,
    };
  });

  return { rows, error: null };
}

export default function StudentImportPage() {
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const parsed = useMemo(() => {
    if (!csvText.trim()) return null;
    return parseCSV(csvText);
  }, [csvText]);

  const handleImport = async () => {
    if (!parsed || parsed.error || parsed.rows.length === 0) return;
    setLoading(true);
    try {
      const { data } = await api.post('/users/import', { users: parsed.rows });
      setResult(data);
      if ((data.inserted ?? data.imported) > 0) toast.success(`${data.inserted ?? data.imported} students inserted`);
      if ((data.skipped ?? data.failed) > 0) toast.error(`${data.skipped ?? data.failed} rows skipped`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title="Import Students" showBack>
      <div className="page-container space-y-6">
        <GlassCard className="p-5 space-y-2">
          <p className="font-bold text-on-surface text-sm">ERP CSV Format</p>
          <pre className="text-[10px] text-on-surface-variant bg-white/30 rounded-xl p-3 overflow-x-auto font-mono">
            {SAMPLE_CSV}
          </pre>
          <button type="button" onClick={() => setCsvText(SAMPLE_CSV)} className="text-xs font-bold text-primary">
            Load sample data
          </button>
        </GlassCard>

        <div className="space-y-2">
          <label className="label-caps">Paste CSV Data</label>
          <textarea
            className="glass-input resize-none font-mono text-xs"
            rows={12}
            placeholder="registration_number,name,programme,branch,current_semester,admission_year,section,phone,email"
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
          />
        </div>

        {parsed?.error && (
          <GlassCard className="p-4 border-red-200 bg-red-50">
            <p className="text-sm text-red-700">{parsed.error}</p>
          </GlassCard>
        )}

        <Button type="button" full loading={loading} onClick={handleImport} icon="upload" disabled={!parsed || !!parsed.error}>
          Import Students
        </Button>

        {result && (
          <GlassCard className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-100/40 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold font-headline text-emerald-700">{result.inserted ?? result.imported}</p>
                <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mt-1">Inserted</p>
              </div>
              <div className="bg-red-100/40 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold font-headline text-red-700">{result.skipped ?? result.failed}</p>
                <p className="text-[10px] text-red-700 font-bold uppercase tracking-wider mt-1">Skipped</p>
              </div>
            </div>

            {result.errors?.length > 0 && (
              <div className="space-y-2">
                <p className="label-caps">Errors</p>
                {result.errors.map((error, index) => (
                  <div key={index} className="text-xs text-error bg-red-100/30 rounded-xl p-3">
                    Row {error.row}: {error.reason}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )}
      </div>
    </PageLayout>
  );
}
