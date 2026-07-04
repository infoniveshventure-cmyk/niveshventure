"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, ArrowLeft, Mail, Phone } from "lucide-react";
import { faqTree, faqIndex, FaqNode } from "@/lib/faqData";
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
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function greet() {
    const name = profile?.fullName?.split(" ")[0] || "there";
    setMessages([
      {
        from: "bot",
        text: `Hey ${name}! I'm your Nivesh Ventures assistant. Pick a question below, or type your own — I'll walk you through it step by step.`,
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
  }

  async function submitSupport(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Fill name, email and message");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");

      if (data.web3FormsOk) {
        toast.success("Message sent to support");
      } else if (data.supportEmail) {
        toast("Opening email to support directly");
        window.location.href = `mailto:${data.supportEmail}?subject=Support Request&body=${encodeURIComponent(
          form.message
        )}`;
      }
      setForm({ name: "", phone: "", email: "", message: "" });
      setShowSupportForm(false);
    } catch (err: any) {
      toast.error(err.message || "Could not send — try WhatsApp instead");
    } finally {
      setSending(false);
    }
  }

  function whatsappRedirect() {
    const no = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NO;
    if (!no) {
      toast.error("WhatsApp support number not configured");
      return;
    }
    const text = encodeURIComponent(form.message || "Hi, I need help with my account.");
    window.open(`https://wa.me/${no}?text=${text}`, "_blank");
  }

  const currentNode = [...messages].reverse().find((m) => m.node)?.node;
  const suggestions = currentNode?.next
    ? currentNode.next.map((id) => faqIndex[id]).filter(Boolean)
    : faqTree.slice(0, 6);

  return (
    <>
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="hidden lg:flex fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-neon-violet to-neon-cyan
        shadow-neon flex items-center justify-center animate-pulse-glow"
        aria-label="Open help chat"
      >
        {open ? <X size={24} className="text-base" /> : <MessageCircle size={24} className="text-base" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="
fixed
left-2
right-2
bottom-4
h-[65vh]
rounded-2xl
sm:left-1/2
sm:-translate-x-1/2
sm:top-auto
sm:bottom-4
sm:w-[95vw]
sm:max-w-md
sm:h-[75vh]

lg:left-auto
lg:right-5
lg:bottom-24
lg:w-[380px]
lg:h-[560px]
lg:translate-x-0

z-50
glass-card
neon-border
flex
flex-col
overflow-hidden
"
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-base-soft/60">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center text-sm font-bold text-base">
                  NX
                </div>

                <div>
                  <p className="font-display text-sm font-semibold">
                    Nivesh Ventures Assistant
                  </p>
                  <p className="text-xs text-neon-green">● Online</p>
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 transition"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>

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
                <div className="flex flex-wrap gap-2 pt-1">
                  {suggestions.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => askFaq(f)}
                      className="text-xs px-3 py-1.5 rounded-full border border-neon-violet/40 text-ink hover:bg-neon-violet/15 transition"
                    >
                      {f.question}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowSupportForm(true)}
                    className="text-xs px-3 py-1.5 rounded-full border border-neon-magenta/50 text-neon-magenta hover:bg-neon-magenta/10 transition"
                  >
                    Contact human support →
                  </button>
                </div>
              )}

              {showSupportForm && (
                <form onSubmit={submitSupport} className="glass-card p-3 space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-neon-cyan">Contact Support</p>
                    <button type="button" onClick={() => setShowSupportForm(false)}>
                      <ArrowLeft size={14} />
                    </button>
                  </div>
                  <input
                    className="input-field text-xs py-2"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <input
                    className="input-field text-xs py-2"
                    placeholder="Phone number"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                  <input
                    className="input-field text-xs py-2"
                    placeholder="Email address"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                  <textarea
                    className="input-field text-xs py-2"
                    placeholder="How can we help?"
                    rows={3}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={sending} className="btn-primary text-xs py-2 flex-1 flex items-center justify-center gap-1">
                      <Mail size={13} /> {sending ? "Sending..." : "Email support"}
                    </button>
                    <button type="button" onClick={whatsappRedirect} className="btn-ghost text-xs py-2 flex-1 flex items-center justify-center gap-1">
                      <Phone size={13} /> WhatsApp
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = (e.target as any).elements.q;
                handleFreeText(input.value);
                input.value = "";
              }}
              className="border-t border-white/10 p-2 flex gap-2"
            >
              <input name="q" className="input-field text-sm py-2" placeholder="Type your question..." />
              <button type="submit" className="btn-primary px-3 py-2">
                <Send size={15} />
              </button>
            </form> */}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
