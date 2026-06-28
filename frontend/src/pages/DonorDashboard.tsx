import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useNotifications } from '../context/NotificationContext';
import { Shirt, Trash2, Edit3, Plus, Loader2, Image, Heart, AlertCircle, MessageSquare, Check, X, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Donation {
  id: string;
  title: string;
  description: string;
  category: string;
  gender: string;
  age_group: string;
  size: string;
  quantity: number;
  condition: string;
  images: string[];
  status: 'available' | 'requested' | 'accepted' | 'collected' | 'completed' | 'rejected';
  request_count: number;
  created_at: string;
}

interface RequestItem {
  request_id: string;
  request_status: string;
  request_date: string;
  ngo_id: string;
  organization_name: string;
  registration_number: string;
  verification_document: string;
  ngo_email: string;
}

export const DonorDashboard: React.FC = () => {
  const { triggerToast } = useNotifications();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Modals & Panels State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeDonationId, setActiveDonationId] = useState<string | null>(null);
  const [selectedDonationRequests, setSelectedDonationRequests] = useState<RequestItem[]>([]);
  const [isRequestsPanelOpen, setIsRequestsPanelOpen] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Shirts');
  const [gender, setGender] = useState('Unisex');
  const [ageGroup, setAgeGroup] = useState('Adult');
  const [size, setSize] = useState('M');
  const [quantity, setQuantity] = useState('1');
  const [condition, setCondition] = useState('Good');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  // Fetch all my donations
  const fetchMyDonations = async () => {
    try {
      const res = await api.get('/donations/my');
      setDonations(res.data);
    } catch (err: any) {
      console.error('Error fetching donations:', err);
      triggerToast('Error', 'Failed to load donations history.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyDonations();
  }, []);

  // Handle file input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(e.target.files);
    }
  };

  // Upload/Create Donation
  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) {
      triggerToast('Validation Alert', 'Please select at least one image.', 'warning');
      return;
    }

    setSubmitLoading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('gender', gender);
    formData.append('age_group', ageGroup);
    formData.append('size', size);
    formData.append('quantity', quantity);
    formData.append('condition', condition);

    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('images', selectedFiles[i]);
    }

    try {
      await api.post('/donations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      triggerToast('Success', 'Donation item uploaded successfully!', 'success');
      resetForm();
      setIsAddModalOpen(false);
      fetchMyDonations();
    } catch (err: any) {
      triggerToast('Error', err.response?.data?.error || 'Failed to upload donation.', 'warning');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (donation: Donation) => {
    setActiveDonationId(donation.id);
    setTitle(donation.title);
    setDescription(donation.description);
    setCategory(donation.category);
    setGender(donation.gender);
    setAgeGroup(donation.age_group);
    setSize(donation.size);
    setQuantity(donation.quantity.toString());
    setCondition(donation.condition);
    setExistingImages(donation.images);
    setIsEditModalOpen(true);
  };

  // Update Donation
  const handleUpdateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDonationId) return;

    setSubmitLoading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('gender', gender);
    formData.append('age_group', ageGroup);
    formData.append('size', size);
    formData.append('quantity', quantity);
    formData.append('condition', condition);

    // Keep existing images
    existingImages.forEach(img => {
      formData.append('existingImages', img);
    });

    // Add new files if selected
    if (selectedFiles) {
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('images', selectedFiles[i]);
      }
    }

    try {
      await api.put(`/donations/${activeDonationId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      triggerToast('Success', 'Donation updated successfully!', 'success');
      resetForm();
      setIsEditModalOpen(false);
      fetchMyDonations();
    } catch (err: any) {
      triggerToast('Error', err.response?.data?.error || 'Failed to update donation.', 'warning');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete Donation
  const handleDeleteDonation = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this donation?')) return;

    try {
      await api.delete(`/donations/${id}`);
      triggerToast('Success', 'Donation deleted successfully.', 'success');
      fetchMyDonations();
    } catch (err: any) {
      triggerToast('Error', err.response?.data?.error || 'Failed to delete donation.', 'warning');
    }
  };

  // Fetch Requests for a Donation
  const viewRequests = async (donationId: string) => {
    setActiveDonationId(donationId);
    setRequestsLoading(true);
    setIsRequestsPanelOpen(true);

    try {
      const res = await api.get(`/requests/donation/${donationId}`);
      setSelectedDonationRequests(res.data);
    } catch (err: any) {
      console.error(err);
      triggerToast('Error', 'Failed to fetch requests.', 'warning');
    } finally {
      setRequestsLoading(false);
    }
  };

  // Accept/Reject NGO Request
  const handleRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
    if (action === 'accept' && !window.confirm('Accepting this NGO will reject all other requests and open a chat. Continue?')) return;
    if (action === 'reject' && !window.confirm('Are you sure you want to decline this request?')) return;

    try {
      await api.put(`/requests/${requestId}/status`, { action });
      triggerToast('Success', `Request ${action === 'accept' ? 'accepted' : 'declined'} successfully.`, 'success');
      
      // Refresh panel
      if (activeDonationId) {
        viewRequests(activeDonationId);
      }
      fetchMyDonations();
    } catch (err: any) {
      triggerToast('Error', err.response?.data?.error || 'Action failed.', 'warning');
    }
  };

  // Confirm Collection (mark collected -> completed)
  const handleConfirmCollection = async (donationId: string) => {
    try {
      // Find the request that was accepted
      const reqRes = await api.get(`/requests/donation/${donationId}`);
      const acceptedReq = reqRes.data.find((r: any) => r.request_status === 'collected' || r.request_status === 'accepted');
      
      if (!acceptedReq) {
        triggerToast('Error', 'No active accepted request found to complete.', 'warning');
        return;
      }

      await api.put(`/requests/${acceptedReq.request_id}/status`, { action: 'complete' });
      triggerToast('Completed', 'Collection confirmed! Donation successfully completed.', 'success');
      fetchMyDonations();
    } catch (err: any) {
      triggerToast('Error', err.response?.data?.error || 'Failed to confirm collection.', 'warning');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Shirts');
    setGender('Unisex');
    setAgeGroup('Adult');
    setSize('M');
    setQuantity('1');
    setCondition('Good');
    setSelectedFiles(null);
    setExistingImages([]);
    setActiveDonationId(null);
  };

  // Status Badge Helper
  const getStatusBadge = (status: Donation['status']) => {
    const map = {
      available: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40',
      requested: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40',
      accepted: 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border-sky-100 dark:border-sky-900/40',
      collected: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/40',
      completed: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-700/50',
      rejected: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/40',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${map[status] || ''}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Donor Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage and track your clothing donations</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="flex items-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md hover:shadow-emerald-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
          id="donate-clothes-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Donate Clothes
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel p-4 rounded-xl text-center">
          <span className="block text-2xl font-bold text-slate-850 dark:text-white">{donations.length}</span>
          <span className="text-[10px] text-slate-450 dark:text-slate-550 uppercase font-semibold mt-1 block">Total Donated</span>
        </div>
        <div className="glass-panel p-4 rounded-xl text-center">
          <span className="block text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {donations.filter(d => d.status === 'requested').length}
          </span>
          <span className="text-[10px] text-slate-450 dark:text-slate-550 uppercase font-semibold mt-1 block">Active Requests</span>
        </div>
        <div className="glass-panel p-4 rounded-xl text-center">
          <span className="block text-2xl font-bold text-sky-600 dark:text-sky-400">
            {donations.filter(d => ['accepted', 'collected'].includes(d.status)).length}
          </span>
          <span className="text-[10px] text-slate-450 dark:text-slate-550 uppercase font-semibold mt-1 block">In Collection</span>
        </div>
        <div className="glass-panel p-4 rounded-xl text-center">
          <span className="block text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {donations.filter(d => d.status === 'completed').length}
          </span>
          <span className="text-[10px] text-slate-450 dark:text-slate-550 uppercase font-semibold mt-1 block">Closed Completed</span>
        </div>
      </div>

      {/* Main Grid: Uploaded Donations */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          <span className="text-sm text-slate-500 mt-2">Loading your donations...</span>
        </div>
      ) : donations.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl flex flex-col items-center justify-center">
          <Shirt className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No clothes uploaded yet</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mt-2">
            Your donations directory is empty. Get started by clicking "Donate Clothes" above!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {donations.map((donation) => (
            <div key={donation.id} className="glass-panel overflow-hidden rounded-2xl flex flex-col justify-between group hover:border-emerald-500/20 transition-all duration-300">
              <div>
                {/* Images */}
                <div className="h-48 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
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
                  {/* Status Indicator */}
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(donation.status)}
                  </div>
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-slate-850 dark:text-white truncate">{donation.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 line-clamp-2">{donation.description}</p>
                  
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block">Category:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{donation.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block">Gender & Age:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{donation.gender} ({donation.age_group})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block">Size & Qty:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{donation.size} / x{donation.quantity}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block">Condition:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{donation.condition}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Operations Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex justify-between items-center gap-2">
                {/* Available & Requested actions */}
                {['available', 'requested'].includes(donation.status) ? (
                  <>
                    <button
                      onClick={() => openEditModal(donation)}
                      className="flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </button>
                    
                    {donation.status === 'requested' && (
                      <button
                        onClick={() => viewRequests(donation.id)}
                        className="flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                      >
                        <Heart className="w-3.5 h-3.5 mr-1.5" />
                        Requests ({donation.request_count})
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteDonation(donation.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="w-full flex justify-between items-center">
                    {/* State tracking display for active matches */}
                    {donation.status === 'accepted' && (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-slate-400 dark:text-slate-500">Awaiting NGO collection</span>
                        <Link to="/chats" className="flex items-center text-xs text-sky-600 dark:text-sky-400 font-bold hover:underline">
                          <MessageSquare className="w-3.5 h-3.5 mr-1" />
                          Chat Partner
                        </Link>
                      </div>
                    )}

                    {donation.status === 'collected' && (
                      <div className="flex items-center justify-between w-full">
                        <button
                          onClick={() => handleConfirmCollection(donation.id)}
                          className="flex items-center text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Confirm Collection
                        </button>
                        <Link to="/chats" className="flex items-center text-xs text-sky-600 dark:text-sky-400 font-bold hover:underline">
                          <MessageSquare className="w-3.5 h-3.5 mr-1" />
                          Chat Partner
                        </Link>
                      </div>
                    )}

                    {donation.status === 'completed' && (
                      <div className="flex items-center justify-between w-full text-xs text-slate-450 dark:text-slate-550">
                        <span>Completed on {new Date(donation.created_at).toLocaleDateString()}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-500">Closed Successfully</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. ADD DONATION MODAL */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Donate Clothing</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDonation} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Title / Item Name</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Winter woolen sweaters pack"
                  className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Description & details</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe condition, fabric, quantity details..."
                  className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white h-20 resize-none"
                  required
                />
              </div>

              {/* Parameters Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  >
                    {['Shirts', 'Pants', 'Dresses', 'Coats', 'Footwear', 'Other'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  >
                    {['Men', 'Women', 'Unisex', 'Boys', 'Girls'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Age Group</label>
                  <select
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  >
                    {['Infant', 'Toddler', 'Child', 'Teen', 'Adult'].map(age => (
                      <option key={age} value={age}>{age}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Size</label>
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="e.g. M, L, XL, 6-8 Yrs"
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="1"
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  >
                    {['New', 'Like New', 'Good', 'Fair'].map(cond => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Images */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Item Images (Select up to 5)</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  multiple
                  accept="image/*"
                  className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 dark:file:bg-emerald-950/30 file:text-emerald-700 dark:file:text-emerald-400 hover:file:bg-emerald-100 cursor-pointer"
                  required
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitLoading}
                className="w-full flex justify-center items-center py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md disabled:opacity-50 mt-4"
              >
                {submitLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading clothes...
                  </>
                ) : (
                  'Upload Donation'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. EDIT DONATION MODAL */}
      {/* ========================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Edit Clothes Details</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDonation} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Title / Item Name</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Description & details</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white h-20 resize-none"
                  required
                />
              </div>

              {/* Parameters Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  >
                    {['Shirts', 'Pants', 'Dresses', 'Coats', 'Footwear', 'Other'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  >
                    {['Men', 'Women', 'Unisex', 'Boys', 'Girls'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Age Group</label>
                  <select
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  >
                    {['Infant', 'Toddler', 'Child', 'Teen', 'Adult'].map(age => (
                      <option key={age} value={age}>{age}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Size</label>
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="1"
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  >
                    {['New', 'Like New', 'Good', 'Fair'].map(cond => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Existing Images preview */}
              <div className="flex gap-2 py-1 overflow-x-auto">
                {existingImages.map((img, idx) => (
                  <div key={idx} className="relative w-12 h-12 rounded border bg-slate-50 overflow-hidden flex-shrink-0">
                    <img
                      src={img.startsWith('http') ? img : `http://localhost:5000${img}`}
                      alt="existing preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setExistingImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 bg-rose-500 text-white rounded-full p-0.5"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add More Images */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1.5">Upload Additonal Images</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  multiple
                  accept="image/*"
                  className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 dark:file:bg-emerald-950/30 file:text-emerald-700 dark:file:text-emerald-400 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitLoading}
                className="w-full flex justify-center items-center py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md disabled:opacity-50 mt-4"
              >
                {submitLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving edits...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. RECEIVED REQUESTS DRAWER/PANEL */}
      {/* ========================================================= */}
      {isRequestsPanelOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg h-full flex flex-col justify-between shadow-2xl border-l border-slate-100 dark:border-slate-700 animate-slide-in">
            {/* Panel Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">NGO Requests</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Review requests sent by charitable groups</p>
              </div>
              <button
                onClick={() => setIsRequestsPanelOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {requestsLoading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <span className="text-xs text-slate-500 mt-2">Fetching NGO documents...</span>
                </div>
              ) : selectedDonationRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <AlertCircle className="w-12 h-12 mb-3" />
                  <span className="text-sm">No requests received for this item.</span>
                </div>
              ) : (
                selectedDonationRequests.map((req) => (
                  <div key={req.request_id} className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/35 space-y-4">
                    {/* NGO Name & Date */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-850 dark:text-white text-base">{req.organization_name}</h4>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
                          Sent: {new Date(req.request_date).toLocaleDateString()}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                        req.request_status === 'pending'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                          : req.request_status === 'accepted'
                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                      }`}>
                        {req.request_status.toUpperCase()}
                      </span>
                    </div>

                    {/* Registration metadata */}
                    <div className="text-xs space-y-1 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-150 dark:border-slate-700/60">
                      <div>
                        <span className="text-slate-400">Reg Number:</span>{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-350">{req.registration_number}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Contact Email:</span>{' '}
                        <a href={`mailto:${req.ngo_email}`} className="font-semibold text-emerald-600 hover:underline">
                          {req.ngo_email}
                        </a>
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center">
                        <FileText className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        <a
                          href={req.verification_document.startsWith('http') ? req.verification_document : `http://localhost:5000${req.verification_document}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] font-semibold"
                        >
                          View NGO Registration Proof
                        </a>
                      </div>
                    </div>

                    {/* Actions */}
                    {req.request_status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleRequestAction(req.request_id, 'accept')}
                          className="flex-1 flex items-center justify-center py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Accept Request
                        </button>
                        <button
                          onClick={() => handleRequestAction(req.request_id, 'reject')}
                          className="flex-1 flex items-center justify-center py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-500 rounded-xl text-xs font-bold"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Panel Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
              <button
                onClick={() => setIsRequestsPanelOpen(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
