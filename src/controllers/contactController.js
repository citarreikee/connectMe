const { Contact } = require('../models');

// 联系人控制器
const contactController = {
  // 获取所有联系人
  getAllContacts: (req, res) => {
    try {
      const contacts = Contact.getAll();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 获取单个联系人
  getContactById: (req, res) => {
    try {
      const contact = Contact.getById(req.params.id);
      if (!contact) {
        return res.status(404).json({ error: '联系人不存在' });
      }
      res.json(contact);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 创建联系人
  createContact: (req, res) => {
    try {
      const newContact = Contact.create(req.body);
      res.status(201).json(newContact);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // 更新联系人
  updateContact: (req, res) => {
    try {
      const updatedContact = Contact.update(req.params.id, req.body);
      if (!updatedContact) {
        return res.status(404).json({ error: '联系人不存在' });
      }
      res.json(updatedContact);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // 删除联系人
  deleteContact: (req, res) => {
    try {
      const deleted = Contact.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: '联系人不存在' });
      }
      res.json({ message: '联系人已删除' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = contactController; 