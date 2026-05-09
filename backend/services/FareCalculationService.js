/**
 * Fare Calculation Service for Ride Sharing
 * Handles dynamic pricing, surge pricing, discounts, taxes
 */

class FareCalculationService {
  /**
   * Ride type configuration with pricing tiers
   */
  static RIDE_TYPES = {
    bike: {
      name: 'Bike Taxi',
      icon: '🏍️',
      category: 'Economy',
      basefare: 28,
      costPerKm: 6,
      costPerMin: 1.5,
      minFare: 30,
      capacity: 1,
      waitingChargePerMin: 2,
    },
    auto: {
      name: 'Auto Rickshaw',
      icon: '🚛',
      category: 'Budget',
      basefare: 42,
      costPerKm: 9,
      costPerMin: 2,
      minFare: 50,
      capacity: 3,
      waitingChargePerMin: 2.5,
    },
    mini_cab: {
      name: 'Mini Cab',
      icon: '🚐',
      category: 'Comfort',
      basefare: 55,
      costPerKm: 12,
      costPerMin: 2.5,
      minFare: 65,
      capacity: 4,
      waitingChargePerMin: 3,
    },
    sedan: {
      name: 'Sedan',
      icon: '🚙',
      category: 'Premium',
      basefare: 74,
      costPerKm: 14,
      costPerMin: 3,
      minFare: 90,
      capacity: 4,
      waitingChargePerMin: 3.5,
    },
    suv: {
      name: 'SUV',
      icon: '🚗',
      category: 'Premium Plus',
      basefare: 95,
      costPerKm: 18,
      costPerMin: 3.5,
      minFare: 120,
      capacity: 5,
      waitingChargePerMin: 4,
    },
    premium: {
      name: 'Premium',
      icon: '🏎️',
      category: 'Luxury',
      basefare: 130,
      costPerKm: 25,
      costPerMin: 4.5,
      minFare: 150,
      capacity: 4,
      waitingChargePerMin: 5,
    },
    ev: {
      name: 'EV Eco',
      icon: '🔋',
      category: 'Eco',
      basefare: 35,
      costPerKm: 7,
      costPerMin: 1.75,
      minFare: 40,
      capacity: 4,
      waitingChargePerMin: 2,
      ecoDiscount: 0.1, // 10% eco discount
    },
  };

  /**
   * Surge pricing multipliers based on demand (time-of-day, area demand)
   */
  static calculateSurgeMultiplier(hour, demandLevel = 'normal') {
    // demandLevel: 'low', 'normal', 'high', 'peak'

    // Peak hours: 7-10am, 12-2pm, 6-9pm
    const peakHours = [7, 8, 9, 12, 13, 18, 19, 20];
    const isPeakHour = peakHours.includes(hour);

    const surgeMap = {
      low: isPeakHour ? 1.1 : 1.0,
      normal: isPeakHour ? 1.25 : 1.0,
      high: isPeakHour ? 1.5 : 1.2,
      peak: isPeakHour ? 2.0 : 1.5,
    };

    return surgeMap[demandLevel] || 1.0;
  }

