import express from 'express';
import {
  createFavorite,
  deleteFavorite,
  getPatientFavorites,
  toggleFavorite,
} from '../controllers/favoriteController.js';

const router = express.Router();

router.get('/patient/:patientId', getPatientFavorites);
router.post('/', createFavorite);
router.delete('/', deleteFavorite);
router.post('/toggle', toggleFavorite);

export default router;
