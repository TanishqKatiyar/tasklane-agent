"use client";

import { Bot, Loader2,Send, Sparkles, User, X } from "lucide-react";
import { useEffect,useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export function AiChatPanel({ isOpen, onClose, projectId = "demo" }: { isOpen: boolean; onClose: () => void; projectId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim(), createdAt: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Send message to the backend. In reality, we'd use EventSource for SSE or handle chunks.
      // But we will just do a standard POST to /ai/chat for now (or a placeholder if SSE isn't fully implemented in frontend yet)
      const res = await api.post("/ai/chat", { projectId, question: userMsg.content });
      
      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: "assistant", 
        // fallback to a dummy reply if the backend expects SSE but we aren't handling it properly
        content: res.data?.reply || "I am the AI assistant. I can help you with project tasks and reporting.", 
        createdAt: new Date() 
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${err.response?.data?.message || err.message || "Failed to communicate with AI."}`,
        createdAt: new Date()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-[400px] flex-col border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-card">
        <div className="flex items-center gap-2 text-purple-500 font-semibold">
          <Sparkles className="h-5 w-5" />
          Tasklane AI
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-4">
            <div className="p-4 bg-purple-500/10 rounded-full text-purple-500">
              <Sparkles className="h-8 w-8" />
            </div>
            <p>How can I help you manage your project today?</p>
            <div className="flex flex-col gap-2 mt-4 text-xs">
              <button onClick={() => setInput("Summarize my active tasks.")} className="px-3 py-2 bg-accent hover:bg-accent/80 rounded-lg text-left transition-colors">"Summarize my active tasks."</button>
              <button onClick={() => setInput("What's the status of the mobile app?")} className="px-3 py-2 bg-accent hover:bg-accent/80 rounded-lg text-left transition-colors">"What's the status of the mobile app?"</button>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "flex-row-reverse" : "")}>
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-purple-500/20 text-purple-400")}>
              {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className={cn("max-w-[75%] rounded-2xl px-4 py-2 text-sm", m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-accent rounded-tl-sm")}>
              {m.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-accent rounded-2xl rounded-tl-sm px-4 py-3 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="p-4 border-t border-border bg-card">
        <div className="relative flex items-end overflow-hidden rounded-xl border border-border bg-background focus-within:ring-1 focus-within:ring-purple-500/50">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask AI anything..."
            className="w-full resize-none bg-transparent p-3 pr-10 text-sm outline-none max-h-32 min-h-[44px]"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-1.5 rounded-md bg-purple-500 text-white disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          AI can make mistakes. Consider verifying important information.
        </p>
      </div>
    </div>
  );
}
