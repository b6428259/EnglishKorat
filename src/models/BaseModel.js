/**
 * Base Model class for database operations
 * Provides common CRUD operations and query building
 */

const knex = require('../config/database');

class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
    this.knex = knex;
  }

  // Find by ID
  async findById(id) {
    try {
      const result = await this.knex(this.tableName).where('id', id).first();
      return result;
    } catch (error) {
      throw new Error(`Error finding ${this.tableName} by ID: ${error.message}`);
    }
  }

  // Find all with optional conditions
  async findAll(conditions = {}, options = {}) {
    try {
      let query = this.knex(this.tableName);
      
      // Apply conditions
      Object.keys(conditions).forEach(key => {
        query = query.where(key, conditions[key]);
      });

      // Apply options
      if (options.orderBy) {
        query = query.orderBy(options.orderBy, options.order || 'asc');
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.offset(options.offset);
      }

      return await query;
    } catch (error) {
      throw new Error(`Error finding ${this.tableName}: ${error.message}`);
    }
  }

  // Create new record
  async create(data) {
    try {
      const [id] = await this.knex(this.tableName).insert({
        ...data,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      return await this.findById(id);
    } catch (error) {
      throw new Error(`Error creating ${this.tableName}: ${error.message}`);
    }
  }

  // Update record
  async update(id, data) {
    try {
      await this.knex(this.tableName)
        .where('id', id)
        .update({
          ...data,
          updated_at: new Date()
        });
      
      return await this.findById(id);
    } catch (error) {
      throw new Error(`Error updating ${this.tableName}: ${error.message}`);
    }
  }

  // Delete record
  async delete(id) {
    try {
      const result = await this.knex(this.tableName).where('id', id).del();
      return result > 0;
    } catch (error) {
      throw new Error(`Error deleting ${this.tableName}: ${error.message}`);
    }
  }

  // Count records
  async count(conditions = {}) {
    try {
      let query = this.knex(this.tableName);
      
      Object.keys(conditions).forEach(key => {
        query = query.where(key, conditions[key]);
      });

      const [{ count }] = await query.count('* as count');
      return parseInt(count, 10);
    } catch (error) {
      throw new Error(`Error counting ${this.tableName}: ${error.message}`);
    }
  }

  // Paginated find
  async paginate(conditions = {}, page = 1, limit = 10, orderBy = 'id', order = 'asc') {
    try {
      const offset = (page - 1) * limit;
      const total = await this.count(conditions);
      const data = await this.findAll(conditions, { limit, offset, orderBy, order });
      
      return {
        data,
        pagination: {
          current_page: page,
          per_page: limit,
          total,
          total_pages: Math.ceil(total / limit),
          from: offset + 1,
          to: offset + data.length
        }
      };
    } catch (error) {
      throw new Error(`Error paginating ${this.tableName}: ${error.message}`);
    }
  }

  // Custom query builder
  query() {
    return this.knex(this.tableName);
  }

  // Transaction support
  async transaction(callback) {
    try {
      return await this.knex.transaction(callback);
    } catch (error) {
      throw new Error(`Transaction error: ${error.message}`);
    }
  }
}

module.exports = BaseModel;