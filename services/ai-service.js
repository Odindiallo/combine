const database = require('../db/database');

class AIService {
  constructor(provider = 'openai') {
    this.provider = provider;
    this.apiKey = this.getApiKey(provider);
    this.initialized = false;
    
    // Question templates for fallback when AI is unavailable
    this.questionTemplates = {
      'JavaScript': {
        1: [
          {
            type: 'multiple_choice',
            question: 'What is the correct way to declare a variable in JavaScript?',
            options: ['var x = 5;', 'variable x = 5;', 'v x = 5;', 'declare x = 5;'],
            correct_answer: 'var x = 5;',
            explanation: 'Variables in JavaScript can be declared using var, let, or const keywords.'
          },
          {
            type: 'multiple_choice',
            question: 'Which of the following is NOT a JavaScript data type?',
            options: ['String', 'Boolean', 'Integer', 'Object'],
            correct_answer: 'Integer',
            explanation: 'JavaScript has Number type but not specifically Integer. Numbers can be integers or floats.'
          }
        ],
        2: [
          {
            type: 'multiple_choice',
            question: 'What does the "this" keyword refer to in JavaScript?',
            options: ['The current function', 'The global object', 'The object that owns the method', 'The parent element'],
            correct_answer: 'The object that owns the method',
            explanation: 'The "this" keyword refers to the object that is executing the current function.'
          },
          {
            type: 'coding',
            question: 'Write a function that takes an array of numbers and returns the sum.',
            correct_answer: 'function sum(arr) { return arr.reduce((a, b) => a + b, 0); }',
            explanation: 'Using reduce() is an efficient way to sum array elements.'
          }
        ]
      },
      'Python': {
        1: [
          {
            type: 'multiple_choice',
            question: 'Which of the following is the correct way to comment in Python?',
            options: ['// comment', '/* comment */', '# comment', '<!-- comment -->'],
            correct_answer: '# comment',
            explanation: 'Python uses the # symbol for single-line comments.'
          },
          {
            type: 'multiple_choice',
            question: 'What is the output of: print(type(5.0))?',
            options: ['<class \'int\'>', '<class \'float\'>', '<class \'number\'>', '<class \'decimal\'>'],
            correct_answer: '<class \'float\'>',
            explanation: 'Numbers with decimal points are float type in Python.'
          }
        ]
      },
      'General': {
        1: [
          {
            type: 'multiple_choice',
            question: 'What does API stand for?',
            options: ['Application Programming Interface', 'Advanced Programming Integration', 'Automated Program Interface', 'Application Process Integration'],
            correct_answer: 'Application Programming Interface',
            explanation: 'API stands for Application Programming Interface, a set of protocols for building software applications.'
          }
        ]
      }
    };
  }

  getApiKey(provider) {
    switch (provider) {
      case 'openai':
        return process.env.OPENAI_API_KEY;
      case 'anthropic':
        return process.env.ANTHROPIC_API_KEY;
      default:
        return null;
    }
  }

  async initialize() {
    try {
      // Test API connection if key is available
      if (this.apiKey) {
        // For now, we'll just mark as initialized
        // In a real implementation, you'd test the API connection here
        this.initialized = true;
        console.log(`AI Service initialized with ${this.provider} provider`);
      } else {
        console.warn(`No API key found for ${this.provider}, using fallback templates`);
        this.initialized = false;
      }
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      this.initialized = false;
    }
  }

  async generateAssessmentQuestions(skillId, level, count = 5) {
    try {
      // Get skill information
      const skill = await database.query('SELECT * FROM skills WHERE id = ?', [skillId]);
      if (skill.length === 0) {
        throw new Error('Skill not found');
      }

      const skillName = skill[0].name;
      const category = skill[0].category;

      // If AI is available, use it (placeholder for actual implementation)
      if (this.initialized && this.apiKey) {
        return await this.generateQuestionsWithAI(skillName, category, level, count);
      } else {
        // Fall back to template questions
        return this.generateQuestionsFromTemplate(skillName, category, level, count);
      }
    } catch (error) {
      console.error('Error generating assessment questions:', error);
      throw error;
    }
  }

  async generateQuestionsWithAI(skillName, category, level, count) {
    // Placeholder for actual AI integration
    // This would make real API calls to OpenAI, Anthropic, etc.
    
    const prompt = `Generate ${count} assessment questions for ${skillName} at difficulty level ${level} (1-5 scale).
    
    Requirements:
    - Mix of multiple choice and coding questions
    - Appropriate for level ${level} difficulty
    - Include correct answers and explanations
    - Format as JSON array`;

    // For now, return template questions with AI-like randomization
    console.log(`AI Service: Would generate questions with prompt: ${prompt}`);
    
    // Simulate AI response with template questions
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
    
    return this.generateQuestionsFromTemplate(skillName, category, level, count);
  }

