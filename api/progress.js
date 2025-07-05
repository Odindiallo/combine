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

// Helper function to calculate XP needed for next level
const calculateXPToNextLevel = (currentLevel) => {
  const nextLevelXP = Math.pow(currentLevel, 2) * 100;
  return nextLevelXP;
};

// Helper function to calculate current level XP threshold
const calculateCurrentLevelXP = (level) => {
  return Math.pow(level - 1, 2) * 100;
};

// GET /api/progress/:userId/:skillId
router.get('/:userId/:skillId', 
  authService.authenticateToken.bind(authService), 
  async (req, res) => {
    try {
      const requestedUserId = parseInt(req.params.userId);
      const skillId = parseInt(req.params.skillId);
      const currentUserId = req.user.userId;
      
      // Validate parameters
      if (isNaN(requestedUserId) || isNaN(skillId)) {
        return sendResponse(res, false, null, 'Invalid user ID or skill ID', 400, 1006);
      }
      
      // Users can only access their own progress (basic permission check)
      if (requestedUserId !== currentUserId) {
        return sendResponse(res, false, null, 'Insufficient permissions', 403, 1004);
      }
      
      // Check if user exists
      const user = await database.getUserById(requestedUserId);
      if (!user) {
        return sendResponse(res, false, null, 'User not found', 404, 1008);
      }
      
      // Check if skill exists
      const skill = await database.getSkillById(skillId);
      if (!skill) {
        return sendResponse(res, false, null, 'Skill not found', 404, 1011);
      }
      
      // Get user progress for this skill
      let progress = await database.getUserProgress(requestedUserId, skillId);
      
      // If no progress exists, create default progress
      if (!progress) {
        progress = {
          user_id: requestedUserId,
          skill_id: skillId,
          skill_name: skill.name,
          level: 1,
          xp: 0,
          streak: 0,
          assessments_completed: 0,
          total_score: 0.0,
          last_activity: new Date().toISOString()
        };
      }
      
      // Calculate XP needed for next level
      const currentLevelXP = calculateCurrentLevelXP(progress.level);
      const nextLevelXP = calculateXPToNextLevel(progress.level);
      const xpToNextLevel = nextLevelXP - progress.xp;
      
      const progressData = {
        user_id: progress.user_id,
        skill_id: progress.skill_id,
        skill_name: progress.skill_name,
        level: progress.level,
        xp: progress.xp,
        xp_to_next_level: Math.max(0, xpToNextLevel),
        streak: progress.streak,
        assessments_completed: progress.assessments_completed,
        average_score: progress.total_score,
        last_activity: progress.last_activity
      };
      
      sendResponse(res, true, { progress: progressData });
    } catch (error) {
      console.error('Error fetching user progress:', error);
      sendResponse(res, false, null, 'Failed to fetch user progress', 500, 1000);
    }
  }
);

