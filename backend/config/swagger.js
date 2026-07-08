const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MalabarBazaar Business Builder API',
      version: '1.0.0',
      description: 'Comprehensive API for the Business Builder module including business management, mini apps, invoices, payments, and more.',
      contact: {
        name: 'API Support',
        email: 'support@malabarbazaar.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.malabarbazaar.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      schemas: {
        Business: {
          type: 'object',
          required: ['businessName', 'businessType', 'phone', 'email'],
          properties: {
            businessId: {
              type: 'string',
              description: 'Unique business identifier'
            },
            businessName: {
              type: 'string',
              description: 'Name of the business'
            },
            businessType: {
              type: 'string',
              enum: ['Retail', 'Service', 'Food', 'Education', 'Health', 'Travel', 'RealEstate', 'Beauty', 'Fitness', 'Other'],
              description: 'Type of business'
            },
            phone: {
              type: 'string',
              pattern: '^[6-9]\\d{9}$',
              description: 'Indian mobile number'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Business email'
            },
            website: {
              type: 'string',
              format: 'uri',
              description: 'Business website URL'
            },
            gstin: {
              type: 'string',
              pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$',
              description: 'GST identification number'
            },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                pincode: { type: 'string', pattern: '^[1-9][0-9]{5}$' },
                country: { type: 'string', default: 'India' }
              }
            },
            primaryColor: {
              type: 'string',
              description: 'Brand primary color (hex)'
            },
            secondaryColor: {
              type: 'string',
              description: 'Brand secondary color (hex)'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        MiniApp: {
          type: 'object',
          required: ['appName', 'slug', 'appType', 'businessId'],
          properties: {
            miniAppId: {
              type: 'string',
              description: 'Unique mini app identifier'
            },
            businessId: {
              type: 'string',
              description: 'Associated business ID'
            },
            appName: {
              type: 'string',
              description: 'Display name of the mini app'
            },
            slug: {
              type: 'string',
              pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
              description: 'URL-friendly identifier'
            },
            appType: {
              type: 'string',
              enum: ['Business Card', 'Product Showcase', 'Service Booking', 'Store Locator', 'Contact Form'],
              description: 'Type of mini app'
            },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'inactive'],
              default: 'active'
            },
            description: {
              type: 'string'
            },
            branding: {
              type: 'object',
              properties: {
                primaryColor: { type: 'string' },
                secondaryColor: { type: 'string' },
                logo: { type: 'string', format: 'uri' },
                banner: { type: 'string', format: 'uri' }
              }
            }
          }
        },
        Invoice: {
          type: 'object',
          required: ['businessId', 'customer', 'items', 'dueDate'],
          properties: {
            invoiceId: {
              type: 'string',
              description: 'Unique invoice identifier'
            },
            invoiceNumber: {
              type: 'string',
              description: 'Human-readable invoice number'
            },
            businessId: {
              type: 'string'
            },
            customer: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                phone: { type: 'string' },
                email: { type: 'string', format: 'email' },
                gstin: { type: 'string' },
                address: { type: 'string' }
              }
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  quantity: { type: 'number' },
                  unitPrice: { type: 'number' },
                  total: { type: 'number' },
                  hsnCode: { type: 'string' }
                }
              }
            },
            subtotal: {
              type: 'number'
            },
            tax: {
              type: 'number'
            },
            discount: {
              type: 'number'
            },
            totalAmount: {
              type: 'number'
            },
            status: {
              type: 'string',
              enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled']
            },
            dueDate: {
              type: 'string',
              format: 'date'
            }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            razorpayOrderId: { type: 'string' },
            razorpayPaymentId: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string', default: 'INR' },
            status: {
              type: 'string',
              enum: ['created', 'authorized', 'captured', 'refunded', 'failed', 'cancelled']
            },
            method: {
              type: 'string',
              enum: ['card', 'netbanking', 'wallet', 'upi']
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              default: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            error: {
              type: 'string',
              description: 'Technical error details'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              default: true
            },
            message: {
              type: 'string'
            },
            data: {
              type: 'object'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Business',
        description: 'Business management operations'
      },
      {
        name: 'Mini Apps',
        description: 'Mini application management'
      },
      {
        name: 'Invoices',
        description: 'Invoice generation and management'
      },
      {
        name: 'Payments',
        description: 'Payment processing with Razorpay'
      },
      {
        name: 'File Upload',
        description: 'File and image upload operations'
      },
      {
        name: 'QR Codes',
        description: 'QR code generation'
      },
      {
        name: 'Webhooks',
        description: 'Webhook management and testing'
      },
      {
        name: 'Audit Logs',
        description: 'Audit trail and compliance'
      },
      {
        name: 'Export',
        description: 'Data export to CSV, Excel, PDF'
      }
    ]
  },
  apis: ['./routes/*.js'] // Path to API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
