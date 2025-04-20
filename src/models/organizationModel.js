const { v4: uuidv4 } = require('uuid');
const { getDataRefs, saveAllData } = require('./contactModel');

// 组织模型
const Organization = {
  getAll: () => {
    const { organizations } = getDataRefs();
    return organizations;
  },
  
  getById: (id) => {
    const { organizations } = getDataRefs();
    return organizations.find(org => org._id === id);
  },
  
  create: (orgData) => {
    const { organizations } = getDataRefs();
    
    const newOrg = {
      _id: orgData._id || uuidv4(),
      name: orgData.name,
      description: orgData.description || '',
      createdAt: new Date().toISOString()
    };
    
    organizations.push(newOrg);
    saveAllData();
    return newOrg;
  },
  
  update: (id, orgData) => {
    const { organizations } = getDataRefs();
    const index = organizations.findIndex(org => org._id === id);
    if (index === -1) return null;
    
    organizations[index] = {
      ...organizations[index],
      ...orgData,
      updatedAt: new Date().toISOString()
    };
    
    saveAllData();
    return organizations[index];
  },
  
  delete: (id) => {
    const { organizations, contacts, companies } = getDataRefs();
    const initialLength = organizations.length;
    
    // 移除组织
    const filteredOrganizations = organizations.filter(org => org._id !== id);
    
    if (filteredOrganizations.length !== initialLength) {
      // 从联系人的组织列表中移除该组织
      const updatedContacts = contacts.map(contact => {
        if (contact.organizations && contact.organizations.length > 0) {
          return {
            ...contact,
            organizations: contact.organizations.filter(org => org._id !== id)
          };
        }
        return contact;
      });
      
      // 从公司的组织列表中移除该组织
      const updatedCompanies = companies.map(company => {
        if (company.organizations && company.organizations.length > 0) {
          return {
            ...company,
            organizations: company.organizations.filter(org => org._id !== id)
          };
        }
        return company;
      });
      
      // 更新引用
      require('./contactModel').setDataRefs({
        organizations: filteredOrganizations,
        contacts: updatedContacts,
        companies: updatedCompanies
      });
      
      saveAllData();
      return true;
    }
    return false;
  }
};

module.exports = { Organization }; 