import PropTypes from "prop-types";

// Profile shape definition
const profileShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  email: PropTypes.string,
  phone: PropTypes.string,
  age: PropTypes.number,
  gender: PropTypes.oneOf(["Man", "Woman", "Other"]),
  religion: PropTypes.string,
  caste: PropTypes.string,
  community: PropTypes.string,
  location: PropTypes.string,
  education: PropTypes.string,
  profession: PropTypes.string,
  maritalStatus: PropTypes.string,
  bio: PropTypes.string,
  languages: PropTypes.arrayOf(PropTypes.string),
  hobbies: PropTypes.arrayOf(PropTypes.string),
  verificationStatus: PropTypes.string,
  matchScore: PropTypes.number,
  privacy: PropTypes.shape({
    hidePhone: PropTypes.bool,
    hideEmail: PropTypes.bool,
    hideLocation: PropTypes.bool,
  }),
  premiumOnlyContact: PropTypes.bool,
});

// Advanced filters shape
const filtersShape = PropTypes.shape({
  religion: PropTypes.string,
  location: PropTypes.string,
  education: PropTypes.string,
  profession: PropTypes.string,
  verifiedOnly: PropTypes.bool,
});

// User preferences shape
const preferencesShape = PropTypes.shape({
  ageMin: PropTypes.number,
  ageMax: PropTypes.number,
  preferredReligion: PropTypes.arrayOf(PropTypes.string),
  preferredLocation: PropTypes.string,
  preferredEducation: PropTypes.string,
  preferredProfession: PropTypes.string,
});

// Matrimonial component prop types
const MatrimonialPropTypes = {
  onProfileUpdate: PropTypes.func,
};

// Matrimonial component default props
const MatrimonialDefaultProps = {
  onProfileUpdate: null,
};

export {
  MatrimonialPropTypes,
  MatrimonialDefaultProps,
  profileShape,
  filtersShape,
  preferencesShape,
};