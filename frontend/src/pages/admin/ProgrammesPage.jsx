import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function ProgrammesPage() {
  const navigate = useNavigate();
  const [programmes, setProgrammes] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(false);
  const [name, setName]             = useState('');
  const [saving, setSaving]         = useState(false);

  const load = () => api.get('/programmes').then(r => { setProgrammes(r.data.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/programmes', { name });
      toast.success('Programme created');
      setModal(false);
      setName('');
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <FullPageSpinner />;

  return (
    <PageLayout title="Programmes" showBack>
      <div className="page-container space-y-8">
        <section>
          <p className="section-label">Academic Administration</p>
          <h2 className="section-title">All Programmes</h2>
        </section>

        <div className="space-y-4">
          {programmes.length === 0 ? (
            <EmptyState icon="school" title="No programmes yet" description="Add your first programme to get started." />
          ) : programmes.map((prog) => (
            <GlassCard
              key={prog.id}
              className="p-5 flex items-center justify-between hover:scale-[1.01] transition-all cursor-pointer"
              onClick={() => navigate(`/admin/settings/branches/${prog.id}`)}
            >
              <div className="flex flex-col">
                <span className="font-headline font-extrabold text-xl text-on-surface">{prog.name}</span>
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider mt-1">View Branches →</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </GlassCard>
          ))}
        </div>
      </div>

      <FAB onClick={() => setModal(true)} icon="add" label="Programme" />

      <Modal open={modal} onClose={() => setModal(false)} title="New Programme">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Programme Name" placeholder="e.g., B.Tech" value={name} onChange={e => setName(e.target.value)} required />
          <Button type="submit" full loading={saving}>Create</Button>
        </form>
      </Modal>
    </PageLayout>
  );
}
