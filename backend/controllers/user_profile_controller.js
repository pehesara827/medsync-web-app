
import { supabase } from '../supabase.js';


export const getPatientProfile = async (req, res) => {
  try {
    const userId = req.params.userId;


    const { data: profileData, error } = await supabase
      .from('patient_profiles')
      .select('*, users(email, is_verified)')
      .eq('user_id', userId)
      .single();

    if (error || !profileData) {
      console.error("Supabase Error:", error);
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    
    const rawPatientId = profileData.id ? profileData.id.toString() : '0000';
    const formattedPatientId = `#MS-${rawPatientId.substring(0, 4)}`;

    res.status(200).json({
      success: true,
      data: {
        userId: profileData.user_id,
        patientId: formattedPatientId,
        fullName: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'Patient Name',
        firstName: profileData.first_name || '',
        lastName: profileData.last_name || '',
        email: profileData.users?.email || '',
        phone: profileData.phone_number || '',
        dob: profileData.date_of_birth ? new Date(profileData.date_of_birth).toISOString().split('T')[0] : '',
        gender: profileData.gender || 'Male',
        bloodType: profileData.blood_group || 'N/A',
        address: profileData.home_address || '',
        avatarUrl: profileData.profile_picture_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80',
        isVerified: Boolean(profileData.users?.is_verified),
        allergies: ["Penicillin", "Latex"],
        chronicConditions: [
          { id: 1, name: "Mild Asthma", note: "Diagnosed 2015 • Monitored Annually" }
        ],
        emergencyContacts: profileData.emergency_contact_name ? [
          {
            id: 1,
            name: profileData.emergency_contact_name,
            relation: profileData.emergency_contact_rel || 'Emergency Contact',
            phone: profileData.emergency_contact_phone || '',
            initials: profileData.emergency_contact_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          }
        ] : []
      }
    });

  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ success: false, message: "Server error while fetching profile" });
  }
};


export const updatePatientProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { firstName, lastName, phone, dob, gender, address } = req.body;

    const { error } = await supabase
      .from('patient_profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        date_of_birth: dob,
        gender: gender,
        home_address: address
      })
      .eq('user_id', userId);

    if (error) throw error;

    res.status(200).json({ success: true, message: "Profile updated successfully!" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ success: false, message: "Server error while updating profile" });
  }
};


export const addEmergencyContact = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { name, relation, phone } = req.body;

    const { error } = await supabase
      .from('patient_profiles')
      .update({
        emergency_contact_name: name,
        emergency_contact_rel: relation,
        emergency_contact_phone: phone
      })
      .eq('user_id', userId);

    if (error) throw error;

    res.status(200).json({ success: true, message: "Emergency contact updated successfully!" });
  } catch (error) {
    console.error("Error adding emergency contact:", error);
    res.status(500).json({ success: false, message: "Server error while adding emergency contact" });
  }
};