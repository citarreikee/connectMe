const express = require('express');
const organizationController = require('../controllers/organizationController');

const router = express.Router();

// 组织路由
router.get('/', organizationController.getAllOrganizations);
router.get('/:id', organizationController.getOrganizationById);
router.post('/', organizationController.createOrganization);
router.put('/:id', organizationController.updateOrganization);
router.delete('/:id', organizationController.deleteOrganization);

module.exports = router; 