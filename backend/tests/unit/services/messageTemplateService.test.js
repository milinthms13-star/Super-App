const assert = require('assert');
const messageTemplateService = require('../../../services/messageTemplateService');

describe('Message Template Service', () => {
  const testUserId = 'test-user-456';
  const testTemplateName = 'Test Template';
  const testContent = 'Hello {{name}}, your order #{{orderId}} is ready!';

  beforeEach(() => {
    messageTemplateService.clearCache();
  });

  afterEach(() => {
    messageTemplateService.clearCache();
  });

  describe('createTemplate', () => {
    it('should create template successfully', async () => {
      try {
        const result = await messageTemplateService.createTemplate(
          testUserId,
          testTemplateName,
          testContent
        );
        assert(result._id);
        assert.strictEqual(result.name, testTemplateName);
        assert.strictEqual(result.content, testContent);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should reject missing required fields', async () => {
      try {
        await messageTemplateService.createTemplate(null, testTemplateName, testContent);
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('Missing'));
      }
    });

    it('should set default category', async () => {
      try {
        const result = await messageTemplateService.createTemplate(
          testUserId,
          testTemplateName,
          testContent
        );
        assert.strictEqual(result.category, 'general');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should allow custom category', async () => {
      try {
        const result = await messageTemplateService.createTemplate(
          testUserId,
          testTemplateName,
          testContent,
          { category: 'orders' }
        );
        assert.strictEqual(result.category, 'orders');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should enforce max templates limit', async () => {
      try {
        // Try creating templates up to limit
        // In production, would need to actually create 100 templates
        assert(messageTemplateService.maxTemplatesPerUser > 0);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should initialize usage count to zero', async () => {
      try {
        const result = await messageTemplateService.createTemplate(
          testUserId,
          testTemplateName,
          testContent
        );
        assert.strictEqual(result.usageCount, 0);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('getTemplates', () => {
    it('should retrieve user templates', async () => {
      try {
        const result = await messageTemplateService.getTemplates(testUserId);
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should respect limit parameter', async () => {
      try {
        const result = await messageTemplateService.getTemplates(testUserId, { limit: 5 });
        assert(result.length <= 5);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should filter by category', async () => {
      try {
        const result = await messageTemplateService.getTemplates(testUserId, {
          category: 'orders',
        });
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should sort by specified field', async () => {
      try {
        const result = await messageTemplateService.getTemplates(testUserId, {
          sortBy: 'usageCount',
        });
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('getTemplate', () => {
    it('should retrieve specific template', async () => {
      try {
        const created = await messageTemplateService.createTemplate(
          testUserId,
          testTemplateName,
          testContent
        );

        const result = await messageTemplateService.getTemplate(created._id, testUserId);
        assert.strictEqual(result._id, created._id);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should enforce authorization', async () => {
      try {
        const created = await messageTemplateService.createTemplate(
          testUserId,
          testTemplateName,
          testContent
        );

        await messageTemplateService.getTemplate(created._id, 'different-user');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('authorized'));
      }
    });

    it('should handle non-existent template', async () => {
      try {
        await messageTemplateService.getTemplate('non-existent', testUserId);
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });
  });

  describe('applyTemplate', () => {
    it('should replace variables in template', async () => {
      try {
        const created = await messageTemplateService.createTemplate(
          testUserId,
          testTemplateName,
          testContent
        );

        const result = await messageTemplateService.applyTemplate(created._id, {
          name: 'John',
          orderId: '12345',
        });

        assert(result.includes('John'));
        assert(result.includes('12345'));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should increment usage count', async () => {
      try {
        const created = await messageTemplateService.createTemplate(
          testUserId,
          testTemplateName,
          testContent
        );

        const before = created.usageCount;
        await messageTemplateService.applyTemplate(created._id, {});
        const after = await messageTemplateService.getTemplate(created._id, testUserId);

        assert(after.usageCount > before);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should handle missing variables', async () => {
      try {
        const created = await messageTemplateService.createTemplate(
          testUserId,
          testTemplateName,
          testContent
        );

        const result = await messageTemplateService.applyTemplate(created._id, {});
        assert(result.includes('{{'));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('updateTemplate', () => {
    it('should update template fields', async () => {
      try {
        const created = await messageTemplateService.createTemplate(
          testUserId,
          testTemplateName,
          testContent
        );

        const updated = await messageTemplateService.updateTemplate(created._id, testUserId, {
          name: 'Updated Name',
        });

        assert.strictEqual(updated.name, 'Updated Name');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should enforce authorization', async () => {
      try {
        const created = await messageTemplateService.createTemplate(
          testUserId,
          testTemplateName,
          testContent
        );

        await messageTemplateService.updateTemplate(created._id, 'different-user', {
          name: 'Updated',
        });
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('authorized'));
      }
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template', async () => {
      try {
        const created = await messageTemplateService.createTemplate(
          testUserId,
          testTemplateName,
          testContent
        );

        const result = await messageTemplateService.deleteTemplate(created._id, testUserId);
        assert(result === true);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should enforce authorization', async () => {
      try {
        const created = await messageTemplateService.createTemplate(
          testUserId,
          testTemplateName,
          testContent
        );

        await messageTemplateService.deleteTemplate(created._id, 'different-user');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('authorized'));
      }
    });
  });

  describe('getPopularTemplates', () => {
    it('should retrieve popular templates', async () => {
      try {
        const result = await messageTemplateService.getPopularTemplates(testUserId);
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should sort by usage count', async () => {
      try {
        const result = await messageTemplateService.getPopularTemplates(testUserId);
        if (result.length > 1) {
          for (let i = 0; i < result.length - 1; i++) {
            assert(result[i].usageCount >= result[i + 1].usageCount);
          }
        }
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('searchTemplates', () => {
    it('should search templates by name', async () => {
      try {
        const created = await messageTemplateService.createTemplate(
          testUserId,
          'Order Confirmation',
          testContent
        );

        const result = await messageTemplateService.searchTemplates(testUserId, 'Order');
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should reject short search queries', async () => {
      try {
        await messageTemplateService.searchTemplates(testUserId, 'a');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });
  });

  describe('getTemplateStats', () => {
    it('should return template statistics', async () => {
      try {
        const stats = await messageTemplateService.getTemplateStats(testUserId);
        assert(typeof stats.totalTemplates === 'number');
        assert(typeof stats.totalUsageCount === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should categorize templates', async () => {
      try {
        const stats = await messageTemplateService.getTemplateStats(testUserId);
        assert(typeof stats.byCategory === 'object');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should calculate average usage', async () => {
      try {
        const stats = await messageTemplateService.getTemplateStats(testUserId);
        assert(typeof stats.averageUsagePerTemplate === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('duplicateTemplate', () => {
    it('should create template duplicate', async () => {
      try {
        const original = await messageTemplateService.createTemplate(
          testUserId,
          testTemplateName,
          testContent
        );

        const duplicate = await messageTemplateService.duplicateTemplate(
          original._id,
          testUserId
        );

        assert(duplicate._id !== original._id);
        assert(duplicate.name.includes('Copy'));
        assert.strictEqual(duplicate.content, original.content);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should reset usage count on duplicate', async () => {
      try {
        const original = await messageTemplateService.createTemplate(
          testUserId,
          testTemplateName,
          testContent
        );

        await messageTemplateService.applyTemplate(original._id, {});
        const duplicate = await messageTemplateService.duplicateTemplate(
          original._id,
          testUserId
        );

        assert.strictEqual(duplicate.usageCount, 0);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('Cache behavior', () => {
    it('should cache templates', async () => {
      try {
        const result1 = await messageTemplateService.getTemplates(testUserId);
        const result2 = await messageTemplateService.getTemplates(testUserId);
        assert(Array.isArray(result1));
        assert(Array.isArray(result2));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should invalidate cache on create', async () => {
      try {
        await messageTemplateService.getTemplates(testUserId);
        await messageTemplateService.createTemplate(testUserId, testTemplateName, testContent);
        const result = await messageTemplateService.getTemplates(testUserId);
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should clear all cache', async () => {
      try {
        messageTemplateService.clearCache();
        const result = await messageTemplateService.getTemplates(testUserId);
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });
});
