/* global cy */
describe('Astrology go-live critical path', () => {
  const authUser = {
    id: 'astro-user-1',
    email: 'astro.user@example.com',
    name: 'Astro User',
    role: 'user',
    registrationType: 'user',
    preferences: { language: 'en' },
  };

  const publicAppData = {
    businessCategories: [],
    globeMartCategories: [],
    enabledModules: ['astrology'],
    registeredAccounts: [],
    moduleData: {
      ecommerceProducts: [],
      classifiedsListings: [],
      classifiedsMessages: [],
      classifiedsReports: [],
      realestateProperties: [],
      restaurants: [],
      rideOffers: [],
      conversations: [],
      matrimonialProfiles: [],
      socialMediaPosts: [],
      socialMediaStories: [],
    },
  };

  const signs = [
    { sign: 'aries', label: 'Aries', dateRange: 'Mar 21 - Apr 19', element: 'Fire', color: '#d66d4b', horoscope: 'Move with clarity.' },
    { sign: 'taurus', label: 'Taurus', dateRange: 'Apr 20 - May 20', element: 'Earth', color: '#6c8f4e', horoscope: 'Steady momentum wins.' },
  ];

  let bookings;

  const setupInterceptors = () => {
    cy.intercept('GET', '**/api/app-data/public', {
      statusCode: 200,
      body: { success: true, data: publicAppData },
    }).as('getPublicAppData');

    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: { success: true, user: authUser },
    }).as('getAuthMe');

    cy.intercept('POST', '**/api/auth/logout', {
      statusCode: 200,
      body: { success: true },
    });

    cy.intercept('GET', '**/api/astrology/signs', {
      statusCode: 200,
      body: { success: true, data: signs },
    }).as('getSigns');

    cy.intercept('GET', '**/api/astrology/daily/**', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          ...signs[0],
          generatedAt: new Date().toISOString(),
          readingDate: new Date().toISOString().slice(0, 10),
        },
      },
    }).as('getDaily');

    cy.intercept('GET', '**/api/astrology/profile', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          sign: 'aries',
          birthDate: '1998-06-15',
          birthTime: '08:30',
          birthPlace: 'Kochi, Kerala, India',
          birthTimezone: 'Asia/Kolkata',
          nakshatra: 'Ashwini',
          rashi: 'Mesha',
          lagna: 'Mesha',
          gender: 'female',
          familyProfiles: [],
          savedReadings: [],
          kundliHistory: [],
          compatibilityHistory: [],
        },
      },
    }).as('getProfile');

    cy.intercept('PUT', '**/api/astrology/profile', {
      statusCode: 200,
      body: { success: true, data: { sign: 'aries' } },
    }).as('saveProfile');

    cy.intercept('GET', '**/api/astrology/panchangam', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          tithi: 'Shukla Paksha Tritiya',
          nakshatra: 'Revati',
          rahuKalam: '10:30 AM - 12:00 PM',
          yamagandam: '03:00 PM - 04:30 PM',
          quality: { source: 'template-engine', guidanceOnly: true, isSynthetic: true, note: 'Template guidance mode.' },
        },
        meta: { source: 'template-engine', guidanceOnly: true, isSynthetic: true, note: 'Template guidance mode.' },
      },
    }).as('getPanchangam');

    cy.intercept('GET', '**/api/astrology/festivals', {
      statusCode: 200,
      body: {
        success: true,
        data: [{ name: 'Vishu', date: 'Apr 14', note: 'Festival note' }],
        meta: { source: 'template-engine', guidanceOnly: true, isSynthetic: true, note: 'Template guidance mode.' },
      },
    }).as('getFestivals');

    cy.intercept('POST', '**/api/astrology/kundli', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          birthChart: { ascendant: 'Mesha', sun: 'Aries', moon: 'Ashwini' },
          navamsa: { lord: 'Sun', balance: 'Balanced' },
          dasha: { current: 'Venus', next: 'Mars', summary: 'Stable period.' },
          planets: [{ planet: 'Sun', position: '10 deg Aries' }],
          remedies: ['Morning prayer'],
        },
      },
    }).as('getKundli');

    cy.intercept('POST', '**/api/astrology/kundli/report', {
      statusCode: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="kundli-report-2026-05-21.pdf"',
      },
      body: 'mock_pdf_binary',
    }).as('downloadKundliPdf');

    cy.intercept('GET', '**/api/astrology/horoscope/report*', {
      statusCode: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="horoscope-report-aries-year-en.pdf"',
      },
      body: 'mock_horoscope_pdf',
    }).as('downloadHoroscopePdf');

    cy.intercept('POST', '**/api/astrology/consultations/book', (req) => {
      const booking = {
        id: `booking-${Date.now()}`,
        consultantId: req.body?.consultantId || 'acharya-madhav',
        consultantName: 'Madhav Acharya',
        slot: 'Today 4:00 PM',
        status: 'pending_payment',
        paymentStatus: 'pending',
        amountInr: 1200,
        currency: 'INR',
        confirmationCode: 'ASTRO-TEST-101',
        createdAt: new Date().toISOString(),
      };
      bookings = [booking, ...bookings.filter((item) => item.id !== booking.id)];
      req.reply({ statusCode: 201, body: { success: true, data: booking } });
    }).as('bookConsultation');

    cy.intercept('GET', '**/api/astrology/consultations', {
      statusCode: 200,
      body: { success: true, data: bookings },
    }).as('getConsultations');

    cy.intercept('POST', '**/api/astrology/consultations/*/payment/create-order', (req) => {
      const bookingId = req.url.split('/consultations/')[1].split('/payment')[0];
      const existing = bookings.find((item) => item.id === bookingId);
      if (existing) {
        existing.paymentOrderId = 'order_test_astro_1';
        existing.paymentStatus = 'pending';
        existing.status = 'pending_payment';
      }
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          data: {
            bookingId,
            orderId: 'order_test_astro_1',
            amountInr: 1200,
            currency: 'INR',
            keyId: 'rzp_test_123',
          },
        },
      });
    }).as('createOrder');

    cy.intercept('POST', '**/api/astrology/consultations/*/payment/verify', (req) => {
      const bookingId = req.url.split('/consultations/')[1].split('/payment')[0];
      const existing = bookings.find((item) => item.id === bookingId);
      if (existing) {
        existing.paymentStatus = 'completed';
        existing.status = 'confirmed';
        existing.paymentId = 'pay_test_astro_1';
      }
      req.reply({
        statusCode: 200,
        body: { success: true, data: existing || {} },
      });
    }).as('verifyPayment');

    cy.intercept('GET', '**/api/astrology/consultations/*/payment', (req) => {
      const bookingId = req.url.split('/consultations/')[1].split('/payment')[0];
      const existing = bookings.find((item) => item.id === bookingId);
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          data: {
            bookingId,
            paymentStatus: existing?.paymentStatus || 'pending',
            bookingStatus: existing?.status || 'pending_payment',
            paymentOrderId: existing?.paymentOrderId || '',
            paymentId: existing?.paymentId || '',
            amountInr: existing?.amountInr || 1200,
          },
        },
      });
    }).as('getPaymentStatus');

    cy.intercept('GET', '**/api/astrology/consultants', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 'acharya-madhav',
            name: 'Madhav Acharya',
            specialty: 'Kerala Jathakam',
            rate: 'INR 1,200 / 15 min',
            amountInr: 1200,
            availableSlots: [
              { id: 'today-1600', label: 'Today 4:00 PM', date: 'today' },
            ],
          },
        ],
      },
    }).as('getConsultants');
  };

  const visitAstrology = () => {
    setupInterceptors();
    cy.visit('/astrology', {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('mb_auth_token', 'test-token');
        win.localStorage.setItem('token', 'test-token');
        win.Razorpay = function Razorpay(options) {
          this.open = () => {
            options.handler({
              razorpay_order_id: 'order_test_astro_1',
              razorpay_payment_id: 'pay_test_astro_1',
              razorpay_signature: 'signature_test_astro_1',
            });
          };
        };
      },
    });

    cy.wait('@getPublicAppData');
    cy.wait('@getAuthMe');
    cy.wait('@getSigns');
    cy.wait('@getDaily');
    cy.wait('@getPanchangam');
    cy.wait('@getFestivals');
  };

  beforeEach(() => {
    bookings = [];
  });

  it('completes kundli pdf and consultation payment flow', () => {
    visitAstrology();

    cy.contains('button', 'Birth Chart').click();
    cy.wait('@getKundli');
    cy.contains('button', 'Download Kundli PDF report').click();
    cy.wait('@downloadKundliPdf');

    cy.contains('button', 'Consult').click();
    cy.wait('@getConsultants');
    cy.contains('button', 'Book consultation').click();
    cy.wait('@bookConsultation');
    cy.contains('button', 'Pay now').click();
    cy.wait('@createOrder');
    cy.wait('@verifyPayment');
    cy.contains(/Payment status:/).should('be.visible');
    cy.contains(/Completed|Confirmed/i).should('be.visible');
  });
});
