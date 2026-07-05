"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, ArrowLeft, Search } from "lucide-react";
import { faqTree, FaqNode } from "@/lib/faqData";
import { useAuth } from "@/lib/AuthContext";
import { useChatbot } from "@/lib/ChatbotContext";
import toast from "react-hot-toast";

type ChatMsg = { from: "bot" | "user"; text: string; node?: FaqNode };

export default function ChatbotWidget() {
  const { profile } = useAuth();
  const { open, setOpen } = useChatbot();
  const [greeted, setGreeted] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pagination for smart suggestions
  const [suggestionOffset, setSuggestionOffset] = useState(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function greet() {
    const name = profile?.fullName?.split(" ")[0] || "there";
    setMessages([
      {
        from: "bot",
        text: `Hey ${name}! I'm your Nivesh Ventures assistant. Pick a question below — I'll walk you through it step by step.`,
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
    // Cycle offset to load next 10 questions automatically
    setSuggestionOffset((prev) => prev + 10);
  }

  // Filter FAQs based on category, search string, and pagination slice
  const getSuggestions = () => {
    let list = faqTree;
    if (selectedCategory !== "All") {
      list = list.filter((f) => f.category === selectedCategory);
    }
    if (search.trim()) {
      list = list.filter((f) =>
        f.question.toLowerCase().includes(search.toLowerCase()) ||
        f.answer.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Slice next 10 questions
    const start = suggestionOffset % Math.max(1, list.length);
    return list.slice(start, start + 10);
  };

  const categories = ["All", "Registration", "Login", "Membership", "Wallets", "Incomes", "System Rules"];

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
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center text-sm font-bold text-base">
                  NX
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
                  placeholder="Search 500+ Help topics..."
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

              {!showSupportForm && (
                <div className="space-y-2 pt-2">
                  <p className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold">Suggested Questions</p>
                  <div className="flex flex-col gap-1.5">
                    {getSuggestions().map((f) => (
                      <button
                        key={f.id}
                        onClick={() => askFaq(f)}
                        className="text-left text-xs px-3 py-2 rounded-xl border border-white/5 bg-white/5 text-white hover:bg-white/10 hover:border-white/10 transition"
                      >
                        {f.question}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowSupportForm(true)}
                      className="text-xs px-3 py-2 rounded-xl border border-neon-magenta/20 text-neon-magenta hover:bg-neon-magenta/5 transition text-center font-semibold"
                    >
                      Contact Human Support →
                    </button>
                  </div>
                </div>
              )}

              {showSupportForm && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    toast.success("Support ticket created!");
                    setShowSupportForm(false);
                  }}
                  className="glass-card p-3 space-y-2 mt-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-neon-cyan">Contact Support</p>
                    <button type="button" onClick={() => setShowSupportForm(false)}>
                      <ArrowLeft size={14} className="text-white" />
                    </button>
                  </div>
                  <input className="input-field text-xs py-2" placeholder="Your name" required />
                  <input className="input-field text-xs py-2" placeholder="Email address" required />
                  <textarea className="input-field text-xs py-2" placeholder="How can we help?" rows={3} required />
                  <button type="submit" className="btn-primary w-full text-xs py-2">
                    Submit Support Ticket
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
