document.addEventListener('DOMContentLoaded', function() {
    let contacts = [];
    let companies = [];
    let organizations = [];
    let graph = null;
    let currentTab = 'contacts';
    let graphData = { nodes: [], links: [] };
    let selectedNode = null;
    let hoverNode = null; // 添加悬停节点跟踪
    
    // 添加延迟刷新标志，确保状态变化后及时重绘
    let needsRefresh = false;
    
    // 移动端导航功能
    function setupMobileNav() {
      const mobileNavToggle = document.getElementById('mobileNavToggle');
      const sidebar = document.querySelector('.sidebar');
      
      if (mobileNavToggle && sidebar) {
        mobileNavToggle.addEventListener('click', function() {
          sidebar.classList.toggle('active');
          // 如果侧边栏变为可见，添加背景点击事件来关闭它
          if (sidebar.classList.contains('active')) {
            setTimeout(() => {
              document.addEventListener('click', closeSidebarOnClickOutside);
            }, 10);
          }
        });
      }
      
      // 点击侧边栏外部区域关闭侧边栏
      function closeSidebarOnClickOutside(event) {
        if (!sidebar.contains(event.target) && event.target !== mobileNavToggle) {
          sidebar.classList.remove('active');
          document.removeEventListener('click', closeSidebarOnClickOutside);
        }
      }
      
      // 监听窗口大小变化，在大屏幕上重置侧边栏状态
      window.addEventListener('resize', function() {
        if (window.innerWidth > 767) {
          sidebar.classList.remove('active');
          sidebar.style.display = '';
        }
      });
    }
    
    // 添加移动端检测
    function isMobileDevice() {
      return window.innerWidth <= 767;
    }
    
    // 修改刷新方法，确保用正确的方式刷新
    function setupRefreshLoop() {
      setInterval(() => {
        if (needsRefresh && graph) {
          // 强制重绘所有元素 - 使用可靠的方法
          const currentData = graph.graphData();
          graph.graphData(currentData);
          needsRefresh = false;
        }
      }, 100);
    }
    
    // 显示详情面板
    function showDetailPanel(node) {
      console.log("显示详情面板调用成功", node.name);
      
      const panel = document.getElementById('detailPanel');
      const title = document.getElementById('detailTitle');
      const subtitle = document.getElementById('detailSubtitle');
      const content = document.getElementById('detailContent');
      
      // 设置面板标题和内容
      title.textContent = node.name;
      
      if (node.type === 'company') {
        subtitle.textContent = '公司';
        
        // 查找该公司的所有员工
        const employees = contacts.filter(contact => {
          return contact.companies && contact.companies.some(c => c._id === node._id);
        });
        
        // 查找公司所属的组织
        const organizationInfo = node.organizations && node.organizations.length > 0 ? `<div class="detail-section">
            <div class="detail-section-title">所属组织</div>
            <div class="detail-connections">
              ${node.organizations.map(org => `
                <div class="connection-tag" data-id="${org._id}" data-type="organization">
                  ${org.name}
                </div>
              `).join('')}
            </div>
          </div>` : '';
        
        content.innerHTML = `
          <div class="detail-section">
            <div class="detail-section-title">公司简介</div>
            ${node.description ? `<p>${node.description}</p>` : `<div class="empty-info"><span class="text-muted">暂无简介</span></div>`}
          </div>
          
          ${organizationInfo}
          
          <div class="detail-section">
            <div class="detail-section-title">员工 (${employees.length})</div>
            <div class="detail-connections">
              ${employees.map(emp => `
                <div class="connection-tag" data-id="${emp._id}" data-type="contact">
                  ${emp.name}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } else if (node.type === 'organization') {
        subtitle.textContent = '组织';
        
        // 查找该组织的所有成员
        const members = contacts.filter(contact => {
          return contact.organizations && contact.organizations.some(o => o._id === node._id);
        });
        
        // 查找该组织的所有公司
        const affiliatedCompanies = companies.filter(company => {
          return company.organizations && company.organizations.some(o => o._id === node._id);
        });
        
        content.innerHTML = `
          <div class="detail-section">
            <div class="detail-section-title">组织简介</div>
            ${node.description ? `<p>${node.description}</p>` : `<div class="empty-info"><span class="text-muted">暂无简介</span></div>`}
          </div>
          
          ${affiliatedCompanies.length > 0 ? `
            <div class="detail-section">
              <div class="detail-section-title">成员公司 (${affiliatedCompanies.length})</div>
              <div class="detail-connections">
                ${affiliatedCompanies.map(company => `
                  <div class="connection-tag" data-id="${company._id}" data-type="company">
                    ${company.name}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          ${members.length > 0 ? `
            <div class="detail-section">
              <div class="detail-section-title">成员 (${members.length})</div>
              <div class="detail-connections">
                ${members.map(member => `
                  <div class="connection-tag" data-id="${member._id}" data-type="contact">
                    ${member.name}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        `;
      } else if (node.type === 'contact' || node.type === 'freelancer') { // 处理联系人和自由职业者
        if (node.companies && node.companies.length > 0) {
          subtitle.textContent = node.companies.map(c => c.name).join(', ');
        } else if (node.organizations && node.organizations.length > 0) {
          subtitle.textContent = node.organizations.map(o => o.name).join(', ');
        } else {
          subtitle.textContent = '自由职业者';
        }
        
        // 查找同一公司或组织的其他成员
        let colleagues = [];
        if (node.companies && node.companies.length > 0) {
          colleagues = contacts.filter(contact => {
            return contact._id !== node._id && 
                  contact.companies && 
                  contact.companies.some(c => node.companies.some(nc => nc._id === c._id));
          });
        } else if (node.organizations && node.organizations.length > 0) {
          colleagues = contacts.filter(contact => {
            return contact._id !== node._id && 
                  contact.organizations && 
                  contact.organizations.some(o => node.organizations.some(no => no._id === o._id));
          });
        }
        
        content.innerHTML = `
          <img src="${node.avatar || 'https://via.placeholder.com/80'}" alt="${node.name}" class="detail-avatar">
          
          <div class="detail-section">
            <div class="detail-section-title">联系方式</div>
            <div class="contact-info">
              ${node.phone ? `
              <div class="contact-info-item">
                <i class="bi bi-telephone"></i>
                <span>${node.phone}</span>
              </div>
              ` : ''}
              ${node.email ? `
              <div class="contact-info-item">
                <i class="bi bi-envelope"></i>
                <span>${node.email}</span>
              </div>
              ` : ''}
              ${node.wechat ? `
              <div class="contact-info-item">
                <i class="bi bi-wechat"></i>
                <span>${node.wechat}</span>
              </div>
              ` : ''}
              ${!node.phone && !node.email && !node.wechat ? `
              <div class="contact-info-item empty-info">
                <span class="text-muted">暂无联系方式</span>
              </div>
              ` : ''}
            </div>
          </div>
          
          ${node.profile ? `
          <div class="detail-section">
            <div class="detail-section-title">个人简介</div>
            <p>${node.profile.replace(/\n/g, '<br>')}</p>
          </div>
          ` : ''}
          
          ${node.companies && node.companies.length > 0 ? `
            <div class="detail-section">
              <div class="detail-section-title">工作单位</div>
              <div class="detail-connections">
                ${node.companies.map(company => `
                  <div class="connection-tag" data-id="${company._id}" data-type="company">
                    ${company.name}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          ${node.organizations && node.organizations.length > 0 ? `
            <div class="detail-section">
              <div class="detail-section-title">所属组织</div>
              <div class="detail-connections">
                ${node.organizations.map(organization => `
                  <div class="connection-tag" data-id="${organization._id}" data-type="organization">
                    ${organization.name}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          ${colleagues.length > 0 ? `
            <div class="detail-section">
              <div class="detail-section-title">同事 (${colleagues.length})</div>
              <div class="detail-connections">
                ${colleagues.map(col => `
                  <div class="connection-tag" data-id="${col._id}" data-type="contact">
                    ${col.name}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        `;
      }
      
      // 添加连接标签的点击事件
      setTimeout(() => {
        panel.querySelectorAll('.connection-tag').forEach(tag => {
          tag.addEventListener('click', () => {
            const id = tag.getAttribute('data-id');
            const type = tag.getAttribute('data-type');
            
            // 查找对应的节点
            let clickedNode = graphData.nodes.find(n => n._id === id && n.type === type);
            
            // 如果找不到节点，尝试将type当作freelancer查找（处理自由职业者的情况）
            if (!clickedNode && type === 'contact') {
              clickedNode = graphData.nodes.find(n => n._id === id && n.type === 'freelancer');
            }
            
            if (clickedNode && graph) {
              // 聚焦到该节点
              graph.centerAt(clickedNode.x, clickedNode.y, 1000);
              graph.zoom(2, 1000);
              
              // 显示该节点的详情
              showDetailPanel(clickedNode);
              selectedNode = clickedNode;
            }
          });
        });
        
        // 添加编辑按钮点击事件
        const editButton = document.getElementById('editButton');
        if (editButton) {
          editButton.onclick = () => {
            showEditModal(node);
          };
        }
        
        // 添加删除按钮点击事件
        const deleteButton = document.getElementById('deleteButton');
        if (deleteButton) {
          deleteButton.onclick = () => {
            if (confirm(`确定要删除 ${node.name} 吗？`)) {
              deleteNode(node);
            }
          };
        }
      }, 10);
      
      // 显示面板
      panel.style.display = 'block';  
      panel.style.opacity = '1';
      panel.classList.add('visible');
      
      console.log('详情面板已显示');
    }
    
    // 显示编辑模态框
    function showEditModal(node) {
      // 设置模态框标题为编辑模式
      document.getElementById('modalTitle').textContent = `编辑${node.type === 'contact' ? '联系人' : node.type === 'company' ? '公司' : '组织'}`;
      
      const modal = document.getElementById('addModal');
      
      // 移动端处理：禁止背景滚动
      if (isMobileDevice()) {
        document.body.style.overflow = 'hidden';
      }
      
      // 根据节点类型选择相应的标签页
      const tabSelector = node.type === 'contact' ? '[data-form="contactForm"]' : 
                         node.type === 'company' ? '[data-form="companyForm"]' : 
                         '[data-form="organizationForm"]';
      
      // 激活对应的标签页
      document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.classList.remove('active');
      });
      document.querySelector(tabSelector).classList.add('active');
      
      // 隐藏所有表单
      document.getElementById('contactForm').style.display = 'none';
      document.getElementById('companyForm').style.display = 'none';
      document.getElementById('organizationForm').style.display = 'none';
      
      // 显示对应的表单
      const formId = node.type === 'contact' ? 'contactForm' : 
                    node.type === 'company' ? 'companyForm' : 
                    'organizationForm';
      document.getElementById(formId).style.display = 'block';
      
      // 填充表单数据
      if (node.type === 'contact' || node.type === 'freelancer') {
        document.getElementById('contactName').value = node.name || '';
        document.getElementById('contactPhone').value = node.phone || '';
        document.getElementById('contactEmail').value = node.email || '';
        document.getElementById('contactWechat').value = node.wechat || '';
        document.getElementById('contactProfile').value = node.profile || '';
        
        // 显示当前头像预览
        const avatarPreview = document.getElementById('avatarPreview');
        const previewImage = document.getElementById('previewImage');
        if (node.avatar) {
          previewImage.src = node.avatar;
          avatarPreview.style.display = 'block';
        } else {
          previewImage.src = '';
          avatarPreview.style.display = 'none';
        }
        
        // 加载公司和组织选项
        loadCompanyOptions();
        loadOrganizationOptions('contactOrganizations');
        
        // 设置选中的公司和组织
        const companiesSelect = document.getElementById('contactCompanies');
        // 清除所有已选择的选项
        Array.from(companiesSelect.options).forEach(option => {
          option.selected = false;
        });
        
        if (node.companies && node.companies.length > 0) {
          // 选中相应的公司
          node.companies.forEach(company => {
            const option = Array.from(companiesSelect.options).find(opt => opt.value === company._id);
            if (option) {
              option.selected = true;
            }
          });
        }
        
        const organizationsSelect = document.getElementById('contactOrganizations');
        // 清除所有已选择的选项
        Array.from(organizationsSelect.options).forEach(option => {
          option.selected = false;
        });
        
        if (node.organizations && node.organizations.length > 0) {
          // 选中相应的组织
          node.organizations.forEach(org => {
            const option = Array.from(organizationsSelect.options).find(opt => opt.value === org._id);
            if (option) {
              option.selected = true;
            }
          });
        }
        
        // 立即更新关系选择的UI显示
        setupRelationSelection('contactCompanies', 'selectedCompanies');
        setupRelationSelection('contactOrganizations', 'selectedOrganizations');
      } else if (node.type === 'company') {
        document.getElementById('companyName').value = node.name || '';
        document.getElementById('companyDescription').value = node.description || '';
        
        // 加载组织选项
        loadOrganizationOptions('companyOrganizations');
        
        // 设置选中的组织
        const organizationsSelect = document.getElementById('companyOrganizations');
        // 清除所有已选中的选项
        Array.from(organizationsSelect.options).forEach(option => {
          option.selected = false;
        });
        
        if (node.organizations && node.organizations.length > 0) {
          // 选中相应的组织
          node.organizations.forEach(org => {
            const option = Array.from(organizationsSelect.options).find(opt => opt.value === org._id);
            if (option) {
              option.selected = true;
            }
          });
        }
        
        // 立即更新关系选择的UI显示
        setupRelationSelection('companyOrganizations', 'selectedCompanyOrgs');
      } else if (node.type === 'organization') {
        document.getElementById('organizationName').value = node.name || '';
        document.getElementById('organizationDescription').value = node.description || '';
      }
      
      // 修改保存按钮的行为
      const saveButton = document.getElementById('modalSave');
      saveButton.onclick = () => {
        updateNode(node);
      };
      
      // 显示模态框
      modal.style.display = 'flex';
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.style.opacity = '1';
        modal.classList.add('visible');
      }, 10);
    }
    
    // 更新节点数据
    function updateNode(node) {
      if (node.type === 'contact' || node.type === 'freelancer') {
        updateContact(node);
      } else if (node.type === 'company') {
        updateCompany(node);
      } else if (node.type === 'organization') {
        updateOrganization(node);
      }
    }
    
    // 更新联系人
    function updateContact(contact) {
      const name = document.getElementById('contactName').value.trim();
      const phone = document.getElementById('contactPhone').value.trim();
      const email = document.getElementById('contactEmail').value.trim();
      const wechat = document.getElementById('contactWechat').value.trim();
      const profile = document.getElementById('contactProfile').value.trim();
      const avatarFile = document.getElementById('contactAvatar').files[0];
      
      if (!name) {
        alert('请输入联系人姓名');
        return;
      }
      
      // 获取选中的公司
      const companiesSelect = document.getElementById('contactCompanies');
      const selectedCompanyIds = Array.from(companiesSelect.selectedOptions).map(option => option.value).filter(id => id !== '');
      
      // 获取选中的组织
      const organizationsSelect = document.getElementById('contactOrganizations');
      const selectedOrganizationIds = Array.from(organizationsSelect.selectedOptions).map(option => option.value).filter(id => id !== '');
      
      // 更新联系人数据
      const updatedContact = {
        name,
        phone,
        email,
        wechat,
        profile,
        avatar: contact.avatar // 保留原来的头像
      };
      
      // 添加公司信息
      const contactCompanies = [];
      if (selectedCompanyIds.length > 0) {
        selectedCompanyIds.forEach(companyId => {
          const company = companies.find(c => c._id === companyId);
          if (company) {
            contactCompanies.push({
              _id: company._id,
              name: company.name
            });
          }
        });
      }
      updatedContact.companies = contactCompanies;
      
      // 添加组织信息
      const contactOrganizations = [];
      if (selectedOrganizationIds.length > 0) {
        selectedOrganizationIds.forEach(organizationId => {
          const organization = organizations.find(o => o._id === organizationId);
          if (organization) {
            contactOrganizations.push({
              _id: organization._id,
              name: organization.name
            });
          }
        });
      }
      updatedContact.organizations = contactOrganizations;
      
      // 如果上传了新头像，先处理头像
      if (avatarFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
          // 使用Base64编码的图片数据
          updatedContact.avatar = e.target.result;
          // 发送带有新头像的更新请求
          sendUpdateRequest(updatedContact);
        };
        reader.readAsDataURL(avatarFile);
      } else {
        // 如果没有上传新头像，直接发送更新请求
        sendUpdateRequest(updatedContact);
      }
      
      // 发送更新请求的函数
      function sendUpdateRequest(data) {
        fetch(`/api/contacts/${contact._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('更新联系人失败');
          }
          return response.json();
        })
        .then(data => {
          console.log('联系人更新成功:', data);
          
          // 更新本地数据
          const index = contacts.findIndex(c => c._id === contact._id);
          if (index !== -1) {
            contacts[index] = { ...contacts[index], ...data };
          }
          
          // 关闭模态框
          closeModal();
          
          // 重新创建图表数据
          createGraphData();
          
          // 更新图表
          updateGraph();
          
          // 更新列表
          updateList();
          
          // 刷新详情面板
          showDetailPanel(contacts[index]);
        })
        .catch(error => {
          console.error('更新联系人出错:', error);
          alert('更新联系人失败: ' + error.message);
        });
      }
    }
    
    // 更新组织
    function updateOrganization(organization) {
      const name = document.getElementById('organizationName').value.trim();
      const description = document.getElementById('organizationDescription').value.trim();
      
      if (!name) {
        alert('请输入组织名称');
        return;
      }
      
      // 更新组织数据
      const updatedOrganization = {
        name,
        description
      };
      
      // 发送更新请求
      fetch(`/api/organizations/${organization._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedOrganization)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('更新组织失败');
        }
        return response.json();
      })
      .then(data => {
        console.log('组织更新成功:', data);
        
        // 更新本地数据
        const index = organizations.findIndex(o => o._id === organization._id);
        if (index !== -1) {
          organizations[index] = { ...organizations[index], ...data };
        }
        
        // 关闭模态框
        closeModal();
        
        // 重新创建图表数据
        createGraphData();
        
        // 更新图表
        updateGraph();
        
        // 更新列表
        updateList();
        
        // 刷新详情面板
        showDetailPanel(organizations[index]);
      })
      .catch(error => {
        console.error('更新组织出错:', error);
        alert('更新组织失败: ' + error.message);
      });
    }
    
    // 关闭模态框
    let isModalClosing = false; // 添加状态标记，防止多次快速点击
    
    function closeModal() {
      if (isModalClosing) return; // 如果已经在关闭过程中，则忽略
      
      isModalClosing = true;
      const addModal = document.getElementById('addModal');
      
      // 移动端处理：恢复背景滚动
      if (isMobileDevice()) {
        document.body.style.overflow = '';
      }
      
      // 添加一个遮罩层防止用户交互
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'transparent';
      overlay.style.zIndex = '2000';
      document.body.appendChild(overlay);
      
      // 先设置opacity为0（添加过渡效果）
      addModal.style.opacity = '0';
      
      // 移除visible类
      addModal.classList.remove('visible');
      
      // 等待过渡效果完成后，再设置display为none
      setTimeout(() => {
        addModal.style.display = 'none';
        document.body.removeChild(overlay); // 移除遮罩层
        isModalClosing = false; // 重置状态
      }, 300); // 与CSS中transition的时间一致
    }
    
    // 删除节点
    function deleteNode(node) {
      let apiUrl = '';
      
      if (node.type === 'contact' || node.type === 'freelancer') {
        apiUrl = `/api/contacts/${node._id}`;
      } else if (node.type === 'company') {
        apiUrl = `/api/companies/${node._id}`;
      } else if (node.type === 'organization') {
        apiUrl = `/api/organizations/${node._id}`;
      }
      
      // 发送删除请求
      fetch(apiUrl, {
        method: 'DELETE'
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('删除失败');
        }
        return response.json();
      })
      .then(data => {
        console.log('删除成功:', data);
        
        // 更新本地数据
        if (node.type === 'contact' || node.type === 'freelancer') {
          contacts = contacts.filter(c => c._id !== node._id);
        } else if (node.type === 'company') {
          // 删除公司时，还需要更新关联的联系人
          companies = companies.filter(c => c._id !== node._id);
          
          // 将关联到此公司的联系人更新
          contacts.forEach(contact => {
            if (contact.companies) {
              contact.companies = contact.companies.filter(c => c._id !== node._id);
            }
          });
        } else if (node.type === 'organization') {
          // 删除组织时，还需要更新关联的联系人和公司
          organizations = organizations.filter(o => o._id !== node._id);
          
          // 将关联到此组织的联系人更新
          contacts.forEach(contact => {
            if (contact.organizations) {
              contact.organizations = contact.organizations.filter(o => o._id !== node._id);
            }
          });
          
          // 将关联到此组织的公司更新
          companies.forEach(company => {
            if (company.organizations) {
              company.organizations = company.organizations.filter(o => o._id !== node._id);
            }
          });
        }
        
        // 关闭详情面板
        closeDetailPanel();
        
        // 重新创建图表数据
        createGraphData();
        
        // 更新图表
        updateGraph();
        
        // 更新列表
        updateList();
      })
      .catch(error => {
        console.error('删除出错:', error);
        alert('删除失败: ' + error.message);
      });
    }
    
    // 关闭详情面板
    function closeDetailPanel() {
      const panel = document.getElementById('detailPanel');
      panel.classList.remove('visible');
      panel.style.opacity = '0';
      setTimeout(() => {
        panel.style.display = 'none';
      }, 300);
      selectedNode = null;
      hoverNode = null;
      needsRefresh = true; // 标记需要刷新
      
      console.log('详情面板已关闭');
    }
    
    // 初始化图谱
    function initGraph() {
      console.log("开始初始化图谱");
      const container = document.getElementById('graphContainer');
      
      // 清除容器内容
      container.innerHTML = '';
      
      try {
        // 判断是否为移动设备
        const isMobile = window.innerWidth <= 767;
        
        // 在初始化前预处理数据，帮助避免重叠
        // 给每个节点一个初始位置，而不是全部从中心开始
        graphData.nodes.forEach((node, i) => {
          // 根据节点类型和索引设定初始位置
          if (node.type === 'organization') {
            // 组织节点位于中心位置
            node.x = 0;
            node.y = 0;
          } else if (node.type === 'company') {
            // 公司节点围绕组织节点分布的外圈
            // 检查该公司是否属于某个组织
            if (node.organizations && node.organizations.length > 0) {
              // 属于组织的公司围绕组织节点
              const firstOrg = node.organizations[0]; // 取第一个组织作为定位参考
              const companyIndex = companies.findIndex(c => c._id === node._id);
              const companiesInOrg = companies.filter(c => 
                c.organizations && c.organizations.some(org => org._id === firstOrg._id)
              );
              const angleStep = (2 * Math.PI) / companiesInOrg.length;
              const indexInOrg = companiesInOrg.findIndex(c => c._id === node._id);
              const angle = indexInOrg * angleStep;
              const radius = 150; // 围绕组织的公司距离中心更远
              node.x = radius * Math.cos(angle);
              node.y = radius * Math.sin(angle);
            } else {
              // 不属于组织的公司在外围分布
              const angle = (i % companies.length) * (2 * Math.PI / companies.length);
              const radius = 250;
              node.x = radius * Math.cos(angle);
              node.y = radius * Math.sin(angle);
            }
          } else if (node.type === 'freelancer') {
            // 自由职业者围绕中心分布，范围更小
            const angle = Math.random() * 2 * Math.PI;
            const radius = 200 + Math.random() * 100; // 缩小初始分布半径
            node.x = radius * Math.cos(angle);
            node.y = radius * Math.sin(angle);
            // 添加初始速度向量，使其向中心靠近
            node.vx = -node.x * 0.01;
            node.vy = -node.y * 0.01;
          } else if (node.type === 'contact') {
            // 联系人初始位置靠近其关联的公司/组织
            if (node.companies && node.companies.length > 0) {
              // 找到第一个公司作为参考节点
              const firstCompany = node.companies[0];
              const company = graphData.nodes.find(n => n._id === firstCompany._id && n.type === 'company');
              if (company) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = 30 + Math.random() * 15;
                node.x = (company.x || 0) + radius * Math.cos(angle);
                node.y = (company.y || 0) + radius * Math.sin(angle);
              }
            } else if (node.organizations && node.organizations.length > 0) {
              // 找到第一个组织作为参考节点
              const firstOrganization = node.organizations[0];
              const organization = graphData.nodes.find(n => n._id === firstOrganization._id && n.type === 'organization');
              if (organization) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = 50 + Math.random() * 20;
                node.x = (organization.x || 0) + radius * Math.cos(angle);
                node.y = (organization.y || 0) + radius * Math.sin(angle);
              }
            } else {
              // 无关联公司或组织的联系人，随机位置
              const angle = Math.random() * 2 * Math.PI;
              const radius = 300 + Math.random() * 50;
              node.x = radius * Math.cos(angle);
              node.y = radius * Math.sin(angle);
            }
          }
        });
        
        // 创建图谱实例
        graph = ForceGraph()(container)
          .graphData(graphData)
          .backgroundColor('rgb(30, 30, 30)')
          .nodeRelSize(isMobile ? 4 : 6) // 移动端节点稍小
          .nodeVal(node => {
            // 移动端缩小节点尺寸
            const mobileFactor = isMobile ? 0.7 : 1;
            if (node.type === 'organization') return 28 * mobileFactor;
            if (node.type === 'company') return 14 * mobileFactor;
            if (node.type === 'freelancer') return 7 * mobileFactor;
            return 7 * mobileFactor;
          })
          // 添加坐标边界约束，防止节点飞得太远
          .d3AlphaDecay(0.02) // 降低衰减速度
          .d3VelocityDecay(isMobile ? 0.4 : 0.3) // 移动端增加阻尼
          .onEngineTick(() => {
            // 添加边界约束，限制最大距离
            const maxDistance = 800; // 最大距离
            graphData.nodes.forEach(node => {
              // 计算到原点的距离
              const distanceFromCenter = Math.sqrt(node.x * node.x + node.y * node.y);
              
              // 如果距离超出边界，将位置按比例缩放到边界内
              if (distanceFromCenter > maxDistance) {
                const scale = maxDistance / distanceFromCenter;
                node.x *= scale;
                node.y *= scale;
                
                // 对自由职业者节点添加更强的向心力
                if (node.type === 'freelancer') {
                  // 添加10%的向中心的力
                  node.x *= 0.9;
                  node.y *= 0.9;
                }
              }
            });
          })
          .nodeCanvasObject((node, ctx, globalScale) => {
            // 自定义节点渲染
            let size = 7;
            // 所有节点使用同一种颜色 RGB(179, 179, 179)
            let color = 'rgb(179, 179, 179)';
            
            if (node.type === 'organization') {
              size = 28;
            } else if (node.type === 'company') {
              size = 14;
            } else if (node.type === 'freelancer') {
              // 自由职业者也使用相同颜色
            }
            
            // 节点主体
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
            ctx.fillStyle = color;
            ctx.fill();
            
            // 如果节点被选中或悬停，添加高亮边框
            if ((selectedNode && node.id === selectedNode.id) || 
                (hoverNode && node.id === hoverNode.id)) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI, false);
              
              // 为选中节点和悬停节点使用不同颜色
              if (selectedNode && node.id === selectedNode.id) {
                ctx.strokeStyle = 'rgb(8, 132, 255)'; // 选中节点边框颜色为蓝色
              } else {
                ctx.strokeStyle = 'rgb(200, 200, 200)'; // 悬停节点边框颜色为灰色
              }
              
              ctx.lineWidth = 2;
              ctx.stroke();
              
              // 显示节点的标签
              const label = node.name;
              const fontSize = 12/globalScale;
              ctx.font = `${(node.type === 'company' || node.type === 'organization') ? fontSize * 1.4 : fontSize}px Sans-Serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              // 添加文字背景
              const textWidth = ctx.measureText(label).width;
              const textYPos = node.y + size + 4 + fontSize/2;
              ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
              ctx.fillRect(
                node.x - textWidth/2 - 2,
                textYPos - fontSize/2 - 1,
                textWidth + 4,
                fontSize + 2
              );
              
              // 绘制文字
              ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
              ctx.fillText(label, node.x, textYPos);
            }
          })
          // 完全禁用默认标签
          .nodeLabel(null)
          // 关闭默认连接线渲染
          .linkVisibility(() => false)
          // 使用自定义对象绘制连接线
          .linkCanvasObject(null)
          .d3Force('link', d3.forceLink().distance(link => {
            // 获取源节点和目标节点
            const sourceNode = graphData.nodes.find(n => n.id === link.source.id || n.id === link.source);
            const targetNode = graphData.nodes.find(n => n.id === link.target.id || n.id === link.target);
            
            // 如果链接涉及组织节点
            if (sourceNode && targetNode && 
                (sourceNode.type === 'organization' || targetNode.type === 'organization')) {
              if (sourceNode.type === 'company' || targetNode.type === 'company') {
                return 150; // 组织到公司的距离较大
              }
              return 80; // 组织到其他节点的距离也较大
            }
            
            // 如果是公司到公司的链接，距离适中
            if (sourceNode && targetNode && 
                sourceNode.type === 'company' && targetNode.type === 'company') {
              return 120; // 公司间距离适中
            }
            
            // 如果是自由职业者到群组的链接
            if (sourceNode && targetNode && 
                (sourceNode.type === 'freelancer' || targetNode.type === 'freelancer') &&
                (sourceNode.type === 'no-company-group' || targetNode.type === 'no-company-group')) {
              return 30; // 自由职业者到群组的距离较短
            }
            
            // 公司与个人之间的链接
            if (sourceNode && targetNode && 
                ((sourceNode.type === 'company' && targetNode.type === 'contact') || 
                 (sourceNode.type === 'contact' && targetNode.type === 'company'))) {
              return 50; // 公司与个人之间的链接距离适中
            }
            
            return 30; // 默认链接距离
          }).strength(link => {
            // 获取源节点和目标节点
            const sourceNode = graphData.nodes.find(n => n.id === link.source.id || n.id === link.source);
            const targetNode = graphData.nodes.find(n => n.id === link.target.id || n.id === link.target);
            
            // 组织相关链接的强度较小，允许更灵活的布局
            if (sourceNode && targetNode && 
                (sourceNode.type === 'organization' || targetNode.type === 'organization')) {
              return 0.3;
            }
            
            // 公司到联系人的链接强度适中
            if (sourceNode && targetNode && 
                ((sourceNode.type === 'company' && targetNode.type === 'contact') || 
                 (sourceNode.type === 'contact' && targetNode.type === 'company'))) {
              return 0.7;
            }
            
            return 1.0; // 默认链接强度
          }))
          // 微调碰撞距离
          .d3Force('collision', d3.forceCollide(node => {
            if (node.type === 'organization') return 40; // 大幅增加组织节点碰撞半径
            if (node.type === 'company') return 20; // 公司节点碰撞半径
            if (node.type === 'no-company-group') return 25; // 自由职业群组节点碰撞半径
            if (node.type === 'freelancer') return 8; // 自由职业者碰撞半径
            return 9; // 普通联系人碰撞半径
          }).strength(1.2).iterations(4)) // 增加碰撞强度和迭代次数，更严格地避免重叠
          // 调整互斥力，允许更紧凑的布局同时避免重叠
          .d3Force('charge', d3.forceManyBody()
            .strength(node => {
              // 根据节点类型设置不同的排斥力
              if (node.type === 'organization') return -300; // 大幅增加组织节点排斥力
              if (node.type === 'company') return -150; // 公司节点排斥力
              if (node.type === 'no-company-group') return -120; // 自由职业群组的排斥力
              if (node.type === 'freelancer') return -50; // 增加自由职业者排斥力，让它们聚集更紧密
              return -8; // 普通联系人排斥力
            })
            .distanceMax(300) // 增加互斥力的影响范围
            .theta(0.7) // 提高电荷力计算精度
          )
          // 添加径向力，让联系人围绕公司/群组轨道运行
          .d3Force('radial', d3.forceRadial(node => {
            if (node.type === 'contact') {
              return 0; // 联系人没有径向力
            } else if (node.type === 'freelancer') {
              return 350; // 自由职业者有向中心的径向力，限制在一定范围内
            }
            return null; // 其他节点没有径向力
          }).strength(node => {
            return node.type === 'freelancer' ? 0.2 : 0; // 自由职业者有较弱的向心力
          }))
          .d3Force('center', d3.forceCenter())
          .cooldownTicks(100) // 降低冷却时间
          .cooldownTime(5000) // 降低冷却总时间
          .onRenderFramePre((ctx, globalScale) => {
            // 在每帧开始时绘制连接线，确保它们在节点下面
            if (selectedNode || hoverNode) {
              // 选择需要显示连接的节点（优先使用选中节点，如果没有则使用悬停节点）
              const activeNode = selectedNode || hoverNode;
              
              const relevantLinks = graphData.links.filter(link => {
                const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                return sourceId === activeNode.id || targetId === activeNode.id;
              });
              
              // 绘制所有相关连接线
              relevantLinks.forEach(link => {
                const start = typeof link.source === 'object' ? link.source : graphData.nodes.find(n => n.id === link.source);
                const end = typeof link.target === 'object' ? link.target : graphData.nodes.find(n => n.id === link.target);
                
                if (!start || !end) return;
                
                // 计算节点的大小
                let sourceSize = 7;
                let targetSize = 7;
                
                if (start.type === 'organization') sourceSize = 28;
                if (end.type === 'organization') targetSize = 28;
                if (start.type === 'company') sourceSize = 14;
                if (end.type === 'company') targetSize = 14;
                
                // 计算从节点边缘开始的连接线，而不是从中心点
                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // 计算单位向量
                const unitX = dx / distance;
                const unitY = dy / distance;
                
                // 计算新的起点和终点，从节点边缘开始
                const startX = start.x + unitX * sourceSize;
                const startY = start.y + unitY * sourceSize;
                const endX = end.x - unitX * targetSize;
                const endY = end.y - unitY * targetSize;
                
                // 绘制连接线
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                // 设置连接线样式，选中节点和悬停节点的连接线颜色不同
                ctx.strokeStyle = activeNode === selectedNode ? 'rgba(8, 132, 255, 0.8)' : 'rgba(200, 200, 200, 0.6)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
              });
            }
          })
          .onRenderFramePost(null);
        
        // 添加节点悬停事件
        graph.onNodeHover(node => {
          if (node !== hoverNode) {
            // 如果悬停节点发生变化
            hoverNode = node;
            // 更新鼠标样式
            graph.nodeRelSize(6); // 刷新节点大小以触发重绘
            
            // 设置需要刷新
            needsRefresh = true;
          }
          
          // 更新鼠标指针
          graph.cooldownTicks(node ? 0 : 100); // 如果悬停在节点上，立即停止冷却
          container.style.cursor = node ? 'pointer' : '';
        });
        
        // 修改点击事件，确保节点选择状态被正确更新并触发重绘
        graph.onNodeClick(node => {
          console.log('节点被点击:', node.name, node);
          
          // 设置选中节点
          selectedNode = node;
          needsRefresh = true;
          
          // 高亮显示与所选节点相关的连接
          const nodeLinks = graphData.links.filter(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return sourceId === node.id || targetId === node.id;
          });
          
          console.log(`选中节点：${node.name}，ID：${node.id}`);
          console.log(`找到相关连接：${nodeLinks.length}条`);
          
          // 测试在控制台打印前5个连接的详情
          nodeLinks.slice(0, 5).forEach((link, i) => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            console.log(`连接${i+1}: 从 ${sourceId} 到 ${targetId}`);
          });
          
          // 立即强制重绘
          const currentData = graph.graphData();
          graph.graphData(currentData);
          
          showDetailPanel(node);
        });
        
        // 添加背景点击事件
        graph.onBackgroundClick(() => {
          console.log('背景被点击');
          closeDetailPanel();
          
          // 清除选中状态并重绘
          selectedNode = null;
          hoverNode = null;
          needsRefresh = true;
          if (graph) {
            const currentData = graph.graphData();
            graph.graphData(currentData);
          }
        });
        
        console.log("图谱初始化完成");
        
        // 不使用热启动模拟，改为优化初始布局参数
        
        // 响应窗口大小变化
        window.addEventListener('resize', () => {
          if (graph) {
            graph.width(container.clientWidth);
            graph.height(container.clientHeight);
          }
        });
        
        // 针对移动设备调整初始视图缩放
        setTimeout(() => {
          if (graph) {
            if (isMobile) {
              // 移动设备上更适合的初始视图
              graph.zoomToFit(300, 20);
            } else {
              graph.zoomToFit(400, 50);
            }
          }
        }, 2000);
        
        // 启动刷新循环
        setupRefreshLoop();
        
        // 针对移动设备优化触摸交互
        if (isMobile) {
          // 提高碰撞检测精度，使触摸更容易选中节点
          graph.d3Force('collision', d3.forceCollide(node => {
            // 增加碰撞半径，便于触摸选择
            const touchFactor = 1.5;
            if (node.type === 'organization') return 40 * touchFactor;
            if (node.type === 'company') return 20 * touchFactor; 
            if (node.type === 'no-company-group') return 25 * touchFactor;
            if (node.type === 'freelancer') return 8 * touchFactor;
            return 9 * touchFactor;
          }).strength(1.3).iterations(4));
          
          // 增加冷却时间和降低冷却速度，使图谱在移动设备上更稳定
          graph.cooldownTicks(200)
              .cooldownTime(6000);
        }
        
        return true;
      } catch (error) {
        console.error('初始化图谱失败:', error);
        container.innerHTML = `<div class="error-message">初始化图谱失败: ${error.message}</div>`;
        return false;
      }
    }
    
    // 设置工具栏事件
    function setupToolbar() {
      document.getElementById('zoomInButton').addEventListener('click', () => {
        if (graph) {
          const currentZoom = graph.zoom();
          graph.zoom(currentZoom * 1.5, 400);
          console.log('放大');
        }
      });
      
      document.getElementById('zoomOutButton').addEventListener('click', () => {
        if (graph) {
          const currentZoom = graph.zoom();
          graph.zoom(currentZoom / 1.5, 400);
          console.log('缩小');
        }
      });
      
      document.getElementById('resetButton').addEventListener('click', () => {
        if (graph) {
          graph.zoomToFit(400, 50);
          console.log('重置视图');
        }
      });
      
      // 关闭详情面板的事件
      document.getElementById('detailClose').addEventListener('click', () => {
        closeDetailPanel();
      });
    }
    
    // 加载数据并创建图谱
    function loadData() {
      console.log("开始加载数据");
      
      // 加载联系人数据
      fetch('/api/contacts')
        .then(response => response.json())
        .then(data => {
          contacts = data;
          console.log(`加载了 ${contacts.length} 个联系人`);
          
          // 加载公司数据
          return fetch('/api/companies');
        })
        .then(response => response.json())
        .then(data => {
          companies = data;
          console.log(`加载了 ${companies.length} 个公司`);
          
          // 加载组织数据
          return fetch('/api/organizations');
        })
        .then(response => response.json())
        .then(data => {
          organizations = data;
          console.log(`加载了 ${organizations.length} 个组织`);
          
          // 创建图谱数据
          createGraphData();
          
          // 更新列表
          updateList();
          
          // 初始化图谱
          if (initGraph()) {
            // 设置工具栏
            setupToolbar();
          }
        })
        .catch(error => {
          console.error('加载数据失败:', error);
          document.getElementById('listContainer').innerHTML = `
            <div class="error-message">加载数据失败: ${error.message}</div>
          `;
        });
    }
    
    // 创建图谱数据
    function createGraphData() {
      graphData.nodes = [];
      graphData.links = [];
      
      // 添加组织节点
      organizations.forEach(organization => {
        graphData.nodes.push({
          ...organization,
          type: 'organization',
          id: `organization-${organization._id}`
        });
      });
      
      // 添加公司节点，并连接到组织
      companies.forEach(company => {
        graphData.nodes.push({
          ...company,
          type: 'company',
          id: `company-${company._id}`
        });
        
        // 如果公司属于一个或多个组织，添加连接
        if (company.organizations && company.organizations.length > 0) {
          company.organizations.forEach(org => {
            graphData.links.push({
              source: `company-${company._id}`,
              target: `organization-${org._id}`,
              id: `link-company-${company._id}-organization-${org._id}`
            });
          });
        }
      });
      
      // 添加联系人节点和链接
      let freelancerCount = 0;
      contacts.forEach(contact => {
        // 设置基本的联系人节点
        let nodeType = 'contact';
        if ((!contact.companies || contact.companies.length === 0) && 
            (!contact.organizations || contact.organizations.length === 0)) {
          nodeType = 'freelancer';
          freelancerCount++;
        }
        
        // 创建节点
        graphData.nodes.push({
          ...contact,
          type: nodeType,
          id: `contact-${contact._id}`
        });
        
        // 添加联系人到公司的链接
        if (contact.companies && contact.companies.length > 0) {
          contact.companies.forEach(company => {
            graphData.links.push({
              source: `contact-${contact._id}`,
              target: `company-${company._id}`,
              id: `link-contact-${contact._id}-company-${company._id}`
            });
          });
        }
        
        // 添加联系人到组织的链接
        if (contact.organizations && contact.organizations.length > 0) {
          contact.organizations.forEach(org => {
            graphData.links.push({
              source: `contact-${contact._id}`,
              target: `organization-${org._id}`,
              id: `link-contact-${contact._id}-organization-${org._id}`
            });
          });
        }
      });
      
      console.log(`发现 ${freelancerCount} 位自由职业者`);
      console.log(`图谱数据包含 ${graphData.nodes.length} 个节点和 ${graphData.links.length} 个链接`);
      
      // 打印链接详情进行调试
      if (graphData.links.length > 0) {
        console.log('链接详情：');
        graphData.links.slice(0, 5).forEach((link, i) => {
          console.log(`链接 ${i+1}：从 "${link.source}" 到 "${link.target}"`);
        });
      }
    }
    
    // 更新列表
    function updateList() {
      const container = document.getElementById('listContainer');
      
      if (currentTab === 'contacts') {
        container.innerHTML = contacts.map(contact => {
          // 确定正确的节点类型
          const nodeType = (!contact.companies || contact.companies.length === 0) && 
                         (!contact.organizations || contact.organizations.length === 0) ? 
                         'freelancer' : 'contact';
          // 获取关联信息
          let subtitle = '自由职业者';
          if (contact.companies && contact.companies.length > 0) {
            subtitle = contact.companies.map(c => c.name).join(', ');
          } else if (contact.organizations && contact.organizations.length > 0) {
            subtitle = contact.organizations.map(o => o.name).join(', ');
          }
          
          return `
            <div class="list-item" data-id="${contact._id}" data-type="${nodeType}">
              <img src="${contact.avatar || 'https://via.placeholder.com/32'}" alt="${contact.name}" class="avatar">
              <div class="item-info">
                <div class="item-title">${contact.name}</div>
                <div class="item-subtitle">${subtitle}</div>
              </div>
            </div>
          `;
        }).join('');
      } else if (currentTab === 'companies') {
        container.innerHTML = companies.map(company => {
          // 计算关联到该公司的联系人数量
          const employeeCount = contacts.filter(c => 
            c.companies && c.companies.some(comp => comp._id === company._id)
          ).length;
          
          return `
            <div class="list-item" data-id="${company._id}" data-type="company">
              <div class="item-info">
                <div class="item-title">${company.name}</div>
                <div class="item-subtitle">员工: ${employeeCount}人</div>
              </div>
            </div>
          `;
        }).join('');
      } else if (currentTab === 'organizations') {
        container.innerHTML = organizations.map(org => {
          // 计算关联到该组织的联系人和公司数量
          const memberCount = contacts.filter(c => 
            c.organizations && c.organizations.some(o => o._id === org._id)
          ).length;
          
          const companyCount = companies.filter(c => 
            c.organizations && c.organizations.some(o => o._id === org._id)
          ).length;
          
          return `
            <div class="list-item" data-id="${org._id}" data-type="organization">
              <div class="item-info">
                <div class="item-title">${org.name}</div>
                <div class="item-subtitle">成员: ${memberCount}人, 
                                   公司: ${companyCount}家</div>
              </div>
            </div>
          `;
        }).join('');
      }
      
      // 添加列表项点击事件
      container.querySelectorAll('.list-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.getAttribute('data-id');
          const type = item.getAttribute('data-type');
          
          // 查找对应的节点
          let node = graphData.nodes.find(n => n._id === id && n.type === type);
          
          // 如果节点未找到且type是contact，尝试以freelancer类型查找
          if (!node && type === 'contact') {
            node = graphData.nodes.find(n => n._id === id && n.type === 'freelancer');
          }
          // 如果节点未找到且type是freelancer，尝试以contact类型查找
          else if (!node && type === 'freelancer') {
            node = graphData.nodes.find(n => n._id === id && n.type === 'contact');
          }
          
          if (node && graph) {
            // 聚焦到该节点
            graph.centerAt(node.x, node.y, 1000);
            graph.zoom(2, 1000);
            
            // 显示该节点的详情
            selectedNode = node;
            showDetailPanel(node);
            
            // 确保需要刷新，以显示选中状态
            needsRefresh = true;
          } else {
            console.warn(`未找到节点: id=${id}, type=${type}`);
          }
        });
      });
    }
    
    // 设置搜索功能
    function setupSearch() {
      const searchInput = document.getElementById('searchInput');
      
      searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        
        if (currentTab === 'contacts') {
          // 搜索联系人
          document.querySelectorAll('#listContainer .list-item').forEach(item => {
            const name = item.querySelector('.item-title').textContent.toLowerCase();
            const company = item.querySelector('.item-subtitle').textContent.toLowerCase();
            
            if (name.includes(searchTerm) || company.includes(searchTerm)) {
              item.style.display = '';
            } else {
              item.style.display = 'none';
            }
          });
        } else {
          // 搜索公司
          document.querySelectorAll('#listContainer .list-item').forEach(item => {
            const name = item.querySelector('.item-title').textContent.toLowerCase();
            const info = item.querySelector('.item-subtitle').textContent.toLowerCase();
            
            if (name.includes(searchTerm) || info.includes(searchTerm)) {
              item.style.display = '';
            } else {
              item.style.display = 'none';
            }
          });
        }
      });
    }
    
    // 设置标签页切换
    function setupTabs() {
      document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
          // 更新激活的标签页
          document.querySelector('.tab.active').classList.remove('active');
          tab.classList.add('active');
          
          // 更新当前标签页
          currentTab = tab.getAttribute('data-tab');
          
          // 更新列表
          updateList();
        });
      });
    }
    
    // 设置添加按钮
    function setupAddButton() {
      const addButton = document.getElementById('addButton');
      const addModal = document.getElementById('addModal');
      const modalClose = document.getElementById('modalClose');
      const modalCancel = document.getElementById('modalCancel');
      const modalSave = document.getElementById('modalSave');
      const contactForm = document.getElementById('contactForm');
      const companyForm = document.getElementById('companyForm');
      const organizationForm = document.getElementById('organizationForm');
      
      // 设置模态框内的标签页切换
      function setupModalTabs() {
        document.querySelectorAll('.modal-tab').forEach(tab => {
          tab.addEventListener('click', () => {
            // 更新激活的标签页
            document.querySelector('.modal-tab.active').classList.remove('active');
            tab.classList.add('active');
            
            // 隐藏所有表单
            contactForm.style.display = 'none';
            companyForm.style.display = 'none';
            organizationForm.style.display = 'none';
            
            // 显示对应的表单
            const formId = tab.getAttribute('data-form');
            document.getElementById(formId).style.display = 'block';
            
            // 根据选择的表单类型加载相应的选项
            if (formId === 'contactForm') {
              loadCompanyOptions();
              loadOrganizationOptions('contactOrganizations');
              
              // 设置联系人表单中的多选交互
              setupRelationSelection('contactCompanies', 'selectedCompanies');
              setupRelationSelection('contactOrganizations', 'selectedOrganizations');
            } else if (formId === 'companyForm') {
              loadOrganizationOptions('companyOrganizations');
              
              // 设置公司表单中的多选交互
              setupRelationSelection('companyOrganizations', 'selectedCompanyOrgs');
            }
          });
        });
        
        // 初始化默认标签页的选择交互
        setupRelationSelection('contactCompanies', 'selectedCompanies');
        setupRelationSelection('contactOrganizations', 'selectedOrganizations');
      }
      
      // 添加头像预览功能
      const avatarInput = document.getElementById('contactAvatar');
      const avatarPreview = document.getElementById('avatarPreview');
      const previewImage = document.getElementById('previewImage');
      
      if (avatarInput) {
        avatarInput.addEventListener('change', function(event) {
          if (event.target.files && event.target.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
              previewImage.src = e.target.result;
              avatarPreview.style.display = 'block';
            };
            
            reader.readAsDataURL(event.target.files[0]);
          } else {
            previewImage.src = '';
            avatarPreview.style.display = 'none';
          }
        });
      }
      
      // 添加按钮点击事件
      if (addButton) {
        addButton.addEventListener('click', () => {
          // 重置表单和警告
          resetForms();
          
          // 显示联系人表单作为默认
          contactForm.style.display = 'block';
          companyForm.style.display = 'none';
          organizationForm.style.display = 'none';
          
          // 设置第一个标签为激活状态
          document.querySelectorAll('.modal-tab').forEach((tab, index) => {
            if (index === 0) {
              tab.classList.add('active');
            } else {
              tab.classList.remove('active');
            }
          });
          
          // 加载公司和组织下拉选项
          loadCompanyOptions();
          loadOrganizationOptions('contactOrganizations');
          loadOrganizationOptions('companyOrganizations');
          
          // 显示模态框
          addModal.style.display = 'flex';
          addModal.style.opacity = '0';
          setTimeout(() => {
            addModal.style.opacity = '1';
            addModal.classList.add('visible');
          }, 10);
        });
      }
      
      // 关闭模态框的事件
      if (modalClose) {
        modalClose.addEventListener('click', () => {
          closeModal();
        });
      }
      
      if (modalCancel) {
        modalCancel.addEventListener('click', () => {
          closeModal();
        });
      }
      
      // 保存按钮点击事件
      if (modalSave) {
        modalSave.onclick = () => {
          // 获取当前激活的表单
          const activeTab = document.querySelector('.modal-tab.active');
          const activeForm = activeTab.getAttribute('data-form');
          
          if (activeForm === 'contactForm') {
            saveContact();
          } else if (activeForm === 'companyForm') {
            saveCompany();
          } else if (activeForm === 'organizationForm') {
            saveOrganization();
          }
        };
      }
      
      // 设置模态框内的标签页
      setupModalTabs();
    }
    
    // 重置表单
    function resetForms() {
      // 清空联系人表单
      document.getElementById('contactName').value = '';
      document.getElementById('contactPhone').value = '';
      document.getElementById('contactEmail').value = '';
      document.getElementById('contactWechat').value = '';
      document.getElementById('contactCompanies').value = '';
      document.getElementById('contactOrganizations').value = '';
      document.getElementById('contactProfile').value = '';
      document.getElementById('contactAvatar').value = '';
      document.getElementById('previewImage').src = '';
      document.getElementById('avatarPreview').style.display = 'none';
      
      // 清空公司表单
      document.getElementById('companyName').value = '';
      document.getElementById('companyDescription').value = '';
      document.getElementById('companyOrganizations').value = '';
      
      // 清空组织表单
      document.getElementById('organizationName').value = '';
      document.getElementById('organizationDescription').value = '';
    }
    
    // 加载公司下拉选项
    function loadCompanyOptions() {
      const companySelect = document.getElementById('contactCompanies');
      companySelect.innerHTML = '<option value="">无</option>';
      
      companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company._id;
        option.textContent = company.name;
        companySelect.appendChild(option);
      });
      
      // 延迟一下触发change事件，确保选项加载完成并且选中状态设置好后才触发
      setTimeout(() => {
        const event = new Event('change');
        companySelect.dispatchEvent(event);
      }, 0);
    }
    
    // 加载组织下拉选项
    function loadOrganizationOptions(selectId) {
      const organizationSelect = document.getElementById(selectId);
      organizationSelect.innerHTML = '<option value="">无</option>';
      
      organizations.forEach(org => {
        const option = document.createElement('option');
        option.value = org._id;
        option.textContent = org.name;
        organizationSelect.appendChild(option);
      });
      
      // 延迟一下触发change事件，确保选项加载完成并且选中状态设置好后才触发
      setTimeout(() => {
        const event = new Event('change');
        organizationSelect.dispatchEvent(event);
      }, 0);
    }
    
    // 保存联系人
    function saveContact() {
      const name = document.getElementById('contactName').value;
      const phone = document.getElementById('contactPhone').value;
      const email = document.getElementById('contactEmail').value;
      const wechat = document.getElementById('contactWechat').value;
      const profile = document.getElementById('contactProfile').value;
      const avatarFile = document.getElementById('contactAvatar').files[0];
      
      // 获取所选公司和组织
      const companiesSelect = document.getElementById('contactCompanies');
      const selectedCompanyIds = Array.from(companiesSelect.selectedOptions).map(option => option.value).filter(id => id !== '');
      
      const organizationsSelect = document.getElementById('contactOrganizations');
      const selectedOrganizationIds = Array.from(organizationsSelect.selectedOptions).map(option => option.value).filter(id => id !== '');
      
      if (!name) {
        alert('请输入姓名');
        return;
      }
      
      // 准备联系人数据
      const newContact = {
        _id: generateUUID(),
        name,
        phone,
        email,
        wechat,
        profile: profile || '暂无简介'
      };
      
      // 处理头像上传
      if (avatarFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
          // 使用Base64编码的图片数据
          newContact.avatar = e.target.result;
          
          // 继续添加其他信息并保存
          completeContactSave(newContact, selectedCompanyIds, selectedOrganizationIds);
        };
        reader.readAsDataURL(avatarFile);
      } else {
        // 如果没有上传头像，使用默认头像
        newContact.avatar = './icon/common.png';
        
        // 继续添加其他信息并保存
        completeContactSave(newContact, selectedCompanyIds, selectedOrganizationIds);
      }
    }
    
    // 完成联系人保存
    function completeContactSave(newContact, companyIds, organizationIds) {
      // 添加公司信息
      const contactCompanies = [];
      if (companyIds && companyIds.length > 0) {
        companyIds.forEach(companyId => {
          if (companyId) { // 确保不是空选项
            const company = companies.find(c => c._id === companyId);
            if (company) {
              contactCompanies.push({
                _id: company._id,
                name: company.name
              });
            }
          }
        });
      }
      newContact.companies = contactCompanies;
      
      // 添加组织信息
      const contactOrganizations = [];
      if (organizationIds && organizationIds.length > 0) {
        organizationIds.forEach(organizationId => {
          if (organizationId) { // 确保不是空选项
            const organization = organizations.find(o => o._id === organizationId);
            if (organization) {
              contactOrganizations.push({
                _id: organization._id,
                name: organization.name
              });
            }
          }
        });
      }
      newContact.organizations = contactOrganizations;
      
      // 发送请求保存联系人
      fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newContact)
      })
      .then(response => response.json())
      .then(data => {
        // 将新联系人添加到列表
        contacts.push(data);
        
        // 更新图谱数据
        updateGraphWithNewContact(data);
        
        // 更新列表
        updateList();
        
        // 关闭模态框
        closeModal();
        
        // 重置表单
        resetForms();
      })
      .catch(error => {
        console.error('保存联系人失败:', error);
        alert('保存联系人失败，请稍后再试');
      });
    }
    
    // 保存公司
    function saveCompany() {
      const name = document.getElementById('companyName').value;
      const description = document.getElementById('companyDescription').value;
      
      // 获取选中的组织ID列表
      const organizationSelect = document.getElementById('companyOrganizations');
      const selectedOrganizations = Array.from(organizationSelect.selectedOptions).map(option => option.value);
      
      if (!name) {
        alert('请输入公司名称');
        return;
      }
      
      // 构建公司数据
      const newCompany = {
        _id: generateUUID(),
        name,
        description: description || '暂无简介',
        organizations: []
      };
      
      // 添加组织信息
      if (selectedOrganizations && selectedOrganizations.length > 0) {
        selectedOrganizations.forEach(orgId => {
          if (orgId) {
            const organization = organizations.find(o => o._id === orgId);
            if (organization) {
              newCompany.organizations.push({
                _id: organization._id,
                name: organization.name
              });
            }
          }
        });
      }
      
      // 发送请求保存公司
      fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCompany)
      })
      .then(response => response.json())
      .then(data => {
        // 将新公司添加到列表
        companies.push(data);
        
        // 更新图谱数据
        updateGraphWithNewCompany(data);
        
        // 更新列表
        updateList();
        
        // 关闭模态框
        closeModal();
        
        // 清空表单
        document.getElementById('companyName').value = '';
        document.getElementById('companyDescription').value = '';
        document.getElementById('companyOrganizations').value = '';
      })
      .catch(error => {
        console.error('保存公司失败:', error);
        alert('保存公司失败，请稍后再试');
      });
    }
    
    // 保存组织
    function saveOrganization() {
      const name = document.getElementById('organizationName').value;
      const description = document.getElementById('organizationDescription').value;
      
      if (!name) {
        alert('请输入组织名称');
        return;
      }
      
      // 构建组织数据
      const newOrganization = {
        _id: generateUUID(),
        name,
        description: description || '暂无简介'
      };
      
      // 发送请求保存组织
      fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newOrganization)
      })
      .then(response => response.json())
      .then(data => {
        // 将新组织添加到列表
        organizations.push(data);
        
        // 更新图谱数据
        updateGraphWithNewOrganization(data);
        
        // 更新列表
        updateList();
        
        // 关闭模态框
        closeModal();
        
        // 清空表单
        document.getElementById('organizationName').value = '';
        document.getElementById('organizationDescription').value = '';
      })
      .catch(error => {
        console.error('保存组织失败:', error);
        alert('保存组织失败，请稍后再试');
      });
    }
    
    // 更新图谱数据 - 添加新联系人
    function updateGraphWithNewContact(contact) {
      // 判断联系人类型
      let nodeType = 'contact';
      if ((!contact.companies || contact.companies.length === 0) && 
          (!contact.organizations || contact.organizations.length === 0)) {
        nodeType = 'freelancer';
      }
      
      // 创建新节点
      const newNode = {
        ...contact,
        type: nodeType,
        id: `contact-${contact._id}`
      };
      
      // 设置初始位置
      if (contact.companies && contact.companies.length > 0) {
        // 找到对应的第一个公司节点作为位置参考
        const firstCompany = contact.companies[0];
        const companyNode = graphData.nodes.find(n => n._id === firstCompany._id && n.type === 'company');
        if (companyNode) {
          const angle = Math.random() * 2 * Math.PI;
          const radius = 30 + Math.random() * 15;
          newNode.x = (companyNode.x || 0) + radius * Math.cos(angle);
          newNode.y = (companyNode.y || 0) + radius * Math.sin(angle);
        }
        
        // 添加到所有关联公司的连接
        contact.companies.forEach(company => {
          graphData.links.push({
            source: `contact-${contact._id}`,
            target: `company-${company._id}`,
            id: `link-contact-${contact._id}-company-${company._id}`
          });
        });
      } else if (contact.organizations && contact.organizations.length > 0) {
        // 找到对应的第一个组织节点作为位置参考
        const firstOrganization = contact.organizations[0];
        const organizationNode = graphData.nodes.find(n => n._id === firstOrganization._id && n.type === 'organization');
        if (organizationNode) {
          const angle = Math.random() * 2 * Math.PI;
          const radius = 50 + Math.random() * 20;
          newNode.x = (organizationNode.x || 0) + radius * Math.cos(angle);
          newNode.y = (organizationNode.y || 0) + radius * Math.sin(angle);
        }
        
        // 添加到所有关联组织的连接
        contact.organizations.forEach(org => {
          graphData.links.push({
            source: `contact-${contact._id}`,
            target: `organization-${org._id}`,
            id: `link-contact-${contact._id}-organization-${org._id}`
          });
        });
      } else {
        // 自由职业者
        const angle = Math.random() * 2 * Math.PI;
        const radius = 300 + Math.random() * 50;
        newNode.x = radius * Math.cos(angle);
        newNode.y = radius * Math.sin(angle);
      }
      
      // 添加节点
      graphData.nodes.push(newNode);
      
      // 更新图谱
      updateGraph();
    }
    
    // 更新图谱数据 - 添加新公司
    function updateGraphWithNewCompany(company) {
      // 创建新节点
      const newNode = {
        ...company,
        type: 'company',
        id: `company-${company._id}`
      };
      
      // 设置初始位置
      if (company.organizations && company.organizations.length > 0) {
        // 找到对应的第一个组织节点作为位置参考
        const firstOrganization = company.organizations[0];
        const organizationNode = graphData.nodes.find(n => n._id === firstOrganization._id && n.type === 'organization');
        if (organizationNode) {
          const companiesInOrg = companies.filter(c => 
            c.organizations && c.organizations.some(org => org._id === firstOrganization._id)
          );
          const angleStep = (2 * Math.PI) / (companiesInOrg.length + 1);
          const indexInOrg = companiesInOrg.findIndex(c => c._id === company._id);
          const angle = indexInOrg * angleStep;
          const radius = 150;
          newNode.x = (organizationNode.x || 0) + radius * Math.cos(angle);
          newNode.y = (organizationNode.y || 0) + radius * Math.sin(angle);
        }
        
        // 添加到所有关联组织的连接
        company.organizations.forEach(org => {
          graphData.links.push({
            source: `company-${company._id}`,
            target: `organization-${org._id}`,
            id: `link-company-${company._id}-organization-${org._id}`
          });
        });
      } else {
        // 不属于组织的公司
        const angle = (companies.length % 20) * (2 * Math.PI / 20);
        const radius = 250;
        newNode.x = radius * Math.cos(angle);
        newNode.y = radius * Math.sin(angle);
      }
      
      // 添加节点
      graphData.nodes.push(newNode);
      
      // 更新图谱
      updateGraph();
    }
    
    // 更新图谱数据 - 添加新组织
    function updateGraphWithNewOrganization(organization) {
      // 创建新节点
      const newNode = {
        ...organization,
        type: 'organization',
        id: `organization-${organization._id}`
      };
      
      // 设置初始位置 - 在画布中心附近随机位置
      const angle = Math.random() * 2 * Math.PI;
      const radius = 200;
      newNode.x = radius * Math.cos(angle);
      newNode.y = radius * Math.sin(angle);
      
      // 添加节点
      graphData.nodes.push(newNode);
      
      // 更新图谱
      updateGraph();
    }
    
    // 更新图谱
    function updateGraph() {
      if (graph) {
        // 更新图谱数据
        graph.graphData(graphData);
        
        // 重新适应视图
        setTimeout(() => {
          graph.zoomToFit(400, 50);
        }, 500);
      }
    }
    
    // 生成UUID
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    // 初始化
    loadData();
    setupSearch();
    setupTabs();
    setupAddButton();
    setupMobileNav(); // 添加移动端导航初始化
    
    // 全局事件监听器，处理ESC按键关闭模态框
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    });
    
    // 点击模态框外部区域关闭模态框
    document.getElementById('addModal').addEventListener('click', (event) => {
      // 如果点击的是模态框本身，而不是其内容，则关闭模态框
      if (event.target.id === 'addModal') {
        closeModal();
      }
    });
    
    // 初始化详情面板样式
    const detailPanel = document.getElementById('detailPanel');
    if (detailPanel) {
      detailPanel.style.zIndex = "1000";
      detailPanel.style.transition = "opacity 0.3s ease";
      detailPanel.style.opacity = "0";
      detailPanel.style.display = "none";
    }
    
    // 控制台调试信息输出函数
    function logLinkInfo(nodeId) {
      const links = graphData.links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return sourceId === nodeId || targetId === nodeId;
      });
      
      console.log(`节点 ${nodeId} 的连接线数量: ${links.length}`);
      
      if (links.length > 0) {
        console.log('连接线详情:');
        links.slice(0, 5).forEach((link, idx) => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          console.log(`连接 ${idx+1}: 从 ${sourceId} 到 ${targetId}`);
        });
      }
    }
    
    // 更新公司
    function updateCompany(company) {
      const name = document.getElementById('companyName').value.trim();
      const description = document.getElementById('companyDescription').value.trim();
      const organizationsSelect = document.getElementById('companyOrganizations');
      const selectedOrganizationIds = Array.from(organizationsSelect.selectedOptions).map(option => option.value);
      
      if (!name) {
        alert('请输入公司名称');
        return;
      }
      
      // 构建公司更新数据
      const updatedCompany = {
        name,
        description
      };
      
      // 添加组织信息
      const companyOrganizations = [];
      if (selectedOrganizationIds && selectedOrganizationIds.length > 0) {
        selectedOrganizationIds.forEach(organizationId => {
          if (organizationId) { // 确保不是空选项
            const organization = organizations.find(o => o._id === organizationId);
            if (organization) {
              companyOrganizations.push({
                _id: organization._id,
                name: organization.name
              });
            }
          }
        });
      }
      updatedCompany.organizations = companyOrganizations;
      
      // 发送更新请求
      fetch(`/api/companies/${company._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedCompany)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('更新公司失败');
        }
        return response.json();
      })
      .then(data => {
        console.log('公司更新成功:', data);
        
        // 更新本地数据
        const index = companies.findIndex(c => c._id === company._id);
        if (index !== -1) {
          companies[index] = { ...companies[index], ...data };
        }
        
        // 关闭模态框
        closeModal();
        
        // 重新创建图表数据
        createGraphData();
        
        // 更新图表
        updateGraph();
        
        // 更新列表
        updateList();
        
        // 刷新详情面板
        showDetailPanel(companies[index]);
      })
      .catch(error => {
        console.error('更新公司出错:', error);
        alert('更新公司失败: ' + error.message);
      });
    }
    
    // 设置关联选择的交互
    function setupRelationSelection(selectId, tagsContainerId) {
      const select = document.getElementById(selectId);
      const tagsContainer = document.getElementById(tagsContainerId);
      
      if (!select || !tagsContainer) return;
      
      // 清空标签容器
      tagsContainer.innerHTML = '';
      
      // 添加select change事件
      select.addEventListener('change', function() {
        // 清空标签容器
        tagsContainer.innerHTML = '';
        
        // 获取所有已选择的选项
        const selectedOptions = Array.from(this.selectedOptions);
        
        // 为每个选项创建标签
        selectedOptions.forEach(option => {
          if (option.value) {
            const tag = document.createElement('div');
            tag.className = 'selected-tag';
            tag.innerHTML = `
              ${option.textContent}
              <span class="remove-tag" data-value="${option.value}">×</span>
            `;
            tagsContainer.appendChild(tag);
            
            // 添加删除标签的事件
            tag.querySelector('.remove-tag').addEventListener('click', function() {
              const value = this.getAttribute('data-value');
              // 找到对应的option并取消选中
              Array.from(select.options).forEach(opt => {
                if (opt.value === value) {
                  opt.selected = false;
                }
              });
              // 移除标签
              tag.remove();
              
              // 触发change事件以更新内部状态
              const event = new Event('change');
              select.dispatchEvent(event);
            });
          }
        });
      });
      
      // 初始化已有选择
      if (select.selectedOptions.length > 0) {
        const event = new Event('change');
        select.dispatchEvent(event);
      }
    }
  });