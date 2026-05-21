import React from 'react';
import GulfModalShell from './GulfModalShell';

const VisaModal = ({ isOpen, onClose, ...props }) => (
  <GulfModalShell
    {...props}
    activeModal={isOpen ? 'visa' : null}
    closeModal={onClose || props.closeModal}
  />
);

export default VisaModal;
