const buildMapsUrl = (latitude, longitude) => {
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return '';
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
};

const sanitizePhone = (phone = '') => String(phone).replace(/[^0-9+]/g, '').slice(0, 16);

const buildSOSMessage = ({ userName = 'NilaHub user', reason, mapsUrl, emergencyProfile = {}, silentMode }) => {
  const lines = [
    `${silentMode ? 'SILENT ' : ''}SOS ALERT from ${userName}`,
    `Reason: ${reason || 'Emergency'}`,
    `Location: ${mapsUrl || 'Location unavailable'}`,
  ];

  if (emergencyProfile.bloodGroup) lines.push(`Blood group: ${emergencyProfile.bloodGroup}`);
  if (emergencyProfile.allergies) lines.push(`Allergies: ${emergencyProfile.allergies}`);
  if (emergencyProfile.medicalConditions) lines.push(`Medical: ${emergencyProfile.medicalConditions}`);
  if (emergencyProfile.preferredHospital) lines.push(`Preferred hospital: ${emergencyProfile.preferredHospital}`);
  if (emergencyProfile.emergencyNotes) lines.push(`Notes: ${emergencyProfile.emergencyNotes}`);

  lines.push('Please call back or open live tracking immediately.');
  return lines.join('\n');
};

const getLeadPriority = ({ batteryStatus, escalationLevel = 0, location }) => {
  if (escalationLevel >= 2) return 'critical';
  if (batteryStatus?.level !== null && Number(batteryStatus?.level) <= 15) return 'high';
  if (!location?.latitude || !location?.longitude) return 'high';
  return 'normal';
};

module.exports = {
  buildMapsUrl,
  sanitizePhone,
  buildSOSMessage,
  getLeadPriority,
};
