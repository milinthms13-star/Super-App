/**
 * ScheduledOrder Schema
 * Orders scheduled for future delivery
 * Enables customers to pre-order meals for future times
 */

const mongoose = require('mongoose');

const scheduledOrderSchema = new mongoose.Schema(
  {
    scheduledOrderId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodOrder',
      required: true,
      unique: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryUser',
      required: true,
      index: true,
    },

    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryRestaurant',
      required: true,
      index: true,
    },

    scheduledDeliveryTime: {
      type: Date,
      required: true,
      index: true,
    },

    deliveryWindow: {
      startTime: Date,
      endTime: Date,
      duration: Number,
      description: String,
    },

    prepTime: {
      estimatedMinutes: Number,
      actualMinutes: Number,
    },

    items: [
      {
        itemId: mongoose.Schema.Types.ObjectId,
        quantity: Number,
        variants: [String],
        addOns: [
          {
            addOnId: mongoose.Schema.Types.ObjectId,
            quantity: Number,
            price: Number,
          },
        ],
        specialInstructions: String,
      },
    ],

    pricing: {
      subtotal: Number,
      deliveryFee: Number,
      platformFee: Number,
      tax: Number,
      discount: Number,
      tip: Number,
      total: Number,
    },

    paymentMethod: {
      type: String,
      enum: ['wallet', 'card', 'upi', 'cod'],
      required: true,
    },

    deliveryAddress: {
      street: String,
      building: String,
      landmark: String,
      latitude: Number,
      longitude: Number,
      city: String,
      pincode: String,
      instructions: String,
    },

    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'failed'],
      default: 'scheduled',
      index: true,
    },

    statusTimeline: [
      {
        status: String,
        timestamp: Date,
        notes: String,
      },
    ],

    reminderSent: {
      oneHourBefore: {
        type: Boolean,
        default: false,
      },
      thirtyMinutesBefore: {
        type: Boolean,
        default: false,
      },
      atScheduledTime: {
        type: Boolean,
        default: false,
      },
    },

    cancellation: {
      isCancelled: {
        type: Boolean,
        default: false,
      },
      cancelledAt: Date,
      cancelledBy: {
        type: String,
        enum: ['user', 'restaurant', 'system'],
      },
      reason: String,
      refundStatus: {
        type: String,
        enum: ['pending', 'processed', 'failed'],
      },
    },

    modificationsAllowed: {
      type: Boolean,
      default: true,
      description: 'Can order be modified before prep starts',
    },

    modificationDeadline: {
      type: Date,
      description: 'Last time order can be modified',
    },

    modifications: [
      {
        modifiedAt: Date,
        modifiedBy: String,
        changeDescription: String,
      },
    ],

    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      ratedAt: Date,
    },
  },
  {
    timestamps: true,
    collection: 'scheduledorders',
  }
);

// Indexes
scheduledOrderSchema.index({ userId: 1, status: 1 });
scheduledOrderSchema.index({ restaurantId: 1, scheduledDeliveryTime: 1 });
scheduledOrderSchema.index({ scheduledDeliveryTime: 1, status: 1 });
scheduledOrderSchema.index({ status: 1, 'cancellation.isCancelled': 1 });

// Methods
scheduledOrderSchema.methods.canModify = function () {
  return this.modificationsAllowed && new Date() < this.modificationDeadline;
};

scheduledOrderSchema.methods.addModification = function (change, modifiedBy) {
  this.modifications.push({
    modifiedAt: new Date(),
    modifiedBy,
    changeDescription: change,
  });
  return this.save();
};

scheduledOrderSchema.methods.updateStatus = function (newStatus, notes = '') {
  this.status = newStatus;
  this.statusTimeline.push({
    status: newStatus,
    timestamp: new Date(),
    notes,
  });
  return this.save();
};

scheduledOrderSchema.methods.markReminderSent = function (type) {
  this.reminderSent[type] = true;
  return this.save();
};

module.exports = mongoose.model('ScheduledOrder', scheduledOrderSchema);
