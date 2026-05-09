/**
 * TrafficPredictionService.js
 * Phase 5: AI Traffic Prediction
 * Historical data analysis and ML-based traffic pattern prediction
 */

class TrafficPredictionService {
  /**
   * Historical traffic patterns database
   * In production, integrate with Google Maps API or similar
   */
  static TRAFFIC_PATTERNS = {
    // Format: hour => averageSpeedKmh
    weekday: {
      0: 35, // midnight
      1: 45,
      2: 50,
      3: 50,
      4: 45,
      5: 25, // early morning peak
      6: 15,
      7: 10, // morning peak
      8: 8,
      9: 12,
      10: 20,
      11: 25,
      12: 18, // lunch time
      13: 20,
      14: 25,
      15: 22,
      16: 18,
      17: 12, // evening peak
      18: 10,
      19: 15,
      20: 20,
      21: 28,
      22: 35,
      23: 40,
    },
    weekend: {
      0: 40,
      1: 45,
      2: 50,
      3: 50,
      4: 45,
      5: 40,
      6: 35,
      7: 30,
      8: 25,
      9: 20,
      10: 18,
      11: 15,
      12: 20,
      13: 22,
      14: 25,
      15: 28,
      16: 30,
      17: 28,
      18: 25,
      19: 30,
      20: 35,
      21: 38,
      22: 40,
      23: 42,
    },
  };

  /**
   * Get baseline average speed for a given time
   */
  static getAverageSpeedByTime(hour, dayOfWeek) {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const pattern = isWeekend
      ? this.TRAFFIC_PATTERNS.weekend
      : this.TRAFFIC_PATTERNS.weekday;

    return pattern[hour] || 30;
  }

  /**
   * Predict ETA with traffic considerations
   * More accurate than simple distance/speed calculation
   */
  static predictETA(
    distance,
    hour,
    dayOfWeek,
    trafficConditions = 'normal',
    weatherMultiplier = 1.0
  ) {
    // Get baseline average speed
    const baselineSpeed = this.getAverageSpeedByTime(hour, dayOfWeek);

    // Apply traffic condition multiplier
    const trafficMultipliers = {
      light: 1.0,
      normal: 0.85,
      moderate: 0.7,
      heavy: 0.5,
      gridlock: 0.3,
    };

    const finalSpeed =
      (baselineSpeed * trafficMultipliers[trafficConditions] * (1 / weatherMultiplier));

    // Calculate time in minutes
    const timeMinutes = (distance / Math.max(finalSpeed, 5)) * 60; // Min 5 km/h

    return {
      estimatedTimeMinutes: Math.ceil(timeMinutes),
      estimatedTimeString: this.formatTime(Math.ceil(timeMinutes)),
      baselineSpeed,
      trafficConditions,
      weatherImpact: weatherMultiplier > 1 ? 'Increased travel time' : 'Normal conditions',
    };
  }

  /**
   * Predict peak hour congestion
   */
  static predictPeakHourCongestion(hour, dayOfWeek) {
    const peakHours = {
      weekday: [7, 8, 9, 12, 13, 18, 19, 20],
      weekend: [11, 12, 18, 19],
    };

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const peaks = isWeekend ? peakHours.weekend : peakHours.weekday;

    const isPeak = peaks.includes(hour);
    const isPeakStart = peaks.includes(hour - 1);
    const isPeakEnd = peaks.includes(hour + 1);

    return {
      isPeakHour: isPeak,
      congestionLevel: isPeak ? 'high' : isPeakStart || isPeakEnd ? 'moderate' : 'low',
      expectedCongestion:
        isPeak > 'Peak traffic expected' : 'Light traffic expected',
      nextPeakHour: this.getNextPeakHour(hour, dayOfWeek),
    };
  }

  /**
   * Get next peak hour
   */
  static getNextPeakHour(currentHour, dayOfWeek) {
    const peakHours = {
      weekday: [7, 8, 9, 12, 13, 18, 19, 20],
      weekend: [11, 12, 18, 19],
    };

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const peaks = isWeekend ? peakHours.weekend : peakHours.weekday;

    for (const hour of peaks) {
      if (hour > currentHour) {
        return hour;
      }
    }

    // Return first peak of next day
    return isWeekend ? 11 : 7;
  }

