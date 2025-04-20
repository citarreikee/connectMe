const { Company } = require('../models');

// 公司控制器
const companyController = {
  // 获取所有公司
  getAllCompanies: (req, res) => {
    try {
      const companies = Company.getAll();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 获取单个公司
  getCompanyById: (req, res) => {
    try {
      const company = Company.getById(req.params.id);
      if (!company) {
        return res.status(404).json({ error: '公司不存在' });
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 创建公司
  createCompany: (req, res) => {
    try {
      const newCompany = Company.create(req.body);
      res.status(201).json(newCompany);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // 更新公司
  updateCompany: (req, res) => {
    try {
      const updatedCompany = Company.update(req.params.id, req.body);
      if (!updatedCompany) {
        return res.status(404).json({ error: '公司不存在' });
      }
      res.json(updatedCompany);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // 删除公司
  deleteCompany: (req, res) => {
    try {
      const deleted = Company.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: '公司不存在' });
      }
      res.json({ message: '公司已删除' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = companyController; 