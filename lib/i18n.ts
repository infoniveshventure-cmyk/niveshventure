
const en = {
  dashboard: "Dashboard",
  members: "Members",
  premium_members: "Premium Members",
  withdrawals: "Withdrawals",
  deposits: "Deposits",
  kyc: "KYC",
  monthly_closing: "Monthly Closing",
  rewards: "Rewards",
  payouts: "Payouts",
  total_members: "Total Members",
  active_members: "Active Members",
  pending_withdrawals: "Pending Withdrawals",
  wallet_balance: "Wallet Balance",
  recent_registrations: "Recent Registrations",
  recent_transactions: "Recent Transactions",
  language: "Language",
  hindi: "Hindi",
  english: "English",
  manual_actions: "Manual Actions",
  auto_release_status: "Auto Release Status",
  manual_release_status: "Manual Release Status",
  pending_manual_actions: "Pending Manual Actions",
  last_manual_release: "Last Manual Release",
  released_by: "Released By",
  remaining_pending_income: "Remaining Pending Income",
};

const hi = {
  dashboard: "डैशबोर्ड",
  members: "सदस्य",
  premium_members: "प्रीमियम सदस्य",
  withdrawals: "निकासी",
  deposits: "जमा",
  kyc: "केवाईसी",
  monthly_closing: "मासिक समापन",
  rewards: "पुरस्कार",
  payouts: "भुगतान",
  total_members: "कुल सदस्य",
  active_members: "सक्रिय सदस्य",
  pending_withdrawals: "लंबित निकासी",
  wallet_balance: "वॉलेट बैलेंस",
  recent_registrations: "हाल के पंजीकरण",
  recent_transactions: "हाल के लेनदेन",
  language: "भाषा",
  hindi: "हिंदी",
  english: "अंग्रेजी",
  manual_actions: "मैनुअल कार्रवाई",
  auto_release_status: "ऑटो रिलीज़ स्थिति",
  manual_release_status: "मैनुअल रिलीज़ स्थिति",
  pending_manual_actions: "लंबित मैनुअल कार्रवाई",
  last_manual_release: "अंतिम मैनुअल रिलीज़",
  released_by: "द्वारा रिलीज़",
  remaining_pending_income: "शेष लंबित आय",
};

export const translations: Record<string, typeof en> = { en, hi };

export function translate(key: string, lang: string = "en"): string {
  const dictionary = translations[lang] || en;
  return (dictionary as any)[key] || (en as any)[key] || key;
}
