import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import useAuthStore from '../store/authStore.js';
import PressButton from '../components/ui/PressButton.jsx';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, setAuth, token } = useAuthStore();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.new_password.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.patch('/auth/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      toast.success('Password updated!');

      // Refresh user session
      const { data } = await api.get('/auth/me');
      setAuth(token, { ...user, must_change_password: false, ...data });
      const dest = user?.role === 'faculty' ? '/faculty'
                 : user?.role === 'student' ? '/student'
                 : '/admin';
      navigate(dest);
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    boxShadow: 'inset 4px 4px 8px rgba(163,177,198,0.3), inset -4px -4px 8px rgba(255,255,255,0.7)',
    borderRadius: '10px'
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-[#F0F4FF]">

      {/* Sharper Claymorphism Card */}
      <div className="w-full max-w-[420px] p-8 md:p-10 bg-white"
        style={{
          borderRadius: '16px',
          boxShadow: '12px 12px 24px rgba(163,177,198,0.4), -12px -12px 24px rgba(255,255,255,0.8)',
          border: '1px solid rgba(255,255,255,0.5)'
        }}>

        {/* Title Section */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-[12px] bg-[#F0F4FF] flex items-center justify-center mx-auto mb-4"
            style={{ boxShadow: 'inset 3px 3px 6px rgba(163,177,198,0.3), inset -3px -3px 6px rgba(255,255,255,0.6)' }}>
            <span className="material-symbols-outlined text-[#4ECDC4] text-2xl">lock_reset</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#2D3748] tracking-tight">Set New Password</h2>
          <p className="text-sm font-medium text-[#718096] mt-2">Update your credentials to continue</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>

          {/* Current Password */}
          <div className="relative">
            <input
              type={showPwd.current ? 'text' : 'password'}
              placeholder="Current Password"
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
              required
              className="w-full h-12 px-5 pr-12 text-sm text-[#2D3748] placeholder-[#A0AEC0] outline-none bg-transparent transition-all"
              style={inputStyle}
            />
            <button type="button" onClick={() => setShowPwd({ ...showPwd, current: !showPwd.current })}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#2D3748]">
              <span className="material-symbols-outlined text-[18px]">
                {showPwd.current ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

          {/* New Password */}
          <div className="relative">
            <input
              type={showPwd.new ? 'text' : 'password'}
              placeholder="New Password (Min 6 chars)"
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
              required
              className="w-full h-12 px-5 pr-12 text-sm text-[#2D3748] placeholder-[#A0AEC0] outline-none bg-transparent transition-all"
              style={inputStyle}
            />
            <button type="button" onClick={() => setShowPwd({ ...showPwd, new: !showPwd.new })}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#2D3748]">
              <span className="material-symbols-outlined text-[18px]">
                {showPwd.new ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <input
              type={showPwd.confirm ? 'text' : 'password'}
              placeholder="Confirm New Password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
              className="w-full h-12 px-5 pr-12 text-sm text-[#2D3748] placeholder-[#A0AEC0] outline-none bg-transparent transition-all"
              style={inputStyle}
            />
            <button type="button" onClick={() => setShowPwd({ ...showPwd, confirm: !showPwd.confirm })}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#2D3748]">
              <span className="material-symbols-outlined text-[18px]">
                {showPwd.confirm ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

          <div className="pt-3">
            <PressButton type="submit" loading={loading} loadingText="Updating...">
              Update Password
            </PressButton>
          </div>
        </form>
      </div>
    </div>
  );
}
