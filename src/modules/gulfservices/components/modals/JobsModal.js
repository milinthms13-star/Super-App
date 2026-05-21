import React from 'react';
import GulfModalShell from './GulfModalShell';

const JobsModal = ({ isOpen, onClose, ...props }) => (
  <GulfModalShell
    {...props}
    activeModal={isOpen ? 'jobs' : null}
    closeModal={onClose || props.closeModal}
  />
);

export default JobsModal;
