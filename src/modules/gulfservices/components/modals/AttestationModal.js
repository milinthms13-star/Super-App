import React from 'react';
import GulfModalShell from './GulfModalShell';

const AttestationModal = ({ isOpen, onClose, ...props }) => (
  <GulfModalShell
    {...props}
    activeModal={isOpen ? 'attestation' : null}
    closeModal={onClose || props.closeModal}
  />
);

export default AttestationModal;
