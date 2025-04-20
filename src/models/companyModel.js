const { v4: uuidv4 } = require('uuid');
const { getDataRefs, saveAllData } = require('./contactModel');

// 公司模型
const Company = {
  getAll: () => {
    const { companies } = getDataRefs();
    return companies;
  },
  
  getById: (id) => {
    const { companies } = getDataRefs();
    return companies.find(company => company._id === id);
  },
  
  create: (companyData) => {
    const { companies } = getDataRefs();
    
    const newCompany = {
      _id: companyData._id || uuidv4(),
      name: companyData.name,
      description: companyData.description || '',
      organizations: companyData.organizations || [],
      createdAt: new Date().toISOString()
    };
    
    companies.push(newCompany);
    saveAllData();
    return newCompany;
  },
  
  update: (id, companyData) => {
    const { companies } = getDataRefs();
    const index = companies.findIndex(company => company._id === id);
    if (index === -1) return null;
    
    companies[index] = {
      ...companies[index],
      ...companyData,
      updatedAt: new Date().toISOString()
    };
    
    saveAllData();
    return companies[index];
  },
  
  delete: (id) => {
    const { companies, contacts } = getDataRefs();
    const initialLength = companies.length;
    
    // 移除公司
    const filteredCompanies = companies.filter(company => company._id !== id);
    
    if (filteredCompanies.length !== initialLength) {
      // 删除关联的联系人的公司关系
      const updatedContacts = contacts.map(contact => {
        if (contact.companies && contact.companies.length > 0) {
          return {
            ...contact,
            companies: contact.companies.filter(company => company._id !== id)
          };
        }
        return contact;
      });
      
      // 更新引用
      require('./contactModel').setDataRefs({
        companies: filteredCompanies,
        contacts: updatedContacts
      });
      
      saveAllData();
      return true;
    }
    return false;
  }
};

module.exports = { Company }; 