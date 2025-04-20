const { Organization } = require('../models');

// 组织控制器
const organizationController = {
  // 获取所有组织
  getAllOrganizations: (req, res) => {
    try {
      const organizations = Organization.getAll();
      res.json(organizations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 获取单个组织
  getOrganizationById: (req, res) => {
    try {
      const organization = Organization.getById(req.params.id);
      if (!organization) {
        return res.status(404).json({ error: '组织不存在' });
      }
      res.json(organization);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 创建组织
  createOrganization: (req, res) => {
    try {
      const newOrganization = Organization.create(req.body);
      res.status(201).json(newOrganization);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // 更新组织
  updateOrganization: (req, res) => {
    try {
      const updatedOrganization = Organization.update(req.params.id, req.body);
      if (!updatedOrganization) {
        return res.status(404).json({ error: '组织不存在' });
      }
      res.json(updatedOrganization);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // 删除组织
  deleteOrganization: (req, res) => {
    try {
      const deleted = Organization.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: '组织不存在' });
      }
      res.json({ message: '组织已删除' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = organizationController; 