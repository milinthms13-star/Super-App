/**
 * CA Foundation to Final - Complete Lesson Content
 * Detailed teaching material for each topic before quiz
 */

const caLessonContent = {
  'CA Foundation': {
    'Principles and Practice of Accounting': {
      'Accounting Fundamentals': {
        beginner: {
          title: 'Understanding the Accounting Equation',
          introduction: `Welcome to the fundamental concept of accounting! The accounting equation is the foundation of double-entry bookkeeping and financial accounting. It shows the relationship between what a business owns and how it's financed.`,
          
          sections: [
            {
              title: '1. What is the Accounting Equation?',
              content: `The accounting equation is: **Assets = Liabilities + Capital**

This equation must ALWAYS balance. Let's understand each component:

**Assets:** Everything the business OWNS
- Cash, Bank balance
- Furniture, Building
- Stock, Debtors (customers who owe money)
- Vehicles, Machinery

**Liabilities:** Everything the business OWES
- Creditors (suppliers we owe money to)
- Bank loans, Overdraft
- Outstanding expenses

**Capital:** Owner's investment in the business
- Initial investment
- Profits added
- Drawings subtracted`,
              duration: 10,
            },
            {
              title: '2. Why Does This Equation Work?',
              content: `Think of it this way: If you buy a car for ₹5 lakhs, you need ₹5 lakhs from somewhere!

**Two possibilities:**
1. **Own money (Capital):** Assets = ₹5L, Capital = ₹5L, Liabilities = 0
2. **Loan (Liability):** Assets = ₹5L, Liabilities = ₹5L, Capital = 0
3. **Mix:** Assets = ₹5L, Capital = ₹2L, Liabilities = ₹3L

The equation ALWAYS balances!`,
              examples: [
                {
                  scenario: 'Starting a Business',
                  description: 'Ram starts business with ₹1,00,000 cash',
                  equation: 'Assets (Cash ₹1,00,000) = Capital (₹1,00,000) + Liabilities (0)',
                  balanced: true,
                },
                {
                  scenario: 'Buying Furniture',
                  description: 'Bought furniture for ₹20,000 cash',
                  equation: 'Assets (Cash ₹80,000 + Furniture ₹20,000) = Capital (₹1,00,000)',
                  balanced: true,
                  note: 'Total assets still = ₹1,00,000',
                },
                {
                  scenario: 'Taking a Loan',
                  description: 'Took bank loan of ₹50,000',
                  equation: 'Assets (₹1,50,000) = Capital (₹1,00,000) + Liabilities (₹50,000)',
                  balanced: true,
                },
              ],
              duration: 15,
            },
          ],
          
          keyTakeaways: [
            'Assets = Liabilities + Capital ALWAYS',
            'Every transaction affects at least 2 accounts',
            'The equation must balance after every transaction',
            'Assets increase on debit side, decrease on credit side',
            'Liabilities and Capital increase on credit side',
          ],
          
          practiceQuestions: [
            'If Assets = ₹5,00,000 and Liabilities = ₹2,00,000, what is Capital?',
            'A business has Capital of ₹3,00,000. If Liabilities = ₹1,00,000, find Assets.',
            'What happens to the equation when you buy goods for cash?',
          ],
          
          realWorldApplication: 'Every business balance sheet is based on this equation. Understanding this helps you read any company\'s financial statements!',
          
          nextTopic: 'Golden Rules of Accounting',
          estimatedTime: 30,
        },
      },
      
      'Journal Entries': {
        beginner: {
          title: 'Journal Entries - The Language of Accounting',
          introduction: `Journal is the book where we FIRST record every business transaction. Think of it as your business diary - you write everything that happens, in date order, following specific rules.`,
          
          sections: [
            {
              title: '1. What is a Journal Entry?',
              content: `A journal entry is a record of a business transaction showing:
- **Date** of transaction
- **Accounts affected** (at least 2)
- **Which account to DEBIT** (Dr.)
- **Which account to CREDIT** (Cr.)
- **Amount**
- **Narration** (brief explanation)

**Format:**
\`\`\`
Date: 01-04-2024
Particulars               Dr.    Cr.
Account to Debit    Dr.  ₹XXX
  To Account to Credit         ₹XXX
(Being narration)
\`\`\``,
              duration: 10,
            },
            {
              title: '2. The Golden Rules - Your Secret Weapon!',
              content: `These 3 rules tell you WHAT to debit and WHAT to credit:

**1. Personal Account** (People, Companies, Banks)
   - **Debit** the Receiver
   - **Credit** the Giver

**2. Real Account** (Assets - things you can touch)
   - **Debit** what Comes In
   - **Credit** what Goes Out

**3. Nominal Account** (Expenses, Income, Losses, Gains)
   - **Debit** all Expenses and Losses
   - **Credit** all Incomes and Gains

**Memory Trick:** "Dear PC, Come In - Go Out, Expenses In - Income Out"`,
              examples: [],
              duration: 15,
            },
          ],
        },
      },
    },
  },
};

