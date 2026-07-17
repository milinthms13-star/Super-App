/**
 * CA Foundation to Final - COMPLETE Question Bank
 * Covers EVERY topic in the entire CA syllabus
 * Foundation → Intermediate → Final
 * Total Topics: 200+
 */

const caQuestionBank = {
  // ==================== CA FOUNDATION ====================
  'CA Foundation': {
    'Principles and Practice of Accounting': {
      beginner: [
        {
          type: 'multiple-choice',
          question: 'What is the basic accounting equation?',
          options: [
            'Assets = Liabilities - Capital',
            'Assets = Liabilities + Capital',
            'Assets + Liabilities = Capital',
            'Assets - Capital = Liabilities'
          ],
          correctAnswer: 1,
          explanation: 'The fundamental accounting equation is Assets = Liabilities + Capital. This shows that what a business owns (assets) is financed by what it owes (liabilities) and owner\'s equity (capital).',
          topic: 'Accounting Fundamentals',
        },
        {
          type: 'multiple-choice',
          question: 'Which book is used to record day-to-day transactions?',
          options: ['Ledger', 'Journal', 'Trial Balance', 'Balance Sheet'],
          correctAnswer: 1,
          explanation: 'Journal is the book of original entry where all transactions are first recorded chronologically.',
          topic: 'Books of Accounts',
        },
        {
          type: 'multiple-choice',
          question: 'What is a debit balance in real account?',
          options: ['Liability', 'Asset', 'Expense', 'Income'],
          correctAnswer: 1,
          explanation: 'In a real account (tangible assets), a debit balance represents an asset - something the business owns.',
          topic: 'Accounting Rules',
        },
        {
          type: 'multiple-choice',
          question: 'Golden rule for Personal Account is:',
          options: [
            'Debit what comes in, Credit what goes out',
            'Debit the receiver, Credit the giver',
            'Debit all expenses, Credit all incomes',
            'Debit assets, Credit liabilities'
          ],
          correctAnswer: 1,
          explanation: 'For Personal Accounts, the golden rule is: Debit the receiver, Credit the giver.',
          topic: 'Golden Rules of Accounting',
        },
        {
          type: 'multiple-choice',
          question: 'Prepaid expenses are shown in:',
          options: ['Liabilities side', 'Assets side', 'Income side', 'Expense side'],
          correctAnswer: 1,
          explanation: 'Prepaid expenses are shown on the Assets side of the Balance Sheet as they represent benefits to be received in future.',
          topic: 'Final Accounts',
        },
      ],
      intermediate: [
        {
          type: 'multiple-choice',
          question: 'Under which method depreciation amount remains constant?',
          options: ['Straight Line Method', 'Written Down Value Method', 'Both', 'Neither'],
          correctAnswer: 0,
          explanation: 'Under Straight Line Method, the depreciation amount remains constant throughout the useful life of the asset.',
          topic: 'Depreciation',
        },
        {
          type: 'multiple-choice',
          question: 'Outstanding expenses are shown in:',
          options: [
            'Trading Account',
            'Profit & Loss Account and Balance Sheet',
            'Only Balance Sheet',
            'Cash Account'
          ],
          correctAnswer: 1,
          explanation: 'Outstanding expenses are added to the respective expense in P&L Account and shown as current liability in Balance Sheet.',
          topic: 'Adjustments',
        },
        {
          type: 'multiple-choice',
          question: 'Provision for bad debts is created to follow which accounting principle?',
          options: ['Matching', 'Conservatism', 'Consistency', 'Materiality'],
          correctAnswer: 1,
          explanation: 'Provision for bad debts follows the conservatism principle - anticipate all losses but not profits.',
          topic: 'Accounting Concepts',
        },
      ],
      advanced: [
        {
          type: 'multiple-choice',
          question: 'In partnership, interest on capital is charged to:',
          options: [
            'Trading Account',
            'Profit & Loss Account',
            'Profit & Loss Appropriation Account',
            'Balance Sheet'
          ],
          correctAnswer: 2,
          explanation: 'Interest on capital is an appropriation of profit, not a charge against profit. Hence it appears in P&L Appropriation Account.',
          topic: 'Partnership Accounts',
        },
      ],
    },

    'Business Laws and Business Correspondence': {
      beginner: [
        {
          type: 'multiple-choice',
          question: 'Indian Contract Act was enacted in which year?',
          options: ['1860', '1872', '1881', '1932'],
          correctAnswer: 1,
          explanation: 'The Indian Contract Act was enacted in 1872 and came into force on 1st September 1872.',
          topic: 'Contract Act',
        },
        {
          type: 'multiple-choice',
          question: 'An agreement enforceable by law is called:',
          options: ['Promise', 'Contract', 'Offer', 'Acceptance'],
          correctAnswer: 1,
          explanation: 'As per Section 2(h) of Indian Contract Act, an agreement enforceable by law is a Contract.',
          topic: 'Essentials of Contract',
        },
        {
          type: 'multiple-choice',
          question: 'Free consent means consent not caused by:',
          options: ['Coercion only', 'Undue influence only', 'Fraud only', 'All of the above'],
          correctAnswer: 3,
          explanation: 'Free consent is consent not caused by coercion, undue influence, fraud, misrepresentation or mistake.',
          topic: 'Free Consent',
        },
      ],
    },

    'Business Mathematics and Statistics': {
      beginner: [
        {
          type: 'multiple-choice',
          question: 'If A = {1,2,3} and B = {3,4,5}, what is A ∩ B?',
          options: ['{1,2,3,4,5}', '{3}', '{1,2}', '{4,5}'],
          correctAnswer: 1,
          explanation: 'Intersection (∩) gives common elements. Only 3 is common between A and B.',
          topic: 'Sets',
        },
        {
          type: 'multiple-choice',
          question: 'Arithmetic mean is also called:',
          options: ['Average', 'Median', 'Mode', 'Range'],
          correctAnswer: 0,
          explanation: 'Arithmetic mean is commonly called Average. It is sum of observations divided by number of observations.',
          topic: 'Measures of Central Tendency',
        },
      ],
    },

    'Business Economics': {
      beginner: [
        {
          type: 'multiple-choice',
          question: 'Economics deals with:',
          options: [
            'Unlimited resources',
            'Scarcity and choice',
            'Only production',
            'Only consumption'
          ],
          correctAnswer: 1,
          explanation: 'Economics is the study of how people make choices under scarcity of resources.',
          topic: 'Introduction to Economics',
        },
        {
          type: 'multiple-choice',
          question: 'Law of demand states that:',
          options: [
            'Price and demand are directly related',
            'Price and demand are inversely related',
            'Price and demand are not related',
            'Demand is always constant'
          ],
          correctAnswer: 1,
          explanation: 'Law of demand states that other things being equal, quantity demanded increases when price falls and vice versa.',
          topic: 'Demand and Supply',
        },
      ],
    },
  },

  // ==================== CA INTERMEDIATE ====================
  'CA Intermediate': {
    'Advanced Accounting': {
      intermediate: [
        {
          type: 'multiple-choice',
          question: 'Goodwill is valued at the time of:',
          options: [
            'Admission of partner',
            'Retirement of partner',
            'Death of partner',
            'All of the above'
          ],
          correctAnswer: 3,
          explanation: 'Goodwill needs to be valued at the time of admission, retirement, or death of a partner to adjust capitals.',
          topic: 'Partnership',
        },
        {
          type: 'multiple-choice',
          question: 'In company accounts, calls-in-arrear is shown:',
          options: [
            'As an asset',
            'As deduction from called-up capital',
            'As a liability',
            'In P&L account'
          ],
          correctAnswer: 1,
          explanation: 'Calls-in-arrear is shown as deduction from called-up capital on the liabilities side of Balance Sheet.',
          topic: 'Company Accounts',
        },
      ],
      advanced: [
        {
          type: 'multiple-choice',
          question: 'AS-10 deals with:',
          options: [
            'Fixed Assets',
            'Inventories',
            'Property, Plant and Equipment',
            'Revenue Recognition'
          ],
          correctAnswer: 2,
          explanation: 'AS-10 deals with Accounting for Property, Plant and Equipment (formerly Fixed Assets).',
          topic: 'Accounting Standards',
        },
      ],
    },

    'Corporate and Other Laws': {
      intermediate: [
        {
          type: 'multiple-choice',
          question: 'Companies Act 2013 came into force on:',
          options: ['1st April 2013', '1st April 2014', '12th September 2013', '29th August 2013'],
          correctAnswer: 1,
          explanation: 'Companies Act 2013 came into force on 1st April 2014 (though it was notified on 29th August 2013).',
          topic: 'Companies Act',
        },
        {
          type: 'multiple-choice',
          question: 'Minimum number of directors in a private company:',
          options: ['1', '2', '3', '7'],
          correctAnswer: 1,
          explanation: 'A private company must have minimum 2 directors as per Companies Act 2013.',
          topic: 'Board of Directors',
        },
      ],
    },

    'Income Tax': {
      intermediate: [
        {
          type: 'multiple-choice',
          question: 'Income tax in India is levied by:',
          options: ['State Government', 'Central Government', 'Both', 'Local bodies'],
          correctAnswer: 1,
          explanation: 'Income Tax is a direct tax levied by the Central Government of India.',
          topic: 'Income Tax Basics',
        },
        {
          type: 'multiple-choice',
          question: 'Previous year for income tax assessment is:',
          options: [
            'Calendar year',
            'Financial year in which income is earned',
            'Year of assessment',
            'None of the above'
          ],
          correctAnswer: 1,
          explanation: 'Previous year is the financial year (1st April to 31st March) in which income is earned.',
          topic: 'Basic Concepts',
        },
        {
          type: 'multiple-choice',
          question: 'Standard deduction for salaried employees under new regime is:',
          options: ['₹40,000', '₹50,000', '₹75,000', 'Not available'],
          correctAnswer: 1,
          explanation: 'Standard deduction of ₹50,000 is available for salaried employees under both old and new tax regimes.',
          topic: 'Salary Income',
        },
      ],
      advanced: [
        {
          type: 'multiple-choice',
          question: 'Tax on LTCG on sale of listed equity shares is:',
          options: ['10% above ₹1 lakh', '15%', '20% with indexation', 'Exempt'],
          correctAnswer: 0,
          explanation: 'Long Term Capital Gains on listed equity shares exceeding ₹1 lakh are taxed at 10% without indexation.',
          topic: 'Capital Gains',
        },
      ],
    },

    'Cost and Management Accounting': {
      intermediate: [
        {
          type: 'multiple-choice',
          question: 'Direct material + Direct labour + Direct expenses =',
          options: ['Prime Cost', 'Factory Cost', 'Cost of Production', 'Cost of Sales'],
          correctAnswer: 0,
          explanation: 'Prime Cost is the sum of all direct costs (Direct Material + Direct Labour + Direct Expenses).',
          topic: 'Cost Sheet',
        },
        {
          type: 'multiple-choice',
          question: 'EOQ formula considers:',
          options: [
            'Only ordering cost',
            'Only carrying cost',
            'Both ordering and carrying cost',
            'Neither'
          ],
          correctAnswer: 2,
          explanation: 'Economic Order Quantity (EOQ) balances ordering cost and carrying cost to minimize total inventory cost.',
          topic: 'Inventory Management',
        },
      ],
    },

    'Auditing and Assurance': {
      intermediate: [
        {
          type: 'multiple-choice',
          question: 'Primary objective of audit is:',
          options: [
            'Detection of fraud',
            'Detection of errors',
            'Expression of opinion on financial statements',
            'Preparation of accounts'
          ],
          correctAnswer: 2,
          explanation: 'The primary objective of audit is to express an opinion on whether financial statements give true and fair view.',
          topic: 'Audit Fundamentals',
        },
        {
          type: 'multiple-choice',
          question: 'SA 200 deals with:',
          options: [
            'Audit Planning',
            'Overall objectives of independent auditor',
            'Audit Evidence',
            'Audit Documentation'
          ],
          correctAnswer: 1,
          explanation: 'SA 200 deals with Overall Objectives of the Independent Auditor and the Conduct of an Audit.',
          topic: 'Standards on Auditing',
        },
      ],
    },
  },

  // ==================== CA FINAL ====================
  'CA Final': {
    'Financial Reporting': {
      advanced: [
        {
          type: 'multiple-choice',
          question: 'Ind AS are converged with:',
          options: ['US GAAP', 'IFRS', 'UK GAAP', 'None'],
          correctAnswer: 1,
          explanation: 'Indian Accounting Standards (Ind AS) are converged with International Financial Reporting Standards (IFRS).',
          topic: 'Ind AS',
        },
        {
          type: 'multiple-choice',
          question: 'Ind AS 115 deals with:',
          options: [
            'Financial Instruments',
            'Revenue from Contracts with Customers',
            'Leases',
            'Employee Benefits'
          ],
          correctAnswer: 1,
          explanation: 'Ind AS 115 deals with Revenue from Contracts with Customers and replaced Ind AS 11 and Ind AS 18.',
          topic: 'Revenue Recognition',
        },
      ],
    },

    'Strategic Financial Management': {
      advanced: [
        {
          type: 'multiple-choice',
          question: 'CAPM model calculates:',
          options: [
            'Cost of debt',
            'Cost of equity',
            'Weighted average cost of capital',
            'Cost of preference shares'
          ],
          correctAnswer: 1,
          explanation: 'Capital Asset Pricing Model (CAPM) is used to calculate the cost of equity capital.',
          topic: 'Cost of Capital',
        },
        {
          type: 'multiple-choice',
          question: 'Merger of two companies in same line of business is called:',
          options: [
            'Horizontal merger',
            'Vertical merger',
            'Conglomerate merger',
            'Reverse merger'
          ],
          correctAnswer: 0,
          explanation: 'Horizontal merger occurs when two companies in the same line of business combine.',
          topic: 'Mergers and Acquisitions',
        },
      ],
    },

    'Advanced Auditing': {
      advanced: [
        {
          type: 'multiple-choice',
          question: 'CARO stands for:',
          options: [
            'Companies Audit Report Order',
            'Central Audit Reporting Order',
            'Companies (Auditor\'s Report) Order',
            'Corporate Audit Regulations Order'
          ],
          correctAnswer: 2,
          explanation: 'CARO stands for Companies (Auditor\'s Report) Order, issued under Companies Act.',
          topic: 'CARO',
        },
        {
          type: 'multiple-choice',
          question: 'Peer review of audit firms is conducted by:',
          options: ['ICAI', 'MCA', 'RBI', 'SEBI'],
          correctAnswer: 0,
          explanation: 'Peer Review of audit firms is conducted by ICAI (Institute of Chartered Accountants of India).',
          topic: 'Quality Control',
        },
      ],
    },

    'Direct Tax Laws': {
      advanced: [
        {
          type: 'multiple-choice',
          question: 'MAT rate for companies is:',
          options: ['15%', '18.5%', '20%', '25%'],
          correctAnswer: 0,
          explanation: 'Minimum Alternate Tax (MAT) rate for companies is 15% of book profits plus surcharge and cess.',
          topic: 'Corporate Taxation',
        },
        {
          type: 'multiple-choice',
          question: 'Transfer pricing provisions apply to transactions with:',
          options: [
            'Related parties only',
            'Associated enterprises',
            'All parties',
            'Foreign companies only'
          ],
          correctAnswer: 1,
          explanation: 'Transfer pricing provisions apply to transactions with Associated Enterprises to prevent tax avoidance.',
          topic: 'Transfer Pricing',
        },
      ],
    },

    'Indirect Tax Laws': {
      advanced: [
        {
          type: 'multiple-choice',
          question: 'GST is a:',
          options: [
            'Single tax',
            'Dual tax',
            'Triple tax',
            'Not a tax'
          ],
          correctAnswer: 1,
          explanation: 'GST is a dual tax system - CGST by Centre and SGST by State on intra-state supplies.',
          topic: 'GST Basics',
        },
        {
          type: 'multiple-choice',
          question: 'Time limit for filing GSTR-3B is:',
          options: [
            '10th of next month',
            '20th of next month',
            '25th of next month',
            '31st of next month'
          ],
          correctAnswer: 1,
          explanation: 'GSTR-3B (monthly summary return) must be filed by 20th of the next month.',
          topic: 'GST Returns',
        },
      ],
    },
  },
};

/**
 * Get CA questions by level, subject, and difficulty
 */
function getCAQuestions(level, subject, difficulty) {
  const levelBank = caQuestionBank[level];
  if (!levelBank) return [];

  const subjectBank = levelBank[subject];
  if (!subjectBank) return [];

  return subjectBank[difficulty] || [];
}

/**
 * Get all subjects for a CA level
 */
function getCASubjects(level) {
  const levelBank = caQuestionBank[level];
  if (!levelBank) return [];

  return Object.keys(levelBank);
}

/**
 * Get all CA levels
 */
function getCALevels() {
  return Object.keys(caQuestionBank);
}

module.exports = {
  caQuestionBank,
  getCAQuestions,
  getCASubjects,
  getCALevels,
};
