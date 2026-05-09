/**
 * Role-Based Access Control Model - Phase 10 Feature 5
 * RBAC and permission matrix enforcement
 */

const { Schema, model } = require('mongoose');

const RoleBasedAccessSchema = new Schema(
  {
    rbacId: {
      type: String,
      unique: true,
      index: true,
      description: 'Unique RBAC record ID',
    },
    roleId: {
      type: String,
      required: true,
      unique: true,
      description: 'Unique role identifier',
    },
    roleName: {
      type: String,
      required: true,
      enum: ['super_admin', 'admin', 'moderator', 'analyst', 'restaurant_admin', 'restaurant_manager', 'delivery_partner', 'customer'],
      description: 'Human-readable role name',
    },
    description: {
      type: String,
      description: 'Description of what this role can do',
    },
    permissions: {
      type: [{
        permissionId: String,
        permissionName: String,
        resource: String, // users, restaurants, orders, payments, etc.
        action: String, // create, read, update, delete, approve, reject
        level: Number, // 1-5, higher = more access
        conditions: Schema.Types.Mixed,
        approved: Boolean,
        approvalTime: Date,
      }],
      default: [],
      description: 'Array of permissions assigned to this role',
    },
    modules: {
      auth: { allowed: Boolean, canCreate: Boolean, canRead: Boolean, canUpdate: Boolean, canDelete: Boolean },
      users: { allowed: Boolean, canCreate: Boolean, canRead: Boolean, canUpdate: Boolean, canDelete: Boolean, canSuspend: Boolean, canBan: Boolean },
      restaurants: { allowed: Boolean, canCreate: Boolean, canRead: Boolean, canUpdate: Boolean, canDelete: Boolean, canApprove: Boolean },
      orders: { allowed: Boolean, canCreate: Boolean, canRead: Boolean, canUpdate: Boolean, canDelete: Boolean, canRefund: Boolean, canCancel: Boolean },
      payments: { allowed: Boolean, canRead: Boolean, canReconcile: Boolean, canRefund: Boolean },
      disputes: { allowed: Boolean, canRead: Boolean, canResolve: Boolean, canEscalate: Boolean },
      reports: { allowed: Boolean, canView: Boolean, canGenerate: Boolean, canExport: Boolean },
      settings: { allowed: Boolean, canView: Boolean, canModify: Boolean, canReset: Boolean },
      audit: { allowed: Boolean, canView: Boolean, canExport: Boolean },
      promos: { allowed: Boolean, canCreate: Boolean, canRead: Boolean, canUpdate: Boolean, canDelete: Boolean, canApprove: Boolean },
      categories: { allowed: Boolean, canCreate: Boolean, canRead: Boolean, canUpdate: Boolean, canDelete: Boolean },
    },
    apiEndpoints: {
      type: [{
        endpoint: String,
        method: String, // GET, POST, PUT, DELETE
        allowed: Boolean,
        rateLimit: Number,
      }],
      default: [],
      description: 'Specific API endpoints accessible by this role',
    },
    dataScope: {
      canViewAllData: Boolean,
      visibleResources: [String], // list of resource IDs visible to this role
      regionRestrictions: [String],
      timeRestrictions: {
        startTime: String,
        endTime: String,
        allowedDays: [String],
      },
    },
    approvalRequired: {
      type: [{
        actionType: String,
        requiresApproval: Boolean,
        approvalChain: [String], // roles that can approve
        minimumApprovals: Number,
      }],
      default: [],
    },
    sessionSettings: {
      maxConcurrentSessions: Number,
      sessionTimeout: Number, // in minutes
      requireMFA: Boolean,
      ipWhitelist: [String],
      ipBlacklist: [String],
    },
    auditLevel: {
      type: String,
      enum: ['none', 'basic', 'detailed', 'comprehensive'],
      default: 'basic',
      description: 'Level of activity logging for this role',
    },
    isActive: {
      type: Boolean,
      default: true,
      description: 'Whether role is currently active',
    },
    createdBy: {
      type: String,
      description: 'Admin who created this role',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: String,
      description: 'Admin who last updated this role',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    lastModified: {
      type: Date,
      description: 'Timestamp of last modification',
    },
    notes: {
      type: String,
      description: 'Additional notes about this role',
    },
  },
  { timestamps: true, collection: 'role_based_access' }
);

// Indexes
RoleBasedAccessSchema.index({ roleName: 1 });
RoleBasedAccessSchema.index({ isActive: 1 });

// Instance methods
RoleBasedAccessSchema.methods.hasPermission = function (resource, action) {
  return this.permissions.some(
    (p) => p.resource === resource && p.action === action && p.approved
  );
};

RoleBasedAccessSchema.methods.addPermission = function (permName, resource, action, level) {
  this.permissions.push({
    permissionId: `PERM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    permissionName: permName,
    resource,
    action,
    level,
  });
};

RoleBasedAccessSchema.methods.removePermission = function (permissionId) {
  this.permissions = this.permissions.filter((p) => p.permissionId !== permissionId);
};

RoleBasedAccessSchema.methods.canAccessEndpoint = function (endpoint, method) {
  return this.apiEndpoints.some((ep) => ep.endpoint === endpoint && ep.method === method && ep.allowed);
};

module.exports = model('RoleBasedAccess', RoleBasedAccessSchema);