module.exports = { caLessonContent };

// Add more detailed examples for Journal Entries
const journalExamples = {
  beginner: [
    {
      title: 'Example 1: Cash Purchase',
      transaction: 'Bought furniture for ₹20,000 cash on 1st April',
      analysis: `
Step 1: Identify accounts
- Furniture A/c (Real account - Asset)
- Cash A/c (Real account - Asset)

Step 2: Apply golden rule
- Furniture comes IN → Debit Furniture
- Cash goes OUT → Credit Cash

Step 3: Journal Entry:
Date: 01-04-2024
Furniture A/c           Dr.  20,000
  To Cash A/c                      20,000
(Being furniture purchased for cash)`,
      explanation: 'We got furniture (debit), we gave cash (credit)',
    },
    {
      title: 'Example 2: Credit Purchase',
      transaction: 'Bought goods worth ₹50,000 from Sharma & Co. on credit on 5th April',
      analysis: `
Step 1: Identify accounts
- Purchases A/c (Nominal account - Expense)
- Sharma & Co. (Personal account - Creditor)

Step 2: Apply golden rule
- Purchases is expense → Debit Purchases
- Sharma & Co. gives goods → Credit Giver

Step 3: Journal Entry:
Date: 05-04-2024
Purchases A/c          Dr.  50,000
  To Sharma & Co.                  50,000
(Being goods purchased on credit from Sharma & Co.)`,
      explanation: 'We got goods (debit expense), Sharma gave us goods (credit giver)',
    },
    {
      title: 'Example 3: Cash Sales',
      transaction: 'Sold goods for ₹30,000 cash on 10th April',
      analysis: `
Step 1: Identify accounts
- Cash A/c (Real account)
- Sales A/c (Nominal account - Income)

Step 2: Apply golden rule
- Cash comes IN → Debit Cash
- Sales is income → Credit Income

Step 3: Journal Entry:
Date: 10-04-2024
Cash A/c               Dr.  30,000
  To Sales A/c                     30,000
(Being goods sold for cash)`,
      explanation: 'We got cash (debit what comes in), we earned sales income (credit income)',
    },
    {
      title: 'Example 4: Payment to Creditor',
      transaction: 'Paid ₹25,000 to Sharma & Co. by cheque on 15th April',
      analysis: `
Step 1: Identify accounts
- Sharma & Co. (Personal account)
- Bank A/c (Personal account - Bank is like a person)

Step 2: Apply golden rule
- Sharma receives payment → Debit Receiver
- Bank gives money → Credit Giver

Step 3: Journal Entry:
Date: 15-04-2024
Sharma & Co.           Dr.  25,000
  To Bank A/c                      25,000
(Being payment made to Sharma & Co. by cheque)`,
      explanation: 'Sharma received money (debit receiver), Bank gave money (credit giver)',
    },
  ],
};


