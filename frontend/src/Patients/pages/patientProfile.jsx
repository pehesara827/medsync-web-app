import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../../../supabaseClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Key, 
  Edit3, 
  Plus, 
  Activity, 
  AlertCircle, 
  Heart,
  Camera,
  Save,
  X
} from 'lucide-react';

export default function PatientProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  
  const [newContact, setNewContact] = useState({ name: '', relation: '', phone: '' });

  const fetchProfile = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        setLoading(false);
        return;
      }

      const response = await axios.get(`http://localhost:5000/api/patient/profile/${user.id}`);
      setProfile(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error("Error loading profile:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // Save Profile Changes
  const handleSaveProfile = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        alert("You must be logged in to update your profile.");
        return;
      }

      const nameParts = profile.fullName.split(' ');
      const payload = {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: profile.email,
        phone: profile.phone,
        dob: profile.dob,
        gender: profile.gender,
        address: profile.address
      };

      await axios.put(`http://localhost:5000/api/patient/profile/${user.id}`, payload);
      alert("Profile updated successfully!");
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    }
  };

  
  const handleAddContactSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        alert("You must be logged in to add an emergency contact.");
        return;
      }

      await axios.post(`http://localhost:5000/api/patient/profile/${user.id}/emergency-contact`, newContact);
      alert("Emergency contact saved!");
      setShowContactModal(false);
      setNewContact({ name: '', relation: '', phone: '' });
      fetchProfile();
    } catch (error) {
      console.error("Error saving contact:", error);
      alert("Failed to add emergency contact.");
    }
  };

  if (loading) return <LoadingSpinner message="Loading your profile" />;
  if (!profile) return <div className="p-8 text-center text-red-500 font-bold">Profile not found.</div>;

  return (
    <div className="min-h-screen bg-[#F4F7F8] p-4 md:p-8 text-[#252B2D] font-sans dark:bg-slate-950 dark:text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Profile Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#BCC9CD]/60 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#4CD7F6] shadow-md">
                <img 
                  src={profile.avatarUrl} 
                  alt="Profile Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <button className="absolute bottom-0 right-0 bg-[#4CD7F6] text-[#252B2D] p-2 rounded-full shadow-lg hover:bg-[#3bc0de] transition">
                <Camera size={14} />
              </button>
            </div>

            <div className="text-center sm:text-left space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-bold text-[#252B2D]">{profile.fullName}</h1>
                {profile.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#4CD7F6]/10 text-[#252B2D] border border-[#4CD7F6]/30">
                    <ShieldCheck size={12} className="text-[#4CD7F6]" /> VERIFIED
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-[#3D494C]">
                Patient ID: <span className="font-semibold text-[#252B2D]">{profile.patientId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#BCC9CD] text-[#252B2D] font-medium hover:bg-[#4CD7F6]/10 transition text-sm">
              <Key size={16} /> Change Password
            </button>

            {isEditing ? (
              <button 
                onClick={handleSaveProfile}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-sm transition text-sm"
              >
                <Save size={16} /> Save Changes
              </button>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4CD7F6] text-[#252B2D] font-bold hover:bg-[#3bc0de] shadow-sm transition text-sm"
              >
                <Edit3 size={16} /> Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Form Body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-[#BCC9CD]/60 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-[#BCC9CD]/40">
              <User className="text-[#4CD7F6]" size={20} />
              <h2 className="text-lg font-bold text-[#252B2D]">Personal Information</h2>
            </div>

            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#3D494C] uppercase tracking-wider mb-2">Full Name</label>
                  <input 
                    type="text" 
                    name="fullName"
                    disabled={!isEditing}
                    value={profile.fullName} 
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2.5 rounded-xl border ${isEditing ? 'bg-white border-[#4CD7F6]' : 'bg-slate-50 border-[#BCC9CD]'} text-[#252B2D] text-sm focus:outline-none transition`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3D494C] uppercase tracking-wider mb-2">Date of Birth</label>
                  <input 
                    type="date" 
                    name="dob"
                    disabled={!isEditing}
                    value={profile.dob} 
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2.5 rounded-xl border ${isEditing ? 'bg-white border-[#4CD7F6]' : 'bg-slate-50 border-[#BCC9CD]'} text-[#252B2D] text-sm focus:outline-none transition`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3D494C] uppercase tracking-wider mb-2">Gender</label>
                  <select 
                    name="gender"
                    disabled={!isEditing}
                    value={profile.gender}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2.5 rounded-xl border ${isEditing ? 'bg-white border-[#4CD7F6]' : 'bg-slate-50 border-[#BCC9CD]'} text-[#252B2D] text-sm focus:outline-none transition`}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3D494C] uppercase tracking-wider mb-2">Blood Type</label>
                  <div className="px-4 py-2.5 rounded-xl border border-[#4CD7F6]/30 bg-[#4CD7F6]/10 text-[#252B2D] font-bold text-sm text-center sm:text-left">
                    {profile.bloodType}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#BCC9CD]/40 space-y-4">
                <h3 className="text-xs font-bold text-[#3D494C] uppercase tracking-wider">Contact Details</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#3D494C] mb-1">Email Address</label>
                    <div className="relative flex items-center">
                      <Mail size={16} className="absolute left-3.5 text-[#3D494C]" />
                      <input 
                        type="email" 
                        name="email"
                        disabled={!isEditing}
                        value={profile.email} 
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${isEditing ? 'bg-white border-[#4CD7F6]' : 'bg-slate-50 border-[#BCC9CD]'} text-[#252B2D] text-sm focus:outline-none transition`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#3D494C] mb-1">Phone Number</label>
                    <div className="relative flex items-center">
                      <Phone size={16} className="absolute left-3.5 text-[#3D494C]" />
                      <input 
                        type="text" 
                        name="phone"
                        disabled={!isEditing}
                        value={profile.phone} 
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${isEditing ? 'bg-white border-[#4CD7F6]' : 'bg-slate-50 border-[#BCC9CD]'} text-[#252B2D] text-sm focus:outline-none transition`}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3D494C] mb-1">Residential Address</label>
                  <div className="relative flex items-center">
                    <MapPin size={16} className="absolute left-3.5 text-[#3D494C]" />
                    <input 
                      type="text" 
                      name="address"
                      disabled={!isEditing}
                      value={profile.address} 
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${isEditing ? 'bg-white border-[#4CD7F6]' : 'bg-slate-50 border-[#BCC9CD]'} text-[#252B2D] text-sm focus:outline-none transition`}
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>

        
          <div className="space-y-6">
            
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#BCC9CD]/60 space-y-5 dark:bg-slate-900 dark:border-slate-700">
              <div className="flex items-center gap-2 pb-3 border-b border-[#BCC9CD]/40">
                <Activity className="text-[#4CD7F6]" size={20} />
                <h2 className="text-lg font-bold text-[#252B2D]">Medical Overview</h2>
              </div>

              <div>
                <span className="block text-xs font-bold text-[#3D494C] uppercase tracking-wider mb-2">
                  <AlertCircle size={12} className="inline mr-1 text-rose-500" /> Allergies
                </span>
                <div className="flex flex-wrap gap-2">
                  {profile.allergies.map((allergy, index) => (
                    <span key={index} className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-[#3D494C] uppercase tracking-wider mb-2">
                  Chronic Conditions
                </span>
                <div className="space-y-2">
                  {profile.chronicConditions.map((condition) => (
                    <div key={condition.id} className="p-3.5 rounded-xl bg-slate-50 border border-[#BCC9CD]/50 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 mt-0.5">
                        <Heart size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#252B2D]">{condition.name}</h4>
                        <p className="text-xs text-[#3D494C] mt-0.5">{condition.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#BCC9CD]/60 space-y-4 dark:bg-slate-900 dark:border-slate-700">
              <div className="flex items-center gap-2 pb-3 border-b border-[#BCC9CD]/40">
                <Phone className="text-[#4CD7F6]" size={20} />
                <h2 className="text-lg font-bold text-[#252B2D]">Emergency Contacts</h2>
              </div>

              <div className="space-y-3">
                {profile.emergencyContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-[#BCC9CD]/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#4CD7F6]/10 text-[#252B2D] flex items-center justify-center font-bold text-xs border border-[#4CD7F6]/30">
                        {contact.initials}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#252B2D]">{contact.name}</h4>
                        <p className="text-xs text-[#3D494C]">{contact.relation}</p>
                      </div>
                    </div>
                    <a href={`tel:${contact.phone}`} className="p-2 rounded-lg text-[#3D494C] hover:text-[#252B2D] hover:bg-[#4CD7F6]/20 transition">
                      <Phone size={16} />
                    </a>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowContactModal(true)}
                className="w-full mt-2 py-2.5 border border-dashed border-[#BCC9CD] rounded-xl text-[#252B2D] hover:bg-[#4CD7F6]/10 hover:border-[#4CD7F6] text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Plus size={14} className="text-[#4CD7F6]" /> Add Contact
              </button>
            </div>

          </div>
        </div>

      
        {showContactModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 border border-[#BCC9CD]">
              <div className="flex justify-between items-center pb-2 border-b">
                <h3 className="font-bold text-lg">Add Emergency Contact</h3>
                <button onClick={() => setShowContactModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleAddContactSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#3D494C]">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={newContact.name} 
                    onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-[#BCC9CD] text-sm mt-1" 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#3D494C]">Relationship</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Spouse, Brother"
                    value={newContact.relation} 
                    onChange={(e) => setNewContact({...newContact, relation: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-[#BCC9CD] text-sm mt-1" 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#3D494C]">Phone Number</label>
                  <input 
                    type="text" 
                    required 
                    value={newContact.phone} 
                    onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-[#BCC9CD] text-sm mt-1" 
                  />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowContactModal(false)} className="px-4 py-2 rounded-lg border text-sm font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-[#4CD7F6] text-[#252B2D] font-bold text-sm">Save Contact</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}