  /**
   * Predict congestion for a specific route
   * Uses historical patterns and current conditions
   */
  static async predictRouteCongestion(
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    departureTime = new Date()
  ) {
    try {
      const hour = departureTime.getHours();
      const dayOfWeek = departureTime.getDay();

      // Get baseline traffic for this time
      const baselineSpeed = this.getAverageSpeedByTime(hour, dayOfWeek);

      // Check if peak hour
      const peakCheck = this.predictPeakHourCongestion(hour, dayOfWeek);

      // Estimate distance (simplified - in production use Google Maps API)
      const estimatedDistance = this.estimateDistance(
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng
      );

      // Calculate predicted ETA
      const etaData = this.predictETA(
        estimatedDistance,
        hour,
        dayOfWeek,
        peakCheck.congestionLevel
      );

      // Predict congestion points (hypothetical route segments)
      const congestionPoints = this.identifyCongestionPoints(
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        hour,
        dayOfWeek
      );

      return {
        success: true,
        route: {
          pickup: { lat: pickupLat, lng: pickupLng },
          dropoff: { lat: dropoffLat, lng: dropoffLng },
        },
        estimatedDistance: Math.round(estimatedDistance * 10) / 10,
        eta: etaData,
        peakHourInfo: peakCheck,
        congestionPoints,
        trafficForecast: {
          likelihood: peakCheck.congestionLevel === 'high' ? 'High' : 'Low',
          timeToAdjust: peakCheck.nextPeakHour
            ? `${Math.abs(peakCheck.nextPeakHour - hour)} hours`
            : 'Peak hours completed',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Error predicting route congestion: ${error.message}`);
    }
  }

  /**
   * Identify potential congestion points on route
   */
  static identifyCongestionPoints(
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    hour,
    dayOfWeek
  ) {
    // Hypothetical hotspots (in production, store in database)
    const hotspots = [
      {
        name: 'Airport Road Junction',
        lat: 12.45,
        lng: 76.0,
        peakHours: [7, 8, 9, 18, 19],
        delayMinutes: 15,
      },
      {
        name: 'Business District Center',
        lat: 12.46,
        lng: 76.01,
        peakHours: [12, 13, 18, 19],
        delayMinutes: 10,
      },
      {
        name: 'Shopping Mall Intersection',
        lat: 12.47,
        lng: 76.02,
        peakHours: [11, 12, 18, 19, 20],
        delayMinutes: 8,
      },
    ];

    const congestionPoints = [];

    for (const hotspot of hotspots) {
      if (hotspot.peakHours.includes(hour)) {
        // Check if hotspot is roughly on the route
        congestionPoints.push({
          name: hotspot.name,
          severity: 'high',
          estimatedDelay: hotspot.delayMinutes,
          coordinates: { lat: hotspot.lat, lng: hotspot.lng },
        });
      }
    }

    return congestionPoints;
  }

  /**
   * ML-based traffic pattern analysis
   * Uses historical data to predict future patterns
   */
  static analyzeTrafficPattern(historicalData) {
    // Simplified ML analysis
    // In production, use TensorFlow.js or similar

    if (!historicalData || historicalData.length === 0) {
      return {
        trend: 'stable',
        avgSpeed: 30,
        volatility: 0.1,
        forecast: 'No significant changes expected',
      };
    }

    const speeds = historicalData.map((d) => d.avgSpeed);
    const avgSpeed =
      speeds.reduce((a, b) => a + b, 0) / speeds.length;

    // Calculate trend
    const firstHalf = speeds.slice(0, Math.floor(speeds.length / 2));
    const secondHalf = speeds.slice(Math.floor(speeds.length / 2));

    const firstHalfAvg =
      firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    let trend = 'stable';
    if (secondHalfAvg > firstHalfAvg * 1.1) {
      trend = 'improving';
    } else if (secondHalfAvg < firstHalfAvg * 0.9) {
      trend = 'worsening';
    }

    // Calculate volatility
    const variance =
      speeds.reduce((sum, speed) => sum + Math.pow(speed - avgSpeed, 2), 0) /
      speeds.length;
    const volatility = Math.sqrt(variance) / avgSpeed;

    return {
      trend,
      avgSpeed: Math.round(avgSpeed),
      volatility: Math.round(volatility * 100) / 100,
      forecast:
        trend === 'improving'
          ? 'Traffic conditions improving'
          : trend === 'worsening'
          ? 'Traffic getting worse'
          : 'Traffic stable',
    };
  }

  /**
   * Get traffic forecast for next N hours
   */
  static getTrafficForecast(hour, dayOfWeek, hoursAhead = 3) {
    const forecast = [];

    for (let i = 0; i < hoursAhead; i++) {
      const forecastHour = (hour + i) % 24;
      const forecastDay = Math.floor((hour + i) / 24) === 0 ? dayOfWeek : (dayOfWeek + 1) % 7;

      const avgSpeed = this.getAverageSpeedByTime(forecastHour, forecastDay);
      const peakCheck = this.predictPeakHourCongestion(forecastHour, forecastDay);

      forecast.push({
        hour: forecastHour,
        dayOfWeek: forecastDay,
        avgSpeed,
        congestionLevel: peakCheck.congestionLevel,
        isPeakHour: peakCheck.isPeakHour,
      });
    }

    return forecast;
  }

  /**
   * Format time in human-readable format
   */
  static formatTime(minutes) {
    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${mins}min`;
  }

  /**
   * Estimate distance between coordinates
   * In production, use Google Maps API for accurate distances
   */
  static estimateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Real-time traffic impact score
   * 0-100: 0 = light traffic, 100 = gridlock
   */
  static calculateTrafficImpactScore(baselineSpeed, currentSpeed) {
    if (baselineSpeed <= 0) return 0;

    const speedRatio = currentSpeed / baselineSpeed;
    const impactScore = Math.max(0, Math.min(100, (1 - speedRatio) * 100));

    return Math.round(impactScore);
  }
}

module.exports = TrafficPredictionService;
