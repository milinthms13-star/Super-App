/**
 * RBAC Controller - Phase 10 REST Endpoints
 * Role-based access control management endpoints
 */

const { validationResult } = require('express-validator');
const RBACService = require('../services/RBACService');

class RBACController {
  async createRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { roleName, description, permissions, modules } = req.body;

      const result = await RBACService.createRole(roleName, description, permissions, modules);

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create role',
        errors: [error.message],
      });
    }
  }

  async getRoleDetails(req, res) {
    try {
      const { roleId } = req.params;

      const result = await RBACService.getRoleDetails(roleId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve role details',
        errors: [error.message],
      });
    }
  }

  async addPermission(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { roleId } = req.params;
      const { permissionName, resource, action, level } = req.body;

      const result = await RBACService.addPermissionToRole(roleId, permissionName, resource, action, level);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to add permission',
        errors: [error.message],
      });
    }
  }

  async removePermission(req, res) {
    try {
      const { roleId, permissionId } = req.params;

      const result = await RBACService.removePermissionFromRole(roleId, permissionId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to remove permission',
        errors: [error.message],
      });
    }
  }

  async checkPermission(req, res) {
    try {
      const { userId, resource, action } = req.body;

      const result = await RBACService.checkUserPermission(userId, resource, action);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to check permission',
        errors: [error.message],
      });
    }
  }

  async getAllRoles(req, res) {
    try {
      const filters = {
        limit: parseInt(req.query.limit) || 50,
        skip: parseInt(req.query.skip) || 0,
      };

      const result = await RBACService.getAllRoles(filters);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve roles',
        errors: [error.message],
      });
    }
  }

  async updatePermissions(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { roleId } = req.params;
      const { permissions } = req.body;

      const result = await RBACService.updateRolePermissions(roleId, permissions);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update permissions',
        errors: [error.message],
      });
    }
  }

  async deactivateRole(req, res) {
    try {
      const { roleId } = req.params;

      const result = await RBACService.deactivateRole(roleId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to deactivate role',
        errors: [error.message],
      });
    }
  }

  async reactivateRole(req, res) {
    try {
      const { roleId } = req.params;

      const result = await RBACService.reactivateRole(roleId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to reactivate role',
        errors: [error.message],
      });
    }
  }
}

module.exports = new RBACController();
