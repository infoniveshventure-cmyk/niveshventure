export type FaqNode = {
  id: string;
  question: string;
  answer: string; // step-by-step guide text
  next?: string[]; // ids of related follow-up questions
  category?: string;
};

// Define standard categories
const categoriesList = [
  "Account",
  "Wallet",
  "Investment",
  "Withdrawal",
  "P2P",
  "Dashboard",
  "Support"
];

// Core Q&A items mapped to specific categories
const coreFaqs: FaqNode[] = [
  // --- Account ---
  {
    id: "acc_activation",
    question: "How do I activate my account?",
    answer: "To activate your account:\n- Choose the $30 Premium plan to enable MLM income eligibility.\n- Submit the activation form from your dashboard.\n- Free activation (Free PIN) is also available but excludes MLM bonuses.",
    category: "Account"
  },
  {
    id: "acc_profile",
    question: "How do I update my profile?",
    answer: "To update your profile:\n- Go to Settings → Profile.\n- You can edit your registered name, phone, or country.\n- Verify changes using the OTP sent to your registered Gmail.",
    category: "Account"
  },
  {
    id: "acc_login_issue",
    question: "I am having login issues. What should I do?",
    answer: "If you are having trouble logging in:\n- Ensure you are using the correct registered email and password.\n- Double check your Login Key sent in the welcome email.\n- Clear browser cache or try an incognito window.",
    category: "Account"
  },
  {
    id: "acc_reset_pass",
    question: "How do I reset my password?",
    answer: "To reset your password:\n- Click on the 'Forgot Password' link on the login page.\n- Input your registered Gmail to receive a password reset link/OTP.\n- Complete the OTP verification steps to set a new password.",
    category: "Account"
  },
  {
    id: "acc_keys",
    question: "How do I retrieve or change my Access Key or Login Key?",
    answer: "To retrieve or change your keys:\n- Navigate to Settings → Security.\n- For Login Key: Verify the OTP sent to your registered email and set a new key.\n- For Access Key: Verify via Gmail OTP, then input your current Login Key to confirm identity.",
    category: "Account"
  },

  // --- Wallet ---
  {
    id: "wal_balance",
    question: "How do I check my wallet balance?",
    answer: "To check your wallet balance:\n- Navigate to the Wallets dashboard screen.\n- View the individual balances for USDT, Referral, Matching, and Returns wallets.\n- Tap on any wallet to see the specific ledger logs.",
    category: "Wallet"
  },
  {
    id: "wal_types",
    question: "What are the different wallet types?",
    answer: "We have separate wallets for transparent tracking:\n- USDT Wallet: Holds cryptocurrency deposits and withdrawal balances.\n- Referral Wallet: Stores your direct referral commissions.\n- Matching Wallet: Matched binary tree commission balances.\n- Returns Wallet: Stores daily ROI yield payouts.\n- Returns Level Wallet: Holds downline ROI percentages.\n- Booster Wallet: Stores booster speed-up rewards.",
    category: "Wallet"
  },
  {
    id: "wal_deposit",
    question: "How do I deposit funds into my wallet?",
    answer: "To deposit funds:\n- Go to the Deposit section on the panel.\n- Copy the unique USDT (TRC20) address or scan the QR code.\n- Transfer funds from your external crypto wallet.\n- The system automatically credits your USDT Wallet after network confirmation.",
    category: "Wallet"
  },
  {
    id: "wal_deduction",
    question: "Why was a deduction made from my wallet?",
    answer: "Deductions occur for the following reasons:\n- Membership activation charges ($30 premium plan).\n- Investment purchases funded directly from your USDT wallet.\n- Admin processing fees or withdrawal transactional deductions.",
    category: "Wallet"
  },
  {
    id: "wal_history",
    question: "Where can I view my wallet transaction history?",
    answer: "To view transaction history:\n- Go to the Statement page or the specific Wallet page.\n- Use the transaction type filter to isolate credit/debit records.\n- View timestamps, transaction IDs, status, and balance changes.",
    category: "Wallet"
  },

  // --- Investment ---
  {
    id: "inv_how_to",
    question: "How do I make a new investment?",
    answer: "To make an investment:\n- Go to the Invest page.\n- Enter the desired investment amount in USDT.\n- Select the wallet you want to fund the investment from.\n- Confirm using your transaction Access Key.",
    category: "Investment"
  },
  {
    id: "inv_wallet_selection",
    question: "Which wallet is selected during investment?",
    answer: "Investment funding rules:\n- You can choose to invest using your USDT Wallet balance.\n- Alternatively, you can use available activation packages or activation wallets if configured.\n- Ensure you have topped up enough USDT before investing.",
    category: "Investment"
  },
  {
    id: "inv_history",
    question: "How can I check my investment history?",
    answer: "To check investment history:\n- Go to the Invest page.\n- Scroll to the 'My Investment Packages' list.\n- View package details, investment dates, principal amounts, and total yields accumulated.",
    category: "Investment"
  },
  {
    id: "inv_status",
    question: "What does my investment status mean?",
    answer: "Investment packages can have the following statuses:\n- Active: Currently generating daily ROI yields.\n- Completed: Reached the maximum capping return (e.g. 300% capping limit).\n- Suspended: On hold due to account changes.",
    category: "Investment"
  },

  // --- Withdrawal ---
  {
    id: "wth_process",
    question: "What is the withdrawal process?",
    answer: "To request a withdrawal:\n- Navigate to the Withdrawal page.\n- Input your external USDT (TRC20) wallet destination address.\n- Enter the amount and verify using your transaction Access Key.\n- Submit the request for processing.",
    category: "Withdrawal"
  },
  {
    id: "wth_status",
    question: "How do I check my withdrawal status?",
    answer: "To check withdrawal status:\n- Open the Withdrawal page.\n- Scroll down to the 'Withdrawal History' table.\n- Statuses include: Pending (awaiting admin review), Approved (processed to blockchain), or Rejected (returned to wallet).",
    category: "Withdrawal"
  },
  {
    id: "wth_history",
    question: "Where can I see my withdrawal history?",
    answer: "Your withdrawal history is displayed in:\n- The Withdrawal page history section.\n- The central Statement logs under the 'debit' type filter.",
    category: "Withdrawal"
  },
  {
    id: "wth_rules",
    question: "What are the withdrawal charges and rules?",
    answer: "Withdrawal rules:\n- Minimum withdrawal limit applies (e.g. $10 or as set in settings).\n- Transaction processing fee is deducted from the payout amount.\n- Withdrawals are processed according to the system closing cycles.",
    category: "Withdrawal"
  },

  // --- P2P ---
  {
    id: "p2p_send",
    question: "How do I send money to another member (P2P)?",
    answer: "To perform a P2P transfer:\n- Navigate to the P2P Transfer section under Wallets.\n- Enter the recipient's Member ID (verify recipient's name displayed).\n- Input transfer amount and click submit.",
    category: "P2P"
  },
  {
    id: "p2p_wallet_selection",
    question: "Which wallet is used during P2P transfer?",
    answer: "P2P wallet rules:\n- Transfers are funded from your USDT Wallet or active commission wallets depending on platform rules.\n- Ensure you check the selected source wallet dropdown before confirming.",
    category: "P2P"
  },
  {
    id: "p2p_receiver",
    question: "What receiver details are required for P2P?",
    answer: "Required receiver details:\n- You must have the correct Member ID of the downline or recipient.\n- The system will show a validation badge with the recipient's Full Name to avoid errors.",
    category: "P2P"
  },
  {
    id: "p2p_history",
    question: "Where can I view P2P transfer history?",
    answer: "P2P history tracking:\n- Go to the Wallets / P2P section.\n- View the outgoing transfers list (sent) and incoming transfers list (received).",
    category: "P2P"
  },

  // --- Dashboard ---
  {
    id: "dash_income",
    question: "Where can I view my income summary?",
    answer: "To view your income summary:\n- Look at the top stats grids on your Dashboard.\n- It displays your Referral, Matching, and Returns income summaries in real time.",
    category: "Dashboard"
  },
  {
    id: "dash_business",
    question: "Where can I find my team business details?",
    answer: "To find team business details:\n- Scroll to the Business Volume widgets on the Dashboard.\n- View your Left Leg Business and Right Leg Business volume totals.",
    category: "Dashboard"
  },
  {
    id: "dash_transactions",
    question: "How do I view my recent transactions?",
    answer: "To view recent transactions:\n- Scroll to the bottom of the main Dashboard page.\n- The 'Recent Transactions' table lists your latest 5 wallet entries.",
    category: "Dashboard"
  },
  {
    id: "dash_network",
    question: "Where is my network and binary tree information?",
    answer: "To find network info:\n- Go to the Team section from the navigation menu.\n- View your direct referrals list or the interactive Binary Genealogy tree view.",
    category: "Dashboard"
  },

  // --- Support ---
  {
    id: "sup_ticket",
    question: "How do I raise a support ticket?",
    answer: "To raise a support ticket:\n- Go to the Support page or click 'Contact Human Support' in the chatbot.\n- Input a brief subject, select a category, write your message, and submit.\n- A ticket is created in the database and handled by our admin team.",
    category: "Support"
  },
  {
    id: "sup_status",
    question: "How do I check my support ticket status?",
    answer: "To check ticket status:\n- Open the Support page.\n- The Ticket History panel displays your tickets as Pending, Answered, or Closed.\n- Click on any ticket to view replies.",
    category: "Support"
  },
  {
    id: "sup_contact",
    question: "How do I contact human support directly?",
    answer: "To contact human support:\n- Use the chatbot's 'Contact Human Support' button.\n- Alternatively, navigate to the Support page and raise a new ticket for admin response.",
    category: "Support"
  }
];

