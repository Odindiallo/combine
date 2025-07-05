const express = require('express');
const rateLimit = require('express-rate-limit');
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

// Rate limiter for assessment generation
const assessmentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 assessment requests per minute per user
  message: {
    success: false,
    error: 'Too many assessment requests. Please try again later.',
    data: null,
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      errorCode: 1005
    }
  }
});

// Helper function to generate sample questions (placeholder for AI service)
const generateSampleQuestions = (skillId, level, count = 5) => {
  const questionTypes = ['multiple_choice', 'short_answer', 'coding'];
  const questions = [];
  
  for (let i = 1; i <= count; i++) {
    const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    const question = {
      id: i,
      type: type,
      question: `Sample ${type} question ${i} for skill ${skillId} at level ${level}`,
      difficulty: level,
      points: level * 10
    };
    
    if (type === 'multiple_choice') {
      question.options = [
        'Option A',
        'Option B', 
        'Option C',
        'Option D'
      ];
      question.correct_answer = 'Option A'; // This would be hidden from client
    } else {
      question.correct_answer = `Correct answer for question ${i}`;
    }
    
    // Remove correct_answer from client response (will be stored in database)
    const clientQuestion = { ...question };
    delete clientQuestion.correct_answer;
    questions.push(clientQuestion);
  }
  
  return questions;
};

// Helper function to calculate XP based on performance
const calculateXP = (difficulty, accuracy, timeSpent, maxTime = 1800) => {
  const baseXP = difficulty * 100;
  const accuracyBonus = accuracy * 0.5;
  const timeBonus = Math.max(0, 1 - (timeSpent / maxTime)) * 0.2;
  return Math.floor(baseXP * (1 + accuracyBonus + timeBonus));
};

// Helper function to calculate level from XP
const calculateLevel = (totalXP) => {
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
};

// Helper function to check for achievements
const checkAchievements = async (userId) => {
  const newAchievements = [];
  
  // Get user's assessment history
  const history = await database.getAssessmentHistory(userId, 100);
  const assessmentCount = history.length;
  
  // Check for assessment count achievements
  const achievementMap = {
    1: 1,   // First Steps
    5: 2,   // Quick Learner  
    10: 3   // Dedicated Student
  };
  
  for (const [count, achievementId] of Object.entries(achievementMap)) {
    if (assessmentCount >= parseInt(count)) {
      try {
        await database.unlockAchievement(userId, achievementId);
        newAchievements.push(achievementId);
      } catch (error) {
        // Achievement already unlocked, ignore
      }
    }
  }
  
  // Check for perfect score achievement
  const perfectScores = history.filter(h => h.score >= 1.0);
  if (perfectScores.length > 0) {
    try {
      await database.unlockAchievement(userId, 5); // Perfect Score
      newAchievements.push(5);
    } catch (error) {
      // Achievement already unlocked, ignore
    }
  }
  
  return newAchievements;
};

// POST /api/assessment/generate
router.post('/generate', 
  assessmentLimiter,
  authService.authenticateToken.bind(authService), 
  async (req, res) => {
    try {
      const { skill_id, level, question_count = 5 } = req.body;
      const userId = req.user.userId;
      
      // Validate input
      if (!skill_id || !level) {
        return sendResponse(res, false, null, 'Skill ID and level are required', 400, 1007);
      }
      
      if (level < 1 || level > 5) {
        return sendResponse(res, false, null, 'Level must be between 1 and 5', 400, 1017);
      }
      
      if (question_count < 1 || question_count > 20) {
        return sendResponse(res, false, null, 'Question count must be between 1 and 20', 400, 1006);
      }
      
      // Check if skill exists
      const skill = await database.getSkillById(skill_id);
      if (!skill) {
        return sendResponse(res, false, null, 'Skill not found', 404, 1011);
      }
      
      // Generate questions (placeholder - would use AI service in production)
      const questions = generateSampleQuestions(skill_id, level, question_count);
      
      // Store assessment in database with full questions including answers
      const fullQuestions = questions.map(q => ({
        ...q,
        correct_answer: `Correct answer for question ${q.id}`
      }));
      
      const timeLimit = Math.max(300, question_count * 120); // 2 minutes per question, minimum 5 minutes
      
      const result = await database.createAssessment(
        skill_id,
        JSON.stringify(fullQuestions),
        userId,
        timeLimit
      );
      
      const assessment = {
        id: result.lastID,
        skill_id: skill_id,
        questions: questions, // Return questions without answers
        time_limit: timeLimit,
        created_at: new Date().toISOString()
      };
      
      sendResponse(res, true, { assessment });
    } catch (error) {
      console.error('Error generating assessment:', error);
      
      if (error.message.includes('Skill not found')) {
        sendResponse(res, false, null, 'Skill not found', 404, 1011);
      } else {
        sendResponse(res, false, null, 'Failed to generate assessment', 500, 1014);
      }
    }
  }
);

