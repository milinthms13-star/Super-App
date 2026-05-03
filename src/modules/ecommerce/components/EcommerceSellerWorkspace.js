import React from 'react';
import SellerAnalytics from '../SellerAnalytics';

const EcommerceSellerWorkspace = ({ currentUser, isEntrepreneur, children }) => {
  if (!isEntrepreneur) return null;

  return (
    <div className="seller-workspace">
      <SellerAnalytics />
      {children}
    </div>
  );
};

export default EcommerceSellerWorkspace;

