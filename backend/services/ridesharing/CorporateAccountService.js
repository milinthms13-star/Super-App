/**
 * CorporateAccountService.js
 * Phase 7: Corporate Account Management
 * Manage corporate accounts with employees, budgets, and approval workflows
 */

const CorporateAccount = require('../../models/CorporateAccount');
const Employee = require('../../models/Employee');
const CorporateBudget = require('../../models/CorporateBudget');
const RiderProfile = require('../../models/RiderProfile');

class CorporateAccountService {
  /**
   * Create corporate account
   */
  static async createCorporateAccount(companyData) {
    try {
      const {
        companyName,
        registrationNumber,
        email,
        phone,
        adminName,
        adminEmail,
        adminPhone,
        address,
        city,
        state,
        zipCode,
        employees,
        monthlyBudget,
        industryType,
      } = companyData;

      // Validation
      if (!companyName || !registrationNumber || !adminEmail) {
        return {
          success: false,
          message: 'Missing required fields',
        };
      }

      // Create corporate account
      const account = new CorporateAccount({
        companyName,
        registrationNumber,
        email,
        phone,
        adminName,
        adminEmail,
        adminPhone,
        address: {
          street: address,
          city,
          state,
          zipCode,
        },
        employees: [],
        monthlyBudget,
        budgetUsed: 0,
        industryType,
        status: 'pending_approval',
        accountSettings: {
          requireApproval: true,
          autoAssignDriver: true,
          enableEmployeeTracking: true,
          allowScheduledBooking: true,
        },
        createdAt: new Date(),
      });

      await account.save();

      return {
        success: true,
        message: 'Corporate account created (pending approval)',
        data: {
          accountId: account._id,
          companyName: account.companyName,
          status: account.status,
          adminEmail: account.adminEmail,
        },
      };
    } catch (error) {
      throw new Error(`Error creating corporate account: ${error.message}`);
    }
  }

  /**
   * Get corporate account details
   */
  static async getCorporateAccount(accountId) {
    try {
      const account = await CorporateAccount.findById(accountId)
        .populate('employees', 'firstName lastName email phone employeeId')
        .lean();

      if (!account) {
        throw new Error('Corporate account not found');
      }

      // Calculate budget utilization
      const utilization = account.monthlyBudget > 0
        ? ((account.budgetUsed / account.monthlyBudget) * 100).toFixed(2)
        : 0;

      return {
        success: true,
        data: {
          ...account,
          budgetUtilization: utilization,
          remainingBudget: account.monthlyBudget - account.budgetUsed,
        },
      };
    } catch (error) {
      throw new Error(`Error retrieving corporate account: ${error.message}`);
    }
  }

  /**
   * Add employee to corporate account
   */
  static async addEmployee(accountId, employeeData) {
    try {
      const account = await CorporateAccount.findById(accountId);

      if (!account) {
        throw new Error('Corporate account not found');
      }

      if (account.status !== 'active') {
        return {
          success: false,
          message: 'Account must be active to add employees',
        };
      }

      const {
        firstName,
        lastName,
        email,
        phone,
        employeeId,
        department,
        designation,
        manager,
        costCenter,
      } = employeeData;

      // Create employee
      const employee = new Employee({
        corporateAccountId: accountId,
        firstName,
        lastName,
        email,
        phone,
        employeeId,
        department,
        designation,
        manager,
        costCenter,
        ridingProfile: {
          totalRides: 0,
          totalSpent: 0,
          averageRating: 0,
        },
        approvalStatus: 'pending',
        joinedAt: new Date(),
      });

      await employee.save();

      // Add to corporate account
      account.employees.push(employee._id);
      account.totalEmployees = account.employees.length;
      await account.save();

      return {
        success: true,
        message: 'Employee added successfully',
        data: {
          employeeId: employee._id,
          name: `${firstName} ${lastName}`,
          email,
          status: 'pending',
        },
      };
    } catch (error) {
      throw new Error(`Error adding employee: ${error.message}`);
    }
  }

