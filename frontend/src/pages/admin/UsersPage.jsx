import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import { copyText } from '../../lib/clipboard.js';
import PageLayout from '../../components/layout/PageLayout.jsx';
import GlassCard from '../../components/ui/GlassCard.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';
import { useTopBarCenter } from '../../contexts/PageMetaContext.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';

const ROLE_TABS = ['All', 'Admin', 'Faculty', 'Student'];

export default function UsersPage() {
  const navigate = useNavigate();
  const [users,   setUsers]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [roleTab, setRoleTab] = useState('All');
  const [search,  setSearch]  = useState('');
  const [showAddFaculty, setShowAddFaculty] = useState(false);
  const [facultyForm, setFacultyForm] = useState({ name: '', email: '', designation: '', phone: '' });
  const [creatingFaculty, setCreatingFaculty] = useState(false);
  const [createdFaculty, setCreatedFaculty] = useState(null);

  // Admin creation state
  const [showAddAdmin, setShowAddAdmin]   = useState(false);
  const [adminForm, setAdminForm]         = useState({ name: '', email: '', password: '', confirm: '' });
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [createdAdmin, setCreatedAdmin]   = useState(null);
  const [showAdminPwd, setShowAdminPwd]   = useState(false);

  const loadUsers = () => {
    setLoading(true);
    const params = {};
    if (roleTab !== 'All') params.role = roleTab.toLowerCase();
    api.get('/users', { params }).then(r => {
      setUsers(r.data.data);
      setTotal(r.data.total);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, [roleTab]);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const ROLE_VARIANT = { admin: 'academic', faculty: 'published', student: 'default' };
  const showFacultyActions = roleTab === 'All' || roleTab === 'Faculty';
  const showAdminActions   = roleTab === 'All' || roleTab === 'Admin';
  const searchNode = useMemo(() => (
    <SearchInput
      value={search}
      onChange={setSearch}
      placeholder={`Search ${total} users...`}
    />
  ), [search, total]);

  useTopBarCenter(searchNode);

  const resetFacultyModal = () => {
    setFacultyForm({ name: '', email: '', designation: '', phone: '' });
    setCreatedFaculty(null);
    setShowAddFaculty(false);
  };

  const resetAdminModal = () => {
    setAdminForm({ name: '', email: '', password: '', confirm: '' });
    setCreatedAdmin(null);
    setShowAddAdmin(false);
    setShowAdminPwd(false);
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (adminForm.password !== adminForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (adminForm.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setCreatingAdmin(true);
    try {
      const { data } = await api.post('/auth/register', {
        name:     adminForm.name.trim(),
        email:    adminForm.email.trim(),
        password: adminForm.password,
        role:     'admin',
      });
      setCreatedAdmin(data.user);
      toast.success('Admin account created');
      loadUsers();
      if (roleTab !== 'Admin') setRoleTab('Admin');
    } catch (err) {
      toast.error(err.response?.data?.message ?? err.message);
    } finally {
      setCreatingAdmin(false);
    }
  };

  const downloadFacultyCredentials = () => {
    if (!createdFaculty?.user?.email || !createdFaculty?.temp_password) return;

    const content = [
      'name,email,temp_password',
      `"${createdFaculty.user.name}","${createdFaculty.user.email}","${createdFaculty.temp_password}"`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'faculty-credentials.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyFacultyPassword = async () => {
    if (!createdFaculty?.temp_password) return;
    const copied = await copyText(createdFaculty.temp_password);
    if (copied) toast.success('Temporary password copied');
    else toast.error('Could not copy password');
  };

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    setCreatingFaculty(true);
    try {
      const payload = {
        name: facultyForm.name.trim(),
        email: facultyForm.email.trim(),
        designation: facultyForm.designation.trim() || null,
        phone: facultyForm.phone.trim() || null,
      };
      const { data } = await api.post('/users/faculty', payload);
      setCreatedFaculty(data);
      toast.success('Faculty created');
      loadUsers();
      if (roleTab !== 'Faculty') setRoleTab('Faculty');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreatingFaculty(false);
    }
  };

  return (
    <PageLayout title="Users">
      <div className="page-container space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-muted">
              User Directory
            </p>
            <p className="text-sm text-on-surface-variant">
              {filtered.length} of {total} user{total !== 1 ? 's' : ''} visible
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showAdminActions && (
              <button
                type="button"
                onClick={() => setShowAddAdmin(true)}
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/10"
              >
                <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                Add Admin
              </button>
            )}
            {showFacultyActions && (
              <button
                type="button"
                onClick={() => setShowAddFaculty(true)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-card px-4 py-2 text-sm font-semibold text-on-surface shadow-sm transition-colors hover:bg-surface-variant"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Add Faculty
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(`/admin/settings/users/import?type=${showFacultyActions ? 'faculty' : 'student'}`)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-card px-4 py-2 text-sm font-semibold text-on-surface shadow-sm transition-colors hover:bg-surface-variant"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              {showFacultyActions ? 'Import Faculty CSV' : 'Import CSV'}
            </button>
          </div>
        </div>

        {/* Role filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ROLE_TABS.map(t => (
            <button key={t} onClick={() => setRoleTab(t)}
              className={`flex-none px-5 py-2 rounded-full font-bold text-sm transition-colors ${roleTab === t ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/40 text-on-surface-variant border border-white/20 hover:bg-white/60'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? <FullPageSpinner /> : filtered.length === 0 ? (
          <EmptyState icon="group" title="No users found" />
        ) : (
          <div className="space-y-3">
            {filtered.map(u => (
              <GlassCard key={u.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary text-sm">person</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-on-surface text-sm truncate">{u.name}</p>
                  <p className="text-xs text-on-surface-variant truncate">{u.email}</p>
                  {u.role === 'faculty' && (
                    <div className="flex flex-wrap items-center mt-1.5 gap-x-2 gap-y-1 text-[10px]">
                      {u.designation && <span className="font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded font-mono">{u.designation}</span>}
                      {u.phone && <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-mono">{u.phone}</span>}
                    </div>
                  )}
                  {u.role === 'student' && (
                    <div className="flex flex-wrap items-center mt-1.5 gap-x-2 gap-y-1 text-[10px]">
                      {u.programme_name && <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono">{u.programme_name}</span>}
                      {u.branch_name && <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-mono">{u.branch_name}</span>}
                      {u.current_semester && <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-mono">Sem {u.current_semester}</span>}
                      {u.section && <span className="font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded font-mono">Sec {u.section}</span>}
                      {u.admission_year && <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono">Batch {u.admission_year}</span>}
                      {u.academic_year && <span className="font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-mono">AY {u.academic_year}</span>}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge variant={ROLE_VARIANT[u.role] ?? 'default'}>{u.role}</Badge>
                  {!u.is_active && <span className="text-[9px] text-error font-bold uppercase">Inactive</span>}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <Modal open={showAddAdmin} onClose={resetAdminModal} title="Add Administrator">
        {createdAdmin ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-emerald-600 text-[22px] flex-shrink-0 mt-0.5">check_circle</span>
              <div>
                <p className="text-sm font-semibold text-emerald-800">{createdAdmin.name}</p>
                <p className="text-xs text-emerald-700 mt-0.5">{createdAdmin.email}</p>
                <p className="text-xs text-emerald-600 mt-1.5">Admin account created. They can log in immediately with the password you set.</p>
              </div>
            </div>
            <Button type="button" full onClick={resetAdminModal} icon="check">Done</Button>
          </div>
        ) : (
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-2 items-start">
              <span className="material-symbols-outlined text-amber-600 text-[18px] flex-shrink-0 mt-0.5">warning</span>
              <p className="text-xs text-amber-800 leading-relaxed">
                Admins have full access to all data, forms, and settings. Only create accounts for trusted users.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-on-surface-variant">Full Name</label>
              <input
                className="field-input"
                placeholder="e.g. Dr. Priya Sharma"
                value={adminForm.name}
                onChange={e => setAdminForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-on-surface-variant">Email</label>
              <input
                type="email"
                className="field-input"
                placeholder="admin@college.edu"
                value={adminForm.email}
                onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-on-surface-variant">Password</label>
              <div className="relative">
                <input
                  type={showAdminPwd ? 'text' : 'password'}
                  className="field-input pr-10"
                  placeholder="Min. 8 characters"
                  value={adminForm.password}
                  onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-muted hover:text-on-surface transition-colors"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showAdminPwd ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-on-surface-variant">Confirm Password</label>
              <input
                type={showAdminPwd ? 'text' : 'password'}
                className={`field-input ${adminForm.confirm && adminForm.confirm !== adminForm.password ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''}`}
                placeholder="Re-enter password"
                value={adminForm.confirm}
                onChange={e => setAdminForm(f => ({ ...f, confirm: e.target.value }))}
                required
              />
              {adminForm.confirm && adminForm.confirm !== adminForm.password && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              full
              loading={creatingAdmin}
              icon="admin_panel_settings"
              disabled={!adminForm.name || !adminForm.email || !adminForm.password || adminForm.password !== adminForm.confirm}
            >
              Create Admin Account
            </Button>
          </form>
        )}
      </Modal>

      <Modal open={showAddFaculty} onClose={resetFacultyModal} title="Add Faculty">
        {createdFaculty ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">{createdFaculty.user.name}</p>
              <p className="text-xs text-emerald-700 mt-1">{createdFaculty.user.email}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Temporary Password</p>
              <p className="font-mono text-lg font-bold text-amber-900">{createdFaculty.temp_password}</p>
              <p className="text-xs text-amber-800">Shown only once. Share it securely and ask the faculty member to change it on first login.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button type="button" variant="secondary" onClick={handleCopyFacultyPassword} icon="content_copy">
                Copy Password
              </Button>
              <Button type="button" variant="secondary" onClick={downloadFacultyCredentials} icon="download">
                Download CSV
              </Button>
            </div>
            <Button type="button" full onClick={resetFacultyModal}>Done</Button>
          </div>
        ) : (
          <form onSubmit={handleCreateFaculty} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-on-surface-variant">Name</label>
              <input
                className="field-input"
                value={facultyForm.name}
                onChange={(e) => setFacultyForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-on-surface-variant">Email</label>
              <input
                type="email"
                className="field-input"
                value={facultyForm.email}
                onChange={(e) => setFacultyForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-on-surface-variant">Designation</label>
              <input
                className="field-input"
                value={facultyForm.designation}
                onChange={(e) => setFacultyForm((f) => ({ ...f, designation: e.target.value }))}
                placeholder="Lecturer"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-on-surface-variant">Phone</label>
              <input
                className="field-input"
                value={facultyForm.phone}
                onChange={(e) => setFacultyForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="9438349394"
              />
            </div>
            <Button type="submit" full loading={creatingFaculty} icon="person_add">
              Create Faculty
            </Button>
          </form>
        )}
      </Modal>
    </PageLayout>
  );
}
