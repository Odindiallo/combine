const express = require('express');
const authService = require('../services/auth-service');
const database = require('../db/database');
const router = express.Router();

// Helper function to send standardized responses
const sendResponse = (res, success, data = null, error = null, statusCode = 200, errorCode = null) => {
  const response = {
    success,
    timestamp: new Date().toISOString(),
    data: data || null,
    error: error || null
  };
  
  if (errorCode) {
    response.errorCode = errorCode;
  }
  
  res.status(statusCode).json(response);
};

// Get all achievements for a user
router.get('/', authService.verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const achievements = await database.query(`
      SELECT 
        a.id,
        a.name,
        a.description,
        a.icon,
        a.points,
        a.created_at,
        CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as earned,
        ua.earned_at
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
      ORDER BY a.created_at DESC
    `, [userId]);
    
    sendResponse(res, true, { achievements });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    sendResponse(res, false, null, 'Failed to fetch achievements', 500, 'FETCH_ACHIEVEMENTS_ERROR');
  }
});

// Get earned achievements for a user
router.get('/earned', authService.verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const earnedAchievements = await database.query(`
      SELECT 
        a.id,
        a.name,
        a.description,
        a.icon,
        a.points,
        ua.earned_at
      FROM achievements a
      JOIN user_achievements ua ON a.id = ua.achievement_id
      WHERE ua.user_id = ?
      ORDER BY ua.earned_at DESC
    `, [userId]);
    
    sendResponse(res, true, { achievements: earnedAchievements });
  } catch (error) {
    console.error('Error fetching earned achievements:', error);
    sendResponse(res, false, null, 'Failed to fetch earned achievements', 500, 'FETCH_EARNED_ACHIEVEMENTS_ERROR');
  }
});

// Get achievement statistics for a user
router.get('/stats', authService.verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await database.query(`
      SELECT 
        COUNT(DISTINCT a.id) as total_achievements,
        COUNT(DISTINCT ua.achievement_id) as earned_achievements,
        COALESCE(SUM(CASE WHEN ua.id IS NOT NULL THEN a.points ELSE 0 END), 0) as total_points,
        ROUND(
          (COUNT(DISTINCT ua.achievement_id) * 100.0 / COUNT(DISTINCT a.id)), 
          2
        ) as completion_percentage
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
    `, [userId]);
    
    const recentAchievements = await database.query(`
      SELECT 
        a.id,
        a.name,
        a.description,
        a.icon,
        a.points,
        ua.earned_at
      FROM achievements a
      JOIN user_achievements ua ON a.id = ua.achievement_id
      WHERE ua.user_id = ?
      ORDER BY ua.earned_at DESC
      LIMIT 5
    `, [userId]);
    
    sendResponse(res, true, {
      stats: stats[0],
      recent_achievements: recentAchievements
    });
  } catch (error) {
    console.error('Error fetching achievement stats:', error);
    sendResponse(res, false, null, 'Failed to fetch achievement statistics', 500, 'FETCH_ACHIEVEMENT_STATS_ERROR');
  }
});

// Award achievement to user (internal endpoint)
router.post('/award', authService.verifyToken, async (req, res) => {
  try {
    const { achievement_id } = req.body;
    const userId = req.user.id;
    
    if (!achievement_id) {
      return sendResponse(res, false, null, 'Achievement ID is required', 400, 'ACHIEVEMENT_ID_REQUIRED');
    }
    
    // Check if achievement exists
    const achievement = await database.query('SELECT * FROM achievements WHERE id = ?', [achievement_id]);
    if (achievement.length === 0) {
      return sendResponse(res, false, null, 'Achievement not found', 404, 'ACHIEVEMENT_NOT_FOUND');
    }
    
    // Check if user already has this achievement
    const existingAchievement = await database.query(
      'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
      [userId, achievement_id]
    );
    
    if (existingAchievement.length > 0) {
      return sendResponse(res, false, null, 'Achievement already earned', 409, 'ACHIEVEMENT_ALREADY_EARNED');
    }
    
    // Award achievement
    await database.query(
      'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
      [userId, achievement_id]
    );
    
    // Update user's total points
    await database.query(`
      UPDATE users 
      SET total_points = (
        SELECT COALESCE(SUM(a.points), 0)
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = ?
      )
      WHERE id = ?
    `, [userId, userId]);
    
    sendResponse(res, true, {
      message: 'Achievement awarded successfully',
      achievement: achievement[0]
    });
  } catch (error) {
    console.error('Error awarding achievement:', error);
    sendResponse(res, false, null, 'Failed to award achievement', 500, 'AWARD_ACHIEVEMENT_ERROR');
  }
});

// Get achievement leaderboard
router.get('/leaderboard', authService.verifyToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = parseInt(req.query.offset) || 0;
    
    const leaderboard = await database.query(`
      SELECT 
        u.id,
        u.email,
        u.total_points,
        COUNT(ua.id) as achievement_count,
        ROW_NUMBER() OVER (ORDER BY u.total_points DESC) as rank
      FROM users u
      LEFT JOIN user_achievements ua ON u.id = ua.user_id
      GROUP BY u.id, u.email, u.total_points
      ORDER BY u.total_points DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    
    sendResponse(res, true, { leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    sendResponse(res, false, null, 'Failed to fetch leaderboard', 500, 'FETCH_LEADERBOARD_ERROR');
  }
});

// Check for potential achievements (internal function)
const checkAchievements = async (userId) => {
  try {
    // Get user's current progress
    const userProgress = await database.query(`
      SELECT 
        COUNT(DISTINCT up.skill_id) as skills_completed,
        COUNT(DISTINCT ar.id) as assessments_taken,
        MAX(ar.score) as highest_score,
        AVG(ar.score) as average_score
      FROM user_progress up
      LEFT JOIN assessment_results ar ON up.user_id = ar.user_id
      WHERE up.user_id = ? AND up.mastery_level >= 80
    `, [userId]);
    
    if (userProgress.length === 0) return;
    
    const progress = userProgress[0];
    
    // Define achievement conditions
    const achievementConditions = [
      {
        id: 1,
        condition: progress.skills_completed >= 1,
        name: 'First Steps'
      },
      {
        id: 2,
        condition: progress.skills_completed >= 5,
        name: 'Skill Collector'
      },
      {
        id: 3,
        condition: progress.skills_completed >= 10,
        name: 'Expert in Training'
      },
      {
        id: 4,
        condition: progress.assessments_taken >= 10,
        name: 'Assessment Master'
      },
      {
        id: 5,
        condition: progress.highest_score >= 90,
        name: 'High Achiever'
      },
      {
        id: 6,
        condition: progress.average_score >= 85,
        name: 'Consistent Performer'
      }
    ];
    
    // Check and award achievements
    for (const achievement of achievementConditions) {
      if (achievement.condition) {
        // Check if user already has this achievement
        const existing = await database.query(
          'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
          [userId, achievement.id]
        );
        
        if (existing.length === 0) {
          // Award achievement
          await database.query(
            'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
            [userId, achievement.id]
          );
          
          console.log(`Achievement "${achievement.name}" awarded to user ${userId}`);
        }
      }
    }
    
    // Update user's total points
    await database.query(`
      UPDATE users 
      SET total_points = (
        SELECT COALESCE(SUM(a.points), 0)
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = ?
      )
      WHERE id = ?
    `, [userId, userId]);
    
  } catch (error) {
    console.error('Error checking achievements:', error);
  }
};

// Export the checkAchievements function for use in other modules
router.checkAchievements = checkAchievements;

module.exports = router;