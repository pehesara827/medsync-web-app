import express from 'express';
import { 
  getPatientProfile, 
  updatePatientProfile, 
  addEmergencyContact 
} from '../controllers/user_profile_controller.js';  

const router = express.Router();


router.get('/:userId', getPatientProfile);
router.put('/:userId', updatePatientProfile);


router.post('/:userId/emergency-contact', addEmergencyContact);

export default router;