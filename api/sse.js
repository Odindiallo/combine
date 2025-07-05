const express = require('express');
const authService = require('../services/auth-service');
const router = express.Router();

// Store SSE connections by user ID
const connections = new Map();

// Helper function to send SSE data
const sendSSEData = (res, eventType, data) => {
  const sseData = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  res.write(sseData);
};

// SSE endpoint for real-time updates
router.get('/updates', authService.verifyToken, (req, res) => {
  const userId = req.user.id;
  
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3000',
    'Access-Control-Allow-Credentials': 'true'
  });

  // Send initial connection confirmation
  sendSSEData(res, 'connected', {
    message: 'SSE connection established',
    userId: userId,
    timestamp: new Date().toISOString()
  });

  // Store connection for this user
  if (!connections.has(userId)) {
    connections.set(userId, []);
  }
  connections.get(userId).push(res);

  // Handle client disconnect
  req.on('close', () => {
    const userConnections = connections.get(userId);
    if (userConnections) {
      const index = userConnections.indexOf(res);
      if (index !== -1) {
        userConnections.splice(index, 1);
      }
      
      // Remove user entry if no connections left
      if (userConnections.length === 0) {
        connections.delete(userId);
      }
    }
  });

  // Keep connection alive with periodic heartbeat
  const heartbeat = setInterval(() => {
    if (res.destroyed) {
      clearInterval(heartbeat);
      return;
    }
    
    sendSSEData(res, 'heartbeat', {
      timestamp: new Date().toISOString()
    });
  }, 30000); // Send heartbeat every 30 seconds

  // Clean up on connection close
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// Function to broadcast achievement unlock to user
const broadcastAchievementUnlocked = (userId, achievement) => {
  const userConnections = connections.get(userId);
  if (!userConnections) return;

  const eventData = {
    achievement: {
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      points: achievement.points
    },
    timestamp: new Date().toISOString()
  };

  userConnections.forEach(connection => {
    if (!connection.destroyed) {
      sendSSEData(connection, 'achievement_unlocked', eventData);
    }
  });
};

// Function to broadcast level up to user
const broadcastLevelUp = (userId, skillId, skillName, newLevel, xp) => {
  const userConnections = connections.get(userId);
  if (!userConnections) return;

  const eventData = {
    skill_id: skillId,
    skill_name: skillName,
    new_level: newLevel,
    xp: xp,
    timestamp: new Date().toISOString()
  };

  userConnections.forEach(connection => {
    if (!connection.destroyed) {
      sendSSEData(connection, 'level_up', eventData);
    }
  });
};

// Function to broadcast progress update to user
const broadcastProgressUpdate = (userId, skillId, skillName, xpGained, newStreak, totalXP) => {
  const userConnections = connections.get(userId);
  if (!userConnections) return;

  const eventData = {
    skill_id: skillId,
    skill_name: skillName,
    xp_gained: xpGained,
    streak: newStreak,
    total_xp: totalXP,
    timestamp: new Date().toISOString()
  };

  userConnections.forEach(connection => {
    if (!connection.destroyed) {
      sendSSEData(connection, 'progress_update', eventData);
    }
  });
};

// Function to broadcast assessment completion
const broadcastAssessmentCompleted = (userId, assessmentId, skillName, score, xpEarned) => {
  const userConnections = connections.get(userId);
  if (!userConnections) return;

  const eventData = {
    assessment_id: assessmentId,
    skill_name: skillName,
    score: score,
    xp_earned: xpEarned,
    timestamp: new Date().toISOString()
  };

  userConnections.forEach(connection => {
    if (!connection.destroyed) {
      sendSSEData(connection, 'assessment_completed', eventData);
    }
  });
};

// Function to broadcast streak milestone
const broadcastStreakMilestone = (userId, skillId, skillName, streakCount) => {
  const userConnections = connections.get(userId);
  if (!userConnections) return;

  const eventData = {
    skill_id: skillId,
    skill_name: skillName,
    streak_count: streakCount,
    timestamp: new Date().toISOString()
  };

  userConnections.forEach(connection => {
    if (!connection.destroyed) {
      sendSSEData(connection, 'streak_milestone', eventData);
    }
  });
};

// Function to get connection stats (for debugging)
const getConnectionStats = () => {
  const stats = {
    total_users: connections.size,
    total_connections: 0,
    users: []
  };

  connections.forEach((userConnections, userId) => {
    stats.total_connections += userConnections.length;
    stats.users.push({
      user_id: userId,
      connection_count: userConnections.length
    });
  });

  return stats;
};

// Admin endpoint to check SSE connection stats
router.get('/stats', authService.verifyToken, (req, res) => {
  // TODO: Add admin role check here
  const stats = getConnectionStats();
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
});

// Export broadcast functions for use in other modules
router.broadcastAchievementUnlocked = broadcastAchievementUnlocked;
router.broadcastLevelUp = broadcastLevelUp;
router.broadcastProgressUpdate = broadcastProgressUpdate;
router.broadcastAssessmentCompleted = broadcastAssessmentCompleted;
router.broadcastStreakMilestone = broadcastStreakMilestone;
router.getConnectionStats = getConnectionStats;

module.exports = router;