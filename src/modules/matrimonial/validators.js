export const validateMatrimonialProfile = (profileForm) => {
  const errors = {};
  const normalizePhoneDigits = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) {
      return digits.slice(2);
    }

    return digits;
  };

  // Name validation
  const trimmedName = profileForm.name?.trim() || '';
  if (!trimmedName) {
    errors.name = 'Name is required';
  } else if (trimmedName.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  } else if (trimmedName.length > 50) {
    errors.name = 'Name must be less than 50 characters';
  }

  // Email validation
  const trimmedEmail = profileForm.email?.trim() || '';
  if (!trimmedEmail) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Valid email address is required';
  }

  // Phone validation (Indian format - 10 digits)
  const phoneDigits = normalizePhoneDigits(profileForm.phone);
  if (!phoneDigits) {
    errors.phone = 'Phone number is required';
  } else if (phoneDigits.length !== 10) {
    errors.phone = 'Phone number must be exactly 10 digits';
  }

  // Age validation
  const age = Number(profileForm.age);
  if (!age || isNaN(age)) {
    errors.age = 'Valid age is required';
  } else if (age < 18) {
    errors.age = 'Age must be at least 18';
  } else if (age > 100) {
    errors.age = 'Age must be less than 100';
  }

  // Required text fields
  const requiredFields = ['gender', 'religion', 'education', 'profession', 'location', 'maritalStatus', 'familyDetails', 'bio'];
  requiredFields.forEach(field => {
    const value = profileForm[field]?.trim();
    if (!value) {
      errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')} is required`;
    }
  });

  // Text length validation
  if (profileForm.bio?.length > 500) {
    errors.bio = 'Bio must be less than 500 characters';
  }

  if (profileForm.familyDetails?.length > 1000) {
    errors.familyDetails = 'Family details must be less than 1000 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const sanitizeProfileData = (profile) => {
  const normalizePhoneDigits = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) {
      return digits.slice(2);
    }

    return digits;
  };

  const sanitizeText = (text) => {
    if (!text) return '';
    // Remove HTML tags and encode special characters to prevent XSS
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, (char) => char === '<' ? '&lt;' : '&gt;')
      .trim();
  };

  const sanitizeList = (value) => {
    if (Array.isArray(value)) {
      return value.map(sanitizeText).filter(Boolean);
    }

    return String(value || "")
      .split(",")
      .map((item) => sanitizeText(item))
      .filter(Boolean);
  };

  return {
    ...profile,
    name: sanitizeText(profile.name),
    email: profile.email?.trim().toLowerCase(),
    phone: normalizePhoneDigits(profile.phone),
    religion: sanitizeText(profile.religion),
    caste: sanitizeText(profile.caste),
    community: sanitizeText(profile.community),
    education: sanitizeText(profile.education),
    profession: sanitizeText(profile.profession),
    location: sanitizeText(profile.location),
    maritalStatus: sanitizeText(profile.maritalStatus),
    bio: sanitizeText(profile.bio),
    familyDetails: sanitizeText(profile.familyDetails),
    languages: sanitizeList(profile.languages),
    hobbies: sanitizeList(profile.hobbies),
  };
};

export const calculateProfileCompletion = (profile) => {
  const requiredFields = [
    'name', 'email', 'phone', 'age', 'gender', 'religion',
    'education', 'profession', 'location', 'maritalStatus',
    'bio', 'familyDetails'
  ];

  const filled = requiredFields.filter(field =>
    profile[field] && String(profile[field]).trim()
  ).length;

  return Math.round((filled / requiredFields.length) * 100);
};