  generateQuestionsFromTemplate(skillName, category, level, count) {
    const questions = [];
    
    // Get questions from templates
    let templateQuestions = this.questionTemplates[skillName] || 
                           this.questionTemplates[category] || 
                           this.questionTemplates['General'];
    
    if (!templateQuestions) {
      templateQuestions = this.questionTemplates['General'];
    }

    const levelQuestions = templateQuestions[level] || templateQuestions[1] || templateQuestions[Object.keys(templateQuestions)[0]];
    
    if (!levelQuestions) {
      throw new Error('No template questions available for this skill and level');
    }

    // Generate questions up to the requested count
    for (let i = 0; i < count; i++) {
      const templateIndex = i % levelQuestions.length;
      const template = levelQuestions[templateIndex];
      
      const question = {
        id: i + 1,
        type: template.type,
        question: template.question,
        options: template.options || null,
        correct_answer: template.correct_answer,
        explanation: template.explanation,
        difficulty: level,
        points: this.calculateQuestionPoints(template.type, level)
      };
      
      questions.push(question);
    }

    return questions;
  }

  calculateQuestionPoints(type, level) {
    const basePoints = {
      'multiple_choice': 10,
      'coding': 20,
      'short_answer': 15
    };
    
    const multiplier = level * 0.5; // Higher levels worth more points
    return Math.floor(basePoints[type] * (1 + multiplier));
  }

  async evaluateResponse(question, userAnswer) {
    try {
      // If AI is available, use it for more sophisticated evaluation
      if (this.initialized && this.apiKey && question.type === 'coding') {
        return await this.evaluateWithAI(question, userAnswer);
      } else {
        // Simple comparison for non-AI evaluation
        return this.evaluateSimple(question, userAnswer);
      }
    } catch (error) {
      console.error('Error evaluating response:', error);
      return {
        correct: false,
        score: 0,
        feedback: 'Error evaluating response'
      };
    }
  }

  async evaluateWithAI(question, userAnswer) {
    // Placeholder for AI-powered evaluation
    // This would analyze coding solutions for correctness, style, etc.
    
    const prompt = `Evaluate this coding solution:
    
    Question: ${question.question}
    Correct Answer: ${question.correct_answer}
    User Answer: ${userAnswer}
    
    Provide a score (0-1), whether it's correct, and detailed feedback.`;

    console.log(`AI Service: Would evaluate with prompt: ${prompt}`);
    
    // Simulate AI evaluation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // For now, fall back to simple evaluation
    return this.evaluateSimple(question, userAnswer);
  }

  evaluateSimple(question, userAnswer) {
    const correct = this.normalizeAnswer(userAnswer) === this.normalizeAnswer(question.correct_answer);
    
    return {
      correct: correct,
      score: correct ? 1 : 0,
      feedback: correct ? 'Correct!' : `Incorrect. The correct answer is: ${question.correct_answer}`,
      explanation: question.explanation || ''
    };
  }

  normalizeAnswer(answer) {
    if (typeof answer !== 'string') return String(answer);
    
    return answer
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, ''); // Remove punctuation for comparison
  }

  async addQuestionTemplate(skillName, level, questionData) {
    try {
      if (!this.questionTemplates[skillName]) {
        this.questionTemplates[skillName] = {};
      }
      
      if (!this.questionTemplates[skillName][level]) {
        this.questionTemplates[skillName][level] = [];
      }
      
      this.questionTemplates[skillName][level].push(questionData);
      
      // In a real implementation, you'd save this to the database
      console.log(`Added question template for ${skillName} level ${level}`);
      
      return true;
    } catch (error) {
      console.error('Error adding question template:', error);
      return false;
    }
  }

  getServiceStatus() {
    return {
      provider: this.provider,
      initialized: this.initialized,
      hasApiKey: !!this.apiKey,
      templateCount: Object.keys(this.questionTemplates).length
    };
  }

  async switchProvider(newProvider) {
    this.provider = newProvider;
    this.apiKey = this.getApiKey(newProvider);
    await this.initialize();
  }
}

// Create singleton instance
const aiService = new AIService();

// Initialize on module load
aiService.initialize().catch(error => {
  console.error('Failed to initialize AI service on startup:', error);
});

module.exports = aiService;