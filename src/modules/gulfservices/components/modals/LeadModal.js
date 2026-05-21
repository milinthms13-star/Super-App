import React from 'react';
import GulfModalShell from './GulfModalShell';

const LeadModal = ({ isOpen, onClose, ...props }) => (
  <GulfModalShell
    {...props}
    activeModal={isOpen ? 'lead' : null}
    closeModal={onClose || props.closeModal}
  />
);

export default LeadModal;