// CA Intermediate - Income Tax Detailed Lesson
const incomeTaxLesson = {
  'CA Intermediate': {
    'Income Tax': {
      'Basic Concepts': {
        intermediate: {
          title: 'Income Tax Basics - Understanding Previous Year and Assessment Year',
          introduction: `Welcome to Income Tax! This is one of the most practical and important subjects in CA. Let me teach you the foundational concepts that you'll use throughout your CA career and practice.`,
          
          sections: [
            {
              title: '1. What is Income Tax?',
              content: `Income Tax is a **direct tax** levied by the Central Government on the income earned by individuals, companies, and other entities.

**Key Points:**
- **Direct Tax:** Paid directly by the person on whom it is imposed
- **Central Tax:** Collected by Central Government (not states)
- **Governed by:** Income Tax Act, 1961
- **Administered by:** Central Board of Direct Taxes (CBDT)

**Why Learn Income Tax?**
- File your own tax returns
- Help clients save tax legally
- Most practical CA subject
- Used daily in CA practice`,
              duration: 8,
            },
            {
              title: '2. Previous Year - The Income Earning Year',
              content: `**Definition:** Previous Year is the financial year in which income is EARNED.

**Financial Year in India:**
- Starts: 1st April
- Ends: 31st March
- Example: FY 2023-24 means 1st April 2023 to 31st March 2024

**Simple Example:**
You earn salary from April 2023 to March 2024.
→ Previous Year = 2023-24 (This is when you EARNED)

**Important:** Income tax is calculated on income of Previous Year.`,
              examples: [
                {
                  scenario: 'Salary Income',
                  description: 'Ram earns ₹10 lakh salary from April 2023 to March 2024',
                  previousYear: '2023-24',
                  explanation: 'This is the year when income was earned',
                },
                {
                  scenario: 'Business Income',
                  description: 'Shop profit of ₹5 lakh during FY 2023-24',
                  previousYear: '2023-24',
                  explanation: 'Business runs for this financial year',
                },
              ],
              duration: 10,
            },
            {
              title: '3. Assessment Year - The Tax Payment Year',
              content: `**Definition:** Assessment Year is the financial year following the Previous Year in which income is ASSESSED and tax is PAID.

**Formula:**
Assessment Year = Previous Year + 1

**Examples:**
- Previous Year 2023-24 → Assessment Year 2024-25
- Previous Year 2022-23 → Assessment Year 2023-24

**Why Different Years?**
You need time to:
1. Calculate your total income
2. File tax return
3. Get it assessed
4. Pay any balance tax

**Memory Trick:**
First you EARN (Previous Year)
Then you FILE and PAY (Assessment Year)`,
              examples: [
                {
                  scenario: 'Complete Cycle',
                  description: `April 2023 - March 2024: You earn ₹12 lakh
Previous Year: 2023-24

July 2024: You file Income Tax Return
Assessment Year: 2024-25

This return shows income of PY 2023-24
Filed and assessed in AY 2024-25`,
                  keyPoint: 'Always one year gap between earning and assessment',
                },
              ],
              duration: 12,
            },
            {
              title: '4. Important Abbreviations',
              content: `**Must Know:**
- **PY:** Previous Year
- **AY:** Assessment Year
- **FY:** Financial Year
- **ITR:** Income Tax Return
- **TDS:** Tax Deducted at Source
- **PAN:** Permanent Account Number

**How to Write:**
- Previous Year: 2023-24 or PY 2023-24
- Assessment Year: 2024-25 or AY 2024-25
- Always mention AY in return heading`,
              duration: 5,
            },
            {
              title: '5. Practical Applications',
              content: `**In Your CA Practice:**

**Scenario 1: Client Visit**
Client: "I earned ₹8 lakh in 2023-24, when do I file return?"
You: "Your PY is 2023-24, you'll file return in AY 2024-25, due date is 31st July 2024"

**Scenario 2: Tax Planning**
Client: "I want to save tax for income earned in 2023-24"
You: "Your investments must be done BEFORE 31st March 2024 (last day of PY)"

**Scenario 3: Notices**
Client: "Got notice for AY 2023-24"
You: "This is for income earned in PY 2022-23"`,
              duration: 10,
            },
          ],
          
          keyTakeaways: [
            'Previous Year = Year when income is EARNED (1st April to 31st March)',
            'Assessment Year = Year when income is ASSESSED and tax is PAID',
            'Assessment Year = Previous Year + 1',
            'Example: PY 2023-24 → AY 2024-25',
            'Income Tax Return filed in Assessment Year shows Previous Year income',
            'TDS deducted in Previous Year, but claimed in Assessment Year return',
          ],
          
          commonMistakes: [
            '❌ Filing return in Previous Year itself',
            '❌ Confusing PY with AY',
            '❌ Writing wrong AY in return',
            '❌ Not knowing which year\'s income to show',
          ],
          
          examTips: [
            'Always identify PY and AY in questions',
            'If question says "for AY 2024-25", income relates to PY 2023-24',
            'Return filing date is in Assessment Year',
            'Due dates are always in Assessment Year',
          ],
          
          practiceQuestions: [
            'If income earned from 1.4.2023 to 31.3.2024, what is PY and AY?',
            'ITR for AY 2024-25 will show income of which Previous Year?',
            'Why is there a gap of one year between PY and AY?',
            'If you get a notice for AY 2023-24, which year\'s income is being questioned?',
          ],
          
          realWorldApplication: `As a CA, you'll use these concepts DAILY when:
- Filing tax returns
- Responding to tax notices
- Tax planning for clients
- Computing advance tax
- Claiming TDS credit
- Maintaining tax records`,
          
          nextTopic: 'Residential Status and Tax Incidence',
          estimatedTime: 45,
        },
      },
    },
  },
};

// Merge with main content
Object.assign(caLessonContent, incomeTaxLesson);
