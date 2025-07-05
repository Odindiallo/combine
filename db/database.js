const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, 'skillforge.db');
    this.schemaPath = path.join(__dirname, 'schema.sql');
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Database connection error:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.initializeSchema()
            .then(() => resolve(this.db))
            .catch(reject);
        }
      });
    });
  }

  async initializeSchema() {
    return new Promise((resolve, reject) => {
      const schema = fs.readFileSync(this.schemaPath, 'utf8');
      this.db.exec(schema, (err) => {
        if (err) {
          console.error('Schema initialization error:', err);
          reject(err);
        } else {
          console.log('Database schema initialized');
          resolve();
        }
      });
    });
  }

  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            console.error('Query error:', err);
            reject(err);
          } else {
            resolve(rows);
          }
        });
      } else {
        this.db.run(sql, params, function(err) {
          if (err) {
            console.error('Query error:', err);
            reject(err);
          } else {
            resolve({
              lastID: this.lastID,
              changes: this.changes
            });
          }
        });
      }
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Get query error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async transaction(queries) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        const executeQueries = async () => {
          try {
            const results = [];
            for (const { sql, params } of queries) {
              const result = await this.query(sql, params);
              results.push(result);
            }
            
            this.db.run('COMMIT', (err) => {
              if (err) {
                reject(err);
              } else {
                resolve(results);
              }
            });
          } catch (error) {
            this.db.run('ROLLBACK');
            reject(error);
          }
        };
        
        executeQueries();
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }

  // Health check method
  async healthCheck() {
    try {
      await this.query('SELECT 1 as test');
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  // User-related database methods
  async createUser(email, passwordHash) {
    const sql = 'INSERT INTO users (email, password_hash) VALUES (?, ?)';
    return await this.query(sql, [email, passwordHash]);
  }

  async getUserByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    return await this.get(sql, [email]);
  }

  async getUserById(id) {
    const sql = 'SELECT id, email, created_at FROM users WHERE id = ?';
    return await this.get(sql, [id]);
  }

  // Skills-related methods
  async getAllSkills() {
    const sql = 'SELECT * FROM skills ORDER BY category, name';
    return await this.query(sql);
  }

  async getSkillById(id) {
    const sql = 'SELECT * FROM skills WHERE id = ?';
    return await this.get(sql, [id]);
  }

  async getSkillsByCategory() {
    const sql = `
      SELECT category, 
             COUNT(*) as count,
             JSON_GROUP_ARRAY(JSON_OBJECT(
               'id', id,
               'name', name,
               'difficulty_levels', difficulty_levels
             )) as skills
      FROM skills 
      GROUP BY category 
      ORDER BY category
    `;
    return await this.query(sql);
  }

  async createSkill(name, category, difficultyLevels = 3, description = null) {
    const sql = 'INSERT INTO skills (name, category, difficulty_levels, description) VALUES (?, ?, ?, ?)';
    return await this.query(sql, [name, category, difficultyLevels, description]);
  }

  async updateSkill(id, updates) {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(id);
    
    const sql = `UPDATE skills SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    return await this.query(sql, values);
  }

  async deleteSkill(id) {
    const sql = 'DELETE FROM skills WHERE id = ?';
    return await this.query(sql, [id]);
  }

  // Progress tracking methods
  async getUserProgress(userId, skillId) {
    const sql = `
      SELECT up.*, s.name as skill_name 
      FROM user_progress up 
      JOIN skills s ON up.skill_id = s.id 
      WHERE up.user_id = ? AND up.skill_id = ?
    `;
    return await this.get(sql, [userId, skillId]);
  }

  async updateUserProgress(userId, skillId, updates) {
    const checkSql = 'SELECT * FROM user_progress WHERE user_id = ? AND skill_id = ?';
    const existing = await this.get(checkSql, [userId, skillId]);
    
    if (existing) {
      const fields = [];
      const values = [];
      
      for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
      values.push(userId, skillId);
      
      const sql = `UPDATE user_progress SET ${fields.join(', ')}, last_activity = CURRENT_TIMESTAMP WHERE user_id = ? AND skill_id = ?`;
      return await this.query(sql, values);
    } else {
      const fields = ['user_id', 'skill_id'];
      const placeholders = ['?', '?'];
      const values = [userId, skillId];
      
      for (const [key, value] of Object.entries(updates)) {
        fields.push(key);
        placeholders.push('?');
        values.push(value);
      }
      
      const sql = `INSERT INTO user_progress (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
      return await this.query(sql, values);
    }
  }

  // Achievement methods
  async getUserAchievements(userId) {
    const sql = `
      SELECT a.*, 
             CASE WHEN ua.user_id IS NOT NULL THEN 1 ELSE 0 END as unlocked,
             ua.unlocked_at
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
      ORDER BY a.id
    `;
    return await this.query(sql, [userId]);
  }

  async unlockAchievement(userId, achievementId) {
    const sql = 'INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)';
    return await this.query(sql, [userId, achievementId]);
  }

  // Assessment methods
  async createAssessment(skillId, questionsJson, createdBy, timeLimit = 1800) {
    const sql = 'INSERT INTO assessments (skill_id, questions_json, created_by, time_limit) VALUES (?, ?, ?, ?)';
    return await this.query(sql, [skillId, questionsJson, createdBy, timeLimit]);
  }

  async getAssessment(id) {
    const sql = 'SELECT * FROM assessments WHERE id = ?';
    return await this.get(sql, [id]);
  }

  async saveAssessmentResult(userId, assessmentId, answersJson, score, pointsEarned, pointsPossible, timeSpent) {
    const sql = `
      INSERT INTO assessment_results 
      (user_id, assessment_id, answers_json, score, points_earned, points_possible, time_spent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    return await this.query(sql, [userId, assessmentId, answersJson, score, pointsEarned, pointsPossible, timeSpent]);
  }

  async getAssessmentHistory(userId, limit = 20) {
    const sql = `
      SELECT ar.*, s.name as skill_name, a.created_at as assessment_created
      FROM assessment_results ar
      JOIN assessments a ON ar.assessment_id = a.id
      JOIN skills s ON a.skill_id = s.id
      WHERE ar.user_id = ?
      ORDER BY ar.completed_at DESC
      LIMIT ?
    `;
    return await this.query(sql, [userId, limit]);
  }
}

// Singleton instance
const database = new Database();

module.exports = database;