import React from 'react';

const GulfModal = ({ activeModal, children, size = 'default' }) => {
  if (!activeModal) return null;

  const modalClasses = `gulf-services-modal gulf-services-modal-${activeModal} ${
    size === 'large' ? 'gulf-services-modal-large' : ''
  }`;

  return <div className={modalClasses}>{children}</div>;
};

export default GulfModal;


