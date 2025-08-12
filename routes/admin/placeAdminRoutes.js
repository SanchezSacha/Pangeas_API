const express = require('express');
const router = express.Router();
const {
    getAllPlacesController,
    getPlaceByIdController,
    createPlaceController,
    updatePlaceController,
    deletePlaceController,
    getGlobalStatsController,
    getPlacesStatsController,
    getChartCategoriesController,
    getChartVisitsController
} = require('../../controllers/admin/placeAdminController');
const getTopVisitedPlacesController = require('../../controllers/admin/getTopVisitedPlacesController')
const { isAdmin } = require('../../middleware/admin/isAdmin');

router.get('/stats', isAdmin, getGlobalStatsController);
router.get('/stats/global', isAdmin, getPlacesStatsController);
router.get('/stats/top', isAdmin, getTopVisitedPlacesController);
router.get('/chart/categories', isAdmin, getChartCategoriesController);
router.get('/chart/visits', isAdmin, getChartVisitsController);

router.get('/', isAdmin, getAllPlacesController);
router.get('/:id', isAdmin, getPlaceByIdController);
router.post('/', isAdmin, createPlaceController);
router.put('/:id', isAdmin, updatePlaceController);
router.delete('/:id', isAdmin, deletePlaceController);


module.exports = router;
