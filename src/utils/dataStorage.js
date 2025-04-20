const fs = require('fs').promises;
const path = require('path');
const dbConfig = require('../config/database');

const DATA_DIR = dbConfig.dataDir;
const COMPANIES_FILE = path.join(DATA_DIR, dbConfig.companiesFile);
const CONTACTS_FILE = path.join(DATA_DIR, dbConfig.contactsFile);
const ORGANIZATIONS_FILE = path.join(DATA_DIR, dbConfig.organizationsFile);

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log('数据目录已创建或已存在');
  } catch (error) {
    console.error('创建数据目录失败:', error);
    throw error;
  }
}

// 保存数据到文件
async function saveData(companies, contacts, organizations) {
  try {
    await ensureDataDir();
    
    await fs.writeFile(COMPANIES_FILE, JSON.stringify(companies, null, 2), 'utf8');
    console.log('公司数据已保存到', COMPANIES_FILE);
    
    await fs.writeFile(CONTACTS_FILE, JSON.stringify(contacts, null, 2), 'utf8');
    console.log('联系人数据已保存到', CONTACTS_FILE);
    
    await fs.writeFile(ORGANIZATIONS_FILE, JSON.stringify(organizations, null, 2), 'utf8');
    console.log('组织数据已保存到', ORGANIZATIONS_FILE);
    
    return true;
  } catch (error) {
    console.error('保存数据失败:', error);
    return false;
  }
}

// 从文件加载数据
async function loadData() {
  try {
    await ensureDataDir();
    
    // 检查文件是否存在
    const [companiesExist, contactsExist, organizationsExist] = await Promise.all([
      fs.access(COMPANIES_FILE).then(() => true).catch(() => false),
      fs.access(CONTACTS_FILE).then(() => true).catch(() => false),
      fs.access(ORGANIZATIONS_FILE).then(() => true).catch(() => false)
    ]);
    
    // 如果文件不存在，返回空数组
    const companies = companiesExist ? 
      JSON.parse(await fs.readFile(COMPANIES_FILE, 'utf8')) : [];
    
    const contacts = contactsExist ? 
      JSON.parse(await fs.readFile(CONTACTS_FILE, 'utf8')) : [];
    
    const organizations = organizationsExist ? 
      JSON.parse(await fs.readFile(ORGANIZATIONS_FILE, 'utf8')) : [];
    
    console.log(`成功加载 ${companies.length} 家公司, ${organizations.length} 个组织和 ${contacts.length} 位联系人的数据`);
    return { companies, contacts, organizations };
  } catch (error) {
    console.error('加载数据失败:', error);
    return { companies: [], contacts: [], organizations: [] };
  }
}

// 同步版本的文件操作
const syncFileOps = {
  saveData: (companies, contacts, organizations) => {
    const fs = require('fs');
    
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    fs.writeFileSync(COMPANIES_FILE, JSON.stringify(companies, null, 2));
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
    fs.writeFileSync(ORGANIZATIONS_FILE, JSON.stringify(organizations, null, 2));
  },
  
  loadData: () => {
    const fs = require('fs');
    
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    const companies = fs.existsSync(COMPANIES_FILE) ? 
      JSON.parse(fs.readFileSync(COMPANIES_FILE, 'utf8')) : [];
    
    const contacts = fs.existsSync(CONTACTS_FILE) ? 
      JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8')) : [];
    
    const organizations = fs.existsSync(ORGANIZATIONS_FILE) ? 
      JSON.parse(fs.readFileSync(ORGANIZATIONS_FILE, 'utf8')) : [];
    
    return { companies, contacts, organizations };
  }
};

module.exports = { 
  saveData, 
  loadData,
  syncFileOps
}; 