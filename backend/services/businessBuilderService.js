const Business = require('../models/Business');
const Invoice = require('../models/Invoice');
const MiniApp = require('../models/MiniApp');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class BusinessBuilderService {
  // Business CRUD operations
  async createBusiness(userId, businessData) {
    try {
      const business = new Business({
        ...businessData,
        userId,
      });
      return await business.save();
    } catch (error) {
      throw new Error(`Failed to create business: ${error.message}`);
    }
  }

  async getBusinesses(userId) {
    try {
      return await Business.find({ userId }).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to fetch businesses: ${error.message}`);
    }
  }

  async getBusinessById(businessId, userId) {
    try {
      const business = await Business.findOne({ businessId, userId });
      if (!business) {
        throw new Error('Business not found');
      }
      return business;
    } catch (error) {
      throw new Error(`Failed to fetch business: ${error.message}`);
    }
  }

  async updateBusiness(businessId, userId, updateData) {
    try {
      const business = await Business.findOneAndUpdate(
        { businessId, userId },
        updateData,
        { new: true, runValidators: true }
      );
      if (!business) {
        throw new Error('Business not found');
      }
      return business;
    } catch (error) {
      throw new Error(`Failed to update business: ${error.message}`);
    }
  }

  async deleteBusiness(businessId, userId) {
    try {
      const business = await Business.findOneAndDelete({ businessId, userId });
      if (!business) {
        throw new Error('Business not found');
      }
      return business;
    } catch (error) {
      throw new Error(`Failed to delete business: ${error.message}`);
    }
  }

  // Business Plan Generation
  async generateBusinessPlan(businessId, userId) {
    try {
      const business = await this.getBusinessById(businessId, userId);

      const costSummary = business.getCostSummary();
      const eligibleSchemes = Business.getEligibleSchemes(
        business.businessType,
        costSummary.oneTimeInvestment,
        business.schemeProfile
      );

      const businessPlan = {
        summary: this.generateSummary(business, costSummary),
        marketAnalysis: this.generateMarketAnalysis(business),
        competitorAnalysis: this.generateCompetitorAnalysis(business),
        revenueModel: this.generateRevenueModel(business, costSummary),
        costEstimation: this.generateCostEstimation(costSummary),
        profitProjection: this.generateProfitProjection(costSummary),
        swot: this.generateSWOT(business),
        roadmap90: this.generateRoadmap90(business),
        roadmap180: this.generateRoadmap180(business),
        generatedAt: new Date(),
      };

      business.businessPlan = businessPlan;
      await business.save();

      return businessPlan;
    } catch (error) {
      throw new Error(`Failed to generate business plan: ${error.message}`);
    }
  }

  // Government Schemes
  async getEligibleSchemes(businessId, userId) {
    try {
      const business = await this.getBusinessById(businessId, userId);
      const costSummary = business.getCostSummary();

      return Business.getEligibleSchemes(
        business.businessType,
        costSummary.oneTimeInvestment,
        business.schemeProfile
      );
    } catch (error) {
      throw new Error(`Failed to get eligible schemes: ${error.message}`);
    }
  }

  // Checklist Management
  async updateChecklist(businessId, userId, checklistUpdates) {
    try {
      const business = await this.getBusinessById(businessId, userId);

      checklistUpdates.forEach(update => {
        const item = business.checklist.find(item => item.id === update.id);
        if (item) {
          item.completed = update.completed;
          if (update.completed) {
            item.completedAt = new Date();
          }
        }
      });

      await business.save();
      return business.checklist;
    } catch (error) {
      throw new Error(`Failed to update checklist: ${error.message}`);
    }
  }

  // Invoice CRUD operations
  async createInvoice(userId, invoiceData) {
    try {
      const business = await Business.findOne({
        businessId: invoiceData.businessId,
        userId
      });

      if (!business) {
        throw new Error('Business not found');
      }

      const invoiceNumber = await Invoice.getNextInvoiceNumber(business._id);

      const invoice = new Invoice({
        ...invoiceData,
        userId,
        businessId: business._id,
        invoiceNumber,
      });

      return await invoice.save();
    } catch (error) {
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  async getInvoices(userId, businessId = null) {
    try {
      const query = { userId };
      if (businessId) {
        const business = await Business.findOne({ businessId, userId });
        if (business) {
          query.businessId = business._id;
        }
      }

      return await Invoice.find(query)
        .populate('businessId', 'businessName businessType')
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to fetch invoices: ${error.message}`);
    }
  }

  async getInvoiceById(invoiceId, userId) {
    try {
      const invoice = await Invoice.findOne({ invoiceId, userId })
        .populate('businessId', 'businessName businessType address phone email gstin');

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      return invoice;
    } catch (error) {
      throw new Error(`Failed to fetch invoice: ${error.message}`);
    }
  }

  async updateInvoice(invoiceId, userId, updateData) {
    try {
      const invoice = await Invoice.findOneAndUpdate(
        { invoiceId, userId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      return invoice;
    } catch (error) {
      throw new Error(`Failed to update invoice: ${error.message}`);
    }
  }

  async deleteInvoice(invoiceId, userId) {
    try {
      const invoice = await Invoice.findOneAndDelete({ invoiceId, userId });
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      return invoice;
    } catch (error) {
      throw new Error(`Failed to delete invoice: ${error.message}`);
    }
  }

  // PDF Generation for Invoices
  async generateInvoicePDF(invoiceId, userId) {
    try {
      const invoice = await this.getInvoiceById(invoiceId, userId);
      const business = invoice.businessId;

      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {});

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.moveDown();

      // Invoice details
      doc.fontSize(12);
      doc.text(`Invoice Number: ${invoice.invoiceNumber}`);
      doc.text(`Date: ${invoice.createdAt.toDateString()}`);
      doc.text(`Due Date: ${invoice.dueDate.toDateString()}`);
      doc.moveDown();

      // Business details
      doc.text('From:', { underline: true });
      doc.text(business.businessName);
      if (business.address) {
        doc.text(business.formattedAddress);
      }
      doc.text(`Phone: ${business.phone}`);
      doc.text(`Email: ${business.email}`);
      if (business.gstin) {
        doc.text(`GSTIN: ${business.gstin}`);
      }
      doc.moveDown();

      // Customer details
      doc.text('Bill To:', { underline: true });
      doc.text(invoice.customer.name);
      if (invoice.customer.address) {
        doc.text(invoice.customer.address);
      }
      if (invoice.customer.phone) {
        doc.text(`Phone: ${invoice.customer.phone}`);
      }
      if (invoice.customer.email) {
        doc.text(`Email: ${invoice.customer.email}`);
      }
      if (invoice.customer.gstin) {
        doc.text(`GSTIN: ${invoice.customer.gstin}`);
      }
      doc.moveDown();

      // Items table
      const tableTop = doc.y;
      doc.text('Items:', { underline: true });
      doc.moveDown(0.5);

      const itemX = 50;
      const qtyX = 300;
      const priceX = 350;
      const totalX = 450;

      doc.text('Description', itemX, doc.y);
      doc.text('Qty', qtyX, doc.y);
      doc.text('Price', priceX, doc.y);
      doc.text('Total', totalX, doc.y);
      doc.moveDown();

      invoice.items.forEach(item => {
        doc.text(item.description, itemX, doc.y);
        doc.text(item.quantity.toString(), qtyX, doc.y);
        doc.text(`₹${item.unitPrice}`, priceX, doc.y);
        doc.text(`₹${item.total}`, totalX, doc.y);
        doc.moveDown();
      });

      doc.moveDown();
      doc.text(`Subtotal: ₹${invoice.subtotal}`);
      if (invoice.discount > 0) {
        doc.text(`Discount: ₹${invoice.discount}`);
      }
      doc.text(`Tax (${invoice.taxRate}%): ₹${invoice.taxAmount}`);
      doc.fontSize(14).text(`Total: ₹${invoice.totalAmount}`, { bold: true });

      if (invoice.notes) {
        doc.moveDown();
        doc.fontSize(10).text(`Notes: ${invoice.notes}`);
      }

      if (invoice.terms) {
        doc.moveDown();
        doc.fontSize(10).text(`Terms: ${invoice.terms}`);
      }

      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  // Mini App CRUD operations
  async createMiniApp(userId, miniAppData) {
    try {
      const business = await Business.findOne({
        businessId: miniAppData.businessId,
        userId
      });

      if (!business) {
        throw new Error('Business not found');
      }

      const miniApp = new MiniApp({
        ...miniAppData,
        userId,
        businessId: business._id,
      });

      const savedMiniApp = await miniApp.save();
      await savedMiniApp.generateQRData();

      return savedMiniApp;
    } catch (error) {
      throw new Error(`Failed to create mini app: ${error.message}`);
    }
  }

  async getMiniApps(userId, businessId = null) {
    try {
      const query = { userId };
      if (businessId) {
        const business = await Business.findOne({ businessId, userId });
        if (business) {
          query.businessId = business._id;
        }
      }

      return await MiniApp.find(query)
        .populate('businessId', 'businessName businessType')
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to fetch mini apps: ${error.message}`);
    }
  }

  async getMiniAppById(miniAppId, userId) {
    try {
      const miniApp = await MiniApp.findOne({ miniAppId, userId })
        .populate('businessId', 'businessName businessType address phone email gstin');

      if (!miniApp) {
        throw new Error('Mini app not found');
      }

      return miniApp;
    } catch (error) {
      throw new Error(`Failed to fetch mini app: ${error.message}`);
    }
  }

  async updateMiniApp(miniAppId, userId, updateData) {
    try {
      const miniApp = await MiniApp.findOneAndUpdate(
        { miniAppId, userId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!miniApp) {
        throw new Error('Mini app not found');
      }

      return miniApp;
    } catch (error) {
      throw new Error(`Failed to update mini app: ${error.message}`);
    }
  }

  async deleteMiniApp(miniAppId, userId) {
    try {
      const miniApp = await MiniApp.findOneAndDelete({ miniAppId, userId });
      if (!miniApp) {
        throw new Error('Mini app not found');
      }
      return miniApp;
    } catch (error) {
      throw new Error(`Failed to delete mini app: ${error.message}`);
    }
  }

  // Private helper methods for business plan generation
  generateSummary(business, costSummary) {
    return `${business.businessName} is a ${business.businessType.toLowerCase()} business located in ${business.address.city || 'India'}. The business requires an initial investment of ₹${costSummary.oneTimeInvestment.toLocaleString()} and expects monthly revenue of ₹${costSummary.expectedMonthlyRevenue.toLocaleString()}.`;
  }

  generateMarketAnalysis(business) {
    const markets = {
      Retail: 'Growing retail sector with increasing online presence',
      Service: 'Service industry with demand for professional services',
      Food: 'Food industry with focus on quality and hygiene',
      Education: 'Education sector with emphasis on skill development',
      Health: 'Healthcare sector with preventive care focus',
      Travel: 'Travel and tourism industry recovering post-pandemic',
      RealEstate: 'Real estate market with residential and commercial demand',
      Beauty: 'Beauty and wellness industry with premium services',
      Fitness: 'Fitness industry with health-conscious consumers',
      Other: 'Niche market with specialized demand',
    };

    return markets[business.businessType] || markets.Other;
  }

  generateCompetitorAnalysis(business) {
    return `Competition analysis for ${business.businessType.toLowerCase()} sector shows moderate competition with opportunities for differentiation through quality service, competitive pricing, and customer loyalty programs.`;
  }

  generateRevenueModel(business, costSummary) {
    return `Revenue model focuses on ${business.businessType.toLowerCase()} services with expected monthly revenue of ₹${costSummary.expectedMonthlyRevenue.toLocaleString()}. Primary revenue streams include direct sales and service fees.`;
  }

  generateCostEstimation(costSummary) {
    return `Initial investment: ₹${costSummary.oneTimeInvestment.toLocaleString()}, Monthly expenses: ₹${costSummary.monthlyExpenses.toLocaleString()}, Expected monthly profit: ₹${costSummary.monthlyProfit.toLocaleString()}.`;
  }

  generateProfitProjection(costSummary) {
    const projection = [];
    for (let month = 1; month <= 12; month++) {
      const cumulativeProfit = costSummary.monthlyProfit * month - (month === 1 ? costSummary.oneTimeInvestment : 0);
      projection.push(`Month ${month}: ₹${cumulativeProfit.toLocaleString()}`);
    }
    return projection.join(', ');
  }

  generateSWOT(business) {
    const swot = {
      strengths: ['Local market knowledge', 'Personalized service', 'Cost-effective operations'],
      weaknesses: ['Limited initial capital', 'Single location dependency', 'Market competition'],
      opportunities: ['Growing local economy', 'Digital marketing potential', 'Service expansion'],
      threats: ['Economic fluctuations', 'New market entrants', 'Changing customer preferences'],
    };
    return `Strengths: ${swot.strengths.join(', ')}. Weaknesses: ${swot.weaknesses.join(', ')}. Opportunities: ${swot.opportunities.join(', ')}. Threats: ${swot.threats.join(', ')}.`;
  }

  generateRoadmap90(business) {
    return 'Month 1-2: Business setup and registration, Month 3-4: Initial marketing and customer acquisition, Month 5-6: Service delivery optimization, Month 7-8: Customer feedback integration, Month 9-10: Revenue stabilization, Month 11-12: Expansion planning.';
  }

  generateRoadmap180(business) {
    return 'Year 1: Establish strong local presence and customer base, Year 2: Digital transformation, expand services, and consider additional locations. Focus on building brand reputation and sustainable growth.';
  }
}

module.exports = new BusinessBuilderService();