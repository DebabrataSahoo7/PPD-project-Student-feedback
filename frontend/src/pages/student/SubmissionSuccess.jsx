import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/ui/GlassCard.jsx';

export default function SubmissionSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh flex flex-col antialiased text-on-surface overflow-hidden relative">
      <main className="flex-1 flex flex-col items-center justify-center px-6 w-full max-w-md mx-auto relative z-10">
        <GlassCard className="rounded-[2rem] p-8 w-full flex flex-col items-center shadow-xl">

          {/* Success icon with tonal rings */}
          <div className="relative mb-8 mt-4 flex flex-col items-center">
            <div className="w-32 h-32 rounded-full bg-white/60 flex items-center justify-center shadow-[0px_20px_40px_rgba(31,38,135,0.06)] relative z-20 border border-white/50 backdrop-blur-md">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <span className="material-symbols-outlined text-5xl text-primary filled">check</span>
              </div>
            </div>
            {/* Depth rings */}
            <div className="absolute inset-0 rounded-full bg-white/30 scale-125 -z-10 opacity-50 blur-sm" />
            <div className="absolute inset-0 rounded-full bg-white/20 scale-150 -z-20 opacity-30" />
          </div>

          {/* Message */}
          <div className="text-center max-w-[320px] mb-4">
            <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface mb-4 leading-tight">
              Response submitted successfully
            </h1>
            <p className="font-body text-[0.875rem] text-on-surface-variant leading-relaxed">
              Thank you for your valuable feedback! Your input helps us improve the academic experience.
            </p>
          </div>
        </GlassCard>
      </main>

      {/* Bottom action */}
      <div className="w-full max-w-md mx-auto px-6 pb-10 pt-4 relative z-20">
        <button
          onClick={() => navigate('/student')}
          className="w-full h-14 bg-primary text-white rounded-2xl font-headline font-bold text-base shadow-lg shadow-primary/25 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
