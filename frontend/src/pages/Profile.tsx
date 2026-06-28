import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { User, Mail, Lock, Building, FileCheck, Loader2 } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { triggerToast } = useNotifications();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // NGO fields
  const [orgName, setOrgName] = useState(user?.organization_name || '');
  const [regNum, setRegNum] = useState(user?.registration_number || '');

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password && password !== confirmPassword) {
      triggerToast('Validation Alert', 'Passwords do not match.', 'warning');
      return;
    }

    setLoading(true);
    
    const payload = {
      name,
      email,
      password: password || undefined,
      organization_name: user?.role === 'ngo' ? orgName : undefined,
      registration_number: user?.role === 'ngo' ? regNum : undefined,
    };

    try {
      await updateProfile(payload);
      triggerToast('Success', 'Profile updated successfully!', 'success');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      triggerToast('Error', err || 'Failed to update profile.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">My Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your account credentials and organization details</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Side: Summary info */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-2xl text-center">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-50 dark:border-emerald-900/20">
              <span className="text-2xl font-bold uppercase">{user?.name.substring(0, 2)}</span>
            </div>
            <h3 className="font-bold text-slate-850 dark:text-white text-lg">{user?.name}</h3>
            <span className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5 tracking-wide block">{user?.role}</span>
            <p className="text-slate-500 dark:text-slate-450 text-xs mt-2 truncate">{user?.email}</p>
          </div>

          {/* Verification status card for NGOs */}
          {user?.role === 'ngo' && (
            <div className="glass-panel p-5 rounded-2xl space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">Audit Credentials</h4>
              <div className="text-xs space-y-2 text-slate-650 dark:text-slate-350">
                <div className="flex justify-between">
                  <span className="text-slate-400">Reg Code:</span>
                  <span className="font-mono font-semibold">{user.registration_number}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Audit status:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    user.approval_status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                      : user.approval_status === 'pending'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450'
                  }`}>
                    {user.approval_status?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Edit Form */}
        <div className="md:col-span-2">
          <div className="glass-panel p-8 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-850 dark:text-white mb-6">Profile Settings</h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Account Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* NGO SPECIFIC SECTIONS */}
              {user?.role === 'ngo' && (
                <div className="space-y-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wide mb-2">NGO Organization info</h4>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Organization Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Building className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Registration Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={regNum}
                        onChange={(e) => setRegNum(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Password change */}
              <div className="space-y-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wide mb-2">Change Password</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Leave blank to keep current"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Leave blank to keep current"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-50"
                  id="profile-submit-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
