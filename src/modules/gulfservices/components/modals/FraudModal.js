import React from 'react';
import GulfModalShell from './GulfModalShell';

const FraudModal = ({ isOpen, onClose, ...props }) => (
  <GulfModalShell
    {...props}
    activeModal={isOpen ? 'fraud' : null}
    closeModal={onClose || props.closeModal}
  />
);

export default FraudModal;
