// FoodDelivery routes
app.use('/api/fooddelivery', require('./routes/fooddelivery'));

// RideSharing routes
app.use('/api/ridesharing', require('./routes/ridesharing'));

// Add realestate route to main server
app.use('/api/realestate', require('./routes/realestate'));