  /**
   * Get all employees in corporate account
   */
  static async getEmployees(accountId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const employees = await Employee.find({
        corporateAccountId: accountId,
      })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await Employee.countDocuments({
        corporateAccountId: accountId,
      });

      return {
        success: true,
        data: employees,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error retrieving employees: ${error.message}`);
    }
  }

  /**
   * Approve or reject employee
   */
  static async approveEmployee(accountId, employeeId, approved = true) {
    try {
      const employee = await Employee.findById(employeeId);

      if (!employee) {
        throw new Error('Employee not found');
      }

      if (employee.corporateAccountId.toString() !== accountId) {
        throw new Error('Unauthorized');
      }

      employee.approvalStatus = approved ? 'approved' : 'rejected';
      employee.approvedAt = new Date();

      await employee.save();

      return {
        success: true,
        message: `Employee ${approved ? 'approved' : 'rejected'} successfully`,
        data: {
          employeeId: employee._id,
          status: employee.approvalStatus,
        },
      };
    } catch (error) {
      throw new Error(`Error approving employee: ${error.message}`);
    }
  }

  /**
   * Get employee riding profile
   */
  static async getEmployeeProfile(employeeId) {
    try {
      const employee = await Employee.findById(employeeId).lean();

      if (!employee) {
        throw new Error('Employee not found');
      }

      return {
        success: true,
        data: {
          employeeId: employee._id,
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          ridingProfile: employee.ridingProfile,
          department: employee.department,
          designation: employee.designation,
          joinedAt: employee.joinedAt,
        },
      };
    } catch (error) {
      throw new Error(`Error retrieving employee profile: ${error.message}`);
    }
  }

  /**
   * Update corporate account settings
   */
  static async updateAccountSettings(accountId, settings) {
    try {
      const account = await CorporateAccount.findById(accountId);

      if (!account) {
        throw new Error('Corporate account not found');
      }

      // Update allowed settings
      if (settings.requireApproval !== undefined) {
        account.accountSettings.requireApproval = settings.requireApproval;
      }
      if (settings.autoAssignDriver !== undefined) {
        account.accountSettings.autoAssignDriver = settings.autoAssignDriver;
      }
      if (settings.enableEmployeeTracking !== undefined) {
        account.accountSettings.enableEmployeeTracking = settings.enableEmployeeTracking;
      }
      if (settings.allowScheduledBooking !== undefined) {
        account.accountSettings.allowScheduledBooking = settings.allowScheduledBooking;
      }

      await account.save();

      return {
        success: true,
        message: 'Account settings updated successfully',
        data: account.accountSettings,
      };
    } catch (error) {
      throw new Error(`Error updating account settings: ${error.message}`);
    }
  }

  /**
   * Set monthly budget
   */
  static async setMonthlyBudget(accountId, monthlyBudget) {
    try {
      const account = await CorporateAccount.findById(accountId);

      if (!account) {
        throw new Error('Corporate account not found');
      }

      account.monthlyBudget = monthlyBudget;
      account.budgetUsed = 0; // Reset on new budget cycle
      account.budgetCycleStartDate = new Date();

      await account.save();

      return {
        success: true,
        message: 'Monthly budget updated',
        data: {
          monthlyBudget: account.monthlyBudget,
          budgetUsed: account.budgetUsed,
          remaining: monthlyBudget - account.budgetUsed,
        },
      };
    } catch (error) {
      throw new Error(`Error setting budget: ${error.message}`);
    }
  }

  /**
   * Get budget utilization report
   */
  static async getBudgetReport(accountId) {
    try {
      const account = await CorporateAccount.findById(accountId);

      if (!account) {
        throw new Error('Corporate account not found');
      }

      const utilization = account.monthlyBudget > 0
        ? ((account.budgetUsed / account.monthlyBudget) * 100).toFixed(2)
        : 0;

      return {
        success: true,
        data: {
          companyName: account.companyName,
          monthlyBudget: account.monthlyBudget,
          budgetUsed: account.budgetUsed,
          remaining: account.monthlyBudget - account.budgetUsed,
          utilization: utilization,
          cycle: {
            startDate: account.budgetCycleStartDate,
            endDate: new Date(
              account.budgetCycleStartDate.getTime() + 30 * 24 * 60 * 60 * 1000
            ),
          },
          warningLevel: utilization > 80,
        },
      };
    } catch (error) {
      throw new Error(`Error retrieving budget report: ${error.message}`);
    }
  }

  /**
   * Deactivate corporate account
   */
  static async deactivateAccount(accountId, reason = '') {
    try {
      const account = await CorporateAccount.findById(accountId);

      if (!account) {
        throw new Error('Corporate account not found');
      }

      account.status = 'inactive';
      account.deactivatedAt = new Date();
      account.deactivationReason = reason;

      await account.save();

      return {
        success: true,
        message: 'Corporate account deactivated',
        data: {
          accountId: account._id,
          status: account.status,
        },
      };
    } catch (error) {
      throw new Error(`Error deactivating account: ${error.message}`);
    }
  }

  /**
   * Get corporate account statistics
   */
  static async getAccountStatistics(accountId) {
    try {
      const account = await CorporateAccount.findById(accountId).populate('employees');

      if (!account) {
        throw new Error('Corporate account not found');
      }

      // Calculate statistics
      let totalRides = 0;
      let totalSpent = 0;
      let averageRating = 0;
      let ratingCount = 0;

      account.employees.forEach((emp) => {
        totalRides += emp.ridingProfile?.totalRides || 0;
        totalSpent += emp.ridingProfile?.totalSpent || 0;
        if (emp.ridingProfile?.averageRating) {
          averageRating += emp.ridingProfile.averageRating;
          ratingCount++;
        }
      });

      return {
        success: true,
        data: {
          companyName: account.companyName,
          totalEmployees: account.employees.length,
          activeEmployees: account.employees.filter(
            (e) => e.approvalStatus === 'approved'
          ).length,
          totalRides,
          totalSpent,
          averageRating: ratingCount > 0 ? (averageRating / ratingCount).toFixed(2) : 0,
          monthlyBudget: account.monthlyBudget,
          budgetUsed: account.budgetUsed,
          status: account.status,
        },
      };
    } catch (error) {
      throw new Error(`Error retrieving account statistics: ${error.message}`);
    }
  }

  /**
   * Get accounts list (admin)
   */
  static async getAccountsList(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const accounts = await CorporateAccount.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();

      const total = await CorporateAccount.countDocuments();

      return {
        success: true,
        data: accounts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error retrieving accounts list: ${error.message}`);
    }
  }

  /**
   * Approve corporate account (admin)
   */
  static async approveAccount(accountId) {
    try {
      const account = await CorporateAccount.findById(accountId);

      if (!account) {
        throw new Error('Corporate account not found');
      }

      account.status = 'active';
      account.approvedAt = new Date();

      await account.save();

      return {
        success: true,
        message: 'Corporate account approved',
        data: {
          accountId: account._id,
          status: account.status,
        },
      };
    } catch (error) {
      throw new Error(`Error approving account: ${error.message}`);
    }
  }

  /**
   * Remove employee from corporate account
   */
  static async removeEmployee(accountId, employeeId) {
    try {
      const account = await CorporateAccount.findById(accountId);
      const employee = await Employee.findById(employeeId);

      if (!account || !employee) {
        throw new Error('Account or employee not found');
      }

      if (employee.corporateAccountId.toString() !== accountId) {
        throw new Error('Unauthorized');
      }

      // Remove from account
      account.employees = account.employees.filter(
        (e) => e.toString() !== employeeId
      );
      account.totalEmployees = account.employees.length;
      await account.save();

      // Mark employee as inactive
      employee.status = 'inactive';
      await employee.save();

      return {
        success: true,
        message: 'Employee removed from corporate account',
      };
    } catch (error) {
      throw new Error(`Error removing employee: ${error.message}`);
    }
  }
}

module.exports = CorporateAccountService;
