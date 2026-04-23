import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import PageLayout from '../../components/layout/PageLayout.jsx';
import GlassCard from '../../components/ui/GlassCard.jsx';
import FAB from '../../components/ui/FAB.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';

const COLORS = ['primary', 'secondary', 'accent-pink', 'success'];
const ICONS  = ['computer', 'sensors', 'lan', 'precision_manufacturing', 'biotech'];

export default function BranchesPage() {
  const { programmeId } = useParams();
  const navigate = useNavigate();
  const [branches,   setBranches]   = useState([]);
  const [programme,  setProgramme]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(false);
  const [name,       setName]       = useState('');
  const [saving,     setSaving]     = useState(false);

  const load = async () => {
    const [progRes, branchRes] = await Promise.all([
      api.get('/programmes'),
      api.get(`/programmes/${programmeId}/branches`),
    ]);
    setProgramme(progRes.data.data.find(p => p.id === programmeId));
    setBranches(branchRes.data.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, [programmeId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/branches', { programme_id: programmeId, name });
      toast.success('Branch created');
      setModal(false);
      setName('');
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <FullPageSpinner />;

  return (
    <PageLayout title="Branches Management" showBack>
      <div className="page-container space-y-8">
        {/* Context */}
        <section>
          <p className="section-label">Active Programme</p>
          <GlassCard className="p-6">
            <h2 className="font-headline font-extrabold text-4xl text-on-surface tracking-tight">{programme?.name}</h2>
            <p className="text-on-surface-variant text-sm mt-1">Manage branches under this programme</p>
          </GlassCard>
        </section>

        <div className="space-y-4">
          <h3 className="font-headline font-bold text-lg text-on-surface px-1">Academic Branches</h3>

          {branches.length === 0 ? (
            <EmptyState icon="account_tree" title="No branches yet" description="Add branches to this programme." />
          ) : branches.map((branch, i) => (
            <GlassCard
              key={branch.id}
              className="p-5 flex items-center justify-between hover:scale-[1.01] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-${COLORS[i % COLORS.length]}/10 flex items-center justify-center text-${COLORS[i % COLORS.length]} border border-${COLORS[i % COLORS.length]}/20`}>
                  <span className="material-symbols-outlined">{ICONS[i % ICONS.length]}</span>
                </div>
                <div>
                  <h4 className="font-headline font-extrabold text-lg text-on-surface leading-tight">{branch.name}</h4>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      <FAB onClick={() => setModal(true)} icon="add" label="Branch" />

      <Modal open={modal} onClose={() => setModal(false)} title="New Branch">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Branch Name" placeholder="e.g., Computer Science Engineering" value={name} onChange={e => setName(e.target.value)} required />
          <Button type="submit" full loading={saving}>Create Branch</Button>
        </form>
      </Modal>
    </PageLayout>
  );
}
