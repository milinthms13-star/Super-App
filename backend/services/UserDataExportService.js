/**
 * User Data Export Service - Phase 10 Business Logic
 * GDPR data export request processing
 */

const UserDataExport = require('../models/UserDataExport');

class UserDataExportService {
  async createExportRequest(userId, userEmail, format = 'json', scope = 'all', customFields = []) {
    try {
      const exportId = `EXPORT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const exportRequest = new UserDataExport({
        exportId,
        userId,
        userEmail,
        requestDate: new Date(),
        exportFormat: format,
        scope,
        customFields,
        status: 'pending',
      });

      await exportRequest.save();

      return {
        success: true,
        data: { exportId },
        message: 'Data export request created',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create export request',
        errors: [error.message],
      };
    }
  }

  async getExportStatus(exportId) {
    try {
      const exportRecord = await UserDataExport.findOne({ exportId });

      if (!exportRecord) {
        return { success: false, message: 'Export request not found', statusCode: 404 };
      }

      return {
        success: true,
        data: {
          exportId,
          status: exportRecord.status,
          requestDate: exportRecord.requestDate,
          processingStarted: exportRecord.processingStarted,
          processingCompleted: exportRecord.processingCompleted,
          processingDuration: exportRecord.processingDuration,
          downloadLink: exportRecord.downloadLink,
        },
        message: 'Export status retrieved',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve export status',
        errors: [error.message],
      };
    }
  }

  async startExportProcessing(exportId) {
    try {
      const exportRecord = await UserDataExport.findOne({ exportId });

      if (!exportRecord) {
        return { success: false, message: 'Export request not found', statusCode: 404 };
      }

      if (exportRecord.status !== 'pending') {
        return { success: false, message: 'Export is not in pending status', statusCode: 400 };
      }

      exportRecord.markAsProcessing();
      await exportRecord.save();

      return {
        success: true,
        data: { exportId },
        message: 'Export processing started',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to start export processing',
        errors: [error.message],
      };
    }
  }

  async completeExportProcessing(exportId, totalRecords, totalSize, fileName, checksum) {
    try {
      const exportRecord = await UserDataExport.findOne({ exportId });

      if (!exportRecord) {
        return { success: false, message: 'Export request not found', statusCode: 404 };
      }

      exportRecord.markAsCompleted(totalRecords, totalSize);
      exportRecord.exportedData.fileName = fileName;
      exportRecord.exportedData.checksum = checksum;

      // Generate download link
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7); // 7 days expiry

      exportRecord.downloadLink = {
        url: `/api/v1/data-export/download/${exportId}`,
        createdDate: new Date(),
        expiryDate,
        downloadCount: 0,
        maxDownloads: 5,
      };

      if (exportRecord.deliveryMethod === 'email') {
        exportRecord.emailDelivery.sent = true;
        exportRecord.emailDelivery.sentDate = new Date();
        exportRecord.emailDelivery.sentTo = exportRecord.userEmail;
      }

      await exportRecord.save();

      return {
        success: true,
        data: { exportId, downloadLink: exportRecord.downloadLink.url },
        message: 'Export processing completed',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to complete export processing',
        errors: [error.message],
      };
    }
  }

  async markExportAsFailed(exportId, reason) {
    try {
      const exportRecord = await UserDataExport.findOne({ exportId });

      if (!exportRecord) {
        return { success: false, message: 'Export request not found', statusCode: 404 };
      }

      exportRecord.markAsFailed(reason);

      if (exportRecord.canRetry()) {
        exportRecord.status = 'pending';
      }

      await exportRecord.save();

      return {
        success: true,
        data: { exportId, canRetry: exportRecord.canRetry() },
        message: 'Export marked as failed',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to mark export as failed',
        errors: [error.message],
      };
    }
  }

  async downloadExportFile(exportId, ipAddress) {
    try {
      const exportRecord = await UserDataExport.findOne({ exportId });

      if (!exportRecord) {
        return { success: false, message: 'Export request not found', statusCode: 404 };
      }

      if (exportRecord.status !== 'completed') {
        return { success: false, message: 'Export not ready for download', statusCode: 400 };
      }

      if (exportRecord.isLinkExpired()) {
        exportRecord.markAsExpired();
        await exportRecord.save();
        return { success: false, message: 'Download link expired', statusCode: 410 };
      }

      if (exportRecord.downloadLink.downloadCount >= exportRecord.downloadLink.maxDownloads) {
        return { success: false, message: 'Maximum downloads exceeded', statusCode: 429 };
      }

      exportRecord.markAsDownloaded(ipAddress);
      await exportRecord.save();

      // TODO: Return actual file data
      return {
        success: true,
        data: { exportId, downloadCount: exportRecord.downloadLink.downloadCount },
        message: 'Export file ready for download',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to download export file',
        errors: [error.message],
      };
    }
  }

  async getUserExports(userId, filters = {}) {
    try {
      const query = { userId };

      if (filters.status) query.status = filters.status;

      const exports = await UserDataExport.find(query)
        .sort({ requestDate: -1 })
        .limit(filters.limit || 20)
        .skip(filters.skip || 0);

      const total = await UserDataExport.countDocuments(query);

      return {
        success: true,
        data: { exports, total },
        message: 'User exports retrieved',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve user exports',
        errors: [error.message],
      };
    }
  }

  async cancelExportRequest(exportId) {
    try {
      const exportRecord = await UserDataExport.findOne({ exportId });

      if (!exportRecord) {
        return { success: false, message: 'Export request not found', statusCode: 404 };
      }

      if (['completed', 'failed', 'expired', 'cancelled'].includes(exportRecord.status)) {
        return { success: false, message: 'Cannot cancel export in this status', statusCode: 400 };
      }

      exportRecord.status = 'cancelled';
      await exportRecord.save();

      return {
        success: true,
        data: { exportId },
        message: 'Export request cancelled',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to cancel export request',
        errors: [error.message],
      };
    }
  }
}

module.exports = new UserDataExportService();
