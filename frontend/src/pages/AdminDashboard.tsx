import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useNotifications } from '../context/NotificationContext';
import { Shield, Users, Building2, Shirt, Loader2, Check, X, FileText, Trash2, BarChart3, Clock } from 'lucide-react';

interface Stats {
  users: { donor: number; ngo: number; admin: number };
  ngos: { pending: number; approved: number; rejected: number };
  donations: { available: number; requested: number; accepted: number; collected: number; completed: number; rejected: number };
  recentDonations: any[];
  recentNgos: any[];
  chats: {
    totalMessages: number;
    activeChats: number;
  };
  analytics: {
    totalRequests: number;
    acceptedRequests: number;
    completedDonations: number;
    requestStatus: { pending: number; accepted: number; rejected: number; collected: number; completed: number };
  };
  reports: {
    categoryDistribution: { category: string; count: number }[];
  };
}

interface NgoRecord {
  id: string;
  organization_name: string;
  registration_number: string;
  verification_document: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  email: string;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface DonationRecord {
  id: string;
  title: string;
  category: string;
  status: string;
  donor_name: string;
  donor_email: string;
  created_at: string;
}

export const AdminDashboard: React.FC = () => {
  const { triggerToast } = useNotifications();
  const [activeTab, setActiveTab] = useState<'stats' | 'approvals' | 'users' | 'donations'>('stats');

  // Loading states
  const [statsLoading, setStatsLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);

  // Data states
  const [stats, setStats] = useState<Stats | null>(null);
  const [ngos, setNgos] = useState<NgoRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [allDonations, setAllDonations] = useState<DonationRecord[]>([]);

  // User role filtering state
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'donor' | 'ngo'>('all');
  const filteredUsers = users.filter(u => userRoleFilter === 'all' || u.role === userRoleFilter);

  // Fetch admin dashboard stats
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err: any) {
      console.error(err);
      triggerToast('Error', 'Failed to load dashboard statistics.', 'warning');
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch NGOs (for verification queue)
  const fetchNgos = async () => {
    setListLoading(true);
    try {
      const res = await api.get('/admin/ngos');
      setNgos(res.data);
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Failed to fetch NGO listings.', 'warning');
    } finally {
      setListLoading(false);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    setListLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Failed to fetch user profiles.', 'warning');
    } finally {
      setListLoading(false);
    }
  };

  // Fetch Donations
  const fetchDonations = async () => {
    setListLoading(true);
    try {
      const res = await api.get('/admin/donations');
      setAllDonations(res.data);
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Failed to fetch platform donations.', 'warning');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStats();
    } else if (activeTab === 'approvals') {
      fetchNgos();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'donations') {
      fetchDonations();
    }
  }, [activeTab]);

  // NGO Verification Handler (Approve/Reject)
  const handleVerifyNgo = async (ngoId: string, status: 'approved' | 'rejected') => {
    const org = ngos.find(n => n.id === ngoId)?.organization_name || 'this NGO';
    if (!window.confirm(`Are you sure you want to change approval status of ${org} to ${status.toUpperCase()}?`)) return;

    try {
      await api.put(`/admin/ngos/${ngoId}/verify`, { status });
      triggerToast('Verified', `NGO organization has been successfully ${status}.`, 'success');
      fetchNgos();
    } catch (err: any) {
      triggerToast('Error', err.response?.data?.error || 'Verification update failed.', 'warning');
    }
  };

