const database = require('../db/database');

class ProgressService {
  constructor() {
    this.XP_PER_LEVEL = 100; // Base XP required for level 1
    this.LEVEL_MULTIPLIER = 1.5; // Each level requires 50% more XP than the previous
    this.STREAK_BONUS_MULTIPLIER = 0.1; // 10% bonus per streak day
    this.MAX_STREAK_BONUS = 1.0; // Maximum 100% bonus from streaks
  }

  /**
   * Calculate XP based on assessment performance
   * @param {number} difficulty - Question difficulty (1-5)
   * @param {number} accuracy - Score percentage (0-1)
   * @param {number} timeSpent - Time spent in milliseconds
   * @param {number} streak - Current streak count
   * @returns {number} XP earned
   */
  calculateXP(difficulty, accuracy, timeSpent, streak = 0) {
    const baseXP = difficulty * 100;
    
    // Accuracy bonus (0% to 50% bonus)
    const accuracyBonus = accuracy * 0.5;
    
    // Time bonus - reward faster completion (max 5 minutes for full bonus)
    const maxTime = 300000; // 5 minutes in milliseconds
    const timeBonus = Math.max(0, 1 - (timeSpent / maxTime)) * 0.2; // Up to 20% bonus
    
    // Streak bonus - up to 100% bonus for long streaks
    const streakBonus = Math.min(
      streak * this.STREAK_BONUS_MULTIPLIER,
      this.MAX_STREAK_BONUS
    );
    
    const totalMultiplier = 1 + accuracyBonus + timeBonus + streakBonus;
    return Math.floor(baseXP * totalMultiplier);
  }

  /**
   * Calculate level from total XP using exponential scaling
   * @param {number} totalXP - Total XP accumulated
   * @returns {number} Current level
   */
  calculateLevel(totalXP) {
    if (totalXP < this.XP_PER_LEVEL) return 1;
    
    // Use logarithmic formula for level calculation
    // Level = floor(log(totalXP / 100) / log(1.5)) + 1
    const level = Math.floor(Math.log(totalXP / this.XP_PER_LEVEL) / Math.log(this.LEVEL_MULTIPLIER)) + 1;
    return Math.max(1, level);
  }

  /**
   * Calculate XP required for next level
   * @param {number} currentLevel - Current level
   * @returns {number} XP required for next level
   */
  calculateXPForLevel(currentLevel) {
    if (currentLevel <= 1) return this.XP_PER_LEVEL;
    
    // XP for level n = 100 * (1.5^(n-1))
    return Math.floor(this.XP_PER_LEVEL * Math.pow(this.LEVEL_MULTIPLIER, currentLevel - 1));
  }

  /**
   * Calculate XP needed to reach next level
   * @param {number} totalXP - Current total XP
   * @returns {object} Object with current level, XP to next level, and progress percentage
   */
  calculateLevelProgress(totalXP) {
    const currentLevel = this.calculateLevel(totalXP);
    const currentLevelXP = this.calculateXPForLevel(currentLevel);
    const nextLevelXP = this.calculateXPForLevel(currentLevel + 1);
    
    const xpInCurrentLevel = totalXP - currentLevelXP;
    const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
    const progressPercentage = Math.floor((xpInCurrentLevel / xpNeededForNextLevel) * 100);
    
    return {
      current_level: currentLevel,
      total_xp: totalXP,
      xp_in_current_level: xpInCurrentLevel,
      xp_to_next_level: xpNeededForNextLevel - xpInCurrentLevel,
      progress_percentage: progressPercentage
    };
  }

