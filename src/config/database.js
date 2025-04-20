const path = require('path');

// 数据库配置
const dbConfig = {
  dataDir: path.join(__dirname, '../../data'),
  contactsFile: 'contacts.json',
  companiesFile: 'companies.json',
  organizationsFile: 'organizations.json'
};

module.exports = dbConfig; 