// POST /api/assessment/submit
router.post('/submit', 
  authService.authenticateToken.bind(authService), 
  async (req, res) => {
    try {
      const { assessment_id, answers, total_time } = req.body;
      const userId = req.user.userId;
      
      // Validate input
      if (!assessment_id || !answers || !Array.isArray(answers)) {
        return sendResponse(res, false, null, 'Assessment ID and answers array are required', 400, 1007);
      }
      
      // Get assessment from database
      const assessment = await database.getAssessment(assessment_id);
      if (!assessment) {
        return sendResponse(res, false, null, 'Assessment not found', 404, 1012);
      }
      
      // Check if assessment is expired (optional - could implement expiration logic)
      const assessmentAge = Date.now() - new Date(assessment.created_at).getTime();
      if (assessmentAge > (assessment.time_limit * 1000 * 2)) { // Allow 2x time limit for flexibility
        return sendResponse(res, false, null, 'Assessment has expired', 400, 1018);
      }
      
      // Parse stored questions
      const storedQuestions = JSON.parse(assessment.questions_json);
      
      // Grade the assessment
      let correctAnswers = 0;
      let totalPoints = 0;
      let earnedPoints = 0;
      
      const gradedQuestions = answers.map(userAnswer => {
        const question = storedQuestions.find(q => q.id === userAnswer.question_id);
        if (!question) {
          return null;
        }
        
        totalPoints += question.points;
        const isCorrect = userAnswer.answer === question.correct_answer;
        
        if (isCorrect) {
          correctAnswers++;
          earnedPoints += question.points;
        }
        
        return {
          question_id: question.id,
          correct: isCorrect,
          user_answer: userAnswer.answer,
          correct_answer: question.correct_answer,
          explanation: `This question tests ${question.type} knowledge at level ${question.difficulty}.`
        };
      }).filter(Boolean);
      
      const score = totalPoints > 0 ? earnedPoints / totalPoints : 0;
      
      // Calculate XP earned
      const avgDifficulty = storedQuestions.reduce((sum, q) => sum + q.difficulty, 0) / storedQuestions.length;
      const xpEarned = calculateXP(avgDifficulty, score, total_time, assessment.time_limit);
      
      // Save assessment result
      await database.saveAssessmentResult(
        userId,
        assessment_id,
        JSON.stringify(answers),
        score,
        earnedPoints,
        totalPoints,
        total_time
      );
      
      // Update user progress
      const currentProgress = await database.getUserProgress(userId, assessment.skill_id);
      const newXP = (currentProgress?.xp || 0) + xpEarned;
      const newLevel = calculateLevel(newXP);
      const levelUp = newLevel > (currentProgress?.level || 1);
      
      await database.updateUserProgress(userId, assessment.skill_id, {
        level: newLevel,
        xp: newXP,
        assessments_completed: (currentProgress?.assessments_completed || 0) + 1,
        total_score: ((currentProgress?.total_score || 0) * (currentProgress?.assessments_completed || 0) + score) / ((currentProgress?.assessments_completed || 0) + 1)
      });
      
      // Check for achievements
      const newAchievements = await checkAchievements(userId);
      
      const results = {
        score: score,
        points_earned: earnedPoints,
        points_possible: totalPoints,
        questions: gradedQuestions,
        xp_earned: xpEarned,
        level_up: levelUp,
        achievements_unlocked: newAchievements
      };
      
      sendResponse(res, true, { results });
    } catch (error) {
      console.error('Error submitting assessment:', error);
      sendResponse(res, false, null, 'Failed to submit assessment', 500, 1000);
    }
  }
);

// GET /api/assessment/history/:userId
router.get('/history/:userId', 
  authService.authenticateToken.bind(authService), 
  async (req, res) => {
    try {
      const requestedUserId = parseInt(req.params.userId);
      const currentUserId = req.user.userId;
      
      // Users can only access their own history (basic permission check)
      if (requestedUserId !== currentUserId) {
        return sendResponse(res, false, null, 'Insufficient permissions', 403, 1004);
      }
      
      const history = await database.getAssessmentHistory(requestedUserId);
      
      const assessments = history.map(record => ({
        id: record.id,
        skill_name: record.skill_name,
        score: record.score,
        points_earned: record.points_earned,
        points_possible: record.points_possible,
        completed_at: record.completed_at,
        time_spent: record.time_spent
      }));
      
      sendResponse(res, true, { assessments });
    } catch (error) {
      console.error('Error fetching assessment history:', error);
      sendResponse(res, false, null, 'Failed to fetch assessment history', 500, 1000);
    }
  }
);

module.exports = router;