
import { supabase } from '../supabase.js';

// Storage bucket that holds every patient profile picture.
const PROFILE_PICTURE_BUCKET = 'profile-pictures';

// Shown whenever the patient has no picture of their own.
const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80';

/**
 * Extracts the storage object path from a public bucket URL.
 * Supabase encodes the path (spaces become %20 and so on), so it is decoded
 * again before it is handed to the storage API.
 * Returns null for anything that does not live in the profile-pictures bucket
 * (e.g. the Unsplash placeholder), so callers never delete a file we did not
 * upload ourselves.
 */
const storagePathFromPublicUrl = (url) => {
  if (typeof url !== 'string' || !url) return null;

  const marker = `/storage/v1/object/public/${PROFILE_PICTURE_BUCKET}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;

  const encodedPath = url.slice(markerIndex + marker.length).split('?')[0];

  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return encodedPath;
  }
};

/**
 * Permanently removes a picture from the profile-pictures bucket.
 * Failures are logged and reported as `false` but never abort the caller — by
 * the time this runs the database already points at the new (or default)
 * picture, so a failed cleanup must not roll the profile back.
 */
const removeProfilePictureObject = async (url) => {
  const objectPath = storagePathFromPublicUrl(url);
  if (!objectPath) return false;

  const { error } = await supabase.storage
    .from(PROFILE_PICTURE_BUCKET)
    .remove([objectPath]);

  if (error) {
    console.error('Failed to delete previous profile picture:', error);
    return false;
  }

  return true;
};


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

    // Family members (beneficiaries) saved under this patient account.
    const { data: beneficiaryRows, error: beneficiariesError } = await supabase
      .from('beneficiaries')
      .select('id, full_name, age, gender, relationship')
      .eq('patient_id', profileData.id)
      .order('full_name');

    if (beneficiariesError) {
      console.error("Supabase beneficiaries error:", beneficiariesError);
    }

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
        avatarUrl: profileData.profile_picture_url || DEFAULT_AVATAR_URL,
        hasCustomAvatar: Boolean(profileData.profile_picture_url),
        isVerified: Boolean(profileData.users?.is_verified),
        beneficiaries: (beneficiaryRows || []).map((beneficiary) => ({
          id: beneficiary.id,
          fullName: beneficiary.full_name || '',
          age: beneficiary.age ?? null,
          gender: beneficiary.gender || '',
          relationship: beneficiary.relationship || ''
        })),
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


/**
 * PUT /api/patient/profile/:userId/photo
 * Saves a newly uploaded profile picture and deletes the file it replaces as
 * soon as the new URL is stored, so storage never keeps a stale copy.
 */
export const updateProfilePicture = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { profilePictureUrl } = req.body;

    if (typeof profilePictureUrl !== 'string' || !profilePictureUrl.trim()) {
      return res.status(400).json({ success: false, message: "A profile picture URL is required" });
    }

    const newUrl = profilePictureUrl.trim();

    const { data: existingProfile, error: fetchError } = await supabase
      .from('patient_profiles')
      .select('id, profile_picture_url')
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingProfile) {
      console.error("Supabase Error:", fetchError);
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const previousUrl = existingProfile.profile_picture_url || null;

    const { error: updateError } = await supabase
      .from('patient_profiles')
      .update({ profile_picture_url: newUrl })
      .eq('id', existingProfile.id);

    if (updateError) throw updateError;

    // The new picture is saved — purge the one it replaced immediately.
    let removedPrevious = false;
    if (previousUrl && previousUrl !== newUrl) {
      removedPrevious = await removeProfilePictureObject(previousUrl);
    }

    res.status(200).json({
      success: true,
      message: "Profile picture updated successfully!",
      data: {
        avatarUrl: newUrl,
        hasCustomAvatar: true,
        removedPrevious
      }
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    res.status(500).json({ success: false, message: "Server error while updating profile picture" });
  }
};


/**
 * DELETE /api/patient/profile/:userId/photo
 * Reverts the patient to the default avatar and deletes the stored file.
 */
export const removeProfilePicture = async (req, res) => {
  try {
    const userId = req.params.userId;

    const { data: existingProfile, error: fetchError } = await supabase
      .from('patient_profiles')
      .select('id, profile_picture_url')
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingProfile) {
      console.error("Supabase Error:", fetchError);
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const previousUrl = existingProfile.profile_picture_url || null;

    const { error: updateError } = await supabase
      .from('patient_profiles')
      .update({ profile_picture_url: null })
      .eq('id', existingProfile.id);

    if (updateError) throw updateError;

    // The profile no longer references the file — delete it right away.
    const removedPrevious = previousUrl
      ? await removeProfilePictureObject(previousUrl)
      : false;

    res.status(200).json({
      success: true,
      message: "Profile picture removed successfully!",
      data: {
        avatarUrl: DEFAULT_AVATAR_URL,
        hasCustomAvatar: false,
        removedPrevious
      }
    });
  } catch (error) {
    console.error("Error removing profile picture:", error);
    res.status(500).json({ success: false, message: "Server error while removing profile picture" });
  }
};