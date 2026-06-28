import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Shirt, User, Building2, UploadCloud, Loader2, ArrowLeft } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'donor' | 'ngo'>('donor');
  
  // Common fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // NGO specific fields
  const [orgName, setOrgName] = useState('');
  const [regNum, setRegNum] = useState('');
  const [docUrl, setDocUrl] = useState('');
  
  // Status states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Document Upload Handler
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const res = await api.post('/auth/upload-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setDocUrl(res.data.url);
      setUploadSuccess(true);
    } catch (err: any) {
      console.error('File upload error:', err);
      setError(err.response?.data?.error || 'Failed to upload verification document.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (activeTab === 'ngo') {
      if (!orgName || !regNum) {
        setError('Please fill in NGO organization name and registration number.');
        return;
      }
      if (!docUrl) {
        setError('Please upload an NGO verification document (PDF/Image).');
        return;
      }
    }

    setLoading(true);
    
    const payload = {
      name,
      email,
      password,
      role: activeTab,
      organization_name: activeTab === 'ngo' ? orgName : undefined,
      registration_number: activeTab === 'ngo' ? regNum : undefined,
      verification_document: activeTab === 'ngo' ? docUrl : undefined,
    };

    try {
      await register(payload);
      if (activeTab === 'donor') {
        navigate('/donor');
      } else {
        navigate('/ngo'); // Will view the pending review screen
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center relative p-4 py-10">
      {/* Background Orbs */}
      <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="inline-flex items-center text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Home
        </Link>

        <div className="glass-panel p-8 rounded-2xl">
          {/* Logo / Header */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-4">
              <Shirt className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Create Account</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Join us to make clothes accessible to all</p>
          </div>

          {/* Role Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-850 rounded-xl mb-6">
            <button
              onClick={() => {
                setActiveTab('donor');
                setError(null);
              }}
              className={`flex items-center justify-center py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'donor'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <User className="w-3.5 h-3.5 mr-1.5" />
              Donor Signup
            </button>
            <button
              onClick={() => {
                setActiveTab('ngo');
                setError(null);
              }}
              className={`flex items-center justify-center py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ngo'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              NGO Signup
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">
                {activeTab === 'donor' ? 'Full Name' : 'Authorized Representative Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="block w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-white transition-all"
                required
                id="register-name-input"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="block w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-white transition-all"
                required
                id="register-email-input"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-white transition-all"
                required
                id="register-password-input"
              />
            </div>

            {/* NGO SPECIFIC SECTIONS */}
            {activeTab === 'ngo' && (
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                {/* Org Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Organization Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Hope Welfare Foundation"
                    className="block w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-white transition-all"
                    required
                    id="register-orgname-input"
                  />
                </div>

                {/* Reg Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Registration Number</label>
                  <input
                    type="text"
                    value={regNum}
                    onChange={(e) => setRegNum(e.target.value)}
                    placeholder="REG-12345-XYZ"
                    className="block w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-white transition-all"
                    required
                    id="register-regnum-input"
                  />
                </div>

                {/* Verification Document Upload */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Verification Document (PDF / Image)</label>
                  <div className="relative border-2 border-dashed border-slate-250 dark:border-slate-700 rounded-xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <input
                      type="file"
                      onChange={handleDocUpload}
                      accept="image/*,application/pdf"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploading}
                      id="register-document-file"
                    />
                    
                    {uploading ? (
                      <div className="flex flex-col items-center py-2">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-2">Uploading document...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-2">
                        <UploadCloud className="w-8 h-8 text-slate-450 dark:text-slate-500" />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-2">
                          {uploadSuccess ? 'Document uploaded!' : 'Click or drag verification certificate'}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-550 mt-1">PDF, JPG, or PNG up to 5MB</span>
                      </div>
                    )}
                  </div>
                  {uploadSuccess && docUrl && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-1.5 text-center">
                      ✅ Upload verified! Document URL ready.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || uploading}
              className="w-full flex justify-center items-center py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md hover:shadow-emerald-500/10 active:scale-[0.99] transition-all disabled:opacity-50"
              id="register-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-550 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