// POST /api/progress/update
router.post('/update', 
  authService.authenticateToken.bind(authService), 
  async (req, res) => {
    try {
      const { user_id, skill_id, xp_gained, streak_maintained = true } = req.body;
      const currentUserId = req.user.userId;
      
      // Validate input
      if (!user_id || !skill_id || xp_gained === undefined) {
        return sendResponse(res, false, null, 'User ID, skill ID, and XP gained are required', 400, 1007);
      }
      
      // Users can only update their own progress
      if (user_id !== currentUserId) {
        return sendResponse(res, false, null, 'Insufficient permissions', 403, 1004);
      }
      
      // Validate XP gained
      if (typeof xp_gained !== 'number' || xp_gained < 0) {
        return sendResponse(res, false, null, 'XP gained must be a positive number', 400, 1006);
      }
      
      // Check if user exists
      const user = await database.getUserById(user_id);
      if (!user) {
        return sendResponse(res, false, null, 'User not found', 404, 1008);
      }
      
      // Check if skill exists
      const skill = await database.getSkillById(skill_id);
      if (!skill) {
        return sendResponse(res, false, null, 'Skill not found', 404, 1011);
      }
      
      // Get current progress
      let currentProgress = await database.getUserProgress(user_id, skill_id);
      
      // Initialize default progress if none exists
      if (!currentProgress) {
        currentProgress = {
          user_id: user_id,
          skill_id: skill_id,
          level: 1,
          xp: 0,
          streak: 0,
          assessments_completed: 0,
          total_score: 0.0
        };
      }
      
      // Calculate new values
      const newXP = currentProgress.xp + xp_gained;
      const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;
      const levelUp = newLevel > currentProgress.level;
      
      // Update streak
      let newStreak = currentProgress.streak;
      const lastActivity = new Date(currentProgress.last_activity || new Date());
      const now = new Date();
      const daysDiff = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1 && streak_maintained) {
        newStreak += 1;
      } else if (daysDiff === 0) {
        // Same day, maintain streak
        newStreak = currentProgress.streak;
      } else if (!streak_maintained || daysDiff > 1) {
        newStreak = 1; // Reset streak
      }
      
      // Update progress in database
      const updates = {
        level: newLevel,
        xp: newXP,
        streak: newStreak
      };
      
      await database.updateUserProgress(user_id, skill_id, updates);
      
      // Check for level-based achievements
      const newAchievements = [];
      
      // Check for skill-specific achievements
      if (skill_id === 1 && newLevel >= 2) { // JavaScript Novice
        try {
          await database.unlockAchievement(user_id, 4);
          newAchievements.push(4);
        } catch (error) {
          // Achievement already unlocked
        }
      }
      
      // Check for level 5 achievement
      if (newLevel >= 5) {
        try {
          await database.unlockAchievement(user_id, 8); // Level Up
          newAchievements.push(8);
        } catch (error) {
          // Achievement already unlocked
        }
      }
      
      // Check for streak achievements
      if (newStreak >= 7) {
        try {
          await database.unlockAchievement(user_id, 6); // Streak Master
          newAchievements.push(6);
        } catch (error) {
          // Achievement already unlocked
        }
      }
      
      const progressData = {
        user_id: user_id,
        skill_id: skill_id,
        level: newLevel,
        xp: newXP,
        streak: newStreak,
        level_up: levelUp,
        achievements_unlocked: newAchievements
      };
      
      sendResponse(res, true, { progress: progressData });
    } catch (error) {
      console.error('Error updating progress:', error);
      
      if (error.message.includes('User not found')) {
        sendResponse(res, false, null, 'User not found', 404, 1008);
      } else if (error.message.includes('Skill not found')) {
        sendResponse(res, false, null, 'Skill not found', 404, 1011);
      } else {
        sendResponse(res, false, null, 'Failed to update progress', 500, 1015);
      }
    }
  }
);

// GET /api/progress/:userId (get all progress for a user)
router.get('/:userId', 
  authService.authenticateToken.bind(authService), 
  async (req, res) => {
    try {
      const requestedUserId = parseInt(req.params.userId);
      const currentUserId = req.user.userId;
      
      // Validate parameters
      if (isNaN(requestedUserId)) {
        return sendResponse(res, false, null, 'Invalid user ID', 400, 1006);
      }
      
      // Users can only access their own progress
      if (requestedUserId !== currentUserId) {
        return sendResponse(res, false, null, 'Insufficient permissions', 403, 1004);
      }
      
      // Check if user exists
      const user = await database.getUserById(requestedUserId);
      if (!user) {
        return sendResponse(res, false, null, 'User not found', 404, 1008);
      }
      
      // Get all skills
      const skills = await database.getAllSkills();
      
      // Get progress for each skill
      const progressPromises = skills.map(async (skill) => {
        let progress = await database.getUserProgress(requestedUserId, skill.id);
        
        if (!progress) {
          progress = {
            user_id: requestedUserId,
            skill_id: skill.id,
            skill_name: skill.name,
            level: 1,
            xp: 0,
            streak: 0,
            assessments_completed: 0,
            total_score: 0.0,
            last_activity: new Date().toISOString()
          };
        }
        
        const currentLevelXP = calculateCurrentLevelXP(progress.level);
        const nextLevelXP = calculateXPToNextLevel(progress.level);
        const xpToNextLevel = nextLevelXP - progress.xp;
        
        return {
          skill_id: skill.id,
          skill_name: skill.name,
          skill_category: skill.category,
          level: progress.level,
          xp: progress.xp,
          xp_to_next_level: Math.max(0, xpToNextLevel),
          streak: progress.streak,
          assessments_completed: progress.assessments_completed,
          average_score: progress.total_score,
          last_activity: progress.last_activity
        };
      });
      
      const allProgress = await Promise.all(progressPromises);
      
      sendResponse(res, true, { progress: allProgress });
    } catch (error) {
      console.error('Error fetching all user progress:', error);
      sendResponse(res, false, null, 'Failed to fetch user progress', 500, 1000);
    }
  }
);

module.exports = router;