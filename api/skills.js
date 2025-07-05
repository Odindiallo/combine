const express = require('express');
const authService = require('../services/auth-service');
const database = require('../db/database');

const router = express.Router();

// Helper function to send standardized responses
const sendResponse = (res, success, data = null, error = null, statusCode = 200, errorCode = null) => {
  const response = {
    success,
    data,
    error,
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  };
  
  if (errorCode) {
    response.metadata.errorCode = errorCode;
  }
  
  res.status(statusCode).json(response);
};

// GET /api/skills/categories
router.get('/categories', async (req, res) => {
  try {
    const skills = await database.getAllSkills();
    
    // Group skills by category
    const categoriesMap = {};
    skills.forEach(skill => {
      if (!categoriesMap[skill.category]) {
        categoriesMap[skill.category] = {
          name: skill.category,
          count: 0,
          skills: []
        };
      }
      
      categoriesMap[skill.category].skills.push({
        id: skill.id,
        name: skill.name,
        difficulty_levels: skill.difficulty_levels
      });
      categoriesMap[skill.category].count++;
    });
    
    const categories = Object.values(categoriesMap);
    sendResponse(res, true, { categories });
  } catch (error) {
    console.error('Error fetching skills categories:', error);
    sendResponse(res, false, null, 'Failed to fetch skills categories', 500, 1001);
  }
});

// GET /api/skills/:id
router.get('/:id', async (req, res) => {
  try {
    const skillId = parseInt(req.params.id);
    
    if (isNaN(skillId)) {
      return sendResponse(res, false, null, 'Invalid skill ID', 400, 1006);
    }
    
    const skill = await database.getSkillById(skillId);
    
    if (!skill) {
      return sendResponse(res, false, null, 'Skill not found', 404, 1011);
    }
    
    sendResponse(res, true, { skill });
  } catch (error) {
    console.error('Error fetching skill:', error);
    sendResponse(res, false, null, 'Failed to fetch skill', 500, 1000);
  }
});

// POST /api/skills/create
router.post('/create', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    const { name, category, difficulty_levels = 3, description } = req.body;
    
    // Validate required fields
    if (!name || !category) {
      return sendResponse(res, false, null, 'Name and category are required', 400, 1007);
    }
    
    // Validate difficulty levels
    if (difficulty_levels && (difficulty_levels < 1 || difficulty_levels > 10)) {
      return sendResponse(res, false, null, 'Difficulty levels must be between 1 and 10', 400, 1006);
    }
    
    const result = await database.createSkill(name, category, difficulty_levels, description);
    
    const newSkill = {
      id: result.lastID,
      name,
      category,
      difficulty_levels,
      description,
      created_at: new Date().toISOString()
    };
    
    sendResponse(res, true, { skill: newSkill });
  } catch (error) {
    console.error('Error creating skill:', error);
    
    if (error.message.includes('UNIQUE constraint')) {
      sendResponse(res, false, null, 'Skill with this name already exists', 409, 1019);
    } else {
      sendResponse(res, false, null, 'Failed to create skill', 500, 1000);
    }
  }
});

// PUT /api/skills/:id
router.put('/:id', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    const skillId = parseInt(req.params.id);
    
    if (isNaN(skillId)) {
      return sendResponse(res, false, null, 'Invalid skill ID', 400, 1006);
    }
    
    // Check if skill exists
    const existingSkill = await database.getSkillById(skillId);
    if (!existingSkill) {
      return sendResponse(res, false, null, 'Skill not found', 404, 1011);
    }
    
    const { name, category, difficulty_levels, description } = req.body;
    const updates = {};
    
    // Only include fields that are provided
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (difficulty_levels !== undefined) {
      if (difficulty_levels < 1 || difficulty_levels > 10) {
        return sendResponse(res, false, null, 'Difficulty levels must be between 1 and 10', 400, 1006);
      }
      updates.difficulty_levels = difficulty_levels;
    }
    if (description !== undefined) updates.description = description;
    
    if (Object.keys(updates).length === 0) {
      return sendResponse(res, false, null, 'No valid fields to update', 400, 1006);
    }
    
    await database.updateSkill(skillId, updates);
    
    // Fetch updated skill
    const updatedSkill = await database.getSkillById(skillId);
    
    sendResponse(res, true, { skill: updatedSkill });
  } catch (error) {
    console.error('Error updating skill:', error);
    sendResponse(res, false, null, 'Failed to update skill', 500, 1000);
  }
});

// DELETE /api/skills/:id
router.delete('/:id', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    const skillId = parseInt(req.params.id);
    
    if (isNaN(skillId)) {
      return sendResponse(res, false, null, 'Invalid skill ID', 400, 1006);
    }
    
    // Check if skill exists
    const existingSkill = await database.getSkillById(skillId);
    if (!existingSkill) {
      return sendResponse(res, false, null, 'Skill not found', 404, 1011);
    }
    
    const result = await database.deleteSkill(skillId);
    
    if (result.changes === 0) {
      return sendResponse(res, false, null, 'Skill not found', 404, 1011);
    }
    
    sendResponse(res, true, {
      message: 'Skill deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting skill:', error);
    
    if (error.message.includes('FOREIGN KEY constraint')) {
      sendResponse(res, false, null, 'Cannot delete skill with existing assessments', 409, 1019);
    } else {
      sendResponse(res, false, null, 'Failed to delete skill', 500, 1000);
    }
  }
});

module.exports = router;