  // Delete User
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('WARNING: Deleting a user will permanently purge their profile, donations, and requests from the database. Continue?')) return;

    try {
      await api.delete(`/admin/users/${userId}`);
      triggerToast('Deleted', 'User account successfully removed.', 'success');
      fetchUsers();
    } catch (err: any) {
      triggerToast('Error', err.response?.data?.error || 'Failed to delete user.', 'warning');
    }
  };

  // Delete Donation
  const handleDeleteDonation = async (donationId: string) => {
    if (!window.confirm('Are you sure you want to remove this clothing item from the platform?')) return;

    try {
      await api.delete(`/admin/donations/${donationId}`);
      triggerToast('Deleted', 'Clothing item deleted by administrator.', 'success');
      fetchDonations();
    } catch (err: any) {
      triggerToast('Error', err.response?.data?.error || 'Failed to delete donation.', 'warning');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center">
            <Shield className="w-8 h-8 text-emerald-600 dark:text-emerald-500 mr-2" />
            Admin Control Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Audit registrations, moderate content, and inspect analytics</p>
        </div>

        {/* Tab switcher */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto max-w-full">
          {[
            { id: 'stats', label: 'Stats Overview', icon: BarChart3 },
            { id: 'approvals', label: 'NGO Queue', icon: Clock },
            { id: 'users', label: 'Manage Users', icon: Users },
            { id: 'donations', label: 'Donations', icon: Shirt },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 mr-1.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: METRICS OVERVIEW */}
      {/* ========================================================= */}
      {activeTab === 'stats' && (
        statsLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <span className="text-sm text-slate-500 mt-2">Aggregating platform metrics...</span>
          </div>
        ) : stats && (
          <div className="space-y-8">
            {/* Analytics & Chat Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chat Stats */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-slate-850 dark:text-white mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 text-emerald-600 mr-2" />
                  Chat Statistics
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block font-semibold">Total Messages Sent</span>
                    <span className="text-xl font-bold text-slate-800 dark:text-white mt-1 block">
                      {stats.chats?.totalMessages || 0}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block font-semibold">Active Chats</span>
                    <span className="text-xl font-bold text-slate-800 dark:text-white mt-1 block">
                      {stats.chats?.activeChats || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Platform Performance Analytics */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-slate-850 dark:text-white mb-4 flex items-center">
                  <Shield className="w-5 h-5 text-emerald-600 mr-2" />
                  Platform Performance
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl text-center">
                    <span className="text-[9px] text-slate-400 block font-semibold">Requests</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-white mt-1 block">
                      {stats.analytics?.totalRequests || 0}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl text-center">
                    <span className="text-[9px] text-slate-400 block font-semibold">Acceptance Rate</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-white mt-1 block">
                      {stats.analytics?.totalRequests > 0
                        ? `${Math.round((stats.analytics.acceptedRequests / stats.analytics.totalRequests) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl text-center">
                    <span className="text-[9px] text-slate-400 block font-semibold">Success Delivery</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-white mt-1 block">
                      {stats.analytics?.completedDonations || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reports Section */}
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-sm font-bold text-slate-850 dark:text-white mb-4 flex items-center">
                <FileText className="w-5 h-5 text-emerald-600 mr-2" />
                Category Distribution & Request Reports
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-2">Category Uploads</h4>
                  {stats.reports?.categoryDistribution?.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3">No categories reported.</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.reports?.categoryDistribution?.map((item: any) => (
                        <div key={item.category} className="flex justify-between items-center text-xs bg-slate-50/50 dark:bg-slate-800/20 px-3 py-1.5 rounded-lg">
                          <span className="text-slate-700 dark:text-slate-350">{item.category}</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-2">Request Status Breakdown</h4>
                  <div className="space-y-2 text-xs">
                    {[
                      { status: 'pending', label: 'Pending Review', count: stats.analytics?.requestStatus?.pending || 0, color: 'text-amber-600 bg-amber-50' },
                      { status: 'accepted', label: 'Accepted by Donor', count: stats.analytics?.requestStatus?.accepted || 0, color: 'text-emerald-600 bg-emerald-50' },
                      { status: 'collected', label: 'Collected by NGO', count: stats.analytics?.requestStatus?.collected || 0, color: 'text-blue-600 bg-blue-50' },
                      { status: 'completed', label: 'Delivery Completed', count: stats.analytics?.requestStatus?.completed || 0, color: 'text-teal-650 bg-teal-50' },
                      { status: 'rejected', label: 'Declined/Rejected', count: stats.analytics?.requestStatus?.rejected || 0, color: 'text-rose-600 bg-rose-50' },
                    ].map(item => (
                      <div key={item.status} className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/20">
                        <span className="text-slate-700 dark:text-slate-350">{item.label}</span>
                        <span className={`px-2 py-0.5 rounded-md font-bold ${item.color}`}>
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recents grids */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent NGO signups */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-slate-850 dark:text-white mb-4">Recent NGO Registrations</h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-80 overflow-y-auto">
                  {stats.recentNgos.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">No recent NGO registrations.</p>
                  ) : (
                    stats.recentNgos.map((ngo: any) => (
                      <div key={ngo.id} className="py-3 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{ngo.organization_name}</p>
                          <span className="text-[10px] text-slate-400">{ngo.email}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          ngo.approval_status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : ngo.approval_status === 'pending'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {ngo.approval_status.toUpperCase()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Donations */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-slate-850 dark:text-white mb-4">Recent Clothing Uploads</h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-80 overflow-y-auto">
                  {stats.recentDonations.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">No clothes uploaded recently.</p>
                  ) : (
                    stats.recentDonations.map((don: any) => (
                      <div key={don.id} className="py-3 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{don.title}</p>
                          <span className="text-[10px] text-slate-400">{don.category} | by {don.donor_name}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[9px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {don.status.toUpperCase()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* ========================================================= */}
      {/* TAB 2: NGO APPROVAL QUEUE */}
      {/* ========================================================= */}
      {activeTab === 'approvals' && (
        listLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <span className="text-sm text-slate-500 mt-2">Fetching registration audits...</span>
          </div>
        ) : ngos.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl text-slate-400">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <span className="text-sm">No NGOs registered on the platform.</span>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-700/80">
                <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-450 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-6 py-3">Organization Details</th>
                    <th className="px-6 py-3">Registration Number</th>
                    <th className="px-6 py-3">Verification document</th>
                    <th className="px-6 py-3">Audit status</th>
                    <th className="px-6 py-3 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                  {ngos.map((ngo) => (
                    <tr key={ngo.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{ngo.organization_name}</p>
                        <span className="text-[10px] text-slate-450 block">{ngo.email}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-650 dark:text-slate-350">{ngo.registration_number}</td>
                      <td className="px-6 py-4">
                        <a
                          href={ngo.verification_document.startsWith('http') ? ngo.verification_document : `http://localhost:5000${ngo.verification_document}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          View Document
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          ngo.approval_status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : ngo.approval_status === 'pending'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                        }`}>
                          {ngo.approval_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {ngo.approval_status === 'pending' ? (
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => handleVerifyNgo(ngo.id, 'approved')}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold"
                              title="Approve NGO"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleVerifyNgo(ngo.id, 'rejected')}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold"
                              title="Reject NGO"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">Audit Complete</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ========================================================= */}
      {/* TAB 3: MANAGE USER ACCOUNTS */}
      {/* ========================================================= */}
      {activeTab === 'users' && (
        listLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <span className="text-sm text-slate-500 mt-2">Loading user accounts...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl text-slate-400">
            <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <span className="text-sm">No user accounts registered.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* User role filter pills */}
            <div className="flex gap-2">
              <button
                onClick={() => setUserRoleFilter('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  userRoleFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-850 dark:hover:text-slate-300'
                }`}
              >
                All Users ({users.length})
              </button>
              <button
                onClick={() => setUserRoleFilter('donor')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  userRoleFilter === 'donor'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-850 dark:hover:text-slate-300'
                }`}
              >
                Donors ({users.filter((u) => u.role === 'donor').length})
              </button>
              <button
                onClick={() => setUserRoleFilter('ngo')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  userRoleFilter === 'ngo'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-850 dark:hover:text-slate-300'
                }`}
              >
                NGOs ({users.filter((u) => u.role === 'ngo').length})
              </button>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-700/80">
                  <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-450 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider text-left">
                    <tr>
                      <th className="px-6 py-3">Account Name</th>
                      <th className="px-6 py-3">Email Address</th>
                      <th className="px-6 py-3">Platform Role</th>
                      <th className="px-6 py-3">Registered On</th>
                      <th className="px-6 py-3 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                    {filteredUsers.map((userRecord) => (
                      <tr key={userRecord.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10">
                        <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-100">{userRecord.name}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-350">{userRecord.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            userRecord.role === 'donor'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450'
                              : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400'
                          }`}>
                            {userRecord.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400">{new Date(userRecord.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteUser(userRecord.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                            title="Ban User"
                            id={`ban-user-${userRecord.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}


      {/* ========================================================= */}
      {/* TAB 4: MANAGE DONATIONS */}
      {/* ========================================================= */}
      {activeTab === 'donations' && (
        listLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <span className="text-sm text-slate-500 mt-2">Loading clothes listings...</span>
          </div>
        ) : allDonations.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl text-slate-400">
            <Shirt className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <span className="text-sm">No donations published on the platform.</span>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-700/80">
                <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-450 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-6 py-3">Donation Title</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Donor contact</th>
                    <th className="px-6 py-3">Shipment status</th>
                    <th className="px-6 py-3">Date Uploaded</th>
                    <th className="px-6 py-3 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                  {allDonations.map((don) => (
                    <tr key={don.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10">
                      <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-100">{don.title}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-350">{don.category}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{don.donor_name}</p>
                        <span className="text-[10px] text-slate-450 block">{don.donor_email}</span>
                      </td>
                      <td className="px-6 py-4 font-mono">
                        <span className="px-2 py-0.5 rounded text-[9px] bg-slate-100 text-slate-750 dark:bg-slate-800 dark:text-slate-350">
                          {don.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{new Date(don.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteDonation(don.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                          title="Remove Donation"
                          id={`remove-donation-${don.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
};
