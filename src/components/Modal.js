import React from 'react';
import '../styles/Modal.css';

const Modal = ({ title, children, onClose, actions }) => {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-box">
        {title ? <header className="modal-header"><h3>{title}</h3></header> : null}
        <div className="modal-body">{children}</div>
        {actions ? <footer className="modal-footer">{actions}</footer> : null}
        <button className="modal-close" aria-label="Close" onClick={onClose}>×</button>
      </div>
    </div>
  );
};

export default Modal;
