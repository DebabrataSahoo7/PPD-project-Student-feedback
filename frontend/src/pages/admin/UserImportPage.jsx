import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import { copyText } from '../../lib/clipboard.js';
import PageLayout from '../../components/layout/PageLayout.jsx';
import GlassCard from '../../components/ui/GlassCard.jsx';
import Button from '../../components/ui/Button.jsx';

const SAMPLE_CSV = {
  faculty: `name,designation,email,phoneno,department
Dr. Stithapragyan Mohanty,Lecturer,sthitapragyanit@outr.ac.in,7008965600,
Dr. Ranjan Kumar Dash,Asso. Professor & HOD,rkdas@outr.ac.in,9437360517,`,
  student: `registration_number,name,programme,branch,current_semester,admission_year,section,phone,email
23110625,ABHAY ABHINANDAN,B.Tech,Information Technology,6,2023,A,7000000000,abhay@college.edu
23110626,ABHIJIT PANDA,B.Tech,Information Technology,6,2023,A,7000000001,abhijit@college.edu`,
};

export default function UserImportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const importType = searchParams.get('type') === 'student' ? 'student' : 'faculty';
  const [csvText, setCsvText] = useState('');
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const currentSample = useMemo(() => SAMPLE_CSV[importType], [importType]);

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).filter(Boolean).map((line, index) => {
      const vals = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || null; });
      if (importType === 'faculty') {
        return {
          name: obj.name,
          email: obj.email,
          designation: obj.designation ?? null,
          phone: obj.phone ?? obj.phoneno ?? null,
          role: 'faculty',
        };
      }
      return {
        name: obj.name,
        email: obj.email,
        registration_number: obj.registration_number ?? null,
        role: 'student',
        programme: obj.programme ?? null,
        branch: obj.branch ?? null,
        current_semester: obj.current_semester ? Number(obj.current_semester) : null,
        section: obj.section ?? null,
        phone: obj.phone ?? null,
        admission_year: obj.admission_year ? Number(obj.admission_year) : null,
        academic_year: obj.academic_year ?? null,
        programme_id: obj.programme_id ?? null,
        branch_id: obj.branch_id ?? null,
        source_row: index + 2,
      };
    });
  };

  const handleFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  };

  const handleImport = async () => {
    if (!csvText.trim()) { toast.error('Paste CSV data first'); return; }
    setLoading(true);
    try {
      const users = parseCSV(csvText);
      const { data } = await api.post('/users/import', { users });
      setResult(data);
      if ((data.inserted ?? data.imported) > 0) toast.success(`${data.inserted ?? data.imported} users inserted`);
      if ((data.skipped ?? data.failed) > 0)   toast.error(`${data.skipped ?? data.failed} rows skipped`);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const facultyCredentials = result?.imported_faculty_credentials ?? [];

  const downloadFacultyCredentials = () => {
    if (facultyCredentials.length === 0) return;

    const rows = [
      'email,temp_password',
      ...facultyCredentials.map((item) => `"${item.email}","${item.temp_password}"`),
    ];

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'faculty-import-credentials.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyFacultyCredentials = async () => {
    if (facultyCredentials.length === 0) return;

    const text = facultyCredentials
      .map((item) => `${item.email}: ${item.temp_password}`)
      .join('\n');

    const copied = await copyText(text);
    if (copied) toast.success('Faculty credentials copied');
    else toast.error('Could not copy credentials');
  };

  return (
    <PageLayout title={importType === 'faculty' ? 'Import Faculty' : 'Import Users'} showBack>
      <div className="page-container space-y-6">

        <GlassCard className="p-5 space-y-2">
          <p className="font-bold text-on-surface text-sm">CSV Format</p>
          <pre className="text-[10px] text-on-surface-variant bg-white/30 rounded-xl p-3 overflow-x-auto font-mono">
            {currentSample}
          </pre>
          <button type="button" onClick={() => setCsvText(currentSample)} className="text-xs font-bold text-primary">
            Load sample data
          </button>
        </GlassCard>

        <GlassCard className="p-5 space-y-3">
          <p className="label-caps">Upload CSV File</p>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-card px-6 py-10 text-center transition-colors hover:bg-surface-variant">
            <span className="material-symbols-outlined text-4xl text-on-surface-muted">upload_file</span>
            <span className="mt-3 text-sm font-semibold text-on-surface">Drop CSV file here or click to browse</span>
            <span className="mt-1 text-xs text-on-surface-variant">Supports .csv files</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        </GlassCard>

        <div className="space-y-2">
          <label className="label-caps">Paste CSV Data</label>
          <textarea
            className="glass-input resize-none font-mono text-xs"
            rows={10}
            placeholder={importType === 'faculty'
              ? 'name,designation,email,phoneno,department'
              : 'registration_number,name,programme,branch,current_semester,admission_year,section,phone,email'}
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
          />
        </div>

        <Button type="button" full loading={loading} onClick={handleImport} icon="upload">
          Import Users
        </Button>

        {/* Results */}
        {result && (
          <GlassCard className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-100/40 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold font-headline text-emerald-700">{result.inserted ?? result.imported}</p>
                <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mt-1">Inserted</p>
              </div>
              <div className="bg-sky-100/40 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold font-headline text-sky-700">{result.updated ?? 0}</p>
                <p className="text-[10px] text-sky-700 font-bold uppercase tracking-wider mt-1">Updated</p>
              </div>
              <div className="bg-red-100/40 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold font-headline text-red-700">{result.skipped ?? result.failed}</p>
                <p className="text-[10px] text-red-700 font-bold uppercase tracking-wider mt-1">Skipped</p>
              </div>
            </div>

            {result.errors?.length > 0 && (
              <div className="space-y-2">
                <p className="label-caps">Errors</p>
                {result.errors.map((e, i) => (
                  <div key={i} className="text-xs text-error bg-red-100/30 rounded-xl p-3">
                    Row {e.row}: {e.email} — {e.reason}
                  </div>
                ))}
              </div>
            )}

            {facultyCredentials.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="label-caps text-amber-700">Faculty Temp Passwords (save now!)</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={handleCopyFacultyCredentials} icon="content_copy">
                      Copy All
                    </Button>
                    <Button type="button" variant="secondary" onClick={downloadFacultyCredentials} icon="download">
                      Download CSV
                    </Button>
                  </div>
                </div>
                {facultyCredentials.map((f, i) => (
                  <div key={i} className="text-xs bg-amber-100/40 rounded-xl p-3 flex justify-between">
                    <span className="font-semibold">{f.email}</span>
                    <span className="font-mono font-bold text-amber-800">{f.temp_password}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-on-surface-variant italic">{result.message}</p>
          </GlassCard>
        )}
      </div>
    </PageLayout>
  );
}
