const database = require('../db/database');

class AchievementService {
  constructor() {
    this.achievementDefinitions = [
      {
        id: 1,
        name: 'First Steps',
        description: 'Complete your first assessment',
        icon: '🎯',
        points: 50,
        condition: {
          type: 'assessment_count',
          value: 1
        }
      },
      {
        id: 2,
        name: 'Getting Started',
        description: 'Complete 5 assessments',
        icon: '🚀',
        points: 100,
        condition: {
          type: 'assessment_count',
          value: 5
        }
      },
      {
        id: 3,
        name: 'Assessment Master',
        description: 'Complete 25 assessments',
        icon: '🏆',
        points: 250,
        condition: {
          type: 'assessment_count',
          value: 25
        }
      },
      {
        id: 4,
        name: 'High Achiever',
        description: 'Score 90% or higher on an assessment',
        icon: '⭐',
        points: 100,
        condition: {
          type: 'high_score',
          value: 0.9
        }
      },
      {
        id: 5,
        name: 'Perfectionist',
        description: 'Score 100% on an assessment',
        icon: '💯',
        points: 200,
        condition: {
          type: 'perfect_score',
          value: 1.0
        }
      },
      {
        id: 6,
        name: 'Consistent Performer',
        description: 'Maintain an average score of 85% or higher across 10 assessments',
        icon: '📈',
        points: 300,
        condition: {
          type: 'average_score',
          value: 0.85,
          min_assessments: 10
        }
      },
      {
        id: 7,
        name: 'Skill Explorer',
        description: 'Try assessments in 3 different skill categories',
        icon: '🗺️',
        points: 150,
        condition: {
          type: 'skill_categories',
          value: 3
        }
      },
      {
        id: 8,
        name: 'Skill Collector',
        description: 'Try assessments in 5 different skills',
        icon: '🎨',
        points: 200,
        condition: {
          type: 'unique_skills',
          value: 5
        }
      },
      {
        id: 9,
        name: 'Level Up',
        description: 'Reach level 5 in any skill',
        icon: '📊',
        points: 200,
        condition: {
          type: 'skill_level',
          value: 5
        }
      },
      {
        id: 10,
        name: 'Expert',
        description: 'Reach level 10 in any skill',
        icon: '🧠',
        points: 500,
        condition: {
          type: 'skill_level',
          value: 10
        }
      },
      {
        id: 11,
        name: 'Master',
        description: 'Reach level 20 in any skill',
        icon: '👑',
        points: 1000,
        condition: {
          type: 'skill_level',
          value: 20
        }
      },
      {
        id: 12,
        name: 'Streak Starter',
        description: 'Maintain a 7-day learning streak',
        icon: '🔥',
        points: 150,
        condition: {
          type: 'streak',
          value: 7
        }
      },
      {
        id: 13,
        name: 'Dedicated Learner',
        description: 'Maintain a 30-day learning streak',
        icon: '💪',
        points: 500,
        condition: {
          type: 'streak',
          value: 30
        }
      },
      {
        id: 14,
        name: 'Unstoppable',
        description: 'Maintain a 100-day learning streak',
        icon: '⚡',
        points: 1500,
        condition: {
          type: 'streak',
          value: 100
        }
      },
      {
        id: 15,
        name: 'XP Hunter',
        description: 'Earn 1,000 total XP',
        icon: '💎',
        points: 100,
        condition: {
          type: 'total_xp',
          value: 1000
        }
      },
      {
        id: 16,
        name: 'XP Collector',
        description: 'Earn 10,000 total XP',
        icon: '💰',
        points: 500,
        condition: {
          type: 'total_xp',
          value: 10000
        }
      },
      {
        id: 17,
        name: 'XP Master',
        description: 'Earn 50,000 total XP',
        icon: '🏅',
        points: 1000,
        condition: {
          type: 'total_xp',
          value: 50000
        }
      },
      {
        id: 18,
        name: 'Speed Demon',
        description: 'Complete an assessment in under 30 seconds',
        icon: '⚡',
        points: 150,
        condition: {
          type: 'fast_completion',
          value: 30000 // 30 seconds in milliseconds
        }
      },
      {
        id: 19,
        name: 'Night Owl',
        description: 'Complete an assessment between 10 PM and 6 AM',
        icon: '🦉',
        points: 100,
        condition: {
          type: 'time_based',
          value: 'night'
        }
      },
      {
        id: 20,
        name: 'Early Bird',
        description: 'Complete an assessment between 5 AM and 9 AM',
        icon: '🐦',
        points: 100,
        condition: {
          type: 'time_based',
          value: 'morning'
        }
      }
    ];
  }

