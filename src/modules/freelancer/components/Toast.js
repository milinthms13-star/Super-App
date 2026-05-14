// Toast.js - Consistent toast notification (scaffold)
import React from 'react';
const Toast = ({ message, type }) => <div className={`toast toast-${type}`}>{message}</div>;
export default Toast;
