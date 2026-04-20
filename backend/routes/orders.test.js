const ordersRouter = require('./orders');

describe('order pricing summary', () => {
  test('recomputes subtotal, delivery fee, and total from authoritative item prices', () => {
    const { buildAuthoritativeOrderSummary } = ordersRouter.__testables;

    const summary = buildAuthoritativeOrderSummary({
      resolvedItems: [
        {
          item: {
            id: 'prod-1::batch::batch-1',
            productId: 'prod-1',
            quantity: 2,
            price: 1,
          },
          productLookupId: 'prod-1',
          sourceProduct: {
            name: 'Banana Chips',
          },
          unitPrice: 120,
        },
        {
          item: {
            id: 'prod-2',
            quantity: 1,
            price: 5,
          },
          productLookupId: 'prod-2',
          sourceProduct: {
            name: 'Mango Pickle',
          },
          unitPrice: 80,
        },
      ],
    });

    expect(summary.items).toEqual([
      expect.objectContaining({
        id: 'prod-1::batch::batch-1',
        productId: 'prod-1',
        price: 120,
        quantity: 2,
        lineTotal: 240,
      }),
      expect.objectContaining({
        id: 'prod-2',
        productId: 'prod-2',
        price: 80,
        quantity: 1,
        lineTotal: 80,
      }),
    ]);
    expect(summary.subtotalValue).toBe(320);
    expect(summary.deliveryFeeValue).toBe(85);
    expect(summary.amountValue).toBe(405);
    expect(summary.subtotal).toBe('INR 320');
    expect(summary.deliveryFee).toBe('INR 85');
    expect(summary.amount).toBe('INR 405');
  });

  test('computes return eligibility from delivered date and window', () => {
    const { getReturnEligibleUntil, isReturnRequestStillEligible } = ordersRouter.__testables;

    const order = {
      deliveredAt: '2026-04-10T10:00:00.000Z',
    };
    const item = {
      returnAllowed: true,
      returnWindowDays: 7,
    };

    expect(getReturnEligibleUntil(item, order)?.toISOString()).toBe('2026-04-17T10:00:00.000Z');
    expect(
      isReturnRequestStillEligible(item, order, new Date('2026-04-16T09:00:00.000Z'))
    ).toBe(true);
    expect(
      isReturnRequestStillEligible(item, order, new Date('2026-04-18T00:00:00.000Z'))
    ).toBe(false);
  });

  test('does not allow return eligibility before delivery is recorded', () => {
    const { getReturnEligibleUntil, isReturnRequestStillEligible } = ordersRouter.__testables;

    const order = {
      createdAt: '2026-04-10T10:00:00.000Z',
      updatedAt: '2026-04-11T10:00:00.000Z',
      deliveredAt: null,
    };
    const item = {
      returnAllowed: true,
      returnWindowDays: 7,
    };

    expect(getReturnEligibleUntil(item, order)).toBeNull();
    expect(
      isReturnRequestStillEligible(item, order, new Date('2026-04-12T10:00:00.000Z'))
    ).toBe(false);
  });
});
