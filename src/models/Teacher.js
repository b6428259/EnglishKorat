/**
 * Teacher Model - extends BaseModel with teacher-specific operations
 */

const BaseModel = require('./BaseModel');

class Teacher extends BaseModel {
  constructor() {
    super('teachers');
  }

  // Find teacher with user details
  async findWithUser(id) {
    try {
      return await this.knex(this.tableName)
        .select('teachers.*', 'users.username', 'users.email', 'users.phone', 'users.line_id', 'users.status as user_status', 'users.branch_id')
        .leftJoin('users', 'teachers.user_id', 'users.id')
        .where('teachers.id', id)
        .first();
    } catch (error) {
      throw new Error(`Error finding teacher with user details: ${error.message}`);
    }
  }

  // Find teachers by branch
  async findByBranch(branchId, options = {}) {
    try {
      return await this.findAll({ 'users.branch_id': branchId }, options);
    } catch (error) {
      throw new Error(`Error finding teachers by branch: ${error.message}`);
    }
  }

  // Search teachers with filters
  async search(filters = {}, options = {}) {
    try {
      let query = this.knex(this.tableName)
        .select('teachers.*', 'users.username', 'users.email', 'users.phone', 'users.branch_id')
        .leftJoin('users', 'teachers.user_id', 'users.id');

      if (filters.name) {
        query = query.where(function() {
          this.whereRaw('LOWER(teachers.first_name) LIKE ?', [`%${filters.name.toLowerCase()}%`])
            .orWhereRaw('LOWER(teachers.last_name) LIKE ?', [`%${filters.name.toLowerCase()}%`])
            .orWhereRaw('LOWER(teachers.nickname) LIKE ?', [`%${filters.name.toLowerCase()}%`]);
        });
      }

      if (filters.branch_id) {
        query = query.where('users.branch_id', filters.branch_id);
      }

      if (filters.teacher_type) {
        query = query.where('teachers.teacher_type', filters.teacher_type);
      }

      if (filters.active !== undefined) {
        query = query.where('teachers.active', filters.active);
      }

      // Apply options
      if (options.orderBy) {
        query = query.orderBy(options.orderBy, options.order || 'asc');
      } else {
        query = query.orderBy('teachers.first_name', 'asc');
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.offset(options.offset);
      }

      return await query;
    } catch (error) {
      throw new Error(`Error searching teachers: ${error.message}`);
    }
  }
}

module.exports = Teacher;
