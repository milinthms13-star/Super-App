const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const { Parser } = require('json2csv');

class ExportService {
  constructor() {
    this.exportsDir = path.join(__dirname, '../exports');
    this.ensureExportDir();
  }

  async ensureExportDir() {
    try {
      await fs.mkdir(this.exportsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating exports directory:', error);
    }
  }

  /**
   * Export data to CSV format
   * @param {Array} data - Data to export
   * @param {Array} fields - Field definitions
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result with file path
   */
  async exportToCSV(data, fields, options = {}) {
    try {
      const {
        filename = `export_${Date.now()}.csv`,
        delimiter = ',',
        withBOM = true
      } = options;

      const parser = new Parser({
        fields,
        delimiter,
        withBOM
      });

      const csv = parser.parse(data);

      const filePath = path.join(this.exportsDir, filename);
      await fs.writeFile(filePath, csv, 'utf8');

      return {
        success: true,
        format: 'csv',
        filename,
        filePath: path.relative(path.join(__dirname, '..'), filePath),
        url: `/exports/${filename}`,
        size: Buffer.byteLength(csv, 'utf8'),
        recordCount: data.length
      };
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw new Error(`Failed to export to CSV: ${error.message}`);
    }
  }

  /**
   * Export data to Excel format
   * @param {Array} data - Data to export
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result with file path
   */
  async exportToExcel(data, options = {}) {
    try {
      const {
        filename = `export_${Date.now()}.xlsx`,
        sheetName = 'Data',
        columns,
        title,
        includeTimestamp = true
      } = options;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      // Add title row if provided
      if (title) {
        worksheet.mergeCells('A1', `${String.fromCharCode(64 + columns.length)}1`);
        const titleRow = worksheet.getCell('A1');
        titleRow.value = title;
        titleRow.font = { size: 16, bold: true };
        titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 30;
      }

      // Add timestamp if requested
      let headerRow = title ? 3 : 1;
      if (includeTimestamp && title) {
        worksheet.mergeCells(`A2:${String.fromCharCode(64 + columns.length)}2`);
        const timestampCell = worksheet.getCell('A2');
        timestampCell.value = `Generated on: ${new Date().toLocaleString()}`;
        timestampCell.alignment = { horizontal: 'center' };
        timestampCell.font = { italic: true };
      }

      // Define columns
      worksheet.columns = columns;

      // Style header row
      const headerRowObj = worksheet.getRow(headerRow);
      headerRowObj.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRowObj.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      headerRowObj.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRowObj.height = 25;

      // Add data rows
      data.forEach((item, index) => {
        const row = worksheet.addRow(item);
        
        // Alternate row colors
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' }
          };
        }
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      });

      // Add borders to all cells
      worksheet.eachRow({ includeEmpty: false }, row => {
        row.eachCell({ includeEmpty: false }, cell => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      const filePath = path.join(this.exportsDir, filename);
      await workbook.xlsx.writeFile(filePath);

      const stats = await fs.stat(filePath);

      return {
        success: true,
        format: 'excel',
        filename,
        filePath: path.relative(path.join(__dirname, '..'), filePath),
        url: `/exports/${filename}`,
        size: stats.size,
        recordCount: data.length
      };
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw new Error(`Failed to export to Excel: ${error.message}`);
    }
  }

  /**
   * Export data to PDF format
   * @param {Array} data - Data to export
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result with file path
   */
  async exportToPDF(data, options = {}) {
    try {
      const {
        filename = `export_${Date.now()}.pdf`,
        title = 'Data Export',
        columns,
        pageSize = 'A4',
        orientation = 'landscape',
        fontSize = 10
      } = options;

      const filePath = path.join(this.exportsDir, filename);
      const doc = new PDFDocument({
        size: pageSize,
        layout: orientation,
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const writeStream = require('fs').createWriteStream(filePath);
      doc.pipe(writeStream);

      // Add title
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text(title, { align: 'center' })
         .moveDown();

      // Add timestamp
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' })
         .moveDown(2);

      // Calculate column widths
      const pageWidth = doc.page.width - 100;
      const columnWidth = pageWidth / columns.length;

      // Add table header
      let yPosition = doc.y;
      doc.fontSize(fontSize)
         .font('Helvetica-Bold');

      columns.forEach((column, index) => {
        const xPosition = 50 + (index * columnWidth);
        doc.rect(xPosition, yPosition, columnWidth, 25)
           .fillAndStroke('#4472C4', '#000000');
        
        doc.fillColor('#FFFFFF')
           .text(column.header, xPosition + 5, yPosition + 8, {
             width: columnWidth - 10,
             align: 'center'
           });
      });

      yPosition += 25;
      doc.fillColor('#000000').font('Helvetica');

      // Add data rows
      data.forEach((item, rowIndex) => {
        // Check if we need a new page
        if (yPosition > doc.page.height - 100) {
          doc.addPage();
          yPosition = 50;

          // Redraw header on new page
          doc.font('Helvetica-Bold');
          columns.forEach((column, index) => {
            const xPosition = 50 + (index * columnWidth);
            doc.rect(xPosition, yPosition, columnWidth, 25)
               .fillAndStroke('#4472C4', '#000000');
            
            doc.fillColor('#FFFFFF')
               .text(column.header, xPosition + 5, yPosition + 8, {
                 width: columnWidth - 10,
                 align: 'center'
               });
          });
          yPosition += 25;
          doc.fillColor('#000000').font('Helvetica');
        }

        // Alternate row colors
        const fillColor = rowIndex % 2 === 0 ? '#F2F2F2' : '#FFFFFF';

        columns.forEach((column, index) => {
          const xPosition = 50 + (index * columnWidth);
          doc.rect(xPosition, yPosition, columnWidth, 20)
             .fillAndStroke(fillColor, '#000000');

          const value = item[column.key] || '';
          doc.fillColor('#000000')
             .text(String(value), xPosition + 5, yPosition + 5, {
               width: columnWidth - 10,
               height: 20,
               ellipsis: true
             });
        });

        yPosition += 20;
      });

      // Add footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8)
           .text(
             `Page ${i + 1} of ${pageCount}`,
             50,
             doc.page.height - 30,
             { align: 'center' }
           );
      }

      doc.end();

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      const stats = await fs.stat(filePath);

      return {
        success: true,
        format: 'pdf',
        filename,
        filePath: path.relative(path.join(__dirname, '..'), filePath),
        url: `/exports/${filename}`,
        size: stats.size,
        recordCount: data.length
      };
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw new Error(`Failed to export to PDF: ${error.message}`);
    }
  }

  /**
   * Export businesses data
   * @param {Array} businesses - Businesses data
   * @param {string} format - Export format (csv, excel, pdf)
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result
   */
  async exportBusinesses(businesses, format = 'csv', options = {}) {
    try {
      const data = businesses.map(business => ({
        id: business._id || business.id,
        name: business.name,
        industry: business.industry,
        description: business.description,
        location: business.location,
        website: business.website,
        phone: business.contactInfo?.phone,
        email: business.contactInfo?.email,
        status: business.status,
        createdAt: new Date(business.createdAt).toLocaleDateString()
      }));

      const columns = [
        { key: 'id', header: 'ID', width: 25 },
        { key: 'name', header: 'Business Name', width: 30 },
        { key: 'industry', header: 'Industry', width: 20 },
        { key: 'location', header: 'Location', width: 25 },
        { key: 'phone', header: 'Phone', width: 15 },
        { key: 'email', header: 'Email', width: 30 },
        { key: 'status', header: 'Status', width: 15 },
        { key: 'createdAt', header: 'Created Date', width: 15 }
      ];

      const fields = columns.map(col => ({ label: col.header, value: col.key }));

      switch (format.toLowerCase()) {
        case 'csv':
          return await this.exportToCSV(data, fields, {
            filename: options.filename || `businesses_${Date.now()}.csv`
          });
        case 'excel':
        case 'xlsx':
          return await this.exportToExcel(data, {
            filename: options.filename || `businesses_${Date.now()}.xlsx`,
            sheetName: 'Businesses',
            columns,
            title: 'Business Directory'
          });
        case 'pdf':
          return await this.exportToPDF(data, {
            filename: options.filename || `businesses_${Date.now()}.pdf`,
            title: 'Business Directory',
            columns
          });
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Error exporting businesses:', error);
      throw new Error(`Failed to export businesses: ${error.message}`);
    }
  }

  /**
   * Export orders data
   * @param {Array} orders - Orders data
   * @param {string} format - Export format
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result
   */
  async exportOrders(orders, format = 'csv', options = {}) {
    try {
      const data = orders.map(order => ({
        orderNumber: order.orderNumber,
        businessName: order.businessId?.name || order.businessName,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        status: order.status,
        items: order.items?.length || 0,
        totalAmount: order.totalAmount,
        currency: order.currency || 'INR',
        paymentStatus: order.paymentStatus,
        createdAt: new Date(order.createdAt).toLocaleDateString(),
        updatedAt: new Date(order.updatedAt).toLocaleDateString()
      }));

      const columns = [
        { key: 'orderNumber', header: 'Order #', width: 20 },
        { key: 'businessName', header: 'Business', width: 25 },
        { key: 'customerName', header: 'Customer', width: 25 },
        { key: 'customerEmail', header: 'Email', width: 30 },
        { key: 'status', header: 'Status', width: 15 },
        { key: 'items', header: 'Items', width: 10 },
        { key: 'totalAmount', header: 'Amount', width: 15 },
        { key: 'currency', header: 'Currency', width: 10 },
        { key: 'paymentStatus', header: 'Payment', width: 15 },
        { key: 'createdAt', header: 'Created', width: 15 }
      ];

      const fields = columns.map(col => ({ label: col.header, value: col.key }));

      switch (format.toLowerCase()) {
        case 'csv':
          return await this.exportToCSV(data, fields, {
            filename: options.filename || `orders_${Date.now()}.csv`
          });
        case 'excel':
        case 'xlsx':
          return await this.exportToExcel(data, {
            filename: options.filename || `orders_${Date.now()}.xlsx`,
            sheetName: 'Orders',
            columns,
            title: 'Orders Report'
          });
        case 'pdf':
          return await this.exportToPDF(data, {
            filename: options.filename || `orders_${Date.now()}.pdf`,
            title: 'Orders Report',
            columns
          });
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Error exporting orders:', error);
      throw new Error(`Failed to export orders: ${error.message}`);
    }
  }

  /**
   * Export leads data
   * @param {Array} leads - Leads data
   * @param {string} format - Export format
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result
   */
  async exportLeads(leads, format = 'csv', options = {}) {
    try {
      const data = leads.map(lead => ({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        businessName: lead.businessId?.name || lead.businessName,
        source: lead.source,
        status: lead.status,
        score: lead.score || 0,
        notes: lead.notes,
        createdAt: new Date(lead.createdAt).toLocaleDateString()
      }));

      const columns = [
        { key: 'name', header: 'Name', width: 25 },
        { key: 'email', header: 'Email', width: 30 },
        { key: 'phone', header: 'Phone', width: 15 },
        { key: 'businessName', header: 'Business', width: 25 },
        { key: 'source', header: 'Source', width: 15 },
        { key: 'status', header: 'Status', width: 15 },
        { key: 'score', header: 'Score', width: 10 },
        { key: 'createdAt', header: 'Created', width: 15 }
      ];

      const fields = columns.map(col => ({ label: col.header, value: col.key }));

      switch (format.toLowerCase()) {
        case 'csv':
          return await this.exportToCSV(data, fields, {
            filename: options.filename || `leads_${Date.now()}.csv`
          });
        case 'excel':
        case 'xlsx':
          return await this.exportToExcel(data, {
            filename: options.filename || `leads_${Date.now()}.xlsx`,
            sheetName: 'Leads',
            columns,
            title: 'Leads Report'
          });
        case 'pdf':
          return await this.exportToPDF(data, {
            filename: options.filename || `leads_${Date.now()}.pdf`,
            title: 'Leads Report',
            columns
          });
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Error exporting leads:', error);
      throw new Error(`Failed to export leads: ${error.message}`);
    }
  }

  /**
   * Delete export file
   * @param {string} filename - File name to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteExport(filename) {
    try {
      const filePath = path.join(this.exportsDir, filename);
      await fs.unlink(filePath);
      return {
        success: true,
        message: 'Export file deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting export file:', error);
      throw new Error(`Failed to delete export file: ${error.message}`);
    }
  }

  /**
   * Clean up old export files
   * @param {number} daysToKeep - Number of days to keep files
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldExports(daysToKeep = 7) {
    try {
      const files = await fs.readdir(this.exportsDir);
      const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.exportsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtimeMs < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      return {
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} old export files`
      };
    } catch (error) {
      console.error('Error cleaning up exports:', error);
      throw new Error(`Failed to cleanup exports: ${error.message}`);
    }
  }
}

module.exports = new ExportService();
