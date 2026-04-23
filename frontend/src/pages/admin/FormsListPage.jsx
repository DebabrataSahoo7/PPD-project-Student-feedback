import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import { copyText } from '../../lib/clipboard.js';
import PageLayout from '../../components/layout/PageLayout.jsx';
import FormCard from '../../components/forms/FormCard.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';
import ActionSheet from '../../components/ui/ActionSheet.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import { useTopBarCenter } from '../../contexts/PageMetaContext.jsx';

const MODE_OPTIONS   = ['Academic', 'Simple'];
const STATUS_OPTIONS = ['Draft', 'Published', 'Closed'];

export default function FormsListPage() {
  const navigate = useNavigate();

  const [forms,      setForms]      = useState([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [modes,      setModes]      = useState([]);      // [] = all
  const [statuses,   setStatuses]   = useState([]);      // [] = all
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeForm, setActiveForm] = useState(null);
  const [deleting,   setDeleting]   = useState(false);

  // ── Inject search into TopBar center slot ──────────────────
  const searchNode = useMemo(() => (
    <SearchInput
      value={search}
      onChange={setSearch}
      placeholder={`Search ${total} forms…`}
    />
  ), [search, total]);

  useTopBarCenter(searchNode);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (modes.length === 1)    params.mode   = modes[0].toLowerCase();
      if (statuses.length === 1) params.status = statuses[0].toLowerCase();
      const { data } = await api.get('/forms', { params });
      setForms(data.data);
      setTotal(data.total);
    } catch {
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  }, [modes, statuses]);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  // ── Client-side search filter ──────────────────────────────
  const filtered = useMemo(() =>
    forms.filter(f => f.title.toLowerCase().includes(search.toLowerCase())),
    [forms, search]
  );

  // ── Active filter count ────────────────────────────────────
  const activeFilterCount = modes.length + statuses.length;

  // ── Toggle helpers ─────────────────────────────────────────
  const toggleMode   = (v) => setModes(p   => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const toggleStatus = (v) => setStatuses(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  // ── Actions ────────────────────────────────────────────────
  const handleCopy = async (formId) => {
    try {
      const { data } = await api.get(`/forms/${formId}`);
      const copied = await copyText(`${window.location.origin}/f/${data.share_token}`);
      if (!copied) throw new Error('copy-failed');
      toast.success('Share link copied!');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleDelete = async () => {
    if (!activeForm || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/forms/${activeForm.id}`);
      setForms(prev => prev.filter(f => f.id !== activeForm.id));
      setTotal(prev => prev - 1);
      toast.success('Form deleted');
      setActiveForm(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete form');
    } finally {
      setDeleting(false);
    }
  };

  const actionSheetActions = activeForm ? [
    { label: 'Copy Share Link', icon: 'content_copy', variant: 'default', onClick: () => handleCopy(activeForm.id) },
    { label: 'Edit Form',       icon: 'edit',         variant: 'default', onClick: () => navigate(`/admin/forms/${activeForm.id}/builder`) },
    { label: deleting ? 'Deleting…' : 'Delete Form', icon: 'delete', variant: 'danger', onClick: handleDelete },
  ] : [];

  return (
    <PageLayout title="All Forms" showBack>
      <div className="page-container space-y-4">

        {/* ── Filter toolbar ── */}
        <div className="flex items-center gap-2">
          {/* Filter button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                activeFilterCount > 0
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-surface-card border-border text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              Filter
              {activeFilterCount > 0 && (
                <span className="bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter popover */}
            {filterOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setFilterOpen(false)} />
                <div className="absolute left-0 top-11 z-40 bg-surface-card border border-border rounded-xl shadow-elevated w-64 p-4 space-y-4">
                  {/* Mode */}
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider mb-2">Mode</p>
                    <div className="flex flex-wrap gap-2">
                      {MODE_OPTIONS.map(v => (
                        <button key={v} type="button" onClick={() => toggleMode(v)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            modes.includes(v)
                              ? 'bg-primary text-white border-primary'
                              : 'bg-surface-variant border-border text-on-surface-variant hover:border-primary/40'
                          }`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Status */}
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider mb-2">Status</p>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map(v => (
                        <button key={v} type="button" onClick={() => toggleStatus(v)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            statuses.includes(v)
                              ? 'bg-primary text-white border-primary'
                              : 'bg-surface-variant border-border text-on-surface-variant hover:border-primary/40'
                          }`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Clear */}
                  {activeFilterCount > 0 && (
                    <button type="button"
                      onClick={() => { setModes([]); setStatuses([]); setFilterOpen(false); }}
                      className="w-full text-xs font-semibold text-red-500 hover:text-red-600 pt-2 border-t border-border-subtle transition-colors">
                      Clear all filters
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Active filter chips */}
          {[...modes.map(v => ({ label: v, remove: () => toggleMode(v) })),
            ...statuses.map(v => ({ label: v, remove: () => toggleStatus(v) }))
          ].map(chip => (
            <span key={chip.label}
              className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-primary/20">
              {chip.label}
              <button type="button" onClick={chip.remove} className="hover:text-primary/60 transition-colors">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          ))}

          {/* Result count */}
          <span className="ml-auto text-xs text-on-surface-muted flex-shrink-0">
            {filtered.length} form{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── List ── */}
        {loading ? (
          <FullPageSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState icon="description" title="No forms found"
            description={search || activeFilterCount > 0 ? 'Try adjusting your search or filters.' : 'Create your first form to get started.'} />
        ) : (
          <div className="space-y-3">
            {filtered.map(f => (
              <FormCard key={f.id} form={f}
                onCopy={() => handleCopy(f.id)}
                onMore={() => setActiveForm(f)} />
            ))}
          </div>
        )}
      </div>

      <ActionSheet
        open={!!activeForm}
        onClose={() => setActiveForm(null)}
        title="Form Actions"
        subtitle={activeForm?.title}
        actions={actionSheetActions}
      />
    </PageLayout>
  );
}