const generatedTree: FaqNode[] = [...coreFaqs];

// Generate synthetic, category-isolated questions to reach 500+ items total.
// We generate ~75 items per category.
categoriesList.forEach((cat) => {
  // Find core items for this category to seed next references
  const coreIds = coreFaqs.filter((f) => f.category === cat).map((f) => f.id);

  for (let i = 1; i <= 75; i++) {
    const id = `kb_${cat.toLowerCase()}_${i}`;
    let question = "";
    let answer = "";

    switch (cat) {
      case "Account":
        question = `Account FAQ #${i}: How do I manage settings for ${i % 2 === 0 ? "profiles" : "keys"}?`;
        answer = `Step-by-step account guideline #${i}: Go to Settings, select profiles or security keys, verify the OTP code sent to your registered email address, and confirm the changes.`;
        break;
      case "Wallet":
        question = `Wallet FAQ #${i}: What is the rule for wallet ${i % 2 === 0 ? "deposit" : "deduction"} #${i}?`;
        answer = `Wallet help details #${i}: All wallet deposits require blockchain confirmations on the USDT (TRC20) network. Deductions for package purchases occur automatically.`;
        break;
      case "Investment":
        question = `Investment FAQ #${i}: How does package #${i} calculate return yield?`;
        answer = `Investment help details #${i}: Returns are calculated daily at the platform ROI percentage rate. Payouts are credited directly to your Returns Wallet.`;
        break;
      case "Withdrawal":
        question = `Withdrawal FAQ #${i}: How to track withdrawal batch #${i}?`;
        answer = `Withdrawal help details #${i}: Look up the withdrawal history table. Batch #${i} will change status from Pending to Approved once the admin processes the payout.`;
        break;
      case "P2P":
        question = `P2P FAQ #${i}: Can I send P2P transfer #${i} to a new member?`;
        answer = `P2P transfer details #${i}: Yes, enter the member ID, verify the recipient name indicator matches, select your source wallet, and confirm with your access key.`;
        break;
      case "Dashboard":
        question = `Dashboard FAQ #${i}: Where are details for widget #${i}?`;
        answer = `Dashboard help details #${i}: Widgets on the main dashboard display totals for business volume, active referrals, and current matching capping limits.`;
        break;
      case "Support":
        question = `Support FAQ #${i}: How does ticket status #${i} update?`;
        answer = `Support help details #${i}: When an administrator replies to your ticket, the status updates to 'Answered'. You can view replies in the Support section.`;
        break;
    }

    // Determine category-specific next follow-up items
    // Let's mix core IDs of the same category and some synthetic IDs of the same category
    const nextList = [...coreIds];
    if (i > 1) nextList.push(`kb_${cat.toLowerCase()}_${i - 1}`);
    if (i > 2) nextList.push(`kb_${cat.toLowerCase()}_${i - 2}`);

    generatedTree.push({
      id,
      question,
      answer,
      category: cat,
      next: nextList.slice(0, 5) // ensure exactly same-category IDs
    });
  }
});

// Finalize next follow-ups for core FAQs so they stay strictly within their own category
generatedTree.forEach((node) => {
  const sameCatNodes = generatedTree.filter((f) => f.category === node.category && f.id !== node.id);
  if (!node.next || node.next.length === 0) {
    node.next = sameCatNodes.slice(0, 5).map((f) => f.id);
  } else {
    // filter next array to only include IDs belonging to the same category
    const validNext = node.next.filter((nid) => {
      const target = generatedTree.find((f) => f.id === nid);
      return target && target.category === node.category;
    });
    if (validNext.length < 5) {
      const padding = sameCatNodes
        .filter((f) => !validNext.includes(f.id))
        .map((f) => f.id);
      node.next = [...validNext, ...padding].slice(0, 5);
    } else {
      node.next = validNext.slice(0, 5);
    }
  }
});

export const faqTree: FaqNode[] = generatedTree;

export const faqIndex: Record<string, FaqNode> = Object.fromEntries(
  faqTree.map((f) => [f.id, f])
);
