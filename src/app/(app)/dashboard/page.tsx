import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  MessageSquareText,
  TrendingUp,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";
import Link from "next/link";

const stats = [
  { label: "Total Generated", value: "1,284", change: "+12%", icon: MessageSquareText, color: "text-violet-500" },
  { label: "This Month", value: "348", change: "+8%", icon: TrendingUp, color: "text-emerald-500" },
  { label: "Credits Used", value: "152", change: "348 left", icon: Zap, color: "text-amber-500" },
  { label: "Avg. Time", value: "1.4s", change: "Fast", icon: Clock, color: "text-sky-500" },
];

const recentActivity = [
  { id: 1, topic: "Logo Design", platform: "Fiverr", tone: "Professional", time: "2 min ago", status: "completed" },
  { id: 2, topic: "SEO Audit", platform: "Upwork", tone: "Friendly", time: "14 min ago", status: "completed" },
  { id: 3, topic: "Mobile App Dev", platform: "Fiverr", tone: "Technical", time: "1 hr ago", status: "completed" },
  { id: 4, topic: "Copywriting", platform: "Upwork", tone: "Casual", time: "3 hr ago", status: "completed" },
  { id: 5, topic: "WordPress Site", platform: "Fiverr", tone: "Formal", time: "Yesterday", status: "completed" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero CTA */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-6 text-white">
        <div className="relative z-10">
          <Badge className="bg-white/20 text-white border-white/30 mb-3">AI Powered</Badge>
          <h2 className="text-2xl font-bold mb-1">Generate Conversations Instantly</h2>
          <p className="text-white/70 text-sm mb-4 max-w-md">
            Create realistic Fiverr &amp; Upwork buyer-seller dialogues in seconds. No copy-paste — unique every time.
          </p>
          <Link href="/generate">
            <Button className="bg-white text-indigo-700 hover:bg-white/90 font-semibold">
              <Sparkles className="w-4 h-4 mr-2" />
              Start Generating
            </Button>
          </Link>
        </div>
        <div className="absolute right-6 bottom-4 opacity-10">
          <MessageSquareText className="w-40 h-40" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold">Recent Generations</CardTitle>
          <Link href="/preview">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquareText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.topic}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.platform} · {item.tone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                  <Badge variant="secondary" className="text-[10px] px-2">
                    {item.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
