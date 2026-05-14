export const SUPPORT_MODULE_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'ecommerce', label: 'GlobeMart' },
  { value: 'messaging', label: 'LinkUp' },
  { value: 'classifieds', label: 'TradePost' },
  { value: 'realestate', label: 'HomeSphere' },
  { value: 'finance', label: 'Nila Finance Hub' },
  { value: 'freelancer', label: 'NilaWorks' },
  { value: 'billpay', label: 'Nila Utility Hub' },
  { value: 'skilllearning', label: 'Nila Skill Hub' },
  { value: 'fooddelivery', label: 'Feastly' },
  { value: 'devadarshan', label: 'Devadarshan' },
  { value: 'hyperlocal', label: 'Nila Hyperlocal Delivery' },
  { value: 'localservices', label: 'Local Services Marketplace' },
  { value: 'localmarket', label: 'Local Market' },
  { value: 'ridesharing', label: 'SwiftRide' },
  { value: 'matrimonial', label: 'SoulMatch' },
  { value: 'socialmedia', label: 'VibeHub' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const CONTACT_METHOD_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

export const LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English' },
  { value: 'malayalam', label: 'Malayalam' },
];

export const SUPPORT_PAGE_SIZE_OPTIONS = [5, 10, 15, 20];

export const ADMIN_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'awaiting_user', label: 'Awaiting User' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'escalated', label: 'Escalated' },
];

export const AGENT_OPTIONS = [
  { value: '', label: 'Unassigned' },
  { value: 'agent_ashan', label: 'Asha – Support' },
  { value: 'agent_deepa', label: 'Deepa – Support' },
  { value: 'agent_anand', label: 'Anand – Support' },
];

export const CANNED_REPLIES = [
  'Thank you for your ticket. We are reviewing it and will respond shortly.',
  'We have escalated this issue to our specialist team.',
  'Please share any supporting documents so we can proceed faster.',
  'A refund review is in progress. We will update you within 24 hours.',
];

export const CATEGORY_OPTIONS_BY_MODULE = {
  general: [
    { value: 'general', label: 'General' },
    { value: 'account', label: 'Account' },
    { value: 'technical', label: 'Technical' },
    { value: 'feedback', label: 'Feedback' },
  ],
  ecommerce: [
    { value: 'order', label: 'Order' },
    { value: 'payment', label: 'Payment' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'refund', label: 'Refund' },
  ],
  messaging: [
    { value: 'chat', label: 'Chat' },
    { value: 'notification', label: 'Notification' },
    { value: 'privacy', label: 'Privacy' },
  ],
  classifieds: [
    { value: 'listing', label: 'Listing' },
    { value: 'verification', label: 'Verification' },
    { value: 'payment', label: 'Payment' },
  ],
  realestate: [
    { value: 'listing', label: 'Listing' },
    { value: 'visit', label: 'Visit' },
    { value: 'legal', label: 'Legal' },
  ],
  finance: [
    { value: 'loan', label: 'Loan' },
    { value: 'payment', label: 'Payment' },
    { value: 'statement', label: 'Statement' },
  ],
  billpay: [
    { value: 'bill', label: 'Bill Payment' },
    { value: 'refund', label: 'Refund' },
    { value: 'support', label: 'Support' },
  ],
  refund: [
    { value: 'cancellation', label: 'Cancellation' },
    { value: 'refund', label: 'Refund' },
  ],
};
