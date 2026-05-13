const businessServicesRouter = require('../routes/businessServices');

const {
  parseMultipartJsonField,
  normalizeCreateOrderBody,
  createOrderSchema,
  statusUpdateSchema,
} = businessServicesRouter.__private__;

describe('businessServices route helpers', () => {
  test('parseMultipartJsonField parses JSON strings', () => {
    const parsed = parseMultipartJsonField('{"name":"Acme"}', 'formData');
    expect(parsed).toEqual({ name: 'Acme' });
  });

  test('parseMultipartJsonField throws 400 on invalid JSON', () => {
    expect(() => parseMultipartJsonField('{invalid-json}', 'pricing')).toThrow('pricing must be a valid JSON object.');
    try {
      parseMultipartJsonField('{invalid-json}', 'pricing');
    } catch (error) {
      expect(error.statusCode).toBe(400);
    }
  });

  test('normalizeCreateOrderBody converts multipart payload fields', () => {
    const normalized = normalizeCreateOrderBody({
      categoryId: 'gst-services',
      serviceId: 'gst-registration',
      pricing: '{"priceText":"₹1,500","priceNumber":1500,"durationText":"3-5 days"}',
      formData: '{"name":"Demo User","email":"demo@example.com"}',
      estimatedCompletion: '',
    });

    expect(normalized.pricing).toEqual({
      priceText: '₹1,500',
      priceNumber: 1500,
      durationText: '3-5 days',
    });
    expect(normalized.formData).toEqual({
      name: 'Demo User',
      email: 'demo@example.com',
    });
    expect(normalized.estimatedCompletion).toBeNull();
  });

  test('createOrderSchema validates parsed payload', () => {
    const normalized = normalizeCreateOrderBody({
      categoryId: 'gst-services',
      categoryName: 'GST Registration / Filing',
      serviceId: 'gst-registration',
      serviceName: 'GST Registration',
      isStarterPackage: 'false',
      pricing: '{"priceText":"₹1,500","priceNumber":1500,"durationText":"3-5 days"}',
      formData: '{"name":"Demo User","email":"demo@example.com","phone":"9999999999"}',
      requirements: '',
      estimatedCompletion: '2026-05-13T00:00:00.000Z',
    });

    const { error } = createOrderSchema.validate(normalized, { stripUnknown: true });
    expect(error).toBeUndefined();
  });

  test('statusUpdateSchema only allows supported status values', () => {
    const good = statusUpdateSchema.validate({ status: 'processing' });
    const bad = statusUpdateSchema.validate({ status: 'documents-pending' });

    expect(good.error).toBeUndefined();
    expect(bad.error).toBeDefined();
  });
});
