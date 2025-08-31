const Tag = require('../models/tagModel');

// 标签控制器
const tagController = {
  // 获取所有标签
  getAllTags: async (req, res) => {
    try {
      const tags = await Tag.getAllTags();
      res.json({
        success: true,
        data: tags,
        message: '成功获取所有标签'
      });
    } catch (error) {
      console.error('获取标签列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取标签列表失败',
        error: error.message
      });
    }
  },

  // 根据ID获取标签
  getTagById: async (req, res) => {
    try {
      const { id } = req.params;
      const tag = await Tag.getTagById(id);
      
      if (!tag) {
        return res.status(404).json({
          success: false,
          message: '标签不存在'
        });
      }
      
      res.json({
        success: true,
        data: tag,
        message: '成功获取标签信息'
      });
    } catch (error) {
      console.error('获取标签失败:', error);
      res.status(500).json({
        success: false,
        message: '获取标签失败',
        error: error.message
      });
    }
  },

  // 创建新标签
  createTag: async (req, res) => {
    try {
      const { name, description, color, parent_tags, child_tags, connections, connection_count } = req.body;
      
      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: '标签名称不能为空'
        });
      }
      
      // 检查标签名是否已存在
      const existingTags = await Tag.getAllTags();
      const isDuplicate = existingTags.some(tag => tag.name.toLowerCase() === name.toLowerCase());
      
      if (isDuplicate) {
        return res.status(400).json({
          success: false,
          message: '标签名称已存在'
        });
      }
      
      // 构建标签数据对象
      const tagData = {
        name: name.trim(),
        description: description || '',
        color: color || '#6B7280',
        parent_tags: parent_tags || [],
        child_tags: child_tags || [],
        connection_count: connection_count || 0,
        connections: connections || []
      };
      
      const newTag = await Tag.createTag(tagData);
      
      // 处理双向绑定：更新父标签的child_tags
      if (parent_tags && parent_tags.length > 0) {
        await updateBidirectionalRelationships(newTag._id, newTag.name, parent_tags, 'add');
      }
      
      // 处理双向绑定：更新子标签的parent_tags
      if (child_tags && child_tags.length > 0) {
        await updateChildParentRelationships(newTag._id, newTag.name, child_tags, 'add');
      }
      
      res.status(201).json({
        success: true,
        data: newTag,
        message: '标签创建成功'
      });
    } catch (error) {
      console.error('创建标签失败:', error);
      res.status(500).json({
        success: false,
        message: '创建标签失败',
        error: error.message
      });
    }
  },

  // 更新标签
  updateTag: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, color, parent_tags, child_tags, connections, connection_count } = req.body;

      // 验证标签名称
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: '标签名称不能为空' });
      }

      // 检查是否存在同名标签（排除当前标签）
      const allTags = await Tag.getAllTags();
      const existingTag = allTags.find(tag => tag.name.toLowerCase() === name.trim().toLowerCase());
      if (existingTag && existingTag._id !== id) {
        return res.status(400).json({ error: '标签名称已存在' });
      }

      // 获取原始标签数据以比较变化
      const originalTag = await Tag.getTagById(id);
      if (!originalTag) {
        return res.status(404).json({ error: '标签不存在' });
      }

      const updateData = {
        name: name.trim(),
        description: description || '',
        color: color || '#3B82F6',
        parent_tags: parent_tags || [],
        child_tags: child_tags || [],
        updated_at: new Date().toISOString()
      };

      // 保留其他字段
      if (connections !== undefined) updateData.connections = connections;
      if (connection_count !== undefined) updateData.connection_count = connection_count;

      const updatedTag = await Tag.updateTag(id, updateData);
      
      // 处理双向绑定：比较parent_tags的变化
      const oldParentTags = originalTag.parent_tags || [];
      const newParentTags = parent_tags || [];
      
      // 移除的父标签关系
      const removedParents = oldParentTags.filter(oldParent => 
        !newParentTags.some(newParent => newParent._id === oldParent._id)
      );
      
      // 新增的父标签关系
      const addedParents = newParentTags.filter(newParent => 
        !oldParentTags.some(oldParent => oldParent._id === newParent._id)
      );
      
      // 更新父标签的child_tags
      if (removedParents.length > 0) {
        await updateBidirectionalRelationships(id, updateData.name, removedParents, 'remove');
      }
      if (addedParents.length > 0) {
        await updateBidirectionalRelationships(id, updateData.name, addedParents, 'add');
      }
      
      // 处理双向绑定：比较child_tags的变化
      const oldChildTags = originalTag.child_tags || [];
      const newChildTags = child_tags || [];
      
      // 移除的子标签关系
      const removedChildren = oldChildTags.filter(oldChild => 
        !newChildTags.some(newChild => newChild._id === oldChild._id)
      );
      
      // 新增的子标签关系
      const addedChildren = newChildTags.filter(newChild => 
        !oldChildTags.some(oldChild => oldChild._id === newChild._id)
      );
      
      // 更新子标签的parent_tags
      if (removedChildren.length > 0) {
        await updateChildParentRelationships(id, updateData.name, removedChildren, 'remove');
      }
      if (addedChildren.length > 0) {
        await updateChildParentRelationships(id, updateData.name, addedChildren, 'add');
      }
      
      res.json(updatedTag);
    } catch (error) {
      console.error('更新标签失败:', error);
      res.status(500).json({ error: '更新标签失败' });
    }
  },

  // 删除标签
  deleteTag: async (req, res) => {
    try {
      const { id } = req.params;
      
      // 获取要删除的标签信息，用于清理双向关系
      const tagToDelete = await Tag.getTagById(id);
      if (tagToDelete) {
        // 清理父标签的child_tags关系
        if (tagToDelete.parent_tags && tagToDelete.parent_tags.length > 0) {
          await updateBidirectionalRelationships(id, tagToDelete.name, tagToDelete.parent_tags, 'remove');
        }
        
        // 清理子标签的parent_tags关系
        if (tagToDelete.child_tags && tagToDelete.child_tags.length > 0) {
          await updateChildParentRelationships(id, tagToDelete.name, tagToDelete.child_tags, 'remove');
        }
      }
      
      await Tag.deleteTag(id);
      res.json({ message: '标签删除成功' });
    } catch (error) {
      console.error('删除标签失败:', error);
      res.status(500).json({ error: '删除标签失败' });
    }
  }
};

