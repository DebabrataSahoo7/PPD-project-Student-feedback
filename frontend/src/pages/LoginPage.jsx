import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import useAuthStore from '../store/authStore.js';
import PressButton from '../components/ui/PressButton.jsx';
import sfcLogo from '../assets/logos/sfc-logo.png';

const ROLES = [
  { key: 'student', label: 'Student' },
  { key: 'faculty', label: 'Faculty' },
  { key: 'admin', label: 'Admin' },
];

const HINTS = {
  student: 'Use your registration number',
  faculty: 'Use your institutional email',
  admin: 'Use your admin email',
};

const PLACEHOLDERS = {
  student: '23110625 or name@outr.ac.in',
  faculty: 'name@outr.ac.in',
  admin: 'admin@institution.edu',
};

export default function LoginPage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth        = useAuthStore((s) => s.setAuth);
  const redirectTo     = searchParams.get('redirect');

  const [role, setRole] = useState('student');
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      setAuth(data.token, data.user);
      if (data.user.must_change_password) {
        navigate('/change-password');
      } else if (redirectTo) {
        navigate(redirectTo);
      } else if (data.user.role === 'faculty') {
        navigate('/faculty');
      } else if (data.user.role === 'student') {
        navigate('/student');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-[#F0F4FF]">

      {/* Logo & Brand Name — outside card, above it */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <img src={sfcLogo} alt="FormBit"
          className="h-8 w-auto object-contain"
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
        <span className="text-xl font-black uppercase tracking-[0.15em] text-[#6C63FF]">FormBit</span>
      </div>

      {/* Claymorphism Login Card */}
      <div className="w-full max-w-[400px] p-8 md:p-10 transition-all duration-300"
        style={{
          background: '#ffffffff',
          borderRadius: '5px',
          boxShadow: '20px 20px 40px rgba(163,177,198,0.5), -20px -20px 40px rgba(255,255,255,0.8)',
          border: '1px solid rgba(255,255,255,0.3)'
        }}>

        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-[#2D3748] mb-2">Sign in</h1>
          <p className="text-sm font-medium text-[#718096]">{HINTS[role]}</p>
        </div>

        {/* Role Selector (Pill Style) */}
        <div className="flex p-1.5 mb-8 bg-[#F0F4FF] rounded-[24px] gap-2"
          style={{ boxShadow: 'inset 4px 4px 8px rgba(163,177,198,0.4), inset -4px -4px 8px rgba(255,255,255,0.7)' }}>
          {ROLES.map(r => (
            <button key={r.key} type="button"
              onClick={() => { setRole(r.key); setForm({ identifier: '', password: '' }); }}
              className={`flex-1 py-2.5 rounded-[20px] text-xs font-bold transition-all duration-200 ${role === r.key ? 'text-white' : 'text-[#718096]'
                }`}
              style={role === r.key ? {
                background: '#6C63FF',
                boxShadow: '0 4px 10px rgba(108,99,255,0.4), inset 2px 2px 4px rgba(255,255,255,0.3)',
              } : {}}>
              {r.label}
            </button>
          ))}
        </div>

        {/* Login Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>

          {/* Identifier Field */}
          <div>
            <div className="relative group">
              <input
                type="text"
                placeholder={PLACEHOLDERS[role]}
                value={form.identifier}
                onChange={e => setForm({ ...form, identifier: e.target.value })}
                required
                className="w-full h-14 px-6 rounded-[10px] text-sm text-[#2D3748] placeholder-[#A0AEC0] outline-none bg-transparent transition-all"
                style={{
                  boxShadow: 'inset 5px 5px 10px rgba(163,177,198,0.4), inset -5px -5px 10px rgba(255,255,255,0.7)'
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="relative group">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                className="w-full h-14 px-6 pr-14 rounded-[10px] text-sm text-[#2D3748] placeholder-[#A0AEC0] outline-none bg-transparent transition-all"
                style={{
                  boxShadow: 'inset 5px 5px 10px rgba(163,177,198,0.4), inset -5px -5px 10px rgba(255,255,255,0.7)'
                }}
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#2D3748] transition-colors">
                <span className="material-symbols-outlined text-[20px]">
                  {showPwd ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            <div className="flex justify-end mt-3 px-1">
              <button type="button" className="text-xs font-bold text-[#718096] hover:text-[#6C63FF] transition-colors">
                Forgot?
              </button>
            </div>
          </div>

          {/* Primary Submit Button */}
          <PressButton type="submit" loading={loading} loadingText="Signing in...">
            Sign In
          </PressButton>
        </form>
      </div>
    </div>
  );
}
