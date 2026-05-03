import { useState, useEffect, useCallback } from 'react';

const CART_KEY = 'globemart-cart-v1';

export const useCart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCart = () => {
      try {
        const saved = localStorage.getItem(CART_KEY);
        if (saved) {
          setCartItems(JSON.parse(saved));
        }
      } catch (error) {
        console.warn('Failed to load cart:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCart();

    const handleStorage = (e) => {
      if (e.key === CART_KEY && e.newValue) {
        try {
          setCartItems(JSON.parse(e.newValue));
        } catch (error) {
          console.warn('Invalid cart data:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addToCart = useCallback((product) => {
    setCartItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      const nextItems = existing 
        ? current.map((item) => item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item 
          )
        : [...current, { ...product, quantity: 1 }];
      
      localStorage.setItem(CART_KEY, JSON.stringify(nextItems));
      return nextItems;
    });
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    setCartItems((current) => {
      const nextItems = current.map((item) => 
        item.id === productId ? { ...item, quantity: Math.max(0, quantity) } : item
      ).filter((item) => item.quantity > 0);
      
      localStorage.setItem(CART_KEY, JSON.stringify(nextItems));
      return nextItems;
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCartItems((current) => {
      const nextItems = current.filter((item) => item.id !== productId);
      localStorage.setItem(CART_KEY, JSON.stringify(nextItems));
      return nextItems;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    localStorage.removeItem(CART_KEY);
  }, []);

  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cartItems,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartTotal,
    itemCount,
  };
};

