const { serializeRestaurant } = require('./restaurantStore');

describe('restaurantStore', () => {
  test('serializes a restaurant document into module data format', () => {
    const serialized = serializeRestaurant({
      _id: '507f1f77bcf86cd799439031',
      name: 'Malabar Meals Hub',
      cuisine: 'Kerala',
      rating: 4.8,
      deliveryTime: '26 mins',
      promoted: true,
      open: true,
      menu: [{ id: 'menu-1', name: 'Biryani', price: 249 }],
    });

    expect(serialized).toEqual(
      expect.objectContaining({
        id: '507f1f77bcf86cd799439031',
        name: 'Malabar Meals Hub',
        cuisine: 'Kerala',
        rating: 4.8,
        promoted: true,
        open: true,
        menu: [{ id: 'menu-1', name: 'Biryani', price: 249 }],
      })
    );
  });
});
