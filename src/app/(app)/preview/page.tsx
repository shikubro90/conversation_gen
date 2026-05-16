"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  Copy,
  RefreshCw,
  CheckCircle2,
  User,
  Briefcase,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  FileText,
  PackageCheck,
  ClipboardList,
  Loader2,
  FileDown,
} from "lucide-react";
import Link from "next/link";
import type { ConversationOutput, ConvoFormData } from "@/lib/prompt";
import { getActiveKey } from "@/lib/ai";
import { runConversationAgent, type AgentStep } from "@/lib/agent";
import { downloadDocx, downloadPdf, downloadTxt } from "@/lib/export";

// ─── Types ────────────────────────────────────────────────────────────────────

type EditableMessage = ConversationOutput["messages"][number] & { id: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function toEditable(msgs: ConversationOutput["messages"]): EditableMessage[] {
  return msgs.map((m) => ({ ...m, id: uid() }));
}

const PLACEHOLDER: ConversationOutput = {
  platform: "Fiverr",
  service: "Logo Design",
  topic: "Wellness Brand",
  buyerPersonality: "Budget-conscious founder who's done their homework",
  sellerTone: "Warm and consultative — builds rapport before pricing",
  messages: [
    { role: "buyer", text: "Hey, I found your profile through a client referral — your branding work for that skincare line was exactly the direction I'm trying to go. I'm launching a wellness brand called Rootwell, targeting women 28–45 who are into slow living and herbal stuff. Not the cliché yoga-poster aesthetic though." },
    { role: "seller", text: "Rootwell — love that name, it already has a grounded, intentional feel. The skincare project you mentioned took about three weeks and we went through some genuinely interesting territory with the mark. Tell me more about how you want people to feel when they see the logo for the first time." },
    { role: "buyer", text: "Something like... trusted friend who happens to know a lot about plants. Warm but not soft. Minimal but not cold. Budget is tighter than I'd like — I've got maybe $130 to spend." },
    { role: "seller", text: "$130 is workable for a primary logo with one alternate lockup and full-res files. I won't pad this out with deliverables you don't need. Three revision rounds, first draft within four days." },
    { role: "buyer", text: "What exactly counts as a revision? I've had sellers who treat a color change as a whole new round." },
    { role: "seller", text: "Fair concern. A revision round is any set of feedback you send in one message — color adjustments, type tweaks, composition changes, all bundled together. Not per change, per round of feedback. You'll also get a brief font + color reference so whoever builds your site later isn't guessing." },
    { role: "buyer", text: "Okay that's actually reassuring. I have a product shoot in 8 days — can you hit that?" },
    { role: "seller", text: "Eight days gives us real breathing room. Draft by day four, final files two days before your shoot at worst. Send the offer?" },
    { role: "buyer", text: "Yes, send it over." },
  ],
  customOffer: {
    title: "Rootwell Brand Logo — Custom Package",
    price: "$130",
    delivery: "8 days",
    revisions: "3 rounds",
    includes: [
      "Primary logo (wordmark + botanical mark)",
      "1 alternate lockup (stacked / horizontal)",
      "PNG, SVG, PDF exports",
      "Color palette reference sheet",
      "Typography pairing guide",
    ],
  },
  requirements: [
    "Brand name spelling confirmation (Rootwell vs RootWell)",
    "3–5 inspiration logos (what you like and why)",
    "Any colors to avoid or include",
    "Intended first-use format (packaging, web, social)",
    "Tagline if any (even a draft)",
    "Competitor brands to differentiate from",
  ],
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChatBubble({
  msg,
  onEdit,
  onDelete,
}: {
  msg: EditableMessage;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}) {
  const isBuyer = msg.role === "buyer";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const save = () => {
    if (draft.trim()) onEdit(msg.id, draft.trim());
    setEditing(false);
  };

  const cancel = () => {
    setDraft(msg.text);
    setEditing(false);
  };

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  return (
    <div className={`flex gap-2.5 group ${isBuyer ? "flex-row" : "flex-row-reverse"}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs self-end mb-1
          ${isBuyer
            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
            : "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400"
          }`}
      >
        {isBuyer ? <User className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[72%] space-y-1 ${isBuyer ? "items-start" : "items-end"} flex flex-col`}>
        <span className={`text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ${isBuyer ? "pl-1" : "pr-1"}`}>
          {isBuyer ? "Buyer" : "Seller"}
        </span>

        {editing ? (
          <div className="w-full space-y-2">
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="text-sm min-h-[80px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) save();
                if (e.key === "Escape") cancel();
              }}
            />
            <div className="flex gap-1.5 justify-end">
              <Button size="sm" variant="ghost" onClick={cancel} className="h-6 px-2 text-xs">
                <X className="w-3 h-3 mr-1" />Cancel
              </Button>
              <Button size="sm" onClick={save} className="h-6 px-2 text-xs">
                <Check className="w-3 h-3 mr-1" />Save
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed
              ${isBuyer
                ? "bg-accent text-accent-foreground rounded-tl-none"
                : "bg-primary text-primary-foreground rounded-tr-none"
              }`}
          >
            {msg.text}
            {/* Edit/delete controls */}
            <div
              className={`absolute -top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity
                ${isBuyer ? "right-0" : "left-0"}`}
            >
              <button
                onClick={() => { setDraft(msg.text); setEditing(true); }}
                className="w-5 h-5 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-accent"
              >
                <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
              </button>
              <button
                onClick={() => onDelete(msg.id)}
                className="w-5 h-5 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-destructive/10"
              >
                <Trash2 className="w-2.5 h-2.5 text-destructive" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STEP_LABELS: Record<AgentStep, string> = {
  planning: "Step 1 of 3 — Planning conversation…",
  writing: "Step 2 of 3 — Writing conversation…",
  finalizing: "Step 3 of 3 — Finalizing offer & requirements…",
  done: "Done!",
};

export default function PreviewPage() {
  const [result, setResult] = useState<ConversationOutput | null>(null);
  const [messages, setMessages] = useState<EditableMessage[]>([]);
  const [offer, setOffer] = useState<ConversationOutput["customOffer"] | null>(null);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<"docx" | "pdf" | "txt" | null>(null);
  const [newReq, setNewReq] = useState("");
  const [addingMsg, setAddingMsg] = useState(false);
  const [newMsgRole, setNewMsgRole] = useState<"buyer" | "seller">("buyer");
  const [newMsgText, setNewMsgText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [agentStep, setAgentStep] = useState<AgentStep>("planning");
  const [genError, setGenError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("convo_result");
    if (stored) {
      const data: ConversationOutput = JSON.parse(stored);
      setResult(data);
      setMessages(toEditable(data.messages));
      setOffer({ ...data.customOffer });
      setRequirements([...data.requirements]);
      return;
    }

    const formRaw = sessionStorage.getItem("convo_form");
    if (!formRaw) return;
    const form: ConvoFormData = JSON.parse(formRaw);
    const config = getActiveKey();
    if (!config) return;

    setGenerating(true);
    setAgentStep("planning");

    (async () => {
      try {
        const data = await runConversationAgent(config, form, (step) => setAgentStep(step));

        const prevRaw = sessionStorage.getItem("convo_history");
        const history: Array<{ role: "buyer" | "seller"; text: string }[]> = prevRaw ? JSON.parse(prevRaw) : [];
        const updatedHistory = [...history, data.messages].slice(-5);
        sessionStorage.setItem("convo_history", JSON.stringify(updatedHistory));
        sessionStorage.setItem("convo_result", JSON.stringify(data));

        setResult(data);
        setMessages(toEditable(data.messages));
        setOffer({ ...data.customOffer });
        setRequirements([...data.requirements]);
      } catch (err) {
        setGenError(err instanceof Error ? err.message : "Generation failed.");
      } finally {
        setGenerating(false);
      }
    })();
  }, []);

  const editMessage = (id: string, text: string) =>
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, text } : m)));

  const deleteMessage = (id: string) =>
    setMessages((ms) => ms.filter((m) => m.id !== id));

  const addMessage = () => {
    if (!newMsgText.trim()) return;
    setMessages((ms) => [...ms, { role: newMsgRole, text: newMsgText.trim(), id: uid() }]);
    setNewMsgText("");
    setAddingMsg(false);
  };

  const addRequirement = () => {
    if (!newReq.trim()) return;
    setRequirements((r) => [...r, newReq.trim()]);
    setNewReq("");
  };

  const removeRequirement = (i: number) =>
    setRequirements((r) => r.filter((_, idx) => idx !== i));

  const editRequirement = (i: number, val: string) =>
    setRequirements((r) => r.map((req, idx) => (idx === i ? val : req)));

  const handleCopy = () => {
    const text = messages
      .map((m) => `${m.role === "buyer" ? "Buyer" : "Seller"}: ${m.text}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentData = (): ConversationOutput => ({
    ...result!,
    messages: messages.map(({ role, text }) => ({ role, text })),
    customOffer: offer ?? result!.customOffer,
    requirements,
  });

  const handleExport = async (type: "docx" | "pdf" | "txt") => {
    setExporting(type);
    try {
      const data = currentData();
      if (type === "docx") await downloadDocx(data);
      else if (type === "pdf") await downloadPdf(data);
      else downloadTxt(data);
    } finally {
      setExporting(null);
    }
  };

  if (generating) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p className="text-sm font-medium">{STEP_LABELS[agentStep]}</p>
        <div className="flex gap-2">
          {(["planning", "writing", "finalizing"] as AgentStep[]).map((s) => (
            <div
              key={s}
              className={`h-1.5 w-16 rounded-full transition-colors duration-500 ${
                agentStep === s
                  ? "bg-violet-500"
                  : ["writing", "finalizing", "done"].includes(agentStep) && s === "planning"
                  ? "bg-violet-300"
                  : agentStep === "finalizing" && s === "writing"
                  ? "bg-violet-300"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (genError) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-sm text-destructive">{genError}</p>
        <Link href="/generate">
          <Button variant="outline" size="sm">Try again</Button>
        </Link>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />Copied</>
            ) : (
              <><Copy className="w-3.5 h-3.5 mr-1.5" />Copy</>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("txt")} disabled={!!exporting}>
            {exporting === "txt" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5 mr-1.5" />}TXT
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("docx")} disabled={!!exporting}>
            {exporting === "docx" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}DOCX
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} disabled={!!exporting}>
            {exporting === "pdf" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}PDF
          </Button>
          <Link href="/generate">
            <Button size="sm" variant="outline">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Regenerate
            </Button>
          </Link>
        </div>
      </div>

      {/* Chat Thread */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Conversation
            <Badge variant="secondary" className="text-[10px] ml-1">{messages.length} messages</Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setAddingMsg(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              msg={msg}
              onEdit={editMessage}
              onDelete={deleteMessage}
            />
          ))}

          {/* Add message */}
          {addingMsg && (
            <div className="border border-dashed border-border rounded-xl p-4 space-y-3 bg-accent/20">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={newMsgRole === "buyer" ? "default" : "outline"}
                  onClick={() => setNewMsgRole("buyer")}
                  className="h-7 text-xs"
                >
                  <User className="w-3 h-3 mr-1" />Buyer
                </Button>
                <Button
                  size="sm"
                  variant={newMsgRole === "seller" ? "default" : "outline"}
                  onClick={() => setNewMsgRole("seller")}
                  className="h-7 text-xs"
                >
                  <Briefcase className="w-3 h-3 mr-1" />Seller
                </Button>
              </div>
              <Textarea
                placeholder="Type message…"
                value={newMsgText}
                onChange={(e) => setNewMsgText(e.target.value)}
                className="resize-none min-h-[80px] text-sm"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingMsg(false); setNewMsgText(""); }}>
                  Cancel
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={addMessage}>
                  <Plus className="w-3 h-3 mr-1" />Add message
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Offer */}
      {offer && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-500" />
              Custom Offer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Offer Title</Label>
              <Input
                value={offer.title}
                onChange={(e) => setOffer({ ...offer, title: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(["price", "delivery", "revisions"] as const).map((field) => (
                <div key={field} className="space-y-1.5">
                  <Label className="text-xs capitalize">{field}</Label>
                  <Input
                    value={offer[field]}
                    onChange={(e) => setOffer({ ...offer, [field]: e.target.value })}
                    className="text-sm text-center font-semibold"
                  />
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs">What&apos;s Included</Label>
              <div className="space-y-2">
                {offer.includes.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <Input
                      value={item}
                      onChange={(e) =>
                        setOffer({
                          ...offer,
                          includes: offer.includes.map((inc, idx) => (idx === i ? e.target.value : inc)),
                        })
                      }
                      className="text-sm h-8"
                    />
                    <button
                      onClick={() =>
                        setOffer({ ...offer, includes: offer.includes.filter((_, idx) => idx !== i) })
                      }
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-muted-foreground"
                  onClick={() => setOffer({ ...offer, includes: [...offer.includes, ""] })}
                >
                  <Plus className="w-3 h-3 mr-1" />Add item
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requirements */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-amber-500" />
            Requirements from Buyer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {requirements.map((req, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">{i + 1}.</span>
              <Input
                value={req}
                onChange={(e) => editRequirement(i, e.target.value)}
                className="text-sm h-8"
              />
              <button
                onClick={() => removeRequirement(i)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Add a requirement…"
              value={newReq}
              onChange={(e) => setNewReq(e.target.value)}
              className="text-sm h-8"
              onKeyDown={(e) => { if (e.key === "Enter") addRequirement(); }}
            />
            <Button size="sm" variant="outline" onClick={addRequirement} className="h-8 shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export footer */}
      <div className="flex flex-wrap gap-2 justify-end pb-8">
        <Button variant="outline" size="sm" onClick={() => handleExport("txt")} disabled={!!exporting}>
          {exporting === "txt" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5 mr-1.5" />}Download TXT
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport("docx")} disabled={!!exporting}>
          {exporting === "docx" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}Download DOCX
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} disabled={!!exporting}>
          {exporting === "pdf" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}Download PDF
        </Button>
      </div>
    </div>
  );
}
