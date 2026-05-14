import React from 'react';

const GulfToast = ({ message }) => {
  if (!message) return null;
  return <div className="gulf-services-toast">{message}</div>;
};

export default GulfToast;