  /**
   * Update user progress for a skill
   * @param {number} userId - User ID
   * @param {number} skillId - Skill ID
   * @param {number} xpGained - XP gained from assessment
   * @param {boolean} streakMaintained - Whether the daily streak was maintained
   * @returns {object} Updated progress with level up information
   */
  async updateProgress(userId, skillId, xpGained, streakMaintained = true) {
    try {
      // Get current progress
      const currentProgress = await database.query(`
        SELECT 
          up.*,
          s.name as skill_name
        FROM user_progress up
        JOIN skills s ON up.skill_id = s.id
        WHERE up.user_id = ? AND up.skill_id = ?
      `, [userId, skillId]);

      let progress;
      let isNewProgress = false;

      if (currentProgress.length === 0) {
        // Create new progress entry
        await database.query(`
          INSERT INTO user_progress (user_id, skill_id, level, xp, streak, last_activity)
          VALUES (?, ?, 1, 0, 0, CURRENT_TIMESTAMP)
        `, [userId, skillId]);
        
        progress = {
          user_id: userId,
          skill_id: skillId,
          level: 1,
          xp: 0,
          streak: 0,
          last_activity: new Date(),
          skill_name: 'Unknown'
        };
        isNewProgress = true;
      } else {
        progress = currentProgress[0];
      }

      // Calculate streak
      const newStreak = this.calculateStreak(progress.last_activity, progress.streak, streakMaintained);
      
      // Add XP
      const newTotalXP = progress.xp + xpGained;
      const oldLevel = progress.level;
      const newLevel = this.calculateLevel(newTotalXP);
      const leveledUp = newLevel > oldLevel;

      // Update progress in database
      await database.query(`
        UPDATE user_progress 
        SET level = ?, xp = ?, streak = ?, last_activity = CURRENT_TIMESTAMP,
            mastery_level = ?
        WHERE user_id = ? AND skill_id = ?
      `, [newLevel, newTotalXP, newStreak, this.calculateMasteryLevel(newLevel, newStreak), userId, skillId]);

      // Get level progress details
      const levelProgress = this.calculateLevelProgress(newTotalXP);

      const result = {
        user_id: userId,
        skill_id: skillId,
        skill_name: progress.skill_name,
        old_level: oldLevel,
        new_level: newLevel,
        level_up: leveledUp,
        xp_gained: xpGained,
        total_xp: newTotalXP,
        old_streak: progress.streak,
        new_streak: newStreak,
        streak_maintained: streakMaintained,
        level_progress: levelProgress,
        is_new_progress: isNewProgress
      };

      return result;
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  }

  /**
   * Calculate streak based on last activity
   * @param {Date} lastActivity - Last activity date
   * @param {number} currentStreak - Current streak count
   * @param {boolean} streakMaintained - Whether activity happened today
   * @returns {number} New streak count
   */
  calculateStreak(lastActivity, currentStreak, streakMaintained) {
    if (!streakMaintained) {
      return 0; // Streak broken
    }

    const now = new Date();
    const lastActivityDate = new Date(lastActivity);
    const daysDifference = Math.floor((now - lastActivityDate) / (1000 * 60 * 60 * 24));

    if (daysDifference === 0) {
      // Same day, maintain current streak
      return currentStreak;
    } else if (daysDifference === 1) {
      // Next day, increment streak
      return currentStreak + 1;
    } else {
      // More than one day, reset streak
      return 1; // Start new streak
    }
  }

  /**
   * Calculate mastery level percentage based on level and streak
   * @param {number} level - Current level
   * @param {number} streak - Current streak
   * @returns {number} Mastery percentage (0-100)
   */
  calculateMasteryLevel(level, streak) {
    // Base mastery from level (50% max)
    const levelMastery = Math.min((level - 1) * 5, 50);
    
    // Additional mastery from streak (50% max)
    const streakMastery = Math.min(streak * 2, 50);
    
    return Math.min(levelMastery + streakMastery, 100);
  }

  /**
   * Get comprehensive progress statistics for a user
   * @param {number} userId - User ID
   * @returns {object} Progress statistics
   */
  async getProgressStats(userId) {
    try {
      const stats = await database.query(`
        SELECT 
          COUNT(DISTINCT up.skill_id) as skills_started,
          COUNT(DISTINCT CASE WHEN up.mastery_level >= 80 THEN up.skill_id END) as skills_mastered,
          SUM(up.xp) as total_xp,
          AVG(up.level) as average_level,
          MAX(up.streak) as longest_streak,
          AVG(up.mastery_level) as average_mastery,
          COUNT(DISTINCT ar.id) as total_assessments,
          AVG(ar.score) as average_score
        FROM user_progress up
        LEFT JOIN assessment_results ar ON up.user_id = ar.user_id AND up.skill_id = ar.skill_id
        WHERE up.user_id = ?
      `, [userId]);

      const recentActivity = await database.query(`
        SELECT 
          s.name as skill_name,
          up.level,
          up.xp,
          up.streak,
          up.mastery_level,
          up.last_activity
        FROM user_progress up
        JOIN skills s ON up.skill_id = s.id
        WHERE up.user_id = ?
        ORDER BY up.last_activity DESC
        LIMIT 5
      `, [userId]);

      return {
        stats: stats[0],
        recent_activity: recentActivity,
        user_level: this.calculateLevel(stats[0].total_xp || 0)
      };
    } catch (error) {
      console.error('Error getting progress stats:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard data
   * @param {number} limit - Number of entries to return
   * @returns {array} Leaderboard entries
   */
  async getLeaderboard(limit = 10) {
    try {
      const leaderboard = await database.query(`
        SELECT 
          u.id,
          u.email,
          SUM(up.xp) as total_xp,
          COUNT(DISTINCT up.skill_id) as skills_count,
          AVG(up.mastery_level) as average_mastery,
          MAX(up.streak) as best_streak
        FROM users u
        LEFT JOIN user_progress up ON u.id = up.user_id
        GROUP BY u.id, u.email
        HAVING total_xp > 0
        ORDER BY total_xp DESC
        LIMIT ?
      `, [limit]);

      return leaderboard.map((entry, index) => ({
        rank: index + 1,
        user_id: entry.id,
        email: entry.email,
        total_xp: entry.total_xp,
        user_level: this.calculateLevel(entry.total_xp),
        skills_count: entry.skills_count,
        average_mastery: Math.round(entry.average_mastery || 0),
        best_streak: entry.best_streak || 0
      }));
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Check if user should receive milestone rewards
   * @param {object} progressUpdate - Progress update result
   * @returns {array} Array of milestone achievements
   */
  checkMilestones(progressUpdate) {
    const milestones = [];

    // Level milestones
    if (progressUpdate.level_up) {
      if (progressUpdate.new_level === 5) {
        milestones.push({ type: 'level', milestone: 'Intermediate', level: 5 });
      } else if (progressUpdate.new_level === 10) {
        milestones.push({ type: 'level', milestone: 'Advanced', level: 10 });
      } else if (progressUpdate.new_level === 20) {
        milestones.push({ type: 'level', milestone: 'Expert', level: 20 });
      }
    }

    // Streak milestones
    const streakMilestones = [7, 14, 30, 60, 100];
    if (streakMilestones.includes(progressUpdate.new_streak)) {
      milestones.push({ 
        type: 'streak', 
        milestone: `${progressUpdate.new_streak} Day Streak`,
        streak: progressUpdate.new_streak 
      });
    }

    // XP milestones
    const xpMilestones = [1000, 5000, 10000, 25000, 50000];
    const oldXP = progressUpdate.total_xp - progressUpdate.xp_gained;
    for (const milestone of xpMilestones) {
      if (oldXP < milestone && progressUpdate.total_xp >= milestone) {
        milestones.push({ 
          type: 'xp', 
          milestone: `${milestone} XP Earned`,
          xp: milestone 
        });
      }
    }

    return milestones;
  }
}

// Create singleton instance
const progressService = new ProgressService();

module.exports = progressService;