  /**
   * Calculate haversine distance between two coordinates
   * Returns distance in kilometers
   */
  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal
  }

  /**
   * Estimate travel time based on distance (simplified)
   * In production, use Google Maps API for real-time traffic
   */
  static estimateTravelTime(distance, speedKmPerHour = 30) {
    // Average city speed: 30 km/h
    // Adjust based on time of day, traffic conditions
    const timeInMinutes = (distance / speedKmPerHour) * 60;
    return Math.round(timeInMinutes);
  }

  /**
   * Calculate complete fare breakdown
   */
  static calculateFare({
    rideType,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    demandLevel = 'normal',
    couponCode = null,
    includeWaitingCharge = false,
    waitingTimeMinutes = 0,
  }) {
    // Validate inputs
    if (!rideType || !this.RIDE_TYPES[rideType]) {
      throw new Error(`Invalid ride type: ${rideType}`);
    }

    if (
      typeof pickupLat !== 'number' ||
      typeof pickupLng !== 'number' ||
      typeof dropoffLat !== 'number' ||
      typeof dropoffLng !== 'number'
    ) {
      throw new Error('Invalid coordinates');
    }

    const ride = this.RIDE_TYPES[rideType];
    const distance = this.calculateDistance(
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng
    );
    const travelTimeMinutes = this.estimateTravelTime(distance);

    // 1. Base fare
    const baseFare = ride.basefare;

    // 2. Distance charge
    const distanceCharge = Math.max(
      distance * ride.costPerKm,
      ride.minFare - baseFare
    );

    // 3. Time charge (for waiting/stopped traffic)
    const timeCharge = travelTimeMinutes * ride.costPerMin;

    // 4. Waiting charge (if applicable)
    let waitingCharge = 0;
    if (includeWaitingCharge && waitingTimeMinutes > 0) {
      waitingCharge = Math.max(
        waitingTimeMinutes * ride.waitingChargePerMin,
        0
      );
    }

    // 5. Ride fare (before surge)
    let rideFare = baseFare + distanceCharge + timeCharge + waitingCharge;
    rideFare = Math.max(rideFare, ride.minFare);

    // 6. Surge pricing
    const hour = new Date().getHours();
    const surgeFactor = this.calculateSurgeMultiplier(hour, demandLevel);
    const surgedFare = rideFare * surgeFactor;

    // 7. Platform fee (5%)
    const platformFee = Math.round(surgedFare * 0.05 * 100) / 100;

    // 8. Discount
    let discount = 0;
    let discountPercentage = 0;
    if (couponCode) {
      const couponDiscount = this.applyCoupon(couponCode, surgedFare);
      discount = couponDiscount.amount;
      discountPercentage = couponDiscount.percentage;
    }

    // 9. Eco discount (if EV)
    let ecoDiscount = 0;
    if (ride.ecoDiscount) {
      ecoDiscount = Math.round((surgedFare + platformFee) * ride.ecoDiscount * 100) / 100;
    }

    // 10. Tax (GST 5% in India)
    const taxableAmount = surgedFare + platformFee - discount - ecoDiscount;
    const gst = Math.round(taxableAmount * 0.05 * 100) / 100;

    // 11. Total
    const total = Math.round(
      (surgedFare + platformFee + gst - discount - ecoDiscount) * 100
    ) / 100;

    return {
      // Identifiers
      rideType,
      distance,
      travelTimeMinutes,

      // Breakdown
      baseFare,
      distanceCharge: Math.round(distanceCharge * 100) / 100,
      timeCharge: Math.round(timeCharge * 100) / 100,
      waitingCharge: Math.round(waitingCharge * 100) / 100,
      rideFare: Math.round(rideFare * 100) / 100,

      // Multipliers
      surgeFactor,
      surgedFare: Math.round(surgedFare * 100) / 100,

      // Fees & Adjustments
      platformFee,
      discount,
      discountPercentage,
      ecoDiscount,
      gst,

      // Total
      total,

      // Savings info
      youSave: discount + ecoDiscount,
      originalPrice: Math.round((surgedFare + platformFee + gst) * 100) / 100,
    };
  }

  /**
   * Apply coupon code discount
   */
  static applyCoupon(couponCode, amount) {
    // Predefined coupon codes
    const coupons = {
      WELCOME10: { type: 'percentage', value: 10, maxDiscount: 100 },
      RIDE50: { type: 'flat', value: 50 },
      SUMMER20: { type: 'percentage', value: 20, maxDiscount: 150 },
      FIRST: { type: 'percentage', value: 100, maxDiscount: 200 }, // 100% off first ride
      REFERRAL30: { type: 'flat', value: 30 },
    };

    const coupon = coupons[couponCode?.toUpperCase()];

    if (!coupon) {
      return { amount: 0, percentage: 0 };
    }

    let discount = 0;
    let percentage = 0;

    if (coupon.type === 'percentage') {
      discount = Math.min(
        (amount * coupon.value) / 100,
        coupon.maxDiscount || (amount * coupon.value) / 100
      );
      percentage = coupon.value;
    } else if (coupon.type === 'flat') {
      discount = Math.min(coupon.value, amount);
      percentage = Math.round((discount / amount) * 100);
    }

    return {
      amount: Math.round(discount * 100) / 100,
      percentage,
    };
  }

  /**
   * Get available coupons for user
   */
  static getAvailableCoupons(userId, isFirstRide = false) {
    const baseCoupons = [
      {
        code: 'WELCOME10',
        description: 'Get 10% off on your next ride',
        discount: '10%',
        maxDiscount: 100,
      },
      {
        code: 'RIDE50',
        description: 'Flat ₹50 off on rides above ₹500',
        discount: '₹50',
      },
      {
        code: 'SUMMER20',
        description: '20% off during summer (max ₹150)',
        discount: '20%',
        maxDiscount: 150,
      },
    ];

    if (isFirstRide) {
      baseCoupons.unshift({
        code: 'FIRST',
        description: 'Enjoy 100% off on your first ride',
        discount: '100%',
        maxDiscount: 200,
        badge: 'FIRST RIDE',
      });
    }

    return baseCoupons;
  }

  /**
   * Get estimated fare range for ride planning
   */
  static getEstimatedFareRange(
    rideType,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng
  ) {
    const distance = this.calculateDistance(
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng
    );

    const ride = this.RIDE_TYPES[rideType];
    const travelTime = this.estimateTravelTime(distance);

    // Normal fare (low demand)
    const normalFare = this.calculateFare({
      rideType,
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      demandLevel: 'low',
    });

    // Peak fare (high demand)
    const peakFare = this.calculateFare({
      rideType,
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      demandLevel: 'peak',
    });

    return {
      rideType: ride.name,
      distance,
      travelTimeMinutes: travelTime,
      minFare: normalFare.total,
      maxFare: peakFare.total,
      estimatedFare: normalFare.total,
      surgeFactor: peakFare.surgeFactor,
    };
  }

  /**
   * Get all available ride types with pricing
   */
  static getAllRideTypes() {
    return Object.entries(this.RIDE_TYPES).map(([key, ride]) => ({
      id: key,
      ...ride,
    }));
  }

  /**
   * Calculate earnings for driver
   */
  static calculateDriverEarnings(rideTotal, commissionPercentage = 20) {
    const commission = (rideTotal * commissionPercentage) / 100;
    const driverEarnings = rideTotal - commission;

    return {
      rideTotal,
      commission,
      driverEarnings,
      commissionPercentage,
    };
  }
}

module.exports = FareCalculationService;
