/**
 * ExpenseTrackingService.js
 * Phase 7: Expense Tracking & Cost Analysis
 * Track corporate ride expenses, generate invoices, and manage cost centers
 */

const ExpenseReport = require('../../models/ExpenseReport');
const CorporateAccount = require('../../models/CorporateAccount');
const RideRequest = require('../../models/RideRequest');
const Employee = require('../../models/Employee');

class ExpenseTrackingService {
  /**
   * Get expense report for a date range
   */
  static async getExpenseReport(accountId, startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Find all rides in date range for this account
      const employees = await Employee.find({ corporateAccountId: accountId });
      const employeeIds = employees.map((e) => e._id);

      const rides = await RideRequest.find({
        riderId: { $in: employeeIds },
        completedAt: { $gte: start, $lte: end },
      });

      // Calculate totals
      const totalRides = rides.length;
      const totalExpense = rides.reduce((sum, ride) => sum + (ride.finalFare || 0), 0);
      const averageFare = totalRides > 0 ? (totalExpense / totalRides).toFixed(2) : 0;

      // Group by cost center
      const byCostCenter = {};
      const byEmployee = {};

      rides.forEach((ride) => {
        const cc = ride.costCenter || 'uncategorized';
        const empId = ride.riderId.toString();

        // By cost center
        if (!byCostCenter[cc]) {
          byCostCenter[cc] = {
            rides: 0,
            expense: 0,
          };
        }
        byCostCenter[cc].rides += 1;
        byCostCenter[cc].expense += ride.finalFare || 0;

        // By employee
        if (!byEmployee[empId]) {
          byEmployee[empId] = {
            rides: 0,
            expense: 0,
            employee: ride.riderId,
          };
        }
        byEmployee[empId].rides += 1;
        byEmployee[empId].expense += ride.finalFare || 0;
      });

      const report = new ExpenseReport({
        corporateAccountId: accountId,
        periodStart: start,
        periodEnd: end,
        totalRides,
        totalExpense: Math.round(totalExpense * 100) / 100,
        averageFare,
        byCostCenter,
        byEmployee: Object.values(byEmployee),
        generatedAt: new Date(),
      });

      await report.save();

      return {
        success: true,
        data: {
          reportId: report._id,
          periodStart: report.periodStart,
          periodEnd: report.periodEnd,
          totalRides: report.totalRides,
          totalExpense: report.totalExpense,
          averageFare: report.averageFare,
          byCostCenter: report.byCostCenter,
          generatedAt: report.generatedAt,
        },
      };
    } catch (error) {
      throw new Error(`Error generating expense report: ${error.message}`);
    }
  }

  /**
   * Get monthly expense summary
   */
  static async getMonthlyExpenseSummary(accountId, month, year) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const result = await this.getExpenseReport(accountId, startDate, endDate);

      return result;
    } catch (error) {
      throw new Error(`Error getting monthly summary: ${error.message}`);
    }
  }

  /**
   * Get employee expense details
   */
  static async getEmployeeExpenses(accountId, employeeId, startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Verify employee belongs to account
      const employee = await Employee.findById(employeeId);
      if (!employee || employee.corporateAccountId.toString() !== accountId) {
        throw new Error('Unauthorized');
      }

      // Get all rides for employee
      const rides = await RideRequest.find({
        riderId: employeeId,
        completedAt: { $gte: start, $lte: end },
      }).lean();

      const totalRides = rides.length;
      const totalExpense = rides.reduce((sum, ride) => sum + (ride.finalFare || 0), 0);
      const averageFare = totalRides > 0 ? (totalExpense / totalRides).toFixed(2) : 0;

      // Group by day
      const byDay = {};
      rides.forEach((ride) => {
        const day = ride.completedAt.toISOString().split('T')[0];
        if (!byDay[day]) {
          byDay[day] = {
            rides: 0,
            expense: 0,
          };
        }
        byDay[day].rides += 1;
        byDay[day].expense += ride.finalFare || 0;
      });

      return {
        success: true,
        data: {
          employee: {
            name: `${employee.firstName} ${employee.lastName}`,
            email: employee.email,
          },
          periodStart: start,
          periodEnd: end,
          totalRides,
          totalExpense: Math.round(totalExpense * 100) / 100,
          averageFare,
          byDay,
          rides: rides.map((r) => ({
            date: r.completedAt,
            fare: r.finalFare,
            distance: r.estimatedDistance,
            rideType: r.rideType,
          })),
        },
      };
    } catch (error) {
      throw new Error(`Error getting employee expenses: ${error.message}`);
    }
  }

  /**
   * Get cost center expenses
   */
  static async getCostCenterExpenses(accountId, costCenter, startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Get all employees in account
      const employees = await Employee.find({ corporateAccountId: accountId });
      const employeeIds = employees.map((e) => e._id);

      // Find all rides for cost center
      const rides = await RideRequest.find({
        riderId: { $in: employeeIds },
        costCenter,
        completedAt: { $gte: start, $lte: end },
      }).populate('riderId', 'firstName lastName email');

      const totalRides = rides.length;
      const totalExpense = rides.reduce((sum, ride) => sum + (ride.finalFare || 0), 0);

      // Top spenders
      const byEmployee = {};
      rides.forEach((ride) => {
        const empId = ride.riderId._id.toString();
        if (!byEmployee[empId]) {
          byEmployee[empId] = {
            employee: ride.riderId,
            rides: 0,
            expense: 0,
          };
        }
        byEmployee[empId].rides += 1;
        byEmployee[empId].expense += ride.finalFare || 0;
      });

      const topSpenders = Object.values(byEmployee)
        .sort((a, b) => b.expense - a.expense)
        .slice(0, 10);

      return {
        success: true,
        data: {
          costCenter,
          periodStart: start,
          periodEnd: end,
          totalRides,
          totalExpense: Math.round(totalExpense * 100) / 100,
          averageRideValue: totalRides > 0 ? (totalExpense / totalRides).toFixed(2) : 0,
          topSpenders,
        },
      };
    } catch (error) {
      throw new Error(`Error getting cost center expenses: ${error.message}`);
    }
  }

  /**
   * Generate invoice for expense period
   */
  static async generateInvoice(accountId, startDate, endDate) {
    try {
      const account = await CorporateAccount.findById(accountId);

      if (!account) {
        throw new Error('Corporate account not found');
      }

      // Get expense report
      const expenseResult = await this.getExpenseReport(accountId, startDate, endDate);

      if (!expenseResult.success) {
        throw new Error('Failed to generate expense report');
      }

      const expenseData = expenseResult.data;

      // Calculate invoice
      const invoiceNumber = `INV-${accountId.toString().slice(-6)}-${Date.now()}`;
      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      // GST calculation (assuming 18% GST)
      const subtotal = expenseData.totalExpense;
      const gstAmount = Math.round((subtotal * 0.18) * 100) / 100;
      const totalAmount = subtotal + gstAmount;

      const invoice = {
        invoiceNumber,
        accountId,
        companyName: account.companyName,
        email: account.email,
        phone: account.phone,
        address: account.address,
        invoiceDate,
        dueDate,
        periodStart: new Date(startDate),
        periodEnd: new Date(endDate),
        lineItems: [
          {
            description: `Ride-sharing services (${expenseData.totalRides} rides)`,
            quantity: expenseData.totalRides,
            unitPrice: expenseData.averageFare,
            amount: subtotal,
          },
        ],
        subtotal,
        tax: {
          name: 'GST',
          rate: 18,
          amount: gstAmount,
        },
        totalAmount,
        paymentTerms: 'Due within 30 days',
        notes: `Total rides: ${expenseData.totalRides}\nAverage fare: ₹${expenseData.averageFare}`,
      };

      return {
        success: true,
        data: invoice,
      };
    } catch (error) {
      throw new Error(`Error generating invoice: ${error.message}`);
    }
  }

  /**
   * Get budget vs actual analysis
   */
  static async getBudgetAnalysis(accountId) {
    try {
      const account = await CorporateAccount.findById(accountId);

      if (!account) {
        throw new Error('Corporate account not found');
      }

      // Get current month expenses
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const expenseResult = await this.getExpenseReport(accountId, startOfMonth, endOfMonth);

      if (!expenseResult.success) {
        return {
          success: false,
          message: 'Failed to retrieve expense data',
        };
      }

      const currentExpense = expenseResult.data.totalExpense;
      const monthlyBudget = account.monthlyBudget;
      const remaining = monthlyBudget - currentExpense;
      const utilization = (currentExpense / monthlyBudget * 100).toFixed(2);
      const daysInMonth = endOfMonth.getDate();
      const currentDay = now.getDate();
      const expectedUsage = (monthlyBudget * (currentDay / daysInMonth)).toFixed(2);
      const onTrack = currentExpense <= expectedUsage;

      return {
        success: true,
        data: {
          monthlyBudget,
          currentExpense,
          remaining,
          utilization,
          expectedUsage: parseFloat(expectedUsage),
          onTrack,
          forecastedOverage: onTrack ? 0 : (currentExpense - monthlyBudget).toFixed(2),
          currentDay,
          daysInMonth,
        },
      };
    } catch (error) {
      throw new Error(`Error getting budget analysis: ${error.message}`);
    }
  }

  /**
   * Get expense trends (last 6 months)
   */
  static async getExpenseTrends(accountId) {
    try {
      const trends = [];

      for (let i = 5; i >= 0; i--) {
        const month = new Date();
        month.setMonth(month.getMonth() - i);

        const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
        const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

        const expenseResult = await this.getExpenseReport(accountId, startDate, endDate);

        trends.push({
          month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          expense: expenseResult.data?.totalExpense || 0,
          rides: expenseResult.data?.totalRides || 0,
        });
      }

      // Calculate growth rate
      const latestExpense = trends[trends.length - 1].expense;
      const previousExpense = trends[trends.length - 2].expense;
      const growthRate = previousExpense > 0
        ? (((latestExpense - previousExpense) / previousExpense) * 100).toFixed(2)
        : 0;

      return {
        success: true,
        data: {
          trends,
          growthRate,
          averageMonthlyExpense: (trends.reduce((sum, t) => sum + t.expense, 0) / trends.length).toFixed(2),
        },
      };
    } catch (error) {
      throw new Error(`Error getting expense trends: ${error.message}`);
    }
  }

  /**
   * Export expense data to CSV
   */
  static async exportExpenseData(accountId, startDate, endDate) {
    try {
      const expenseResult = await this.getExpenseReport(accountId, startDate, endDate);

      if (!expenseResult.success) {
        throw new Error('Failed to retrieve expense data');
      }

      const data = expenseResult.data;

      // Generate CSV
      let csv = 'Expense Report\n';
      csv += `Period: ${data.periodStart} to ${data.periodEnd}\n`;
      csv += `Generated: ${data.generatedAt}\n\n`;
      csv += `Total Rides,${data.totalRides}\n`;
      csv += `Total Expense,₹${data.totalExpense}\n`;
      csv += `Average Fare,₹${data.averageFare}\n\n`;
      csv += 'By Cost Center\n';
      csv += 'Cost Center,Rides,Expense\n';

      Object.entries(data.byCostCenter).forEach(([cc, details]) => {
        csv += `${cc},${details.rides},₹${details.expense}\n`;
      });

      return {
        success: true,
        data: {
          csv,
          fileName: `expense-report-${accountId}-${Date.now()}.csv`,
        },
      };
    } catch (error) {
      throw new Error(`Error exporting expense data: ${error.message}`);
    }
  }

  /**
   * Get department-wise expenses
   */
  static async getDepartmentExpenses(accountId, startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Get all employees in account
      const employees = await Employee.find({ corporateAccountId: accountId }).lean();

      // Get all rides
      const employeeIds = employees.map((e) => e._id);
      const rides = await RideRequest.find({
        riderId: { $in: employeeIds },
        completedAt: { $gte: start, $lte: end },
      });

      // Group by department
      const byDepartment = {};

      employees.forEach((emp) => {
        const dept = emp.department || 'uncategorized';
        if (!byDepartment[dept]) {
          byDepartment[dept] = {
            employees: 0,
            rides: 0,
            expense: 0,
          };
        }
        byDepartment[dept].employees += 1;
      });

      rides.forEach((ride) => {
        const emp = employees.find((e) => e._id.toString() === ride.riderId.toString());
        if (emp) {
          const dept = emp.department || 'uncategorized';
          byDepartment[dept].rides += 1;
          byDepartment[dept].expense += ride.finalFare || 0;
        }
      });

      return {
        success: true,
        data: {
          periodStart: start,
          periodEnd: end,
          byDepartment,
        },
      };
    } catch (error) {
      throw new Error(`Error getting department expenses: ${error.message}`);
    }
  }
}

module.exports = ExpenseTrackingService;
