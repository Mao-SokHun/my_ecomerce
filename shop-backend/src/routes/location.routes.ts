import { Router } from 'express';
import { getProvinces, getDistricts, getCommunes, getVillages } from '../controllers/location.controller';

const router = Router();

router.get('/provinces', getProvinces);
router.get('/districts/:provinceId', getDistricts);
router.get('/communes/:districtId', getCommunes);
router.get('/villages/:communeId', getVillages);

export default router;

