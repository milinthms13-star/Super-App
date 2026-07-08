const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const logger = require('../utils/logger');
const FinanceLead = require('../models/FinanceLead');
const fs = require('fs').promises;
const path = require('path');

class ReportingService {
  /**
   * Generate lead report as PDF
   */
  async generateLeadReportPDF(leadId) {
    try {
      const lead = await FinanceLead.findOne({ leadId })
        .populate('consultant', 'name email phone')
        .populate('institution', 'name')
        .lean();

      if (!lead) {
        throw new Error('Lead not found');
      }

      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve({
            success: true,
            buffer: pdfBuffer,
            filename: `Lead_Report_${leadId}.pdf`,
          });
        });

        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('Loan Application Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        // Lead Information
        doc.fontSize(14).text('Application Details', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Lead ID: ${lead.leadId}`);
        doc.text(`Applicant Name: ${lead.fullName}`);
        doc.text(`Phone: ${lead.phone}`);
        doc.text(`Loan Category: ${lead.loanCategory}`);
        doc.text(`Loan Amount: ₹${lead.amount.toLocaleString()}`);
        doc.text(`Preferred Tenure: ${lead.preferredTenureMonths} months`);
        doc.text(`Status: ${lead.status}`);
        doc.text(`Applied On: ${new Date(lead.createdAt).toLocaleString()}`);
        doc.moveDown(1);

        // Eligibility Snapshot
        if (lead.eligibilitySnapshot) {
          doc.fontSize(14).text('Eligibility Information', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);
          doc.text(`CIBIL Score: ${lead.eligibilitySnapshot.cibilScore || 'N/A'}`);
          doc.text(`Monthly Income: ₹${(lead.eligibilitySnapshot.monthlyIncome || 0).toLocaleString()}`);
          doc.text(`Existing EMI: ₹${(lead.eligibilitySnapshot.existingEmi || 0).toLocaleString()}`);
          doc.text(`Employment Type: ${lead.eligibilitySnapshot.employmentType || 'N/A'}`);
          doc.text(`State: ${lead.eligibilitySnapshot.state || 'N/A'}`);
          doc.text(`District: ${lead.eligibilitySnapshot.district || 'N/A'}`);
          doc.moveDown(1);
        }

        // Consultant Information
        if (lead.consultant) {
          doc.fontSize(14).text('Assigned Consultant', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);
          doc.text(`Name: ${lead.consultant.name}`);
          doc.text(`Email: ${lead.consultant.email}`);
          doc.text(`Phone: ${lead.consultant.phone}`);
          doc.moveDown(1);
        }

        // Institution Information
        if (lead.institution) {
          doc.fontSize(14).text('Financial Institution', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);
          doc.text(`Name: ${lead.institution.name}`);
          doc.moveDown(1);
        }

        // Status Timeline
        if (lead.statusTimeline && lead.statusTimeline.length > 0) {
          doc.fontSize(14).text('Status Timeline', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);
          lead.statusTimeline.forEach((item, index) => {
            doc.text(
              `${index + 1}. ${item.status} - ${new Date(item.timestamp).toLocaleString()}${
                item.note ? ` (${item.note})` : ''
              }`
            );
          });
          doc.moveDown(1);
        }

        // Documents
        doc.fontSize(14).text('Uploaded Documents', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        const docTypes = ['aadhaar', 'pan', 'salarySlips', 'bankStatements', 'businessProof', 'other'];
        docTypes.forEach((type) => {
          const docs = lead.documents?.[type] || [];
          if (docs.length > 0) {
            doc.text(`${type.toUpperCase()}: ${docs.length} file(s)`);
          }
        });

        // Footer
        doc.moveDown(2);
        doc.fontSize(8).text('This is a system-generated report from Malabar Bazaar Finance', {
          align: 'center',
          color: 'gray',
        });

        doc.end();
      });
    } catch (error) {
      logger.error(`PDF generation error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate leads export as Excel
   */
  async generateLeadsExcel(filters = {}) {
    try {
      const query = this.buildQueryFromFilters(filters);
      const leads = await FinanceLead.find(query)
        .populate('consultant', 'name email')
        .populate('institution', 'name')
        .sort({ createdAt: -1 })
        .limit(filters.limit || 1000)
        .lean();

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Leads');

      // Define columns
      worksheet.columns = [
        { header: 'Lead ID', key: 'leadId', width: 20 },
        { header: 'Full Name', key: 'fullName', width: 25 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Loan Category', key: 'loanCategory', width: 20 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Tenure (Months)', key: 'tenure', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'CIBIL Score', key: 'cibilScore', width: 12 },
        { header: 'Monthly Income', key: 'monthlyIncome', width: 15 },
        { header: 'State', key: 'state', width: 15 },
        { header: 'District', key: 'district', width: 15 },
        { header: 'Consultant', key: 'consultantName', width: 20 },
        { header: 'Institution', key: 'institutionName', width: 25 },
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Updated At', key: 'updatedAt', width: 20 },
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

      // Add data rows
      leads.forEach((lead) => {
        worksheet.addRow({
          leadId: lead.leadId,
          fullName: lead.fullName,
          phone: lead.phone,
          loanCategory: lead.loanCategory,
          amount: lead.amount,
          tenure: lead.preferredTenureMonths,
          status: lead.status,
          cibilScore: lead.eligibilitySnapshot?.cibilScore || '',
          monthlyIncome: lead.eligibilitySnapshot?.monthlyIncome || '',
          state: lead.eligibilitySnapshot?.state || '',
          district: lead.eligibilitySnapshot?.district || '',
          consultantName: lead.consultant?.name || '',
          institutionName: lead.institution?.name || '',
          createdAt: new Date(lead.createdAt).toLocaleString(),
          updatedAt: new Date(lead.updatedAt).toLocaleString(),
        });
      });

      // Add summary sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 },
      ];

      const statusCounts = {};
      const categoryCounts = {};
      let totalAmount = 0;

      leads.forEach((lead) => {
        statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
        categoryCounts[lead.loanCategory] = (categoryCounts[lead.loanCategory] || 0) + 1;
        totalAmount += lead.amount;
      });

      summarySheet.addRow({ metric: 'Total Leads', value: leads.length });
      summarySheet.addRow({ metric: 'Total Amount', value: `₹${totalAmount.toLocaleString()}` });
      summarySheet.addRow({ metric: 'Average Amount', value: `₹${Math.round(totalAmount / leads.length).toLocaleString()}` });
      summarySheet.addRow({ metric: '', value: '' });
      summarySheet.addRow({ metric: 'Status Breakdown', value: '' });
      Object.entries(statusCounts).forEach(([status, count]) => {
        summarySheet.addRow({ metric: `  ${status}`, value: count });
      });
      summarySheet.addRow({ metric: '', value: '' });
      summarySheet.addRow({ metric: 'Category Breakdown', value: '' });
      Object.entries(categoryCounts).forEach(([category, count]) => {
        summarySheet.addRow({ metric: `  ${category}`, value: count });
      });

      const buffer = await workbook.xlsx.writeBuffer();

      return {
        success: true,
        buffer,
        filename: `Leads_Export_${new Date().toISOString().split('T')[0]}.xlsx`,
      };
    } catch (error) {
      logger.error(`Excel generation error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate analytics report
   */
  async generateAnalyticsReport(startDate, endDate, format = 'json') {
    try {
      const query = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };

      const leads = await FinanceLead.find(query).lean();

      const analytics = {
        period: { startDate, endDate },
        overview: {
          totalLeads: leads.length,
          totalAmount: leads.reduce((sum, lead) => sum + lead.amount, 0),
          averageAmount: 0,
        },
        byStatus: {},
        byCategory: {},
        byState: {},
        byConsultant: {},
        byInstitution: {},
        conversionFunnel: {},
        timeline: [],
      };

      analytics.overview.averageAmount = Math.round(
        analytics.overview.totalAmount / leads.length || 0
      );

      // Group by status
      leads.forEach((lead) => {
        analytics.byStatus[lead.status] = (analytics.byStatus[lead.status] || 0) + 1;
      });

      // Group by category
      leads.forEach((lead) => {
        analytics.byCategory[lead.loanCategory] = (analytics.byCategory[lead.loanCategory] || 0) + 1;
      });

      // Group by state
      leads.forEach((lead) => {
        const state = lead.eligibilitySnapshot?.state || 'Unknown';
        analytics.byState[state] = (analytics.byState[state] || 0) + 1;
      });

      // Conversion funnel
      analytics.conversionFunnel = {
        submitted: leads.filter((l) => l.status === 'submitted').length,
        underReview: leads.filter((l) => l.status === 'under-review').length,
        documentsRequested: leads.filter((l) => l.status === 'documents-requested').length,
        institutionReview: leads.filter((l) => l.status === 'institution-review').length,
        approved: leads.filter((l) => l.status === 'approved').length,
        rejected: leads.filter((l) => l.status === 'rejected').length,
      };

      // Timeline (daily breakdown)
      const dailyCounts = {};
      leads.forEach((lead) => {
        const date = new Date(lead.createdAt).toISOString().split('T')[0];
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      });
      analytics.timeline = Object.entries(dailyCounts).map(([date, count]) => ({
        date,
        count,
      }));

      if (format === 'pdf') {
        return this.generateAnalyticsPDF(analytics);
      }

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      logger.error(`Analytics report error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate analytics as PDF
   */
  async generateAnalyticsPDF(analytics) {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve({
            success: true,
            buffer: pdfBuffer,
            filename: `Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`,
          });
        });

        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('Finance Analytics Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(
          `Period: ${analytics.period.startDate} to ${analytics.period.endDate}`,
          { align: 'center' }
        );
        doc.moveDown(2);

        // Overview
        doc.fontSize(14).text('Overview', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Total Leads: ${analytics.overview.totalLeads}`);
        doc.text(`Total Amount: ₹${analytics.overview.totalAmount.toLocaleString()}`);
        doc.text(`Average Amount: ₹${analytics.overview.averageAmount.toLocaleString()}`);
        doc.moveDown(1);

        // Status breakdown
        doc.fontSize(14).text('Status Breakdown', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        Object.entries(analytics.byStatus).forEach(([status, count]) => {
          const percentage = ((count / analytics.overview.totalLeads) * 100).toFixed(1);
          doc.text(`${status}: ${count} (${percentage}%)`);
        });
        doc.moveDown(1);

        // Category breakdown
        doc.fontSize(14).text('Loan Category Breakdown', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        Object.entries(analytics.byCategory).forEach(([category, count]) => {
          const percentage = ((count / analytics.overview.totalLeads) * 100).toFixed(1);
          doc.text(`${category}: ${count} (${percentage}%)`);
        });
        doc.moveDown(1);

        // Conversion funnel
        doc.fontSize(14).text('Conversion Funnel', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        Object.entries(analytics.conversionFunnel).forEach(([stage, count]) => {
          doc.text(`${stage}: ${count}`);
        });

        doc.end();
      });
    } catch (error) {
      logger.error(`Analytics PDF error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Build query from filters
   */
  buildQueryFromFilters(filters) {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.loanCategory) {
      query.loanCategory = filters.loanCategory;
    }

    if (filters.consultant) {
      query.consultant = filters.consultant;
    }

    if (filters.institution) {
      query.institution = filters.institution;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }

    if (filters.minAmount || filters.maxAmount) {
      query.amount = {};
      if (filters.minAmount) {
        query.amount.$gte = filters.minAmount;
      }
      if (filters.maxAmount) {
        query.amount.$lte = filters.maxAmount;
      }
    }

    return query;
  }
}

module.exports = new ReportingService();