  /**
   * Initialize achievement system - create default achievements in database
   */
  async initializeAchievements() {
    try {
      for (const achievement of this.achievementDefinitions) {
        // Check if achievement already exists
        const existing = await database.query(
          'SELECT id FROM achievements WHERE id = ?',
          [achievement.id]
        );

        if (existing.length === 0) {
          // Insert new achievement
          await database.query(`
            INSERT INTO achievements (id, name, description, icon, points, condition_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `, [
            achievement.id,
            achievement.name,
            achievement.description,
            achievement.icon,
            achievement.points,
            JSON.stringify(achievement.condition)
          ]);
        }
      }
      
      console.log('Achievement system initialized with', this.achievementDefinitions.length, 'achievements');
    } catch (error) {
      console.error('Error initializing achievements:', error);
    }
  }

  /**
   * Check and award achievements for a user based on their activity
   * @param {number} userId - User ID
   * @param {string} trigger - What triggered the check (assessment_completed, level_up, etc.)
   * @param {object} data - Additional data for checking conditions
   * @returns {array} Array of newly unlocked achievements
   */
  async checkAchievements(userId, trigger, data = {}) {
    try {
      const newAchievements = [];
      
      // Get user's current achievement status
      const existingAchievements = await database.query(`
        SELECT achievement_id FROM user_achievements WHERE user_id = ?
      `, [userId]);
      
      const existingIds = new Set(existingAchievements.map(a => a.achievement_id));
      
      // Get user statistics for checking conditions
      const userStats = await this.getUserStats(userId);
      
      // Check each achievement definition
      for (const achievement of this.achievementDefinitions) {
        if (existingIds.has(achievement.id)) {
          continue; // User already has this achievement
        }
        
        if (await this.checkAchievementCondition(achievement.condition, userStats, data)) {
          // Award achievement
          await this.awardAchievement(userId, achievement.id);
          newAchievements.push(achievement);
        }
      }
      
      return newAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Get comprehensive user statistics for achievement checking
   * @param {number} userId - User ID
   * @returns {object} User statistics
   */
  async getUserStats(userId) {
    try {
      // Assessment statistics
      const assessmentStats = await database.query(`
        SELECT 
          COUNT(*) as total_assessments,
          AVG(score) as average_score,
          MAX(score) as highest_score,
          MIN(time_spent) as fastest_time,
          COUNT(DISTINCT skill_id) as unique_skills
        FROM assessment_results 
        WHERE user_id = ?
      `, [userId]);

      // Skill category statistics
      const categoryStats = await database.query(`
        SELECT COUNT(DISTINCT s.category) as unique_categories
        FROM assessment_results ar
        JOIN skills s ON ar.skill_id = s.id
        WHERE ar.user_id = ?
      `, [userId]);

      // Progress statistics
      const progressStats = await database.query(`
        SELECT 
          MAX(level) as highest_level,
          MAX(streak) as longest_streak,
          SUM(xp) as total_xp,
          MAX(xp) as highest_skill_xp
        FROM user_progress 
        WHERE user_id = ?
      `, [userId]);

      // Recent assessment for time-based achievements
      const recentAssessment = await database.query(`
        SELECT completed_at, time_spent
        FROM assessment_results 
        WHERE user_id = ?
        ORDER BY completed_at DESC
        LIMIT 1
      `, [userId]);

      return {
        ...assessmentStats[0],
        ...categoryStats[0],
        ...progressStats[0],
        recent_assessment: recentAssessment[0] || null
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {};
    }
  }

  /**
   * Check if a specific achievement condition is met
   * @param {object} condition - Achievement condition
   * @param {object} userStats - User statistics
   * @param {object} triggerData - Data from the triggering event
   * @returns {boolean} Whether condition is met
   */
  async checkAchievementCondition(condition, userStats, triggerData) {
    switch (condition.type) {
      case 'assessment_count':
        return (userStats.total_assessments || 0) >= condition.value;
      
      case 'high_score':
        return (userStats.highest_score || 0) >= condition.value;
      
      case 'perfect_score':
        return (userStats.highest_score || 0) >= condition.value;
      
      case 'average_score':
        return (userStats.total_assessments || 0) >= (condition.min_assessments || 1) &&
               (userStats.average_score || 0) >= condition.value;
      
      case 'skill_categories':
        return (userStats.unique_categories || 0) >= condition.value;
      
      case 'unique_skills':
        return (userStats.unique_skills || 0) >= condition.value;
      
      case 'skill_level':
        return (userStats.highest_level || 0) >= condition.value;
      
      case 'streak':
        return (userStats.longest_streak || 0) >= condition.value;
      
      case 'total_xp':
        return (userStats.total_xp || 0) >= condition.value;
      
      case 'fast_completion':
        return userStats.recent_assessment && 
               userStats.recent_assessment.time_spent <= condition.value;
      
      case 'time_based':
        if (!userStats.recent_assessment) return false;
        
        const completedAt = new Date(userStats.recent_assessment.completed_at);
        const hour = completedAt.getHours();
        
        if (condition.value === 'night') {
          return hour >= 22 || hour < 6; // 10 PM to 6 AM
        } else if (condition.value === 'morning') {
          return hour >= 5 && hour < 9; // 5 AM to 9 AM
        }
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Award an achievement to a user
   * @param {number} userId - User ID
   * @param {number} achievementId - Achievement ID
   * @returns {boolean} Success status
   */
  async awardAchievement(userId, achievementId) {
    try {
      // Check if already awarded
      const existing = await database.query(
        'SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
        [userId, achievementId]
      );

      if (existing.length > 0) {
        return false; // Already awarded
      }

      // Award achievement
      await database.query(
        'INSERT INTO user_achievements (user_id, achievement_id, earned_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [userId, achievementId]
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

      console.log(`Achievement ${achievementId} awarded to user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error awarding achievement:', error);
      return false;
    }
  }

  /**
   * Get all achievements for a user with their unlock status
   * @param {number} userId - User ID
   * @returns {array} Array of achievements with unlock status
   */
  async getUserAchievements(userId) {
    try {
      const achievements = await database.query(`
        SELECT 
          a.id,
          a.name,
          a.description,
          a.icon,
          a.points,
          a.created_at,
          CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END as earned,
          ua.earned_at
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
        ORDER BY earned DESC, a.points ASC
      `, [userId]);

      return achievements;
    } catch (error) {
      console.error('Error getting user achievements:', error);
      return [];
    }
  }

  /**
   * Get achievement statistics for a user
   * @param {number} userId - User ID
   * @returns {object} Achievement statistics
   */
  async getAchievementStats(userId) {
    try {
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

      return {
        stats: stats[0],
        recent_achievements: recentAchievements
      };
    } catch (error) {
      console.error('Error getting achievement stats:', error);
      return {
        stats: {
          total_achievements: 0,
          earned_achievements: 0,
          total_points: 0,
          completion_percentage: 0
        },
        recent_achievements: []
      };
    }
  }

  /**
   * Get achievement leaderboard
   * @param {number} limit - Number of entries to return
   * @returns {array} Leaderboard entries
   */
  async getAchievementLeaderboard(limit = 10) {
    try {
      const leaderboard = await database.query(`
        SELECT 
          u.id,
          u.email,
          u.total_points,
          COUNT(ua.id) as achievement_count,
          ROW_NUMBER() OVER (ORDER BY u.total_points DESC, COUNT(ua.id) DESC) as rank
        FROM users u
        LEFT JOIN user_achievements ua ON u.id = ua.user_id
        GROUP BY u.id, u.email, u.total_points
        HAVING u.total_points > 0
        ORDER BY u.total_points DESC, achievement_count DESC
        LIMIT ?
      `, [limit]);

      return leaderboard;
    } catch (error) {
      console.error('Error getting achievement leaderboard:', error);
      return [];
    }
  }

  /**
   * Get achievement by ID
   * @param {number} achievementId - Achievement ID
   * @returns {object} Achievement details
   */
  getAchievementById(achievementId) {
    return this.achievementDefinitions.find(a => a.id === achievementId) || null;
  }

  /**
   * Get all achievement definitions
   * @returns {array} All achievement definitions
   */
  getAllAchievements() {
    return this.achievementDefinitions;
  }
}

// Create singleton instance
const achievementService = new AchievementService();

// Initialize achievements on module load
achievementService.initializeAchievements().catch(error => {
  console.error('Failed to initialize achievements on startup:', error);
});

module.exports = achievementService;