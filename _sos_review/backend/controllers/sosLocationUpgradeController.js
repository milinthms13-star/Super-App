const SOSIncident = require('../models/SosIncident');
const { buildMapsUrl } = require('../services/sosUpgradeService');

exports.updateLiveLocation = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const accuracy = Number(req.body.accuracy);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required' });
    }

    const incident = await SOSIncident.findOne({ _id: incidentId, userId: req.user.id });
    if (!incident) return res.status(404).json({ success: false, message: 'SOS incident not found' });

    incident.latitude = latitude;
    incident.longitude = longitude;
    incident.accuracy = Number.isFinite(accuracy) ? Math.round(accuracy) : incident.accuracy;
    incident.mapsUrl = buildMapsUrl(latitude, longitude);
    incident.location = { type: 'Point', coordinates: [longitude, latitude] };
    incident.history = incident.history || [];
    incident.history.push({ event: 'live_location_refresh', data: { latitude, longitude, accuracy }, timestamp: new Date() });
    await incident.save();

    return res.json({ success: true, incident });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update location' });
  }
};
