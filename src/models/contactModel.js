const { v4: uuidv4 } = require('uuid');
const { syncFileOps } = require('../utils/dataStorage');

// 内存数据存储
let contacts = [];
let companies = [];
let organizations = [];

// 加载初始数据
function loadInitialData() {
  const data = syncFileOps.loadData();
  contacts = data.contacts;
  companies = data.companies;
  organizations = data.organizations;
  return { contacts, companies, organizations };
}

// 保存所有数据
function saveAllData() {
  syncFileOps.saveData(companies, contacts, organizations);
}

// 联系人模型
const Contact = {
  getAll: () => contacts,
  
  getById: (id) => contacts.find(contact => contact._id === id),
  
  create: (contactData) => {
    // 使用提供的ID，如果没有则生成新ID
    const newContact = {
      _id: contactData._id || uuidv4(),
      name: contactData.name,
      profile: contactData.profile || '',
      companies: contactData.companies || [],
      organizations: contactData.organizations || [],
      // 添加新字段
      phone: contactData.phone || '',
      email: contactData.email || '',
      wechat: contactData.wechat || '',
      avatar: contactData.avatar || '',
      createdAt: new Date().toISOString()
    };
    
    contacts.push(newContact);
    saveAllData();
    return newContact;
  },
  
  update: (id, contactData) => {
    const index = contacts.findIndex(contact => contact._id === id);
    if (index === -1) return null;
    
    contacts[index] = {
      ...contacts[index],
      ...contactData,
      updatedAt: new Date().toISOString()
    };
    
    saveAllData();
    return contacts[index];
  },
  
  delete: (id) => {
    const initialLength = contacts.length;
    contacts = contacts.filter(contact => contact._id !== id);
    
    if (contacts.length !== initialLength) {
      saveAllData();
      return true;
    }
    return false;
  },
  
  // 为了在其它模型中访问和修改联系人数据
  _getContactsRef: () => contacts,
  _setContactsData: (data) => { contacts = data; },
};

module.exports = {
  Contact,
  loadInitialData,
  saveAllData,
  getDataRefs: () => ({ contacts, companies, organizations }),
  setDataRefs: (data) => {
    if (data.contacts) contacts = data.contacts;
    if (data.companies) companies = data.companies;
    if (data.organizations) organizations = data.organizations;
  }
}; 