"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RotateCcw, Key, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getActiveKey, type Provider } from "@/lib/ai";
import type { ConvoFormData } from "@/lib/prompt";

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: "OpenAI",
  claude: "Anthropic Claude",
  openrouter: "OpenRouter",
  groq: "Groq",
};

const DEFAULT_FORM: ConvoFormData = {
  profileName: "",
  projectType: "",
  topic: "",
  budget: "",
  timeline: "",
  tone: "",
  techStack: "",
  plan: "",
  notes: "",
};


export default function GeneratePage() {
  const router = useRouter();
  const [form, setForm] = useState<ConvoFormData>(DEFAULT_FORM);
  const [error, setError] = useState("");
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);

  useEffect(() => {
    const cfg = getActiveKey();
    if (cfg) setActiveProvider(cfg.provider);
  }, []);

  const set = (key: keyof ConvoFormData) => (val: string | null) =>
    setForm((f) => ({ ...f, [key]: val ?? "" }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const config = getActiveKey();
    if (!config) {
      setError("No API key configured. Please add one in Settings.");
      return;
    }

    sessionStorage.removeItem("convo_result");
    sessionStorage.setItem("convo_form", JSON.stringify(form));
    router.push("/preview");
  };

  const handleReset = () => {
    setForm(DEFAULT_FORM);
    setError("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">New Conversation</h2>
          <p className="text-sm text-muted-foreground">
            Fill in the details — AI handles the rest
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeProvider ? (
            <Badge variant="outline" className="text-xs gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {PROVIDER_LABELS[activeProvider]}
            </Badge>
          ) : (
            <Link href="/settings">
              <Badge variant="outline" className="text-xs gap-1.5 text-amber-600 border-amber-500/40 bg-amber-500/10 cursor-pointer">
                <Key className="w-3 h-3" />
                Add API Key
              </Badge>
            </Link>
          )}
        </div>
      </div>

      {/* No key warning */}
      {!activeProvider && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            No API key configured.{" "}
            <Link href="/settings" className="underline font-medium">
              Go to Settings
            </Link>{" "}
            to add OpenAI, Claude, or OpenRouter.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Fiverr Profile Name */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Fiverr Profile Name</CardTitle>
            <CardDescription className="text-xs">The seller's Fiverr username or display name</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="e.g. john_designs, creativestudio, webwizard…"
              value={form.profileName}
              onChange={(e) => set("profileName")(e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Project Type */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Project Type</CardTitle>
              <CardDescription className="text-xs">The freelance service category</CardDescription>
            </CardHeader>
            <CardContent>
              <Select onValueChange={set("projectType")} value={form.projectType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project type…" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Logo Design", "Web Development", "Mobile App", "SEO / Marketing",
                    "Copywriting", "Video Editing", "UI/UX Design", "Data Entry",
                    "WordPress", "Shopify Store", "Social Media", "Voiceover",
                    "Translation", "Data Analysis", "Other",
                  ].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Topic */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Topic / Niche</CardTitle>
              <CardDescription className="text-xs">Industry, brand, or product context</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="e.g. wellness brand, fintech startup, SaaS tool…"
                value={form.topic}
                onChange={(e) => set("topic")(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Budget */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Budget</CardTitle>
              <CardDescription className="text-xs">Buyer's approximate budget range</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="e.g. $500, under $200, flexible…"
                value={form.budget}
                onChange={(e) => set("budget")(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Timeline</CardTitle>
              <CardDescription className="text-xs">Urgency of the project</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="e.g. 1 week, ASAP, by end of month…"
                value={form.timeline}
                onChange={(e) => set("timeline")(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Tone */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Conversation Tone</CardTitle>
              <CardDescription className="text-xs">Overall vibe (AI will still randomize internally)</CardDescription>
            </CardHeader>
            <CardContent>
              <Select onValueChange={set("tone")} value={form.tone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone hint…" />
                </SelectTrigger>
                <SelectContent>
                  {["Professional", "Friendly & Casual", "Technical", "Formal", "Enthusiastic", "Skeptical buyer"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Tech Stack */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Tech Stack</CardTitle>
              <CardDescription className="text-xs">Relevant tools or technologies (optional)</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="e.g. React, Node.js, Shopify, Figma…"
                value={form.techStack}
                onChange={(e) => set("techStack")(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Extra Notes</CardTitle>
            <CardDescription className="text-xs">
              Specific scenarios, quirks, or instructions for the AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g. Buyer is hesitant about price. Seller should mention a revision guarantee. Include a discount negotiation…"
              className="min-h-[100px] resize-none"
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={handleReset} className="text-muted-foreground">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>

          <Button
            type="submit"
            disabled={!form.projectType || !form.topic || !activeProvider}
            className="min-w-[180px] bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate with AI
          </Button>
        </div>
      </form>
    </div>
  );
}
