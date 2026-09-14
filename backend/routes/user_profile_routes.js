import express from 'express';
import { 
  getPatientProfile, 
  updatePatientProfile, 
  addEmergencyContact,
  updateProfilePicture,
  removeProfilePicture
} from '../controllers/user_profile_controller.js';  

const router = express.Router();


router.get('/:userId', getPatientProfile);
router.put('/:userId', updatePatientProfile);


router.post('/:userId/emergency-contact', addEmergencyContact);


// Profile picture — PUT stores the newly uploaded image and immediately deletes
// the file it replaces; DELETE reverts to the default avatar and deletes the file.
router.put('/:userId/photo', updateProfilePicture);
router.delete('/:userId/photo', removeProfilePicture);

export default router;