// 双向绑定辅助函数：更新父标签的child_tags
async function updateBidirectionalRelationships(childId, childName, parentTags, operation) {
  try {
    for (const parentTag of parentTags) {
      const parent = await Tag.getTagById(parentTag._id);
      if (parent) {
        let childTags = parent.child_tags || [];
        
        if (operation === 'add') {
          // 添加子标签关系（避免重复）
          const exists = childTags.some(child => child._id === childId);
          if (!exists) {
            childTags.push({ _id: childId, name: childName });
          }
        } else if (operation === 'remove') {
          // 移除子标签关系
          childTags = childTags.filter(child => child._id !== childId);
        }
        
        // 更新父标签
        await Tag.updateTag(parentTag._id, {
          ...parent,
          child_tags: childTags,
          updated_at: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('更新父标签child_tags失败:', error);
  }
}

// 双向绑定辅助函数：更新子标签的parent_tags
async function updateChildParentRelationships(parentId, parentName, childTags, operation) {
  try {
    for (const childTag of childTags) {
      const child = await Tag.getTagById(childTag._id);
      if (child) {
        let parentTags = child.parent_tags || [];
        
        if (operation === 'add') {
          // 添加父标签关系（避免重复）
          const exists = parentTags.some(parent => parent._id === parentId);
          if (!exists) {
            parentTags.push({ _id: parentId, name: parentName });
          }
        } else if (operation === 'remove') {
          // 移除父标签关系
          parentTags = parentTags.filter(parent => parent._id !== parentId);
        }
        
        // 更新子标签
        await Tag.updateTag(childTag._id, {
          ...child,
          parent_tags: parentTags,
          updated_at: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('更新子标签parent_tags失败:', error);
  }
}

module.exports = tagController;