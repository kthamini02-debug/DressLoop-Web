import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Search, Filter, Loader2, Shirt, Image, ChevronLeft, ChevronRight, X, MessageSquare, ClipboardList, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Donation {
  id: string;
  donor_id: string;
  title: string;
  description: string;
  category: string;
  gender: string;
  age_group: string;
  size: string;
  quantity: number;
  condition: string;
  images: string[];
  status: string;
  donor_name: string;
  created_at: string;
}

interface RequestItem {
  request_id: string;
  request_status: 'pending' | 'accepted' | 'rejected' | 'collected' | 'completed';
  request_date: string;
  donation_id: string;
  title: string;
  category: string;
  size: string;
  condition: string;
  images: string[];
  donation_status: string;
  donor_name: string;
  donor_email: string;
}

export const NgoDashboard: React.FC = () => {
  const { user } = useAuth();
  const { triggerToast } = useNotifications();

  // Active Tab: 'browse' or 'requests'
  const [activeTab, setActiveTab] = useState<'browse' | 'requests'>('browse');

  // Browse state
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Filters state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [gender, setGender] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [condition, setCondition] = useState('');
  const [size, setSize] = useState('');

  // Requests state
  const [myRequests, setMyRequests] = useState<RequestItem[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Fetch available donations
  const fetchDonations = async () => {
    if (user?.approval_status !== 'approved') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (category) params.category = category;
      if (gender) params.gender = gender;
      if (ageGroup) params.age_group = ageGroup;
      if (condition) params.condition = condition;
      if (size) params.size = size;

      const res = await api.get('/donations/browse', { params });
      setDonations(res.data);
    } catch (err: any) {
      console.error(err);
      triggerToast('Error', 'Failed to fetch available clothes.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  // Fetch sent requests
  const fetchMyRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await api.get('/requests/my');
      setMyRequests(res.data);
    } catch (err: any) {
      console.error(err);
      triggerToast('Error', 'Failed to load request history.', 'warning');
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'browse') {
      fetchDonations();
    } else {
      fetchMyRequests();
    }
  }, [activeTab, category, gender, ageGroup, condition, size]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDonations();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('');
    setGender('');
    setAgeGroup('');
    setCondition('');
    setSize('');
    // Trigger manual fetch due to query updates
    setTimeout(() => fetchDonations(), 50);
  };

  // Send request for a clothing item
  const handleSendRequest = async (donationId: string) => {
    try {
      await api.post('/requests', { donation_id: donationId });
      triggerToast('Requested', 'Request sent successfully to the donor!', 'success');
      setSelectedDonation(null);
      fetchDonations();
    } catch (err: any) {
      triggerToast('Error', err.response?.data?.error || 'Failed to submit request.', 'warning');
    }
  };

  // Mark Request/Donation as Collected
  const handleMarkAsCollected = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to mark this donation as Collected? The donor will receive a notification to verify.')) return;

    try {
      await api.put(`/requests/${requestId}/status`, { action: 'collect' });
      triggerToast('Success', 'Donation marked as collected. Donor has been notified.', 'success');
      fetchMyRequests();
    } catch (err: any) {
      triggerToast('Error', err.response?.data?.error || 'Failed to update status.', 'warning');
    }
  };

  // Open item inspector
  const openDonationInspector = (donation: Donation) => {
    setSelectedDonation(donation);
    setActiveImageIdx(0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 1. STATUS ACCOUNT PENDING OR REJECTED WARNING BANNERS */}
      {user?.approval_status === 'pending' && (
        <div className="mb-8 p-5 border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/40 rounded-2xl flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">NGO Profile Under Audit</h3>
            <p className="text-slate-650 dark:text-slate-350 text-sm mt-1 leading-relaxed">
              Your organization registration documentation (ID: <span className="font-semibold text-slate-700 dark:text-white">{user.registration_number}</span>) is undergoing review by system administrators. 
              Once verified, you will be authorized to search and request clothing donations.
            </p>
          </div>
        </div>
      )}

      {user?.approval_status === 'rejected' && (
        <div className="mb-8 p-5 border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/40 rounded-2xl flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-rose-800 dark:text-rose-200 text-base">NGO Verification Rejected</h3>
            <p className="text-slate-650 dark:text-slate-350 text-sm mt-1 leading-relaxed">
              Your organization verification documents were flagged as incomplete or incorrect. Please contact system support at <a href="mailto:admin@dress.com" className="font-bold underline text-rose-600 dark:text-rose-450">admin@dress.com</a> to re-verify.
            </p>
          </div>
        </div>
      )}

      {/* Header with Navigation tabs */}
      {user?.approval_status === 'approved' && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">NGO Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Browse and request clothing shipments for children and adults</p>
          </div>

          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/20 rounded-xl">
            <button
              onClick={() => setActiveTab('browse')}
              className={`flex items-center px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'browse'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Browse Donations
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex items-center px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'requests'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
              My Requests ({myRequests.length})
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. TAB: BROWSE AVAILABLE DONATIONS */}
      {/* ========================================================= */}
      {user?.approval_status === 'approved' && activeTab === 'browse' && (
        <div className="space-y-6">
          {/* Search Bar & Filters */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search clothing by name, brand, material..."
                  className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm"
              >
                Search
              </button>
            </form>

            {/* Select Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                >
                  <option value="">Category (All)</option>
                  {['Shirts', 'Pants', 'Dresses', 'Coats', 'Footwear', 'Other'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                >
                  <option value="">Gender (All)</option>
                  {['Men', 'Women', 'Unisex', 'Boys', 'Girls'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                >
                  <option value="">Age Group (All)</option>
                  {['Infant', 'Toddler', 'Child', 'Teen', 'Adult'].map(age => (
                    <option key={age} value={age}>{age}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                >
                  <option value="">Condition (All)</option>
                  {['New', 'Like New', 'Good', 'Fair'].map(cond => (
                    <option key={cond} value={cond}>{cond}</option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  onClick={handleResetFilters}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Filter className="w-3.5 h-3.5" />
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Cards List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <span className="text-sm text-slate-500 mt-2">Loading clothing items...</span>
            </div>
          ) : donations.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl flex flex-col items-center justify-center">
              <Shirt className="w-16 h-16 text-slate-350 dark:text-slate-700 mb-4" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No active clothes matches</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mt-2">
                No clothes matching your search filters are available right now. Try clearing some filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {donations.map((donation) => (
                <div
                  key={donation.id}
                  onClick={() => openDonationInspector(donation)}
                  className="glass-panel overflow-hidden rounded-2xl flex flex-col justify-between group hover:border-emerald-500/25 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div>
                    {/* Image */}
                    <div className="h-44 bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                      {donation.images && donation.images.length > 0 ? (
                        <img
                          src={donation.images[0].startsWith('http') ? donation.images[0] : `http://localhost:5000${donation.images[0]}`}
                          alt={donation.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-350">
                          <Image className="w-12 h-12" />
                        </div>
                      )}
                      {/* Condition label */}
                      <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[10px] text-white font-semibold">
                        Condition: {donation.condition}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="p-5">
                      <h3 className="text-base font-bold text-slate-800 dark:text-white truncate">{donation.title}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 line-clamp-2">{donation.description}</p>
                      
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        <span className="bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-350 px-2 py-0.5 rounded font-semibold">
                          {donation.category}
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-350 px-2 py-0.5 rounded font-semibold">
                          {donation.gender} ({donation.age_group})
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-350 px-2 py-0.5 rounded font-semibold">
                          Size: {donation.size}
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-350 px-2 py-0.5 rounded font-semibold">
                          Qty: x{donation.quantity}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40 text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline flex justify-between items-center">
                    <span>Uploaded by {donation.donor_name}</span>
                    <span>Inspect & Request ➔</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. TAB: REQUESTS TRACKING */}
      {/* ========================================================= */}
      {user?.approval_status === 'approved' && activeTab === 'requests' && (
        <div className="space-y-6">
          {requestsLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <span className="text-sm text-slate-500 mt-2">Loading sent requests...</span>
            </div>
          ) : myRequests.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl flex flex-col items-center justify-center">
              <ClipboardList className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No requests sent yet</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mt-2">
                Browse available clothes and send request applications. Your applications will show up here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myRequests.map((req) => (
                <div key={req.request_id} className="glass-panel overflow-hidden rounded-2xl flex flex-col justify-between group hover:border-emerald-500/20 transition-all duration-300">
                  <div>
                    {/* Image */}
                    <div className="h-40 bg-slate-105 dark:bg-slate-800 overflow-hidden relative">
                      {req.images && req.images.length > 0 ? (
                        <img
                          src={req.images[0].startsWith('http') ? req.images[0] : `http://localhost:5000${req.images[0]}`}
                          alt={req.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-350">
                          <Image className="w-12 h-12" />
                        </div>
                      )}
                      
                      {/* Request Status overlay badge */}
                      <span className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        req.request_status === 'pending'
                          ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                          : req.request_status === 'accepted'
                          ? 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400'
                          : req.request_status === 'collected'
                          ? 'bg-emerald-50 border-emerald-250 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-450'
                          : req.request_status === 'completed'
                          ? 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-850 dark:text-slate-350'
                          : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:text-rose-450'
                      }`}>
                        Request: {req.request_status.toUpperCase()}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="p-5">
                      <h3 className="text-base font-bold text-slate-800 dark:text-white truncate">{req.title}</h3>
                      <p className="text-slate-500 dark:text-slate-450 text-xs mt-1">
                        Donor: {req.donor_name} (<a href={`mailto:${req.donor_email}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">{req.donor_email}</a>)
                      </p>

                      <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] text-center font-semibold text-slate-600 dark:text-slate-300">
                        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded">
                          {req.category}
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded">
                          Size: {req.size}
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded">
                          {req.condition}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col gap-2">
                    {req.request_status === 'accepted' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMarkAsCollected(req.request_id)}
                          className="flex-1 flex items-center justify-center py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                        >
                          Mark as Collected
                        </button>
                        <Link
                          to="/chats"
                          className="flex-1 flex items-center justify-center py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm text-center"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1" />
                          Chat Donor
                        </Link>
                      </div>
                    )}
                    
                    {['collected', 'completed'].includes(req.request_status) && (
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {req.request_status === 'collected' ? 'Waiting donor confirmation' : 'Collection Completed'}
                        </span>
                        <Link to="/chats" className="flex items-center text-xs text-sky-600 dark:text-sky-400 font-bold hover:underline">
                          <MessageSquare className="w-3.5 h-3.5 mr-1" />
                          Chat Donor
                        </Link>
                      </div>
                    )}

                    {req.request_status === 'pending' && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-500 font-medium block text-center">
                        ⏳ Pending donor review
                      </span>
                    )}

                    {req.request_status === 'rejected' && (
                      <span className="text-[11px] text-rose-600 dark:text-rose-500 font-medium block text-center">
                        ❌ Request declined
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. CLOTHING INSPECTOR DETAILED MODAL */}
      {/* ========================================================= */}
      {selectedDonation && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700">
            {/* Carousel images view */}
            <div className="h-64 bg-slate-100 dark:bg-slate-800 relative">
              <button
                onClick={() => setSelectedDonation(null)}
                className="absolute top-3 right-3 bg-black/50 hover:bg-black/75 p-1.5 rounded-full text-white z-10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {selectedDonation.images && selectedDonation.images.length > 0 ? (
                <>
                  <img
                    src={selectedDonation.images[activeImageIdx].startsWith('http') ? selectedDonation.images[activeImageIdx] : `http://localhost:5000${selectedDonation.images[activeImageIdx]}`}
                    alt={`${selectedDonation.title} detail`}
                    className="w-full h-full object-cover"
                  />
                  {selectedDonation.images.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveImageIdx(prev => (prev === 0 ? selectedDonation.images.length - 1 : prev - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-1.5 rounded-full text-white"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveImageIdx(prev => (prev === selectedDonation.images.length - 1 ? 0 : prev + 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-1.5 rounded-full text-white"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {/* Indicators dot */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 bg-black/40 px-2 py-1 rounded-full">
                    {selectedDonation.images.map((_, idx) => (
                      <span
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full ${idx === activeImageIdx ? 'bg-white' : 'bg-white/40'}`}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-350">
                  <Image className="w-16 h-16" />
                </div>
              )}
            </div>

            {/* Description */}
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-snug">{selectedDonation.title}</h3>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold mt-1 block">
                  Uploaded on {new Date(selectedDonation.created_at).toLocaleDateString()} by {selectedDonation.donor_name}
                </span>
              </div>

              <div className="text-sm text-slate-650 dark:text-slate-300 leading-relaxed border-t border-b border-slate-100 dark:border-slate-700 py-3">
                {selectedDonation.description}
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                  <span className="text-slate-450 dark:text-slate-500">Category:</span>
                  <span className="font-bold text-slate-750 dark:text-slate-300">{selectedDonation.category}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                  <span className="text-slate-450 dark:text-slate-500">Condition:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedDonation.condition}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                  <span className="text-slate-450 dark:text-slate-500">Size:</span>
                  <span className="font-bold text-slate-750 dark:text-slate-300">{selectedDonation.size}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                  <span className="text-slate-450 dark:text-slate-500">Quantity:</span>
                  <span className="font-bold text-slate-750 dark:text-slate-300">x{selectedDonation.quantity}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                  <span className="text-slate-450 dark:text-slate-500">Gender:</span>
                  <span className="font-bold text-slate-750 dark:text-slate-300">{selectedDonation.gender}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                  <span className="text-slate-450 dark:text-slate-500">Age Group:</span>
                  <span className="font-bold text-slate-750 dark:text-slate-300">{selectedDonation.age_group}</span>
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setSelectedDonation(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSendRequest(selectedDonation.id)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md"
                >
                  Request Clothes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
