import { useState } from "react";
import { Link, Redirect } from "wouter";
import {
  useGetMe,
  useGetAdminStats,
  useGetAdminUsers,
  useUpdateAdminUser,
  useGetApiConfigs,
  useCreateApiConfig,
  useDeleteApiConfig,
  useGetAdminLogs,
  useGetPlans,
  useUpdatePlan,
  getGetAdminUsersQueryKey,
  getGetApiConfigsQueryKey,
  getGetPlansQueryKey,
} from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  ArrowLeft, Users, MessageSquare, Key, Activity, Loader2,
  LayoutDashboard, Database, Plus, Trash2, Tag, Check,
  Eye, EyeOff, ChevronDown, ChevronUp, Settings2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// ─── Provider catalogue ─────────────────────────────────
const PROVIDERS = [
  {
    id: "groq",
    name: "Groq",
    logo: "⚡",
    color: "#f55036",
    bg: "rgba(245,80,54,.12)",
    border: "rgba(245,80,54,.3)",
    desc: "Ultra-fast inference (LLaMA, Mixtral)",
    docs: "https://console.groq.com/keys",
    models: [
      { id: "llama-3.3-70b-versatile",   label: "LLaMA 3.3 70B Versatile (best)" },
      { id: "llama-3.1-8b-instant",       label: "LLaMA 3.1 8B Instant (tez)" },
      { id: "llama3-70b-8192",            label: "LLaMA3 70B 8k" },
      { id: "mixtral-8x7b-32768",         label: "Mixtral 8x7B 32k" },
      { id: "gemma2-9b-it",               label: "Gemma2 9B IT" },
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    logo: "✦",
    color: "#4285f4",
    bg: "rgba(66,133,244,.12)",
    border: "rgba(66,133,244,.3)",
    desc: "Google DeepMind multimodal modellari",
    docs: "https://aistudio.google.com/app/apikey",
    models: [
      { id: "gemini-2.0-flash",           label: "Gemini 2.0 Flash (yangi, tez)" },
      { id: "gemini-1.5-pro",             label: "Gemini 1.5 Pro (kuchli)" },
      { id: "gemini-1.5-flash",           label: "Gemini 1.5 Flash (tez)" },
      { id: "gemini-1.5-flash-8b",        label: "Gemini 1.5 Flash-8B (arzon)" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI / GPT",
    logo: "◆",
    color: "#10a37f",
    bg: "rgba(16,163,127,.12)",
    border: "rgba(16,163,127,.3)",
    desc: "GPT-4o, GPT-4 Turbo va boshqalar",
    docs: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-4o",                     label: "GPT-4o (multimodal, best)" },
      { id: "gpt-4o-mini",                label: "GPT-4o Mini (arzon, tez)" },
      { id: "gpt-4-turbo",                label: "GPT-4 Turbo 128k" },
      { id: "gpt-4",                      label: "GPT-4 (klassik)" },
      { id: "gpt-3.5-turbo",              label: "GPT-3.5 Turbo (iqtisodiy)" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic / Claude",
    logo: "▲",
    color: "#cc785c",
    bg: "rgba(204,120,92,.12)",
    border: "rgba(204,120,92,.3)",
    desc: "Claude 3.5 Sonnet, Haiku va boshqalar",
    docs: "https://console.anthropic.com/settings/keys",
    models: [
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (best)" },
      { id: "claude-3-5-haiku-20241022",  label: "Claude 3.5 Haiku (tez, arzon)" },
      { id: "claude-3-opus-20240229",     label: "Claude 3 Opus (kuchli)" },
      { id: "claude-3-sonnet-20240229",   label: "Claude 3 Sonnet" },
      { id: "claude-3-haiku-20240307",    label: "Claude 3 Haiku (iqtisodiy)" },
    ],
  },
];

const FEATURES = [
  { id: "chat",           label: "Chat (Asosiy)"        },
  { id: "image_analysis", label: "Rasm Tahlili"         },
  { id: "video",          label: "Video Stsenariy"      },
  { id: "translation",    label: "Tarjima"              },
  { id: "code",           label: "Dasturlash"           },
];

const P = "#6366f1";
const G = `linear-gradient(135deg,${P} 0%,#818cf8 100%)`;

type TabType = "overview" | "users" | "configs" | "plans" | "logs";

export default function AdminPage() {
  const { toast } = useToast();
  const { data: userProfile, isLoading: loadingProfile } = useGetMe();
  const { data: stats, isLoading: loadingStats } = useGetAdminStats();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [usersPage, setUsersPage] = useState(1);
  const [searchUser, setSearchUser] = useState("");
  const { data: usersData, isLoading: loadingUsers } = useGetAdminUsers({ page: usersPage, limit: 10, search: searchUser });
  const updateUserObj = useUpdateAdminUser();

  const { data: configs, isLoading: loadingConfigs } = useGetApiConfigs();
  const createConfigObj = useCreateApiConfig();
  const deleteConfigObj = useDeleteApiConfig();

  // Provider form state
  const [showAddConfig, setShowAddConfig] = useState(false);
  const [newProvider, setNewProvider] = useState("groq");
  const [newModel, setNewModel] = useState("");
  const [newFeature, setNewFeature] = useState("chat");
  const [newApiKey, setNewApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const [logsPage, setLogsPage] = useState(1);
  const { data: logsData, isLoading: loadingLogs } = useGetAdminLogs({ page: logsPage, limit: 20 });

  const { data: plans, isLoading: loadingPlans } = useGetPlans();
  const updatePlanObj = useUpdatePlan();
  const [editingPlan, setEditingPlan] = useState<number | null>(null);
  const [planPrice, setPlanPrice] = useState("");
  const [planName, setPlanName] = useState("");

  if (loadingProfile) {
    return (
      <div style={{ minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center", background:"#080d1a" }}>
        <Loader2 style={{ width:36, height:36, color:P, animation:"spin 1s linear infinite" }} />
      </div>
    );
  }
  if (userProfile?.role !== "admin") return <Redirect to="/chat" />;

  // ── Handlers ────────────────────────────────────────────
  const handleUpdateUserRole = (id: number, role: "user" | "admin") => {
    updateUserObj.mutate({ id: String(id), data: { role } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() }); toast({ title: "✅ Yangilandi" }); }
    });
  };
  const handleUpdateUserTier = (id: number, tier: "free" | "pro") => {
    updateUserObj.mutate({ id: String(id), data: { tier } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() }); toast({ title: "✅ Yangilandi" }); }
    });
  };

  const handleAddConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModel || !newApiKey) { toast({ title: "⚠️ Model va API kalitni kiriting", variant: "destructive" }); return; }
    createConfigObj.mutate({ data: { provider: newProvider as "groq" | "openai" | "anthropic" | "gemini", feature: newFeature, model: newModel, apiKey: newApiKey } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetApiConfigsQueryKey() });
        setShowAddConfig(false);
        setNewApiKey(""); setNewModel(""); setNewProvider("groq"); setNewFeature("chat");
        toast({ title: "✅ Provider qo'shildi" });
      },
      onError: () => toast({ title: "❌ Xatolik", variant: "destructive" }),
    });
  };
  const handleDeleteConfig = (id: number) => {
    deleteConfigObj.mutate({ id }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetApiConfigsQueryKey() }); toast({ title: "🗑️ O'chirildi" }); }
    });
  };
  const handleSavePlan = (_id: number, tier: string) => {
    updatePlanObj.mutate({ tier, data: { price: Number(planPrice), name: planName } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetPlansQueryKey() }); setEditingPlan(null); toast({ title: "✅ Narx yangilandi" }); }
    });
  };

  // ── Helpers ─────────────────────────────────────────────
  const providerConfigs = (pid: string) => (configs || []).filter(c => c.provider === pid);
  const selectedProviderObj = PROVIDERS.find(p => p.id === newProvider);
  const modelList = selectedProviderObj?.models || [];

  const TABS = [
    { id: "overview", icon: "📊", label: "Umumiy"     },
    { id: "users",    icon: "👥", label: "Foydalanuvchilar" },
    { id: "configs",  icon: "🔑", label: "AI Provayderlar" },
    { id: "plans",    icon: "💎", label: "Rejalar"    },
    { id: "logs",     icon: "📋", label: "Loglar"     },
  ] as const;

  // ── Stat card helper ────────────────────────────────────
  const StatCard = ({ icon, label, value, sub }: { icon: string; label: string; value: React.ReactNode; sub?: string }) => (
    <div style={{ borderRadius:16, padding:"18px 20px", background:"rgba(255,255,255,.04)", border:"1.5px solid rgba(255,255,255,.08)", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-16, right:-16, fontSize:52, opacity:.07 }}>{icon}</div>
      <div style={{ color:"rgba(255,255,255,.4)", fontSize:12, marginBottom:8, fontWeight:600, textTransform:"uppercase", letterSpacing:.7 }}>{label}</div>
      <div style={{ fontSize:32, fontWeight:900, color:"#fff" }}>{value}</div>
      {sub && <div style={{ color:"rgba(255,255,255,.3)", fontSize:12, marginTop:4 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ minHeight:"100dvh", background:"#080d1a", color:"#e2e8f0", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

      {/* ── Header ─────────────────────────────────────── */}
      <header style={{
        position:"sticky", top:0, zIndex:50,
        background:"rgba(8,13,26,.95)", backdropFilter:"blur(20px)",
        borderBottom:"1px solid rgba(99,102,241,.18)",
        boxShadow:"0 1px 32px rgba(0,0,0,.5)",
      }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 20px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <Link href="/chat">
              <button style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.7)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <ArrowLeft size={16} />
              </button>
            </Link>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:G, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:`0 4px 16px ${P}44` }}>
                <LayoutDashboard size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:16, background:G, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Admin Console</div>
                <div style={{ fontSize:10.5, color:"rgba(255,255,255,.3)" }}>{userProfile?.email}</div>
              </div>
            </div>
          </div>
          <div style={{ padding:"4px 12px", borderRadius:20, background:"rgba(248,113,113,.12)", border:"1px solid rgba(248,113,113,.3)", color:"#f87171", fontSize:11, fontWeight:700, letterSpacing:.5 }}>
            🔴 ADMIN
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 20px 0", display:"flex", gap:2, borderTop:"1px solid rgba(255,255,255,.04)", overflowX:"auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as TabType)} style={{
              padding:"10px 16px", background:"none", border:"none", cursor:"pointer",
              color:activeTab===t.id?"#fff":"rgba(255,255,255,.4)",
              borderBottom:`2px solid ${activeTab===t.id?P:"transparent"}`,
              fontSize:13, fontWeight:activeTab===t.id?700:400,
              display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap",
              transition:"all .2s",
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth:1200, margin:"0 auto", padding:"24px 20px 60px" }}>

        {/* ══ OVERVIEW ══════════════════════════════════ */}
        {activeTab==="overview" && (
          <div style={{ animation:"fadeIn .35s ease" }}>
            <div style={{ fontWeight:800, fontSize:22, marginBottom:20, background:G, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              📊 Tizim Ko'rinishi
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12, marginBottom:28 }}>
              <StatCard icon="👥" label="Jami Foydalanuvchi" value={loadingStats?<Loader2 size={20} style={{ animation:"spin 1s linear infinite", color:P }}/>:stats?.totalUsers} sub={`${stats?.proUsers||0} Pro · ${stats?.freeUsers||0} Free`} />
              <StatCard icon="💬" label="Jami Suhbat" value={loadingStats?<Loader2 size={20} style={{ animation:"spin 1s linear infinite", color:P }}/>:stats?.totalConversations} />
              <StatCard icon="📨" label="Jami Xabar" value={loadingStats?<Loader2 size={20} style={{ animation:"spin 1s linear infinite", color:P }}/>:stats?.totalMessages} />
              <StatCard icon="🔑" label="AI Provayderlar" value={(configs||[]).length} sub={`${(configs||[]).filter(c=>c.isActive).length} aktiv`} />
            </div>

            {/* Quick actions */}
            <div style={{ fontWeight:700, fontSize:15, marginBottom:14, color:"rgba(255,255,255,.6)" }}>⚡ Tezkor Amallar</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
              {TABS.slice(1).map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as TabType)} style={{
                  padding:"14px 16px", borderRadius:14, background:"rgba(255,255,255,.04)",
                  border:"1px solid rgba(255,255,255,.08)", cursor:"pointer", textAlign:"left",
                  display:"flex", alignItems:"center", gap:10, transition:"all .2s",
                }}>
                  <span style={{ fontSize:24 }}>{t.icon}</span>
                  <span style={{ color:"rgba(255,255,255,.75)", fontSize:13.5, fontWeight:600 }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══ USERS ══════════════════════════════════════ */}
        {activeTab==="users" && (
          <div style={{ animation:"fadeIn .35s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontWeight:800, fontSize:22, background:G, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>👥 Foydalanuvchilar</div>
            </div>
            <div style={{ marginBottom:14 }}>
              <input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Email bo'yicha qidiring..." style={{ width:"100%", maxWidth:380, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", borderRadius:12, padding:"10px 14px", color:"#e2e8f0", fontSize:13.5, outline:"none", boxSizing:"border-box" }} />
            </div>
            <div style={{ borderRadius:16, overflow:"hidden", border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.03)" }}>
              <Table>
                <TableHeader>
                  <TableRow style={{ borderBottom:"1px solid rgba(255,255,255,.07)" }}>
                    <TableHead style={{ color:"rgba(255,255,255,.4)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:.7 }}>Email</TableHead>
                    <TableHead style={{ color:"rgba(255,255,255,.4)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:.7 }}>Ism</TableHead>
                    <TableHead style={{ color:"rgba(255,255,255,.4)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:.7 }}>Qo'shilgan</TableHead>
                    <TableHead style={{ color:"rgba(255,255,255,.4)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:.7 }}>Rol</TableHead>
                    <TableHead style={{ color:"rgba(255,255,255,.4)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:.7 }}>Reja</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsers ? (
                    <TableRow><TableCell colSpan={5} style={{ textAlign:"center", padding:"32px 0" }}><Loader2 size={24} style={{ margin:"0 auto", color:P, animation:"spin 1s linear infinite" }} /></TableCell></TableRow>
                  ) : usersData?.users.length === 0 ? (
                    <TableRow><TableCell colSpan={5} style={{ textAlign:"center", padding:"32px 0", color:"rgba(255,255,255,.25)", fontSize:13 }}>Foydalanuvchi topilmadi</TableCell></TableRow>
                  ) : usersData?.users.map(u => (
                    <TableRow key={u.id} style={{ borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                      <TableCell style={{ color:"rgba(255,255,255,.8)", fontSize:13 }}>{u.email}</TableCell>
                      <TableCell style={{ color:"rgba(255,255,255,.5)", fontSize:13 }}>{u.name || "–"}</TableCell>
                      <TableCell style={{ color:"rgba(255,255,255,.35)", fontSize:12 }}>{format(new Date(u.createdAt), "dd.MM.yyyy")}</TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(val: "user"|"admin") => handleUpdateUserRole(u.id, val)} disabled={updateUserObj.isPending}>
                          <SelectTrigger className="w-[110px] h-8 bg-secondary/50 border-0 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">👤 User</SelectItem>
                            <SelectItem value="admin">🔴 Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={u.tier} onValueChange={(val: "free"|"pro") => handleUpdateUserTier(u.id, val)} disabled={updateUserObj.isPending}>
                          <SelectTrigger className="w-[110px] h-8 bg-secondary/50 border-0 text-xs capitalize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">🆓 Free</SelectItem>
                            <SelectItem value="pro">💎 Pro</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:14, fontSize:12.5, color:"rgba(255,255,255,.3)" }}>
              <span>Sahifa {usersData?.page || 1} · Jami {usersData?.total || 0} ta</span>
              <div style={{ display:"flex", gap:8 }}>
                <Button variant="outline" size="sm" disabled={usersPage===1} onClick={() => setUsersPage(p => p-1)}>← Oldingi</Button>
                <Button variant="outline" size="sm" disabled={usersData?.users.length !== usersData?.limit} onClick={() => setUsersPage(p => p+1)}>Keyingi →</Button>
              </div>
            </div>
          </div>
        )}

        {/* ══ AI PROVIDERS ═══════════════════════════════ */}
        {activeTab==="configs" && (
          <div style={{ animation:"fadeIn .35s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:22, background:G, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:4 }}>🔑 AI Provayderlar</div>
                <div style={{ color:"rgba(255,255,255,.35)", fontSize:13 }}>API kalitlar va modellarni sozlang</div>
              </div>
              <button onClick={() => setShowAddConfig(true)} style={{
                display:"flex", alignItems:"center", gap:8, padding:"10px 18px",
                borderRadius:12, background:G, border:"none", color:"#fff",
                fontWeight:700, fontSize:13.5, cursor:"pointer",
                boxShadow:`0 4px 16px ${P}44`,
              }}>
                <Plus size={16} /> Yangi qo'shish
              </button>
            </div>

            {/* Provider cards */}
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {PROVIDERS.map(prov => {
                const pConfigs = providerConfigs(prov.id);
                const isExpanded = expandedProvider === prov.id;
                return (
                  <div key={prov.id} style={{ borderRadius:18, overflow:"hidden", border:`1.5px solid ${isExpanded ? prov.border : "rgba(255,255,255,.09)"}`, transition:"all .25s" }}>
                    {/* Provider header */}
                    <div onClick={() => setExpandedProvider(isExpanded ? null : prov.id)} style={{
                      display:"flex", alignItems:"center", gap:14, padding:"16px 20px",
                      background:isExpanded ? prov.bg : "rgba(255,255,255,.04)",
                      cursor:"pointer", userSelect:"none", transition:"background .2s",
                    }}>
                      <div style={{ width:46, height:46, borderRadius:14, background:prov.bg, border:`1.5px solid ${prov.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, color:prov.color, fontWeight:900, flexShrink:0 }}>
                        {prov.logo}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ fontWeight:800, fontSize:16, color:"#fff" }}>{prov.name}</span>
                          {pConfigs.length > 0 && (
                            <span style={{ background:prov.bg, border:`1px solid ${prov.border}`, color:prov.color, fontSize:10.5, padding:"2px 8px", borderRadius:20, fontWeight:700 }}>
                              {pConfigs.length} ta sozlangan
                            </span>
                          )}
                        </div>
                        <div style={{ color:"rgba(255,255,255,.4)", fontSize:12.5, marginTop:2 }}>{prov.desc}</div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:10, height:10, borderRadius:"50%", background:pConfigs.length>0?"#34d399":"rgba(255,255,255,.2)", boxShadow:pConfigs.length>0?"0 0 8px #34d39966":"none" }} />
                        {isExpanded ? <ChevronUp size={18} style={{ color:"rgba(255,255,255,.4)" }}/> : <ChevronDown size={18} style={{ color:"rgba(255,255,255,.4)" }}/>}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div style={{ padding:"0 20px 20px", background:prov.bg, borderTop:`1px solid ${prov.border}40` }}>
                        {/* Configured models */}
                        {pConfigs.length > 0 && (
                          <div style={{ marginBottom:16, marginTop:14 }}>
                            <div style={{ fontSize:11.5, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:.7, marginBottom:8 }}>Sozlangan Konfiguratsiyalar</div>
                            {pConfigs.map(c => (
                              <div key={c.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", background:"rgba(0,0,0,.25)", borderRadius:12, marginBottom:7, border:`1px solid ${prov.border}60` }}>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                    <span style={{ background:`${prov.color}22`, color:prov.color, fontSize:10.5, padding:"2px 8px", borderRadius:8, fontWeight:700, border:`1px solid ${prov.color}44` }}>
                                      {FEATURES.find(f=>f.id===c.feature)?.label || c.feature}
                                    </span>
                                    <div style={{ width:7, height:7, borderRadius:"50%", background:c.isActive?"#34d399":"rgba(255,255,255,.2)" }} />
                                  </div>
                                  <div style={{ color:"rgba(255,255,255,.8)", fontSize:13, fontWeight:600, marginTop:5, fontFamily:"monospace" }}>{c.model}</div>
                                  <div style={{ color:"rgba(255,255,255,.25)", fontSize:11, marginTop:2, fontFamily:"monospace" }}>
                                    {c.apiKey ? "🔑 ••••••••••••••••" : "⚠️ API kalitsiz"}
                                  </div>
                                </div>
                                <button onClick={() => handleDeleteConfig(c.id)} style={{ width:32, height:32, borderRadius:8, background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.2)", color:"#f87171", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Quick add for this provider */}
                        <div style={{ padding:"14px 16px", background:"rgba(0,0,0,.2)", borderRadius:14, border:`1px solid ${prov.border}55` }}>
                          <div style={{ fontSize:12, fontWeight:700, color:prov.color, marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                            <Settings2 size={14} /> {prov.name} konfiguratsiya qo'shish
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                            <div>
                              <div style={{ fontSize:11.5, color:"rgba(255,255,255,.4)", marginBottom:5 }}>Model tanlang</div>
                              <select
                                style={{ width:"100%", background:"rgba(255,255,255,.08)", border:`1px solid ${prov.border}`, borderRadius:9, padding:"8px 10px", color:"#e2e8f0", fontSize:12.5, outline:"none", cursor:"pointer" }}
                                onChange={e => {
                                  setNewProvider(prov.id);
                                  setNewModel(e.target.value);
                                }}
                              >
                                <option value="">— Model tanlang —</option>
                                {prov.models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <div style={{ fontSize:11.5, color:"rgba(255,255,255,.4)", marginBottom:5 }}>Funksiya</div>
                              <select
                                style={{ width:"100%", background:"rgba(255,255,255,.08)", border:`1px solid ${prov.border}`, borderRadius:9, padding:"8px 10px", color:"#e2e8f0", fontSize:12.5, outline:"none", cursor:"pointer" }}
                                onChange={e => setNewFeature(e.target.value)}
                              >
                                {FEATURES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                              </select>
                            </div>
                          </div>
                          <div style={{ marginBottom:12 }}>
                            <div style={{ fontSize:11.5, color:"rgba(255,255,255,.4)", marginBottom:5 }}>
                              API kalit
                              <a href={prov.docs} target="_blank" rel="noreferrer" style={{ marginLeft:8, color:prov.color, fontSize:10.5, textDecoration:"none" }}>
                                ↗ {prov.name} konsol
                              </a>
                            </div>
                            <div style={{ display:"flex", gap:8 }}>
                              <input
                                type={showKey ? "text" : "password"}
                                placeholder="API kalitni kiriting..."
                                style={{ flex:1, background:"rgba(255,255,255,.06)", border:`1px solid ${prov.border}`, borderRadius:9, padding:"8px 12px", color:"#e2e8f0", fontSize:12.5, outline:"none", fontFamily:"monospace" }}
                                onChange={e => setNewApiKey(e.target.value)}
                              />
                              <button onClick={() => setShowKey(!showKey)} style={{ width:36, height:36, borderRadius:9, background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.5)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                                {showKey ? <EyeOff size={14}/> : <Eye size={14}/>}
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (!newModel || !newApiKey) { toast({ title: "⚠️ Model va API kalitni tanlang", variant: "destructive" }); return; }
                              createConfigObj.mutate(
                                { data: { provider: prov.id as "groq"|"openai"|"anthropic"|"gemini", feature: newFeature, model: newModel, apiKey: newApiKey } },
                                {
                                  onSuccess: () => {
                                    queryClient.invalidateQueries({ queryKey: getGetApiConfigsQueryKey() });
                                    setNewApiKey(""); setNewModel("");
                                    toast({ title: `✅ ${prov.name} qo'shildi` });
                                  },
                                  onError: () => toast({ title: "❌ Xatolik", variant: "destructive" }),
                                }
                              );
                            }}
                            disabled={createConfigObj.isPending}
                            style={{
                              width:"100%", padding:"10px", borderRadius:11, border:"none",
                              background:prov.color, color:"#fff", fontWeight:700, fontSize:13.5,
                              cursor:createConfigObj.isPending?"not-allowed":"pointer",
                              opacity:createConfigObj.isPending?0.6:1,
                              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                              boxShadow:`0 4px 16px ${prov.color}44`,
                            }}
                          >
                            {createConfigObj.isPending ? <Loader2 size={15} style={{ animation:"spin 1s linear infinite" }}/> : <Check size={15}/>}
                            {prov.name} ni Saqlash
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* All configs summary */}
            {loadingConfigs ? (
              <div style={{ textAlign:"center", padding:"32px 0" }}><Loader2 size={24} style={{ color:P, animation:"spin 1s linear infinite", margin:"0 auto" }} /></div>
            ) : (configs||[]).length === 0 && (
              <div style={{ textAlign:"center", padding:"40px 0", color:"rgba(255,255,255,.2)", fontSize:14 }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🔑</div>
                Hech qanday API konfiguratsiya yo'q.<br />
                <span style={{ color:"#f87171" }}>AI funksiyalari ishlamaydi!</span><br />
                Yuqoridan provider tanlang va API kalit qo'shing.
              </div>
            )}
          </div>
        )}

        {/* ══ PLANS ══════════════════════════════════════ */}
        {activeTab==="plans" && (
          <div style={{ animation:"fadeIn .35s ease" }}>
            <div style={{ fontWeight:800, fontSize:22, marginBottom:24, background:G, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>💎 Obuna Rejalari</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
              {loadingPlans ? (
                <div style={{ textAlign:"center", padding:"32px 0" }}><Loader2 size={24} style={{ color:P, animation:"spin 1s linear infinite", margin:"0 auto" }} /></div>
              ) : plans?.map(plan => (
                <div key={plan.id} style={{ borderRadius:20, overflow:"hidden", border:`1.5px solid ${plan.tier==="pro"?P+"55":"rgba(255,255,255,.1)"}`, background:plan.tier==="pro"?`${P}0d`:"rgba(255,255,255,.04)" }}>
                  <div style={{ padding:"20px 20px 14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:.7, marginBottom:4 }}>{plan.tier} Reja</div>
                        <div style={{ fontSize:22, fontWeight:900, color:"#fff" }}>{plan.name}</div>
                      </div>
                      {plan.tier==="pro" ? (
                        <div style={{ fontSize:32, color:P }}>💎</div>
                      ) : (
                        <div style={{ fontSize:32 }}>🆓</div>
                      )}
                    </div>
                    {editingPlan===plan.id ? (
                      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                        <div>
                          <Label style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>Reja nomi</Label>
                          <Input value={planName} onChange={e => setPlanName(e.target.value)} className="mt-1 bg-secondary/50 border-border/50 h-9" />
                        </div>
                        {plan.tier !== "free" && (
                          <div>
                            <Label style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>Narx (USD)</Label>
                            <Input type="number" value={planPrice} onChange={e => setPlanPrice(e.target.value)} className="mt-1 bg-secondary/50 border-border/50 h-9" />
                          </div>
                        )}
                        <div style={{ display:"flex", gap:8 }}>
                          <button onClick={() => handleSavePlan(plan.id, plan.tier)} disabled={updatePlanObj.isPending} style={{ flex:1, padding:"9px", borderRadius:10, background:G, border:"none", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                            {updatePlanObj.isPending ? "⏳..." : "✅ Saqlash"}
                          </button>
                          <button onClick={() => setEditingPlan(null)} style={{ flex:1, padding:"9px", borderRadius:10, background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.6)", fontWeight:600, fontSize:13, cursor:"pointer" }}>
                            Bekor
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize:28, fontWeight:900, color:plan.tier==="pro"?P:"rgba(255,255,255,.8)", marginBottom:4 }}>
                          {plan.tier==="free" ? "$0" : `$${plan.price}`}
                          {plan.tier!=="free" && <span style={{ fontSize:14, fontWeight:400, color:"rgba(255,255,255,.3)" }}>/oy</span>}
                        </div>
                        <button onClick={() => { setEditingPlan(plan.id); setPlanName(plan.name); setPlanPrice(plan.price?.toString()||""); }} style={{ marginTop:12, width:"100%", padding:"9px", borderRadius:10, background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.12)", color:"rgba(255,255,255,.65)", fontSize:13, cursor:"pointer", fontWeight:600 }}>
                          ✏️ Tahrirlash
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ LOGS ═══════════════════════════════════════ */}
        {activeTab==="logs" && (
          <div style={{ animation:"fadeIn .35s ease" }}>
            <div style={{ fontWeight:800, fontSize:22, marginBottom:20, background:G, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>📋 Tizim Loglari</div>
            <div style={{ borderRadius:16, overflow:"hidden", border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.03)" }}>
              <Table>
                <TableHeader>
                  <TableRow style={{ borderBottom:"1px solid rgba(255,255,255,.07)" }}>
                    <TableHead style={{ color:"rgba(255,255,255,.4)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:.7, width:160 }}>Vaqt</TableHead>
                    <TableHead style={{ color:"rgba(255,255,255,.4)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:.7, width:120 }}>Tur</TableHead>
                    <TableHead style={{ color:"rgba(255,255,255,.4)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:.7 }}>Foydalanuvchi</TableHead>
                    <TableHead style={{ color:"rgba(255,255,255,.4)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:.7 }}>Tavsif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLogs ? (
                    <TableRow><TableCell colSpan={4} style={{ textAlign:"center", padding:"32px 0" }}><Loader2 size={24} style={{ margin:"0 auto", color:P, animation:"spin 1s linear infinite" }} /></TableCell></TableRow>
                  ) : logsData?.logs.length === 0 ? (
                    <TableRow><TableCell colSpan={4} style={{ textAlign:"center", padding:"32px 0", color:"rgba(255,255,255,.25)", fontSize:13 }}>Log yo'q</TableCell></TableRow>
                  ) : logsData?.logs.map(log => (
                    <TableRow key={log.id} style={{ borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                      <TableCell style={{ color:"rgba(255,255,255,.35)", fontSize:12, whiteSpace:"nowrap" }}>{format(new Date(log.createdAt), "dd.MM HH:mm:ss")}</TableCell>
                      <TableCell>
                        <span style={{
                          padding:"2px 9px", borderRadius:20, fontSize:10.5, fontWeight:700, letterSpacing:.4,
                          background:log.type==="chat"?"rgba(99,102,241,.18)":log.type==="auth"?"rgba(52,211,153,.15)":"rgba(255,255,255,.08)",
                          color:log.type==="chat"?P:log.type==="auth"?"#34d399":"rgba(255,255,255,.5)",
                          border:`1px solid ${log.type==="chat"?P+"44":log.type==="auth"?"rgba(52,211,153,.3)":"rgba(255,255,255,.1)"}`,
                          textTransform:"uppercase",
                        }}>
                          {log.type}
                        </span>
                      </TableCell>
                      <TableCell style={{ color:"rgba(255,255,255,.5)", fontSize:12 }}>{log.userEmail || "–"}</TableCell>
                      <TableCell style={{ color:"rgba(255,255,255,.7)", fontSize:13 }}>{log.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:14, fontSize:12.5, color:"rgba(255,255,255,.3)" }}>
              <span>Sahifa {logsData?.page || 1} · Jami {logsData?.total || 0} ta log</span>
              <div style={{ display:"flex", gap:8 }}>
                <Button variant="outline" size="sm" disabled={logsPage===1} onClick={() => setLogsPage(p => p-1)}>← Oldingi</Button>
                <Button variant="outline" size="sm" disabled={logsData?.logs.length !== logsData?.limit} onClick={() => setLogsPage(p => p+1)}>Keyingi →</Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Generic Add Config Dialog (fallback) ─────────── */}
      <Dialog open={showAddConfig} onOpenChange={setShowAddConfig}>
        <DialogContent className="bg-card border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle>🔑 AI Provider qo'shish</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddConfig} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={newProvider} onValueChange={v => { setNewProvider(v); setNewModel(""); }}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map(p => <SelectItem key={p.id} value={p.id}>{p.logo} {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={newModel} onValueChange={setNewModel}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue placeholder="Model tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {modelList.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Funksiya</Label>
              <Select value={newFeature} onValueChange={setNewFeature}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEATURES.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Kalit</Label>
              <div style={{ display:"flex", gap:8 }}>
                <Input type={showKey ? "text" : "password"} value={newApiKey} onChange={e => setNewApiKey(e.target.value)} placeholder="sk-... yoki gsk_..." className="bg-secondary/50 border-border/50 font-mono text-sm flex-1" required />
                <Button type="button" variant="outline" size="icon" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff size={14}/> : <Eye size={14}/>}
                </Button>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowAddConfig(false)}>Bekor</Button>
              <Button type="submit" disabled={createConfigObj.isPending}>
                {createConfigObj.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                ✅ Saqlash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
