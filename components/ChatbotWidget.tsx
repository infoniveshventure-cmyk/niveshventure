"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, ArrowLeft, Search } from "lucide-react";
import { faqTree, FaqNode } from "@/lib/faqData";
import { useAuth } from "@/lib/AuthContext";
import { useChatbot } from "@/lib/ChatbotContext";
import toast from "react-hot-toast";

type ChatMsg = { from: "bot" | "user"; text: string; node?: FaqNode };

const categoryIntroNodes: Record<string, FaqNode> = {
  Account: {
    id: "intro_account",
    question: "Account",
    answer: "Here is how you can manage your Account:\n- Activate your account using the Premium $30 membership plan.\n- Edit your personal information under settings.\n- Resolve security keys or login issues using OTP verification.",
    category: "Account"
  },
  Wallet: {
    id: "intro_wallet",
    question: "Wallet",
    answer: "Details on your wallet options:\n- View your USDT, Referral, Matching, and Returns balances.\n- Access secure deposit TRC20 addresses.\n- Track credit and debit ledger transaction histories.",
    category: "Wallet"
  },
  Investment: {
    id: "intro_investment",
    question: "Investment",
    answer: "Details on your investment options:\n- Invest using your USDT wallet balance.\n- Select active packages from the dashboard.\n- Track investment status and ROI yield details.",
    category: "Investment"
  },
  Withdrawal: {
    id: "intro_withdrawal",
    question: "Withdrawal",
    answer: "Details on your withdrawal options:\n- Submit withdrawal requests to external TRC20 wallets.\n- Track pending and approved withdrawal statuses.\n- Check processing charges and closing rules.",
    category: "Withdrawal"
  },
  P2P: {
    id: "intro_p2p",
    question: "P2P",
    answer: "Details on Peer-to-Peer (P2P) transfers:\n- Send money directly to other member IDs.\n- Verify recipient details and choose the source wallet.\n- Track P2P transfer history logs.",
    category: "P2P"
  },
  Dashboard: {
    id: "intro_dashboard",
    question: "Dashboard",
    answer: "Explore your main account Dashboard:\n- View income summaries, direct referral stats, and carry-forward volume.\n- Review recent ledger transactions.",
    category: "Dashboard"
  },
  Support: {
    id: "intro_support",
    question: "Support",
    answer: "Need help? Contact human support or track support ticket history:\n- Go to the support section to view tickets.\n- Create a ticket with subject, category, and message.",
    category: "Support"
  }
};

export default function ChatbotWidget() {
  const { profile } = useAuth();
  const { open, setOpen } = useChatbot();
  const [greeted, setGreeted] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [showTokenPrompt, setShowTokenPrompt] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Support ticket fields
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Offset placeholder for search sync
  const [suggestionOffset, setSuggestionOffset] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setGuestToken(localStorage.getItem("temp_support_token"));
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, showSupportForm, showTokenPrompt]);

  function greet() {
    const name = profile?.fullName?.split(" ")[0] || "there";
    setMessages([
      {
        from: "bot",
        text: `Hey ${name}! I'm your Nivesh Ventures assistant. Pick a topic or question below — I'll walk you through it step by step.`,
      },
    ]);
    setGreeted(true);
  }

  function toggle() {
    const next = !open;
    if (next && !greeted) greet();
    setOpen(next);
  }

  function askFaq(node: FaqNode) {
    setMessages((m) => [
      ...m,
      { from: "user", text: node.question },
      { from: "bot", text: node.answer, node },
    ]);
    setSuggestionOffset((prev) => prev + 5);
  }

  const getFollowUps = (lastNode?: FaqNode) => {
    // If no lastNode, return the initial 5 options:
    if (!lastNode) {
      return [
        categoryIntroNodes["Account"],
        categoryIntroNodes["Wallet"],
        categoryIntroNodes["Investment"],
        categoryIntroNodes["Withdrawal"],
        categoryIntroNodes["Support"]
      ];
    }

    // Get nodes defined in lastNode.next
    let followUps: FaqNode[] = [];
    if (lastNode.next) {
      followUps = lastNode.next
        .map((id) => faqTree.find((f) => f.id === id))
        .filter(Boolean) as FaqNode[];
    }

    // Ensure all follow-ups are strictly of the same category
    followUps = followUps.filter((f) => f.category === lastNode.category);

    // If less than 5, fill with category matches
    if (followUps.length < 5) {
      const categoryMatches = faqTree.filter(
        (f) =>
          f.category === lastNode.category &&
          f.id !== lastNode.id &&
          !followUps.some((ex) => ex.id === f.id)
      );
      followUps = [...followUps, ...categoryMatches];
    }

    return followUps.slice(0, 5);
  };

  // Filter FAQs based on category, search string, and pagination slice
  const getSuggestions = () => {
    if (selectedCategory !== "All") {
      let list = faqTree.filter((f) => f.category === selectedCategory);
      if (search.trim()) {
        list = list.filter((f) =>
          f.question.toLowerCase().includes(search.toLowerCase()) ||
          f.answer.toLowerCase().includes(search.toLowerCase())
        );
      }
      return list.slice(0, 5);
    }
    if (search.trim()) {
      const list = faqTree.filter((f) =>
        f.question.toLowerCase().includes(search.toLowerCase()) ||
        f.answer.toLowerCase().includes(search.toLowerCase())
      );
      return list.slice(0, 5);
    }

    // Default conversational flow follow-ups
    const lastBotMsg = [...messages].reverse().find((m) => m.from === "bot");
    return getFollowUps(lastBotMsg?.node);
  };

  function handleGenerateToken() {
    const token = "temp_support_" + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("temp_support_token", token);
    setGuestToken(token);
    setShowTokenPrompt(false);
    setShowSupportForm(true);
  }

  function handleContactHumanClick() {
    if (profile) {
      setShowSupportForm(true);
      setShowTokenPrompt(false);
    } else {
      const existingToken = localStorage.getItem("temp_support_token");
      if (existingToken) {
        setGuestToken(existingToken);
        setShowSupportForm(true);
        setShowTokenPrompt(false);
      } else {
        setShowTokenPrompt(true);
        setShowSupportForm(false);
      }
    }
  }

  async function handleSubmitSupport(e: React.FormEvent) {
    e.preventDefault();
    if (!supportMessage.trim()) return;

    setSubmittingTicket(true);
    try {
      const activeToken = profile ? null : (guestToken || localStorage.getItem("temp_support_token"));
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (activeToken) {
        headers["Authorization"] = `Bearer ${activeToken}`;
      }

      const res = await fetch("/api/support", {
        method: "POST",
        headers,
        body: JSON.stringify({
          category: "Chatbot Support",
          subject: supportSubject.trim() || "Chatbot Support Ticket",
          message: supportMessage,
          token: activeToken
        }),
      });

      if (res.ok) {
        toast.success("Support ticket created successfully!");
        setShowSupportForm(false);
        setSupportSubject("");
        setSupportMessage("");

        setMessages((m) => [
          ...m,
          { from: "user", text: `[Support Request] Subject: ${supportSubject || "Chatbot Support Ticket"}\nMessage: ${supportMessage}` },
          {
            from: "bot",
            text: `**Thank you for contacting us!**\n\nYour support request has been submitted successfully.\n\nOur support team will review your request and get back to you as soon as possible.\n\nYou can also track your request anytime from the **Support** section.`
          }
        ]);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit support ticket");
      }
    } catch {
      toast.error("Error creating support ticket");
    } finally {
      setSubmittingTicket(false);
    }
  }

  const categories = ["All", "Account", "Wallet", "Investment", "Withdrawal", "P2P", "Dashboard", "Support"];

  return (
    <>
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="hidden lg:flex fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-neon-violet to-neon-cyan
        shadow-neon items-center justify-center animate-pulse-glow"
        aria-label="Open help chat"
      >
        {open ? <X size={24} className="text-base text-white" /> : <MessageCircle size={24} className="text-base text-white" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed left-2 right-2 bottom-4 h-[65vh] rounded-2xl sm:left-1/2 sm:-translate-x-1/2 sm:top-auto sm:bottom-4 sm:w-[95vw] sm:max-w-md sm:h-[75vh] lg:left-auto lg:right-5 lg:bottom-24 lg:w-[380px] lg:h-[560px] lg:translate-x-0 z-50 glass-card neon-border flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-base-soft/60">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-violet/40 to-neon-cyan/40 border border-white/10 flex items-center justify-center p-1.5 bg-base-soft">
                  <img src="/logo1.png" alt="Logo" className="w-full h-full object-contain rounded" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-white">Nivesh Ventures Assistant</p>
                  <p className="text-xs text-neon-green">● Online</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-white/10 transition">
                <X size={18} className="text-white" />
              </button>
            </div>

            {/* Smart Category & Search Bar */}
            <div className="px-3 py-2 border-b border-white/5 bg-white/5 space-y-2">
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setSelectedCategory(c); setSuggestionOffset(0); }}
                    className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap border transition ${selectedCategory === c
                        ? "border-neon-cyan text-neon-cyan bg-neon-cyan/10"
                        : "border-white/5 text-ink-muted"
                      }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 text-ink-muted" size={12} />
                <input
                  type="text"
                  placeholder="Search Help topics..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSuggestionOffset(0); }}
                  className="input-field pl-8 text-xs py-1.5 w-full bg-black/45"
                />
              </div>
            </div>

            {/* Messages & Suggestions Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${m.from === "user"
                        ? "bg-gradient-to-r from-neon-violet to-neon-cyan text-base rounded-br-sm"
                        : "bg-base-soft border border-white/10 rounded-bl-sm"
                      }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {!showSupportForm && !showTokenPrompt && (
                <div className="space-y-4 pt-2 pb-4 flex flex-col">
                  <p className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold">Suggested Questions</p>
                  
                  {/* Floating FAQ Buttons container */}
                  <div className="flex flex-wrap gap-2.5 justify-center py-2">
                    {getSuggestions().map((f, i) => (
                      <motion.button
                        key={f.id}
                        onClick={() => askFaq(f)}
                        animate={{
                          y: [0, -6, 0],
                        }}
                        transition={{
                          duration: 3 + (i % 3),
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        whileHover={{ scale: 1.06, y: -8 }}
                        className="text-left text-[11px] px-3.5 py-2 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/15 transition shadow-sm whitespace-normal max-w-full hover:shadow-neon-sm"
                      >
                        {f.question}
                      </motion.button>
                    ))}
                  </div>

                  {/* Fixed Human Support Button */}
                  <div className="mt-2">
                    <button
                      onClick={handleContactHumanClick}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-neon-magenta/20 text-neon-magenta hover:bg-neon-magenta/5 transition text-center font-semibold bg-neon-magenta/5 hover:border-neon-magenta/40"
                    >
                      Contact Human Support →
                    </button>
                  </div>
                </div>
              )}

              {showTokenPrompt && (
                <div className="glass-card p-3 space-y-3 mt-2 text-center border border-neon-magenta/30">
                  <p className="text-xs text-white">Please log in to contact support. If login is not available, you can generate a temporary support token to submit a ticket.</p>
                  <div className="flex flex-col gap-2">
                    <a
                      href="/login"
                      className="btn-primary w-full text-xs py-2 text-center block"
                      onClick={() => setOpen(false)}
                    >
                      Go to Login
                    </a>
                    <button
                      onClick={handleGenerateToken}
                      className="text-xs px-3 py-2 rounded-xl border border-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/5 transition text-center font-semibold"
                    >
                      Generate Temporary Support Token
                    </button>
                    <button
                      onClick={() => setShowTokenPrompt(false)}
                      className="text-xs text-ink-muted hover:text-white transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {showSupportForm && (
                <form
                  onSubmit={handleSubmitSupport}
                  className="glass-card p-3 space-y-2 mt-2 border border-neon-cyan/30"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-neon-cyan">Contact Support</p>
                    <button type="button" onClick={() => setShowSupportForm(false)}>
                      <ArrowLeft size={14} className="text-white" />
                    </button>
                  </div>
                  <input
                    className="input-field text-xs py-2"
                    placeholder="Subject (e.g. Account Issue)"
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    required
                  />
                  <textarea
                    className="input-field text-xs py-2"
                    placeholder="How can we help?"
                    rows={3}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    className="btn-primary w-full text-xs py-2"
                    disabled={submittingTicket}
                  >
                    {submittingTicket ? "Submitting..." : "Submit Support Ticket"}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
