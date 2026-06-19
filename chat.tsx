import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  useGetMe,
  useGetConversations,
  useCreateConversation,
  useDeleteConversation,
  useGetMessages,
  useSendMessage,
  useGetUsage,
  getGetConversationsQueryKey,
  getGetMessagesQueryKey,
  getGetUsageQueryKey,
} from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { ChatAvatar } from "@/components/chat-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  MessageSquare, Plus, Trash2, Send, Paperclip,
  Settings, LogOut, Loader2, Bot, User, LayoutDashboard,
  AlertCircle, FileText, Mic, MicOff, Volume2, VolumeX,
  Bell, RefreshCw, Menu, X, TrendingUp, TrendingDown,
  Wallet, ArrowUpRight, ArrowDownLeft, Copy, Check, Database,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// ─── Constants ───────────────────────────────────────────
const ONE_HOUR = 60 * 60 * 1000;
const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;
const NOW = Date.now();
const P = "#6366f1";
const P2 = "#818cf8";

const SOCIAL_LIST = [
  { icon: "📸", name: "Instagram", color: "#e1306c", tasks: ["Post yoz", "Hashtag tavsiya", "Reel script", "Bio optim", "Caption viral"] },
  { icon: "✈️", name: "Telegram",  color: "#0088cc", tasks: ["Kanal post", "Bot xabar", "Announcement", "Guruh qoidalari", "Reklama matni"] },
  { icon: "🎵", name: "TikTok",    color: "#ff0050", tasks: ["Video g'oyasi", "Caption yoz", "Trend tahlil", "Hook yoz", "Duet g'oya"] },
  { icon: "▶️", name: "YouTube",   color: "#ff0000", tasks: ["Sarlavha yoz", "Tavsif yoz", "Skript", "SEO teglari", "Thumbnail g'oya"] },
  { icon: "in", name: "LinkedIn",  color: "#0077b5", tasks: ["Post yoz", "CV optim", "Cover letter", "Network post", "Article"] },
  { icon: "🐦", name: "Twitter/X", color: "#1da1f2", tasks: ["Tweet yoz", "Thread", "Bio yoz", "Viral post", "Reply yoz"] },
];

const MONEY_LIST = [
  { icon: "📹", name: "YouTube Shorts AI",   earn: "$300-2000/oy", diff: "Oson",  how: "AI video → monetizatsiya → AdSense" },
  { icon: "✍️", name: "AI Blog/Maqola",      earn: "$100-800/oy",  diff: "Oson",  how: "ChatGPT/Claude → blog → Google reklama" },
  { icon: "🎨", name: "AI Rasm Sotish",      earn: "$200-1500/oy", diff: "O'rta", how: "Midjourney → Etsy/Gumroad → sotish" },
  { icon: "🤖", name: "Telegram Bot",        earn: "$50-500/oy",   diff: "O'rta", how: "Bot yaratish → kanalga ulash → to'lov" },
  { icon: "📱", name: "SMM Xizmati",         earn: "$300-1200/oy", diff: "Oson",  how: "AI kontent → mahalliy bizneslar → oylik" },
  { icon: "💻", name: "No-Code Ilovalar",    earn: "$500-5000/oy", diff: "O'rta", how: "Bubble/Glide → mijoz topish → loyiha" },
  { icon: "🎓", name: "Online Kurs Sotish",  earn: "$300-3000/oy", diff: "O'rta", how: "AI kurs yozish → Udemy/Teachable" },
  { icon: "🚀", name: "Dropshipping",        earn: "$200-1500/oy", diff: "O'rta", how: "AI mahsulot → Shopify → reklama" },
  { icon: "🎧", name: "AI Podcast",          earn: "$50-600/oy",   diff: "Oson",  how: "AI skript → ElevenLabs → Spotify" },
  { icon: "🔗", name: "Affiliate Marketing", earn: "$100-3000/oy", diff: "Oson",  how: "AI review → link → komissiya" },
];

const CRYPTO_LIST = [
  { sym: "BTC",  name: "Bitcoin",        icon: "₿",  price: 67842.30, change: 2.41,  color: "#f7931a", market: "1.32T", vol: "28.4B" },
  { sym: "ETH",  name: "Ethereum",       icon: "Ξ",  price: 3521.18,  change: -1.23, color: "#627eea", market: "423B",  vol: "14.2B" },
  { sym: "BNB",  name: "BNB Chain",      icon: "⬡",  price: 598.44,   change: 0.87,  color: "#f3ba2f", market: "87.3B", vol: "2.1B"  },
  { sym: "SOL",  name: "Solana",         icon: "◎",  price: 178.92,   change: 5.64,  color: "#9945ff", market: "82.4B", vol: "3.8B"  },
  { sym: "USDT", name: "Tether",         icon: "₮",  price: 1.00,     change: 0.01,  color: "#26a17b", market: "112B",  vol: "45.1B" },
  { sym: "ADA",  name: "Cardano",        icon: "₳",  price: 0.4821,   change: -2.14, color: "#0033ad", market: "17.1B", vol: "412M"  },
  { sym: "DOGE", name: "Dogecoin",       icon: "Ð",  price: 0.1634,   change: 8.92,  color: "#c2a633", market: "23.7B", vol: "1.9B"  },
  { sym: "UZS",  name: "Tether UZS",    icon: "so'm", price: 12820,   change: 0.15,  color: "#1abc9c", market: "–",     vol: "–"     },
];

const WALLET_TXNS = [
  { type: "in",  label: "Oylik maosh",       amount: 5_200_000, date: "Bugun 09:12",    coin: "UZS" },
  { type: "out", label: "Netflix obuna",      amount: 89_000,    date: "Kecha 22:44",    coin: "UZS" },
  { type: "in",  label: "Freelance to'lov",   amount: 1_400_000, date: "10 iyun 14:30",  coin: "UZS" },
  { type: "out", label: "Supermarket",        amount: 215_000,   date: "9 iyun 11:00",   coin: "UZS" },
  { type: "in",  label: "BTC savdo foyda",    amount: 0.0041,    date: "8 iyun 18:05",   coin: "BTC" },
  { type: "out", label: "Elektr to'lovi",     amount: 310_000,   date: "7 iyun 08:30",   coin: "UZS" },
];

const INIT_MODULES = [
  { id: "chat",      icon: "💬", name: "AI Chat",           cat: "ai",      desc: "Aqlli suhbat",           lastUsed: NOW, uses: 0, locked: true  },
  { id: "voice",     icon: "🎙️", name: "Ovozli Yordamchi",  cat: "ai",      desc: "Ovozli kiritish/TTS",    lastUsed: NOW, uses: 0, locked: true  },
  { id: "video",     icon: "🎬", name: "Video Generator",   cat: "media",   desc: "AI video stsenariy",     lastUsed: NOW, uses: 0, locked: false },
  { id: "image",     icon: "🖼️", name: "Rasm & Dizayn",     cat: "media",   desc: "AI rasm yaratish",       lastUsed: NOW, uses: 0, locked: false },
  { id: "social",    icon: "📱", name: "Ijtimoiy Tarmoqlar", cat: "social",  desc: "SMM & kontent",          lastUsed: NOW, uses: 0, locked: false },
  { id: "money",     icon: "💰", name: "Pul Ishlash",       cat: "finance", desc: "Online daromad yo'llari", lastUsed: NOW, uses: 0, locked: false },
  { id: "wallet",    icon: "💳", name: "Hamyon",             cat: "finance", desc: "Onlayn hamyon",          lastUsed: NOW, uses: 0, locked: false },
  { id: "crypto",    icon: "📈", name: "Kripto Savdo",       cat: "finance", desc: "Kripto & aksiyalar",     lastUsed: NOW, uses: 0, locked: false },
  { id: "code",      icon: "💻", name: "Dasturchi AI",       cat: "dev",     desc: "Kod yozish & debug",     lastUsed: NOW, uses: 0, locked: false },
  { id: "bank",      icon: "🏦", name: "Bank Operatori",    cat: "finance", desc: "Moliyaviy maslahat",     lastUsed: NOW, uses: 0, locked: false },
  { id: "gov",       icon: "🏛️", name: "Davlat Xizmatlari", cat: "civic",   desc: "Hujjat & ariza",         lastUsed: NOW, uses: 0, locked: false },
  { id: "doctor",    icon: "🏥", name: "Tibbiy Maslahat",   cat: "health",  desc: "Sog'liq ma'lumotlari",   lastUsed: NOW, uses: 0, locked: false },
  { id: "lawyer",    icon: "⚖️", name: "Huquqiy Maslahat",  cat: "civic",   desc: "Qonun & huquq",          lastUsed: NOW, uses: 0, locked: false },
  { id: "translate", icon: "🌐", name: "Tarjimon Pro",      cat: "ai",      desc: "200+ til tarjima",       lastUsed: NOW, uses: 0, locked: false },
  { id: "edu",       icon: "🎓", name: "Ta'lim AI",         cat: "learn",   desc: "O'rgatish & dars",       lastUsed: NOW, uses: 0, locked: false },
  { id: "seo",       icon: "🔍", name: "SEO Optimizer",     cat: "dev",     desc: "Sayt optim & tahlil",    lastUsed: NOW, uses: 0, locked: false },
];

interface Module { id:string; icon:string; name:string; cat:string; desc:string; lastUsed:number; uses:number; locked:boolean; auto?:boolean; earning?:string; tech?:string; }
interface LearnLogEntry { time:string; type:"add"|"remove"|"info"; icon:string; text:string; tech?:string; }
interface Notif { id:number; text:string; type:"success"|"warn"|"info"; }
interface VideoResult { title?:string; duration?:string; platform?:string; hook?:string; cta?:string; tips?:string; music?:string; scenes?:{time:string; visual:string; voiceover?:string}[]; }

type TabType = "chat"|"video"|"social"|"money"|"modules"|"learn"|"wallet"|"crypto";

function timeLeft(lastUsed:number) {
  const rem = lastUsed + ONE_YEAR - Date.now();
  if (rem <= 0) return "O'chirish vaqti!";
  const days = Math.floor(rem / 86400000);
  return days > 60 ? `${Math.floor(days/30)} oy` : `${days} kun`;
}
function loadModules():Module[] { try { const s=localStorage.getItem("ulugbek_modules"); return s?JSON.parse(s):INIT_MODULES; } catch { return INIT_MODULES; } }
function saveModules(m:Module[]) { try { localStorage.setItem("ulugbek_modules",JSON.stringify(m)); } catch { /**/ } }
function loadLearnLog():LearnLogEntry[] { try { const s=localStorage.getItem("ulugbek_learn_log"); return s?JSON.parse(s):[]; } catch { return []; } }
function saveLearnLog(l:LearnLogEntry[]) { try { localStorage.setItem("ulugbek_learn_log",JSON.stringify(l)); } catch { /**/ } }
function fmt(n:number) { return n>=1e9?`${(n/1e9).toFixed(2)}B`:n>=1e6?`${(n/1e6).toFixed(1)}M`:n.toLocaleString(); }
function usageLimitPercent(count:number, limit:number) { return Math.min(100, (count/limit)*100); }

// ─── Global CSS ──────────────────────────────────────────
const ANIM_CSS = `
@keyframes avatarFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes avatarRipple{0%{transform:scale(.8);opacity:.5}100%{transform:scale(2.4);opacity:0}}
@keyframes thinkDot{from{transform:translateY(0);opacity:.3}to{transform:translateY(-9px);opacity:1}}
@keyframes statusBlink{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes notifIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes cdPulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes drawerIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes priceFlash{0%{opacity:1}50%{opacity:.4}100%{opacity:1}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 12px #6366f133}50%{box-shadow:0 0 28px #6366f155}}
`;

// ─── Crypto price ticker (simulated live) ────────────────
function useLivePrices() {
  const [prices, setPrices] = useState<Record<string,(number)>>(() =>
    Object.fromEntries(CRYPTO_LIST.map(c => [c.sym, c.price]))
  );
  useEffect(() => {
    const t = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        CRYPTO_LIST.forEach(c => {
          const drift = (Math.random() - 0.497) * 0.002;
          next[c.sym] = parseFloat((prev[c.sym] * (1 + drift)).toFixed(c.price < 1 ? 4 : 2));
        });
        return next;
      });
    }, 2500);
    return () => clearInterval(t);
  }, []);
  return prices;
}

export default function ChatPage() {
  const [, setLocation] = useLocation();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const { data: userProfile } = useGetMe();

  // ── UI state ─────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<TabType>("chat");
  const [agentId, setAgentId] = useState("chat");

  // ── Conversation ──────────────────────────────────────
  const [activeConversationId, setActiveConversationId] = useState<number|null>(null);
  const [inputValue, setInputValue] = useState("");
  const [fileToUpload, setFileToUpload] = useState<{url:string;type:string;name:string}|null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Avatar ─────────────────────────────────────────────
  const [talking, setTalking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [bubble, setBubble] = useState("Salom! Men Ulug'bek AI 🌟");
  const talkTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  // ── Voice ─────────────────────────────────────────────
  const [listening, setListening] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);
  const synthRef = useRef<SpeechSynthesis|null>(typeof window!=="undefined"?window.speechSynthesis:null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null);

  // ── Modules & log ─────────────────────────────────────
  const [modules, setModules] = useState<Module[]>(() => loadModules());
  const [removedMods, setRemovedMods] = useState<Module[]>([]);
  const [learnLog, setLearnLog] = useState<LearnLogEntry[]>(() => loadLearnLog());
  const [discovering, setDiscovering] = useState(false);
  const [lastLearn, setLastLearn] = useState(Date.now());
  const [countdown, setCountdown] = useState(ONE_HOUR);

  // ── Notifications ─────────────────────────────────────
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [showNotif, setShowNotif] = useState(false);

  // ── Video ─────────────────────────────────────────────
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoResult, setVideoResult] = useState<VideoResult|null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  // ── Wallet ─────────────────────────────────────────────
  const [walletTab, setWalletTab] = useState<"overview"|"send"|"receive">("overview");
  const [sendAmount, setSendAmount] = useState("");
  const [sendAddr, setSendAddr] = useState("");
  const [copied, setCopied] = useState(false);
  const WALLET_ADDR = "UZB1x9f2k3...8mQ4";
  const WALLET_BALANCE_UZS = 12_480_000;
  const WALLET_BALANCE_USD = 976.42;

  // ── Crypto ─────────────────────────────────────────────
  const livePrices = useLivePrices();
  const [portfolio] = useState([
    { sym: "BTC", amount: 0.0041, avgPrice: 62_000 },
    { sym: "ETH", amount: 0.21,   avgPrice: 3_100  },
    { sym: "SOL", amount: 2.5,    avgPrice: 160    },
  ]);
  const [tradeDialog, setTradeDialog] = useState<string|null>(null);
  const [tradeType, setTradeType] = useState<"buy"|"sell">("buy");
  const [tradeAmt, setTradeAmt] = useState("");

  // ── API hooks ─────────────────────────────────────────
  const { data: conversations = [], isLoading: loadingConversations } = useGetConversations();
  const { data: usageStats } = useGetUsage();
  const createConversationObj = useCreateConversation();
  const deleteConversationObj = useDeleteConversation();
  const sendMessageObj = useSendMessage();
  const { data: messages = [], isLoading: loadingMessages } = useGetMessages(
    activeConversationId as number,
    { query: { enabled: !!activeConversationId, queryKey: getGetMessagesQueryKey(activeConversationId as number) } }
  );

  const autoMods = modules.filter(m => m.auto);
  const cdStr = `${String(Math.floor(countdown/3600000)).padStart(2,"0")}:${String(Math.floor((countdown%3600000)/60000)).padStart(2,"0")}:${String(Math.floor((countdown%60000)/1000)).padStart(2,"0")}`;

  // ── Effects ───────────────────────────────────────────
  useEffect(() => {
    if (!loadingConversations && conversations.length > 0 && !activeConversationId)
      setActiveConversationId(conversations[0].id);
  }, [conversations, loadingConversations, activeConversationId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, sendMessageObj.isPending]);
  useEffect(() => { saveModules(modules); }, [modules]);
  useEffect(() => { saveLearnLog(learnLog); }, [learnLog]);

  useEffect(() => {
    const t = setInterval(() => { setCountdown(Math.max(0, ONE_HOUR-(Date.now()-lastLearn))); }, 1000);
    return () => clearInterval(t);
  }, [lastLearn]);

  useEffect(() => {
    const t = setInterval(() => { discoverNew(); }, ONE_HOUR);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const cutoff = Date.now()-ONE_YEAR;
      setModules(prev => {
        const active:Module[]=[], removed:Module[]=[];
        prev.forEach(m => { if (!m.locked && m.lastUsed<cutoff) { removed.push({...m}); addNotif(`🗑️ "${m.name}" — 1 yil o'chirildi`,"warn"); } else { active.push(m); } });
        if (removed.length) setRemovedMods(p => [...removed,...p].slice(0,30));
        return active;
      });
    }, 86400000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ───────────────────────────────────────────
  const addNotif = useCallback((text:string, type:"success"|"warn"|"info"="info") => {
    setNotifs(p => [{ id:Date.now(), text, type }, ...p].slice(0,20));
    setShowNotif(true);
    setTimeout(() => setShowNotif(false), 4500);
  }, []);

  const animTalk = useCallback((ms=3500) => {
    setTalking(true);
    if (talkTimerRef.current) clearTimeout(talkTimerRef.current);
    talkTimerRef.current = setTimeout(() => setTalking(false), ms);
  }, []);

  const speakText = useCallback((text:string) => {
    if (!ttsOn || !synthRef.current) return;
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0,450));
    u.lang="uz-UZ"; u.rate=0.93; u.pitch=1.05;
    u.onstart=() => setTalking(true);
    u.onend=() => setTalking(false);
    u.onerror=() => setTalking(false);
    synthRef.current.speak(u);
  }, [ttsOn]);

  const callAIComplete = useCallback(async (prompt:string, systemPrompt?:string, maxTokens?:number):Promise<string> => {
    try {
      const res = await fetch("/api/ai/complete", {
        method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include",
        body: JSON.stringify({ prompt, systemPrompt, maxTokens }),
      });
      if (!res.ok) return "";
      const data = await res.json() as { text?:string };
      return data.text||"";
    } catch { return ""; }
  }, []);

  const discoverNew = useCallback(async () => {
    if (discovering) return;
    setDiscovering(true);
    setLastLearn(Date.now());
    addNotif("🔍 AI yangi funksiya qidirmoqda...","info");
    const resp = await callAIComplete(
      `Hozirgi texnologiya trendlari asosida AI ilovaga qo'shish mumkin bo'lgan YANGI funksiya tavsiya qil.
      JSON format:
      {"name":"...", "icon":"emoji", "cat":"ai|media|finance|dev|health|civic|social|learn", "desc":"...qisqa", "earning":"ixtiyoriy", "tech":"texnologiya nomi"}
      Faqat JSON, boshqa hech narsa yozma.`,
      "Sen AI ilovalar mutaxassisisan.",
      120
    );
    try {
      const raw = resp.match(/\{[\s\S]*\}/)?.[0];
      if (!raw) throw new Error("no json");
      const parsed = JSON.parse(raw) as { name?:string; icon?:string; cat?:string; desc?:string; earning?:string; tech?:string };
      if (!parsed.name) throw new Error("no name");
      const newMod:Module = {
        id:`auto_${Date.now()}`, icon:parsed.icon||"✨", name:parsed.name,
        cat:parsed.cat||"ai", desc:parsed.desc||"", lastUsed:Date.now(),
        uses:0, locked:false, auto:true,
        earning:parsed.earning, tech:parsed.tech,
      };
      setModules(p => {
        if (p.find(x => x.name===newMod.name)) return p;
        return [...p, newMod];
      });
      const entry:LearnLogEntry = {
        time:new Date().toLocaleString("uz"), type:"add",
        icon:newMod.icon, text:`"${newMod.name}" qo'shildi`,
        tech:parsed.tech,
      };
      setLearnLog(p => [entry,...p].slice(0,60));
      addNotif(`✨ Yangi modul: "${newMod.name}"`, "success");
    } catch {
      addNotif("⚠️ Kashfiyot amalga oshmadi","warn");
    }
    setDiscovering(false);
  }, [discovering, addNotif, callAIComplete]);

  const genVideo = useCallback(async () => {
    if (!videoPrompt.trim() || videoLoading) return;
    setVideoLoading(true);
    setVideoResult(null);
    const resp = await callAIComplete(
      `"${videoPrompt}" uchun video stsenariy yoz. JSON:
      {"title":"...","duration":"0:30-3:00","platform":"TikTok/YouTube/Reel","hook":"...","scenes":[{"time":"0:00","visual":"...","voiceover":"..."}],"music":"...","cta":"...","tips":"..."}
      Faqat JSON.`,
      "Sen kreativ video skriptchi mutaxassisisan.",
      600
    );
    try {
      const raw = resp.match(/\{[\s\S]*\}/)?.[0];
      if (!raw) throw new Error();
      setVideoResult(JSON.parse(raw) as VideoResult);
    } catch {
      addNotif("⚠️ Stsenariy yaratilmadi","warn");
    }
    setVideoLoading(false);
  }, [videoPrompt, videoLoading, callAIComplete, addNotif]);

  const sendQuickPrompt = useCallback((text:string) => {
    setInputValue(text);
    setTab("chat");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const toggleListen = () => {
    type SR = new () => { lang:string; interimResults:boolean; onstart:(()=>void)|null; onresult:((e:any)=>void)|null; onend:(()=>void)|null; onerror:(()=>void)|null; start:()=>void; stop:()=>void };
    const SRC = ((window as unknown as Record<string,unknown>)["SpeechRecognition"]||(window as unknown as Record<string,unknown>)["webkitSpeechRecognition"]) as SR|undefined;
    if (!SRC) { addNotif("⚠️ Chrome yoki Edge ishlatilsin","warn"); return; }
    if (listening) { recogRef.current?.stop(); setListening(false); return; }
    const r = new SRC();
    r.lang="uz-UZ"; r.interimResults=false;
    r.onstart=() => setListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult=(e:any) => { setInputValue(e.results[0][0].transcript); setTab("chat"); };
    r.onend=() => setListening(false);
    r.onerror=() => setListening(false);
    recogRef.current=r;
    r.start();
    setModules(p => p.map(m => m.id==="voice"?{...m,lastUsed:Date.now(),uses:m.uses+1}:m));
  };

  const handleCreateChat = () => {
    createConversationObj.mutate({ data:{ title:"Yangi suhbat" } }, {
      onSuccess: (conv) => {
        queryClient.invalidateQueries({ queryKey:getGetConversationsQueryKey() });
        setActiveConversationId(conv.id);
        setTab("chat");
        setBubble("Yangi suhbat boshlandi! 🚀");
        animTalk(2500);
        setMenuOpen(false);
      }
    });
  };

  const handleDeleteChat = (id:number, e:React.MouseEvent) => {
    e.stopPropagation();
    deleteConversationObj.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey:getGetConversationsQueryKey() });
        if (activeConversationId===id) setActiveConversationId(conversations.find(c=>c.id!==id)?.id||null);
      }
    });
  };

  const handleFileSelect = (e:React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (usageStats?.tier==="free" && (usageStats.fileCount||0) >= (usageStats.limits?.fileLimit||1)) { setShowUpgradeDialog(true); return; }
    if (file.type.startsWith("image/") && usageStats?.tier==="free" && (usageStats.imageCount||0) >= (usageStats.limits?.imageLimit||1)) { setShowUpgradeDialog(true); return; }
    const url = URL.createObjectURL(file);
    setFileToUpload({ url, type:file.type, name:file.name });
  };

  const handleSendMessage = async (e:React.FormEvent) => {
    e.preventDefault();
    if ((!inputValue.trim() && !fileToUpload) || sendMessageObj.isPending) return;
    let convId = activeConversationId;
    if (!convId) {
      try {
        const conv = await createConversationObj.mutateAsync({ data:{ title: inputValue.slice(0,50)||"Yangi suhbat" } });
        queryClient.invalidateQueries({ queryKey:getGetConversationsQueryKey() });
        convId=conv.id;
        setActiveConversationId(conv.id);
      } catch { return; }
    }
    const payload = { content:inputValue, agentType:agentId!=="chat"?agentId:undefined, fileUrl:fileToUpload?.url, fileType:fileToUpload?.type, fileName:fileToUpload?.name };
    setInputValue("");
    setFileToUpload(null);
    setThinking(true);
    setBubble("O'ylamoqda...");
    setModules(p => p.map(m => m.id===agentId?{...m,lastUsed:Date.now(),uses:m.uses+1}:m));
    sendMessageObj.mutate({ id:convId, data:payload }, {
      onSuccess: (reply) => {
        queryClient.invalidateQueries({ queryKey:getGetMessagesQueryKey(convId!) });
        queryClient.invalidateQueries({ queryKey:getGetUsageQueryKey() });
        setThinking(false);
        const text = reply.content||"";
        setBubble(text.slice(0,80)+(text.length>80?"...":""));
        animTalk(Math.max(2000, Math.min(8000, text.length*40)));
        if (ttsOn) speakText(text);
        const entry:LearnLogEntry = { time:new Date().toLocaleString("uz"), type:"info", icon:"💬", text:`"${inputValue.slice(0,40)}" — ${agentId} agenti javob berdi` };
        setLearnLog(p => [entry,...p].slice(0,60));
      },
      onError: () => { setThinking(false); setBubble("Xatolik yuz berdi 😔"); addNotif("⚠️ Xabar yuborishda xatolik","warn"); }
    });
  };

  // ─── Render ───────────────────────────────────────────
  const G = `linear-gradient(135deg, ${P} 0%, ${P2} 100%)`;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100dvh", background:"#080d1a", color:"#e2e8f0", overflow:"hidden", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" }}>
      <style>{ANIM_CSS}</style>

      {/* ── Notification ─────────────────────────────────── */}
      {showNotif && notifs[0] && (
        <div style={{ position:"fixed", top:16, right:16, zIndex:9999, animation:"notifIn .3s ease", maxWidth:300 }}>
          <div style={{
            background:"rgba(8,13,26,.95)", backdropFilter:"blur(20px)",
            border:`1.5px solid ${notifs[0].type==="success"?"#34d39955":notifs[0].type==="warn"?"#f8717155":P+"55"}`,
            borderRadius:14, padding:"12px 16px",
            boxShadow:"0 16px 48px rgba(0,0,0,.6)",
            color:"#e2e8f0", fontSize:13, lineHeight:1.5,
          }}>
            {notifs[0].text}
          </div>
        </div>
      )}

      {/* ── Hamburger Drawer Overlay ────────────────────── */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{
          position:"fixed", inset:0, zIndex:200,
          background:"rgba(0,0,0,.65)", backdropFilter:"blur(4px)",
          animation:"fadeIn .2s ease",
        }} />
      )}

      {/* ── Hamburger Drawer ─────────────────────────────── */}
      <div style={{
        position:"fixed", top:0, left:0, bottom:0, width:Math.min(300, window.innerWidth*0.85),
        zIndex:201, background:"rgba(10,15,30,.97)", backdropFilter:"blur(24px)",
        borderRight:"1px solid rgba(99,102,241,.18)",
        transform:menuOpen?"translateX(0)":"translateX(-100%)",
        transition:"transform .3s cubic-bezier(.4,0,.2,1)",
        display:"flex", flexDirection:"column",
        boxShadow:menuOpen?"8px 0 48px rgba(0,0,0,.6)":"none",
      }}>
        {/* Drawer header */}
        <div style={{ padding:"20px 18px 14px", borderBottom:"1px solid rgba(255,255,255,.06)", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:G, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:`0 4px 16px ${P}55` }}>🤖</div>
              <div>
                <div style={{ fontWeight:800, fontSize:15, background:G, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Ulug'bek AI</div>
                <div style={{ fontSize:10.5, color:"rgba(255,255,255,.35)", marginTop:1 }}>{clerkUser?.firstName||"Foydalanuvchi"} · {userProfile?.role==="admin"?"Admin":"Foydalanuvchi"}</div>
              </div>
            </div>
            <button onClick={() => setMenuOpen(false)} style={{ background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,.5)" }}>
              <X size={16} />
            </button>
          </div>
          <button onClick={handleCreateChat} disabled={createConversationObj.isPending} style={{
            marginTop:14, width:"100%", padding:"10px", borderRadius:12,
            background:G, border:"none", color:"#fff", fontWeight:700, fontSize:13.5,
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7,
            boxShadow:`0 4px 16px ${P}44`,
          }}>
            <Plus size={16} /> Yangi suhbat
          </button>
        </div>

        {/* Conversations list */}
        <div style={{ flex:1, overflowY:"auto", padding:"10px 10px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.25)", letterSpacing:1, padding:"4px 8px 6px", textTransform:"uppercase" }}>Suhbatlar</div>
          {loadingConversations ? (
            <div style={{ display:"flex", justifyContent:"center", padding:16 }}><Loader2 size={18} style={{ animation:"spin 1s linear infinite", color:P }} /></div>
          ) : conversations.length===0 ? (
            <div style={{ textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:12, padding:"16px 0" }}>Hali suhbat yo'q</div>
          ) : (
            conversations.map(conv => (
              <div key={conv.id} onClick={() => { setActiveConversationId(conv.id); setTab("chat"); setMenuOpen(false); }}
                style={{
                  display:"flex", alignItems:"center", gap:8, padding:"9px 10px", borderRadius:10, marginBottom:3,
                  background:activeConversationId===conv.id?`${P}18`:"transparent",
                  border:`1px solid ${activeConversationId===conv.id?P+"33":"transparent"}`,
                  cursor:"pointer", transition:"all .15s",
                }}>
                <MessageSquare size={14} style={{ color:activeConversationId===conv.id?P:"rgba(255,255,255,.3)", flexShrink:0 }} />
                <span style={{ flex:1, fontSize:13, color:activeConversationId===conv.id?"rgba(255,255,255,.9)":"rgba(255,255,255,.5)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{conv.title}</span>
                <button onClick={e => handleDeleteChat(conv.id, e)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(248,113,113,.4)", padding:2, flexShrink:0, display:"flex" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Usage stats */}
        {usageStats && (
          <div style={{ padding:"12px 14px", borderTop:"1px solid rgba(255,255,255,.06)", flexShrink:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:10.5, color:"rgba(255,255,255,.3)", fontWeight:700, textTransform:"uppercase", letterSpacing:.7 }}>{usageStats.tier.toUpperCase()} Reja</span>
              {usageStats.tier==="free" && <Link href="/settings"><span style={{ fontSize:11, color:P, cursor:"pointer" }}>Upgrade →</span></Link>}
            </div>
            {[
              { label:"Rasm", count:usageStats.imageCount, limit:usageStats.limits?.imageLimit },
              { label:"Fayl",  count:usageStats.fileCount,  limit:usageStats.limits?.fileLimit  },
            ].map(({ label, count, limit }) => (
              <div key={label} style={{ marginBottom:7 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                  <span style={{ color:"rgba(255,255,255,.4)" }}>{label}</span>
                  <span style={{ color:"rgba(255,255,255,.3)" }}>{limit==null?"Cheksiz":`${count}/${limit}`}</span>
                </div>
                {limit!=null && <Progress value={usageLimitPercent(count, limit)} className="h-1" />}
              </div>
            ))}
          </div>
        )}

        {/* Nav buttons */}
        <div style={{ padding:"10px 10px 20px", borderTop:"1px solid rgba(255,255,255,.06)", flexShrink:0, display:"flex", flexDirection:"column", gap:4 }}>
          {userProfile?.role==="admin" && (
            <>
              <Link href="/admin">
                <button onClick={() => setMenuOpen(false)} style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"10px 12px", background:`${P}14`, border:`1px solid ${P}33`, borderRadius:10, color:P, cursor:"pointer", fontSize:13, fontWeight:700 }}>
                  <LayoutDashboard size={15} /> 🔴 Admin Panel
                </button>
              </Link>
              <button onClick={() => { setTab("learn"); setMenuOpen(false); }} style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"10px 12px", background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.2)", borderRadius:10, color:"rgba(148,163,184,.9)", cursor:"pointer", fontSize:13, fontWeight:600 }}>
                <Database size={15} style={{ color:P }} /> 📋 Loglar & Statistika
              </button>
            </>
          )}
          <Link href="/settings">
            <button onClick={() => setMenuOpen(false)} style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"10px 12px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10, color:"rgba(255,255,255,.6)", cursor:"pointer", fontSize:13, fontWeight:500 }}>
              <Settings size={15} style={{ color:P }} /> Sozlamalar
            </button>
          </Link>
          <button onClick={() => signOut({ redirectUrl:import.meta.env.BASE_URL.replace(/\/$/,"")||"/" })} style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"10px 12px", background:"rgba(248,113,113,.06)", border:"1px solid rgba(248,113,113,.15)", borderRadius:10, color:"rgba(248,113,113,.8)", cursor:"pointer", fontSize:13, fontWeight:500 }}>
            <LogOut size={15} /> Chiqish
          </button>
        </div>
      </div>

      {/* ── Top header bar ───────────────────────────────── */}
      <header style={{
        display:"flex", alignItems:"center", gap:10, padding:"0 12px",
        height:56, flexShrink:0,
        background:"rgba(8,13,26,.92)", backdropFilter:"blur(20px)",
        borderBottom:"1px solid rgba(99,102,241,.15)",
        boxShadow:"0 1px 24px rgba(0,0,0,.5)",
      }}>
        {/* Hamburger */}
        <button onClick={() => setMenuOpen(true)} style={{
          width:40, height:40, borderRadius:11, flexShrink:0,
          background:"rgba(99,102,241,.12)", border:"1px solid rgba(99,102,241,.25)",
          color:P, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          transition:"all .2s",
        }}>
          <Menu size={18} />
        </button>

        {/* Logo + avatar zone */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
          <div style={{ fontWeight:800, fontSize:16, background:G, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", whiteSpace:"nowrap" }}>
            Ulug'bek AI
          </div>
          {tab==="chat" && (
            <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", borderLeft:"1px solid rgba(255,255,255,.08)", paddingLeft:8 }}>
              {agentId==="chat"?"Umumiy":agentId.charAt(0).toUpperCase()+agentId.slice(1)}
            </div>
          )}
        </div>

        {/* Right controls */}
        <div style={{ display:"flex", gap:6, flexShrink:0, alignItems:"center" }}>
          <div style={{ padding:"3px 8px", borderRadius:8, background:"rgba(99,102,241,.08)", border:`1px solid ${P}22`, textAlign:"center" }}>
            <div style={{ color:"rgba(255,255,255,.22)", fontSize:8, letterSpacing:.4 }}>KEYINGI</div>
            <div style={{ color:discovering?"#34d399":P, fontSize:11, fontWeight:700, fontVariantNumeric:"tabular-nums", animation:discovering?"cdPulse .6s infinite":"none" }}>
              {discovering?"🌐...":cdStr}
            </div>
          </div>
          <button onClick={() => discoverNew()} disabled={discovering} title="Yangi modul qo'shish" style={{
            width:34, height:34, borderRadius:9, background:`${P}14`, border:`1px solid ${P}33`,
            color:discovering?"rgba(255,255,255,.2)":P, cursor:discovering?"not-allowed":"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <RefreshCw size={14} style={{ animation:discovering?"spin 1s linear infinite":"none" }} />
          </button>
          <button onClick={() => { synthRef.current?.cancel(); setTtsOn(!ttsOn); }} style={{
            width:34, height:34, borderRadius:9,
            background:ttsOn?"rgba(52,211,153,.1)":"rgba(248,113,113,.1)",
            border:`1px solid ${ttsOn?"rgba(52,211,153,.28)":"rgba(248,113,113,.28)"}`,
            color:ttsOn?"#34d399":"#f87171", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            {ttsOn?<Volume2 size={14}/>:<VolumeX size={14}/>}
          </button>
          <button onClick={() => setShowNotif(!showNotif)} style={{
            position:"relative", width:34, height:34, borderRadius:9,
            background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)",
            color:"rgba(255,255,255,.4)", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <Bell size={14} />
            {notifs.length>0 && <span style={{ position:"absolute", top:6, right:6, width:6, height:6, borderRadius:"50%", background:"#f87171", border:"1.5px solid #080d1a" }} />}
          </button>
        </div>
      </header>

      {/* ── Tab bar ──────────────────────────────────────── */}
      <div style={{
        display:"flex", gap:4, overflowX:"auto", padding:"8px 12px",
        flexShrink:0, background:"rgba(8,13,26,.85)",
        borderBottom:"1px solid rgba(255,255,255,.05)",
        scrollbarWidth:"none",
      }}>
        {([
          { id:"chat",    icon:"💬", label:"Chat"     },
          { id:"video",   icon:"🎬", label:"Video"    },
          { id:"social",  icon:"📱", label:"Social"   },
          { id:"money",   icon:"💰", label:"Pul"      },
          { id:"wallet",  icon:"💳", label:"Hamyon"   },
          { id:"crypto",  icon:"📈", label:"Kripto"   },
          { id:"modules", icon:"🧩", label:"Modullar" },
          { id:"learn",   icon:"🧠", label:"Log"      },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"6px 12px", borderRadius:20, whiteSpace:"nowrap", flexShrink:0,
            border:`1.5px solid ${tab===t.id?P:"rgba(255,255,255,.08)"}`,
            background:tab===t.id?G:"rgba(255,255,255,.04)",
            color:tab===t.id?"#fff":"rgba(255,255,255,.4)",
            fontSize:12.5, fontWeight:tab===t.id?700:400, cursor:"pointer",
            display:"flex", alignItems:"center", gap:5,
            boxShadow:tab===t.id?`0 2px 12px ${P}44`:"none",
            transition:"all .18s",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Avatar zone (only in chat tab) ──────────────── */}
      {tab==="chat" && (
        <div style={{
          display:"flex", alignItems:"flex-start", gap:12, padding:"10px 14px 8px",
          background:"rgba(8,13,26,.8)", borderBottom:"1px solid rgba(255,255,255,.04)",
          flexShrink:0,
        }}>
          <ChatAvatar talking={talking} thinking={thinking} color={P} size={80} />
          <div style={{ flex:1, minWidth:0 }}>
            {bubble && (
              <div style={{
                background:`${P}14`, border:`1.5px solid ${P}33`,
                borderRadius:"10px 10px 10px 2px",
                padding:"7px 11px", marginBottom:8, color:"#e2e8f0",
                fontSize:12.5, lineHeight:1.55, animation:"msgIn .3s ease",
                maxWidth:400,
              }}>
                {bubble}
              </div>
            )}
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              {[
                { id:"chat",      icon:"💬", name:"Umumiy"  },
                { id:"code",      icon:"💻", name:"Kod"     },
                { id:"bank",      icon:"🏦", name:"Bank"    },
                { id:"gov",       icon:"🏛️", name:"Davlat"  },
                { id:"doctor",    icon:"🏥", name:"Tibbiy"  },
                { id:"lawyer",    icon:"⚖️", name:"Huquq"   },
                { id:"translate", icon:"🌐", name:"Tarjima" },
                { id:"edu",       icon:"🎓", name:"Ta'lim"  },
              ].map(a => (
                <button key={a.id} onClick={() => setAgentId(a.id)} style={{
                  padding:"4px 10px", borderRadius:14, whiteSpace:"nowrap",
                  border:`1px solid ${agentId===a.id?P:"rgba(255,255,255,.08)"}`,
                  background:agentId===a.id?`${P}22`:"rgba(255,255,255,.04)",
                  color:agentId===a.id?P:"rgba(255,255,255,.35)",
                  fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", gap:4,
                  transition:"all .15s",
                }}>
                  {a.icon} {a.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main scrollable content ──────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden" }}>

        {/* ─── CHAT TAB ─────────────────────────────────── */}
        {tab==="chat" && (
          <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
            <ScrollArea className="flex-1 px-3 py-4" style={{ flex:1 }}>
              <div style={{ maxWidth:760, margin:"0 auto", display:"flex", flexDirection:"column", gap:14 }}>
                {!activeConversationId || (messages.length===0 && !loadingMessages) ? (
                  <div style={{ minHeight:200, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"24px 16px", animation:"slideUp .4s ease" }}>
                    <div style={{ width:56, height:56, borderRadius:18, background:`${P}18`, border:`1.5px solid ${P}33`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14, fontSize:24, animation:"glowPulse 2s infinite" }}>🤖</div>
                    <div style={{ fontWeight:800, fontSize:20, marginBottom:6 }}>Suhbat boshlang!</div>
                    <div style={{ color:"rgba(255,255,255,.35)", fontSize:13, marginBottom:18, maxWidth:320 }}>
                      {agentId!=="chat"?`${agentId} agenti faol — savol bering`:"Savol yozing yoki tezkor prompt tanlang"}
                    </div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center" }}>
                      {["Salom! Nima qila olasan?","Python kodi yoz","Pul ishlash usullari","O'zbekiston qonunlari","Inglizcha tarjima qil"].map(h => (
                        <button key={h} onClick={() => sendQuickPrompt(h)} style={{
                          background:`${P}14`, border:`1px solid ${P}33`,
                          borderRadius:20, padding:"6px 14px", color:P, fontSize:12, cursor:"pointer",
                          transition:"all .15s",
                        }}>{h}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} style={{ display:"flex", gap:10, justifyContent:msg.role==="user"?"flex-end":"flex-start", animation:"msgIn .25s ease" }}>
                      {msg.role==="assistant" && (
                        <div style={{ width:30, height:30, borderRadius:10, background:`${P}22`, border:`1.5px solid ${P}44`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                          <Bot size={14} style={{ color:P }} />
                        </div>
                      )}
                      <div style={{ display:"flex", flexDirection:"column", gap:6, maxWidth:"83%", alignItems:msg.role==="user"?"flex-end":"flex-start" }}>
                        {msg.fileUrl && (
                          <div style={{ borderRadius:14, overflow:"hidden", background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", maxWidth:300 }}>
                            {msg.fileType?.startsWith("image/") ? (
                              <img src={msg.fileUrl} alt="Attached" style={{ maxWidth:"100%", display:"block" }} />
                            ) : (
                              <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:8 }}>
                                <FileText size={20} style={{ color:P }} />
                                <span style={{ fontSize:13 }}>Document</span>
                              </div>
                            )}
                          </div>
                        )}
                        {msg.content && (
                          <div style={{
                            padding:"10px 14px",
                            borderRadius:msg.role==="user"?"18px 18px 4px 18px":"4px 18px 18px 18px",
                            background:msg.role==="user"?G:"rgba(255,255,255,.08)",
                            border:msg.role==="user"?"none":"1px solid rgba(255,255,255,.1)",
                            color:msg.role==="user"?"#fff":"#e2e8f0",
                            fontSize:14, lineHeight:1.65, whiteSpace:"pre-wrap", wordBreak:"break-word",
                            boxShadow:msg.role==="user"?`0 4px 20px ${P}44`:"none",
                          }}>
                            {msg.content}
                            {msg.role==="assistant" && (
                              <button onClick={() => speakText(msg.content)} style={{ marginLeft:8, background:"none", border:"none", cursor:"pointer", fontSize:13, opacity:.4, verticalAlign:"middle" }}>🔊</button>
                            )}
                          </div>
                        )}
                      </div>
                      {msg.role==="user" && (
                        <div style={{ width:30, height:30, borderRadius:10, background:"rgba(255,255,255,.08)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2, overflow:"hidden" }}>
                          {clerkUser?.imageUrl ? <img src={clerkUser.imageUrl} style={{ width:30, height:30 }} alt="You" /> : <User size={14} />}
                        </div>
                      )}
                    </div>
                  ))
                )}
                {sendMessageObj.isPending && (
                  <div style={{ display:"flex", gap:10, justifyContent:"flex-start", animation:"msgIn .25s ease" }}>
                    <div style={{ width:30, height:30, borderRadius:10, background:`${P}22`, border:`1.5px solid ${P}44`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Bot size={14} style={{ color:P }} />
                    </div>
                    <div style={{ padding:"12px 16px", borderRadius:"4px 18px 18px 18px", background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)", display:"flex", alignItems:"center", gap:10 }}>
                      <Loader2 size={14} style={{ color:P, animation:"spin 1s linear infinite" }} />
                      <span style={{ fontSize:13, color:"rgba(255,255,255,.35)" }}>O'ylamoqda...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>
        )}

        {/* ─── VIDEO TAB ─────────────────────────────────── */}
        {tab==="video" && (
          <div style={{ padding:"16px 14px", maxWidth:800, margin:"0 auto" }}>
            <div style={{ marginBottom:18, animation:"slideUp .35s ease" }}>
              <div style={{ fontWeight:800, fontSize:18, background:G, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:4 }}>🎬 AI Video Generator</div>
              <div style={{ color:"rgba(255,255,255,.35)", fontSize:12.5 }}>Mavzuni kiriting — stsenariy, kadrlar, ovoz matni</div>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <input value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)} onKeyDown={e => e.key==="Enter" && genVideo()} placeholder="Masalan: O'zbek oshxonasida viral TikTok..." style={{ flex:1, background:"rgba(255,255,255,.06)", border:`1.5px solid ${P}33`, borderRadius:12, padding:"11px 14px", color:"#e2e8f0", fontSize:13.5, outline:"none" }} />
              <button onClick={genVideo} disabled={videoLoading||!videoPrompt.trim()} style={{
                padding:"11px 18px", borderRadius:12, fontWeight:700, fontSize:13,
                background:videoLoading||!videoPrompt.trim()?"rgba(255,255,255,.06)":G,
                border:"none", color:videoLoading||!videoPrompt.trim()?"rgba(255,255,255,.25)":"#fff",
                cursor:videoLoading||!videoPrompt.trim()?"not-allowed":"pointer", whiteSpace:"nowrap",
                boxShadow:videoLoading||!videoPrompt.trim()?"none":`0 4px 16px ${P}44`,
              }}>
                {videoLoading?"⏳ Yaratyapti...":"🎬 Yaratish"}
              </button>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:18 }}>
              {["TikTok Viral 🔥","YouTube Short","Instagram Reel","Mahsulot Reklama","Motivatsiya"].map(p => (
                <button key={p} onClick={() => setVideoPrompt(p+" uchun video")} style={{ background:`${P}10`, border:`1px solid ${P}28`, borderRadius:16, padding:"5px 12px", color:P, fontSize:11.5, cursor:"pointer" }}>{p}</button>
              ))}
            </div>
            {videoResult && (
              <div style={{ background:"rgba(255,255,255,.04)", border:`1.5px solid ${P}33`, borderRadius:16, padding:16, animation:"slideUp .3s ease" }}>
                <div style={{ color:P, fontWeight:800, fontSize:15, marginBottom:10 }}>🎬 {videoResult.title} {videoResult.duration&&`· ${videoResult.duration}`}</div>
                {videoResult.hook && <div style={{ background:`${P}14`, borderRadius:10, padding:"8px 12px", marginBottom:10, color:P, fontSize:12.5 }}>🎣 Hook: {videoResult.hook}</div>}
                {videoResult.scenes?.map((s,i) => (
                  <div key={i} style={{ display:"flex", gap:10, marginBottom:8, padding:"9px 12px", background:"rgba(255,255,255,.04)", borderRadius:10, borderLeft:`3px solid ${P}` }}>
                    <div style={{ color:P, fontSize:10.5, fontWeight:700, flexShrink:0, minWidth:40 }}>{s.time}</div>
                    <div>
                      <div style={{ color:"rgba(255,255,255,.8)", fontSize:13 }}>{s.visual}</div>
                      {s.voiceover && <div style={{ color:"rgba(255,255,255,.35)", fontSize:11.5, marginTop:3, fontStyle:"italic" }}>🗣️ {s.voiceover}</div>}
                    </div>
                  </div>
                ))}
                {videoResult.music && <div style={{ color:"rgba(255,255,255,.4)", fontSize:12, marginTop:8 }}>🎵 {videoResult.music}</div>}
                {videoResult.cta && <div style={{ color:"rgba(255,255,255,.4)", fontSize:12 }}>👉 {videoResult.cta}</div>}
                {videoResult.tips && <div style={{ marginTop:10, padding:"9px 13px", background:`${P}10`, borderRadius:10, color:P, fontSize:12 }}>💡 {videoResult.tips}</div>}
              </div>
            )}
          </div>
        )}

        {/* ─── SOCIAL TAB ────────────────────────────────── */}
        {tab==="social" && (
          <div style={{ padding:"16px 14px", maxWidth:800, margin:"0 auto" }}>
            <div style={{ marginBottom:16, animation:"slideUp .35s ease" }}>
              <div style={{ fontWeight:800, fontSize:18, background:G, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:4 }}>📱 Ijtimoiy Tarmoqlar AI</div>
              <div style={{ color:"rgba(255,255,255,.35)", fontSize:12.5 }}>Platforma tanlang — AI viral kontent yaratadi</div>
            </div>
            {SOCIAL_LIST.map(p => (
              <div key={p.name} style={{ marginBottom:10, padding:"14px", borderRadius:16, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", animation:"slideUp .3s ease" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:p.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:"#fff", boxShadow:`0 4px 12px ${p.color}55` }}>{p.icon}</div>
                  <span style={{ color:"rgba(255,255,255,.85)", fontWeight:700, fontSize:14 }}>{p.name}</span>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {p.tasks.map(t => (
                    <button key={t} onClick={() => { sendQuickPrompt(`${p.name} uchun ${t} — viral, kreativ, O'zbek auditoriyasiga mos`); }} style={{ background:`${p.color}18`, border:`1px solid ${p.color}44`, borderRadius:14, padding:"5px 12px", color:p.color, fontSize:12, cursor:"pointer" }}>{t}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── MONEY TAB ─────────────────────────────────── */}
        {tab==="money" && (
          <div style={{ padding:"16px 14px", maxWidth:800, margin:"0 auto" }}>
            <div style={{ marginBottom:16, animation:"slideUp .35s ease" }}>
              <div style={{ fontWeight:800, fontSize:18, background:G, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:4 }}>💰 Online Pul Ishlash</div>
              <div style={{ color:"rgba(255,255,255,.35)", fontSize:12.5 }}>Bosing → AI qadama-qadam yo'l xaritasi beradi</div>
            </div>
            {MONEY_LIST.map((idea, i) => (
              <div key={i} onClick={() => sendQuickPrompt(`"${idea.name}" usuli bilan pul ishlash bo'yicha qadama-qadam yo'l xaritasi ber. O'zbekiston uchun mos, amaliy.`)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", marginBottom:8, borderRadius:14, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", cursor:"pointer", transition:"all .2s", animation:"slideUp .3s ease" }}>
                <div style={{ fontSize:26, flexShrink:0 }}>{idea.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:"rgba(255,255,255,.85)", fontWeight:700, fontSize:13.5 }}>{idea.name}</div>
                  <div style={{ color:"rgba(255,255,255,.3)", fontSize:11.5, marginTop:2 }}>{idea.how}</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ color:"#34d399", fontWeight:800, fontSize:13 }}>{idea.earn}</div>
                  <div style={{ color:idea.diff==="Oson"?"#34d399":idea.diff==="O'rta"?"#fbbf24":"#f87171", fontSize:10.5, marginTop:2 }}>{idea.diff}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── WALLET TAB ────────────────────────────────── */}
        {tab==="wallet" && (
          <div style={{ padding:"16px 14px", maxWidth:600, margin:"0 auto", animation:"slideUp .35s ease" }}>
            {/* Balance card */}
            <div style={{
              borderRadius:20, padding:"24px 22px",
              background:`linear-gradient(135deg, ${P}cc 0%, #06b6d4cc 100%)`,
              boxShadow:`0 16px 48px ${P}44`, marginBottom:18, position:"relative", overflow:"hidden",
            }}>
              <div style={{ position:"absolute", top:-30, right:-30, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,.08)" }} />
              <div style={{ position:"absolute", bottom:-50, left:-20, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,.05)" }} />
              <div style={{ position:"relative", zIndex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18 }}>
                  <Wallet size={18} style={{ color:"rgba(255,255,255,.8)" }} />
                  <span style={{ color:"rgba(255,255,255,.7)", fontSize:13, fontWeight:600 }}>Asosiy Hamyon</span>
                </div>
                <div style={{ fontSize:32, fontWeight:900, color:"#fff", letterSpacing:-.5 }}>{fmt(WALLET_BALANCE_UZS)} so'm</div>
                <div style={{ color:"rgba(255,255,255,.65)", fontSize:14, marginTop:4 }}>≈ ${WALLET_BALANCE_USD.toLocaleString()}</div>
                <div style={{ marginTop:16, display:"flex", alignItems:"center", gap:8, background:"rgba(0,0,0,.2)", borderRadius:10, padding:"8px 12px", width:"fit-content" }}>
                  <span style={{ color:"rgba(255,255,255,.7)", fontSize:12, fontFamily:"monospace" }}>{WALLET_ADDR}</span>
                  <button onClick={() => { navigator.clipboard.writeText(WALLET_ADDR); setCopied(true); setTimeout(()=>setCopied(false),2000); }} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,.7)", display:"flex" }}>
                    {copied?<Check size={14}/>:<Copy size={14}/>}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:18 }}>
              {[
                { icon:<ArrowUpRight size={18}/>, label:"Jo'natish",   action:()=>setWalletTab("send"),    color:"#f59e0b" },
                { icon:<ArrowDownLeft size={18}/>, label:"Qabul qilish", action:()=>setWalletTab("receive"), color:"#34d399" },
                { icon:<RefreshCw size={18}/>, label:"AI Tahlil", action:()=>sendQuickPrompt("Mening harajatlarimni tahlil qil va tejamkorlik maslahatlar ber"), color:P },
              ].map((a, i) => (
                <button key={i} onClick={a.action} style={{
                  padding:"14px 8px", borderRadius:14, background:"rgba(255,255,255,.05)",
                  border:`1px solid ${a.color}33`, cursor:"pointer", textAlign:"center",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:8, transition:"all .2s",
                }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:`${a.color}18`, display:"flex", alignItems:"center", justifyContent:"center", color:a.color }}>
                    {a.icon}
                  </div>
                  <span style={{ color:"rgba(255,255,255,.7)", fontSize:12, fontWeight:600 }}>{a.label}</span>
                </button>
              ))}
            </div>

            {/* Send/Receive panel */}
            {walletTab==="send" && (
              <div style={{ background:"rgba(255,255,255,.04)", border:`1.5px solid ${P}33`, borderRadius:16, padding:16, marginBottom:18, animation:"slideUp .3s ease" }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:12, color:P }}>💸 Pul Jo'natish</div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:11.5, color:"rgba(255,255,255,.4)", marginBottom:5 }}>Qabul qiluvchi manzil</div>
                  <input value={sendAddr} onChange={e=>setSendAddr(e.target.value)} placeholder="UZB1..." style={{ width:"100%", background:"rgba(255,255,255,.06)", border:`1px solid ${P}33`, borderRadius:10, padding:"10px 13px", color:"#e2e8f0", fontSize:13, outline:"none", boxSizing:"border-box" }} />
                </div>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11.5, color:"rgba(255,255,255,.4)", marginBottom:5 }}>Miqdor (so'm)</div>
                  <input value={sendAmount} onChange={e=>setSendAmount(e.target.value)} placeholder="100 000" type="number" style={{ width:"100%", background:"rgba(255,255,255,.06)", border:`1px solid ${P}33`, borderRadius:10, padding:"10px 13px", color:"#e2e8f0", fontSize:13, outline:"none", boxSizing:"border-box" }} />
                </div>
                <button onClick={() => { addNotif("✅ Demo: Jo'natish amalga oshirildi!","success"); setWalletTab("overview"); setSendAddr(""); setSendAmount(""); }} style={{ width:"100%", padding:"11px", borderRadius:12, background:G, border:"none", color:"#fff", fontWeight:700, fontSize:13.5, cursor:"pointer" }}>
                  Jo'natish →
                </button>
              </div>
            )}

            {walletTab==="receive" && (
              <div style={{ background:"rgba(255,255,255,.04)", border:`1.5px solid #34d39933`, borderRadius:16, padding:16, marginBottom:18, textAlign:"center", animation:"slideUp .3s ease" }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:12, color:"#34d399" }}>📥 Qabul Qilish</div>
                <div style={{ width:120, height:120, borderRadius:16, background:"rgba(255,255,255,.08)", margin:"0 auto 14px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:48 }}>📷</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginBottom:10 }}>QR kod yoki manzilni ulashing:</div>
                <div style={{ background:"rgba(0,0,0,.3)", borderRadius:10, padding:"10px 14px", fontFamily:"monospace", fontSize:12.5, color:"rgba(255,255,255,.7)", marginBottom:12 }}>{WALLET_ADDR}</div>
                <button onClick={() => { navigator.clipboard.writeText(WALLET_ADDR); addNotif("✅ Manzil nusxalandi!","success"); }} style={{ padding:"9px 20px", borderRadius:10, background:"rgba(52,211,153,.15)", border:"1px solid rgba(52,211,153,.35)", color:"#34d399", fontSize:12.5, cursor:"pointer", fontWeight:600 }}>
                  📋 Manzilni Nusxalash
                </button>
              </div>
            )}

            {/* Transactions */}
            <div style={{ fontWeight:700, fontSize:14, color:"rgba(255,255,255,.7)", marginBottom:10 }}>📋 So'nggi Operatsiyalar</div>
            {WALLET_TXNS.map((tx, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:14, marginBottom:6, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)" }}>
                <div style={{ width:38, height:38, borderRadius:12, background:tx.type==="in"?"rgba(52,211,153,.15)":"rgba(248,113,113,.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {tx.type==="in"?<ArrowDownLeft size={18} style={{ color:"#34d399" }}/>:<ArrowUpRight size={18} style={{ color:"#f87171" }}/>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:"rgba(255,255,255,.82)", fontSize:13, fontWeight:600 }}>{tx.label}</div>
                  <div style={{ color:"rgba(255,255,255,.28)", fontSize:11, marginTop:1 }}>{tx.date}</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ color:tx.type==="in"?"#34d399":"#f87171", fontWeight:800, fontSize:13 }}>
                    {tx.type==="in"?"+":"-"}{tx.coin==="BTC"?tx.amount.toFixed(4):fmt(tx.amount)} {tx.coin}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── CRYPTO TAB ────────────────────────────────── */}
        {tab==="crypto" && (
          <div style={{ padding:"16px 14px", maxWidth:800, margin:"0 auto", animation:"slideUp .35s ease" }}>
            {/* Portfolio summary */}
            <div style={{
              borderRadius:20, padding:"20px 20px",
              background:"linear-gradient(135deg, rgba(99,102,241,.25) 0%, rgba(6,182,212,.2) 100%)",
              border:`1.5px solid ${P}44`, marginBottom:18,
              boxShadow:`0 8px 32px ${P}22`,
            }}>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.45)", marginBottom:8, fontWeight:600 }}>PORTFOLIO QIYMATI</div>
              <div style={{ fontSize:28, fontWeight:900, color:"#fff", marginBottom:4 }}>
                ${portfolio.reduce((sum,p) => sum + p.amount * (livePrices[p.sym]||0), 0).toFixed(2)}
              </div>
              <div style={{ display:"flex", gap:14 }}>
                {portfolio.map(p => {
                  const cur = livePrices[p.sym]||p.avgPrice;
                  const pnl = ((cur-p.avgPrice)/p.avgPrice)*100;
                  return (
                    <div key={p.sym} style={{ textAlign:"center" }}>
                      <div style={{ color:"rgba(255,255,255,.5)", fontSize:10.5 }}>{p.sym}</div>
                      <div style={{ color:pnl>=0?"#34d399":"#f87171", fontWeight:700, fontSize:12 }}>{pnl>=0?"+":""}{pnl.toFixed(2)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI analysis button */}
            <button onClick={() => sendQuickPrompt("Kripto bozor haqida hozirgi holat va investitsiya maslahat ber")} style={{
              width:"100%", padding:"11px", borderRadius:14, marginBottom:16,
              background:`${P}14`, border:`1px solid ${P}44`, color:P, fontSize:13, fontWeight:700, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
              🤖 AI Bozor Tahlili & Maslahat
            </button>

            {/* Price cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(100%,220px), 1fr))", gap:10 }}>
              {CRYPTO_LIST.map(coin => {
                const cur = livePrices[coin.sym]||coin.price;
                const prev = coin.price;
                const delta = ((cur-prev)/prev)*100;
                const isUp = delta>=0;
                return (
                  <div key={coin.sym} style={{
                    borderRadius:16, padding:"14px 15px",
                    background:"rgba(255,255,255,.05)",
                    border:`1.5px solid ${isUp?"rgba(52,211,153,.2)":"rgba(248,113,113,.18)"}`,
                    cursor:"pointer", transition:"all .25s",
                  }}
                    onClick={() => { setTradeDialog(coin.sym); setTradeType("buy"); setTradeAmt(""); }}
                  >
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                        <div style={{ width:36, height:36, borderRadius:12, background:`${coin.color}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, border:`1px solid ${coin.color}44` }}>
                          {coin.icon}
                        </div>
                        <div>
                          <div style={{ fontWeight:800, fontSize:14, color:"rgba(255,255,255,.9)" }}>{coin.sym}</div>
                          <div style={{ fontSize:10.5, color:"rgba(255,255,255,.3)" }}>{coin.name}</div>
                        </div>
                      </div>
                      {isUp?<TrendingUp size={16} style={{ color:"#34d399" }}/>:<TrendingDown size={16} style={{ color:"#f87171" }}/>}
                    </div>
                    <div style={{ fontWeight:900, fontSize:16, color:"#fff", letterSpacing:-.3, fontVariantNumeric:"tabular-nums" }}>
                      ${cur < 1 ? cur.toFixed(4) : cur.toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 })}
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, alignItems:"center" }}>
                      <div style={{ color:isUp?"#34d399":"#f87171", fontSize:12, fontWeight:700 }}>
                        {isUp?"▲":"▼"} {Math.abs(delta).toFixed(2)}%
                      </div>
                      <div style={{ color:"rgba(255,255,255,.25)", fontSize:10.5 }}>Vol: {coin.vol}</div>
                    </div>
                    <div style={{ marginTop:10, display:"flex", gap:6 }}>
                      <button onClick={e=>{e.stopPropagation();setTradeDialog(coin.sym);setTradeType("buy");setTradeAmt("");}} style={{ flex:1, padding:"6px", borderRadius:8, background:"rgba(52,211,153,.14)", border:"1px solid rgba(52,211,153,.3)", color:"#34d399", fontSize:11.5, fontWeight:700, cursor:"pointer" }}>Sotib olish</button>
                      <button onClick={e=>{e.stopPropagation();setTradeDialog(coin.sym);setTradeType("sell");setTradeAmt("");}} style={{ flex:1, padding:"6px", borderRadius:8, background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.25)", color:"#f87171", fontSize:11.5, fontWeight:700, cursor:"pointer" }}>Sotish</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── MODULES TAB ───────────────────────────────── */}
        {tab==="modules" && (
          <div style={{ padding:"16px 14px", maxWidth:800, margin:"0 auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:18, background:G, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>🧩 Modullar</div>
                <div style={{ color:"rgba(255,255,255,.3)", fontSize:12, marginTop:2 }}>{modules.length} aktiv · bosganda chat ochiladi</div>
              </div>
              <button onClick={() => discoverNew()} disabled={discovering} style={{ background:`${P}14`, border:`1px solid ${P}44`, borderRadius:10, padding:"8px 14px", color:P, fontSize:12.5, cursor:"pointer", fontWeight:600 }}>
                {discovering?"⏳...":"🔄 AI Yangi"}
              </button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(100%,160px), 1fr))", gap:8 }}>
              {modules.map(m => {
                const danger = !m.locked && (Date.now()-m.lastUsed)>ONE_YEAR*0.85;
                return (
                  <div key={m.id} onClick={() => { setAgentId(m.id); setModules(p => p.map(x => x.id===m.id?{...x,lastUsed:Date.now(),uses:x.uses+1}:x)); setTab("chat"); }}
                    style={{ padding:"12px 12px", borderRadius:14, cursor:"pointer", background:"rgba(255,255,255,.05)", border:`1.5px solid ${m.auto?P+"44":danger?"rgba(248,113,113,.35)":"rgba(255,255,255,.09)"}`, transition:"all .2s" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                      <span style={{ fontSize:24 }}>{m.icon}</span>
                      <div style={{ display:"flex", gap:3 }}>
                        {m.auto && <span style={{ background:`${P}22`, color:P, fontSize:8, padding:"1px 4px", borderRadius:4 }}>AI</span>}
                        {m.locked && <span style={{ background:"rgba(52,211,153,.15)", color:"#34d399", fontSize:8, padding:"1px 4px", borderRadius:4 }}>🔒</span>}
                        {danger && <span style={{ background:"rgba(248,113,113,.2)", color:"#f87171", fontSize:8, padding:"1px 4px", borderRadius:4 }}>⚠️</span>}
                      </div>
                    </div>
                    <div style={{ color:"rgba(255,255,255,.82)", fontSize:12.5, fontWeight:700 }}>{m.name}</div>
                    <div style={{ color:"rgba(255,255,255,.28)", fontSize:10.5, marginTop:3 }}>{m.desc}</div>
                    {m.earning && <div style={{ color:"#34d399", fontSize:10.5, marginTop:3 }}>{m.earning}</div>}
                    <div style={{ color:"rgba(255,255,255,.18)", fontSize:9.5, marginTop:4 }}>
                      {m.locked?"🔒 Himoyalangan":m.uses>0?`👆${m.uses}x · ${timeLeft(m.lastUsed)}`:timeLeft(m.lastUsed)}
                    </div>
                  </div>
                );
              })}
            </div>
            {removedMods.length>0 && (
              <div style={{ marginTop:20 }}>
                <div style={{ color:"rgba(255,255,255,.22)", fontSize:10.5, fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:.8 }}>🗑️ O'chirilganlar ({removedMods.length})</div>
                {removedMods.map((m,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:12, marginBottom:5, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.05)", opacity:.6 }}>
                    <span style={{ fontSize:18 }}>{m.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ color:"rgba(255,255,255,.4)", fontSize:13 }}>{m.name}</div>
                      <div style={{ color:"rgba(255,255,255,.2)", fontSize:10.5 }}>1 yil ishlatilmadi</div>
                    </div>
                    <button onClick={() => { setRemovedMods(p=>p.filter((_,j)=>j!==i)); setModules(p=>[...p,{...m,lastUsed:Date.now()}]); }} style={{ background:`${P}14`, border:`1px solid ${P}33`, borderRadius:8, padding:"4px 10px", color:P, fontSize:11, cursor:"pointer" }}>Tiklash</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── LEARN LOG TAB ─────────────────────────────── */}
        {tab==="learn" && (
          <div style={{ padding:"16px 14px", maxWidth:800, margin:"0 auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:18, background:G, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>🧠 O'z-o'zini O'rganish</div>
                <div style={{ color:"rgba(255,255,255,.3)", fontSize:12, marginTop:2 }}>Har 1 soatda yangi · 1 yil ishlatilmagan o'chiriladi</div>
              </div>
              <div style={{ textAlign:"center", padding:"6px 12px", background:`${P}12`, border:`1px solid ${P}33`, borderRadius:12 }}>
                <div style={{ color:"rgba(255,255,255,.3)", fontSize:9, marginBottom:2 }}>KEYINGI</div>
                <div style={{ color:P, fontSize:16, fontWeight:800, fontVariantNumeric:"tabular-nums" }}>{cdStr}</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:18 }}>
              {[
                { label:"Aktiv",      val:modules.length,      color:"#34d399", icon:"🟢" },
                { label:"AI qo'shdi", val:autoMods.length,     color:P,         icon:"✨" },
                { label:"O'chirildi", val:removedMods.length,  color:"#f87171", icon:"🗑️" },
              ].map(s => (
                <div key={s.label} style={{ padding:"14px 10px", borderRadius:16, textAlign:"center", background:"rgba(255,255,255,.04)", border:`1.5px solid ${s.color}22` }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
                  <div style={{ color:s.color, fontWeight:900, fontSize:24 }}>{s.val}</div>
                  <div style={{ color:"rgba(255,255,255,.3)", fontSize:11, marginTop:3 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:"13px 15px", borderRadius:14, background:`${P}0d`, border:`1.5px solid ${P}28`, marginBottom:16 }}>
              <div style={{ color:P, fontWeight:700, fontSize:13, marginBottom:8 }}>⚙️ Avtomatik qoidalar:</div>
              <div style={{ color:"rgba(255,255,255,.5)", fontSize:12.5, lineHeight:1.8 }}>
                ⏰ <b style={{ color:P }}>Har 1 soatda</b> — AI orqali yangi funksiya qo'shiladi<br />
                📅 <b style={{ color:"#f87171" }}>1 yil</b> ishlatilmagan funksiyalar o'chiriladi<br />
                🔒 <b style={{ color:"#34d399" }}>Chat, Ovoz</b> — hech qachon o'chirilmaydi<br />
                ♻️ O'chirilganlarni istalgan vaqt tiklash mumkin
              </div>
            </div>
            {learnLog.length===0 ? (
              <div style={{ textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:13, padding:"30px 0" }}>
                <div style={{ fontSize:36, marginBottom:12 }}>🧠</div>
                O'rganish logi hali bo'sh.<br />Har 1 soatda yangi funksiya qo'shiladi.
              </div>
            ) : (
              learnLog.map((log,i) => (
                <div key={i} style={{ padding:"10px 13px", marginBottom:7, borderRadius:12, animation:"msgIn .2s ease", background:log.type==="add"?"rgba(52,211,153,.06)":log.type==="remove"?"rgba(248,113,113,.07)":"rgba(255,255,255,.03)", border:`1px solid ${log.type==="add"?"rgba(52,211,153,.2)":log.type==="remove"?"rgba(248,113,113,.2)":"rgba(255,255,255,.07)"}` }}>
                  <div style={{ color:"rgba(255,255,255,.22)", fontSize:10, marginBottom:3 }}>🕐 {log.time}</div>
                  <div style={{ color:log.type==="add"?"#34d399":log.type==="remove"?"#f87171":"rgba(255,255,255,.55)", fontSize:13 }}>{log.icon} {log.text}</div>
                  {log.tech && <div style={{ color:"rgba(255,255,255,.25)", fontSize:11, marginTop:3 }}>🔧 {log.tech}</div>}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Input bar (only in Chat tab) ─────────────────── */}
      {tab==="chat" && (
        <div style={{
          padding:"8px 12px 16px", borderTop:"1px solid rgba(255,255,255,.07)",
          background:"rgba(8,13,26,.96)", backdropFilter:"blur(20px)", flexShrink:0,
        }}>
          {fileToUpload && (
            <div style={{ marginBottom:10, display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", borderRadius:12, width:"fit-content" }}>
              {fileToUpload.type.startsWith("image/") ? <img src={fileToUpload.url} style={{ width:36, height:36, objectFit:"cover", borderRadius:6 }} alt="preview" /> : <FileText size={20} style={{ color:P }} />}
              <span style={{ fontSize:12, color:"rgba(255,255,255,.6)", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{fileToUpload.name}</span>
              <button onClick={() => setFileToUpload(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(248,113,113,.7)", display:"flex" }}><X size={14} /></button>
            </div>
          )}
          <form onSubmit={handleSendMessage} style={{
            display:"flex", gap:8, alignItems:"center",
            background:"rgba(255,255,255,.06)", border:`2px solid ${sendMessageObj.isPending?P+"55":"rgba(255,255,255,.1)"}`,
            borderRadius:18, padding:"8px 10px", transition:"border-color .25s",
          }}>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sendMessageObj.isPending} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,.35)", padding:4, display:"flex", alignItems:"center" }}>
              <Paperclip size={18} />
            </button>
            <Input ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)}
              placeholder={`Ulug'bek AI ga yozing... (${agentId==="chat"?"Umumiy":agentId})`}
              className="flex-1 bg-transparent border-0 shadow-none focus-visible:ring-0 text-[14px] p-0 h-auto"
              disabled={sendMessageObj.isPending}
              onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as unknown as React.FormEvent); } }}
            />
            <button type="button" onClick={toggleListen} style={{
              width:36, height:36, borderRadius:10, flexShrink:0,
              background:listening?`${P}30`:"rgba(255,255,255,.07)",
              border:`1.5px solid ${listening?P:"rgba(255,255,255,.1)"}`,
              color:listening?P:"rgba(255,255,255,.4)", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              animation:listening?"statusBlink 1s infinite":"none",
            }}>
              {listening?<MicOff size={15}/>:<Mic size={15}/>}
            </button>
            <button type="submit" disabled={(!inputValue.trim()&&!fileToUpload)||sendMessageObj.isPending} style={{
              width:36, height:36, borderRadius:10, flexShrink:0,
              background:(!inputValue.trim()&&!fileToUpload)||sendMessageObj.isPending?"rgba(255,255,255,.07)":G,
              border:"none",
              color:(!inputValue.trim()&&!fileToUpload)||sendMessageObj.isPending?"rgba(255,255,255,.2)":"#fff",
              cursor:(!inputValue.trim()&&!fileToUpload)||sendMessageObj.isPending?"not-allowed":"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:(!inputValue.trim()&&!fileToUpload)||sendMessageObj.isPending?"none":`0 4px 14px ${P}55`,
              transition:"all .2s",
            }}>
              {sendMessageObj.isPending?<Loader2 size={15} style={{ animation:"spin 1s linear infinite" }}/>:<Send size={15}/>}
            </button>
          </form>
          <div style={{ textAlign:"center", marginTop:6, color:"rgba(255,255,255,.15)", fontSize:11 }}>
            AI xatolik qilishi mumkin. Muhim ma'lumotlarni tekshiring.
          </div>
        </div>
      )}

      {/* ── Trade Dialog ──────────────────────────────────── */}
      {tradeDialog && (
        <div onClick={() => setTradeDialog(null)} style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,.7)", backdropFilter:"blur(6px)", display:"flex", alignItems:"flex-end", justifyContent:"center", animation:"fadeIn .2s ease" }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"rgba(12,18,35,.98)", borderTop:`2px solid ${P}55`,
            borderRadius:"20px 20px 0 0", padding:"24px 20px 36px",
            width:"100%", maxWidth:480, animation:"slideUp .3s ease",
          }}>
            {(() => {
              const coin = CRYPTO_LIST.find(c=>c.sym===tradeDialog);
              if (!coin) return null;
              const cur = livePrices[coin.sym]||coin.price;
              const amt = parseFloat(tradeAmt)||0;
              const total = amt * cur;
              return (
                <>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:42, height:42, borderRadius:14, background:`${coin.color}22`, border:`1.5px solid ${coin.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{coin.icon}</div>
                      <div>
                        <div style={{ fontWeight:800, fontSize:15 }}>{coin.name}</div>
                        <div style={{ color:"rgba(255,255,255,.4)", fontSize:12 }}>${cur.toLocaleString()}</div>
                      </div>
                    </div>
                    <button onClick={()=>setTradeDialog(null)} style={{ background:"rgba(255,255,255,.07)", border:"none", borderRadius:10, width:34, height:34, cursor:"pointer", color:"rgba(255,255,255,.5)", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={16}/></button>
                  </div>
                  <div style={{ display:"flex", gap:8, marginBottom:18 }}>
                    {(["buy","sell"] as const).map(t => (
                      <button key={t} onClick={() => setTradeType(t)} style={{
                        flex:1, padding:"10px", borderRadius:12, fontWeight:700, fontSize:13,
                        background:tradeType===t?(t==="buy"?"rgba(52,211,153,.2)":"rgba(248,113,113,.18)"):"rgba(255,255,255,.05)",
                        border:`1.5px solid ${tradeType===t?(t==="buy"?"rgba(52,211,153,.5)":"rgba(248,113,113,.4)"):"rgba(255,255,255,.08)"}`,
                        color:tradeType===t?(t==="buy"?"#34d399":"#f87171"):"rgba(255,255,255,.4)", cursor:"pointer",
                      }}>
                        {t==="buy"?"Sotib Olish":"Sotish"}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginBottom:6 }}>Miqdor ({coin.sym})</div>
                    <input value={tradeAmt} onChange={e=>setTradeAmt(e.target.value)} type="number" step="0.0001" placeholder="0.00" style={{ width:"100%", background:"rgba(255,255,255,.07)", border:`1.5px solid ${P}33`, borderRadius:12, padding:"12px 14px", color:"#e2e8f0", fontSize:16, outline:"none", boxSizing:"border-box", fontWeight:700 }} />
                  </div>
                  {amt>0 && (
                    <div style={{ padding:"10px 14px", background:"rgba(255,255,255,.05)", borderRadius:10, marginBottom:16 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                        <span style={{ color:"rgba(255,255,255,.4)" }}>Jami:</span>
                        <span style={{ fontWeight:800, color:"#fff" }}>${total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  <button onClick={() => { addNotif(`✅ Demo: ${tradeAmt} ${coin.sym} ${tradeType==="buy"?"sotib olindi":"sotildi"}!`,"success"); setTradeDialog(null); setTradeAmt(""); }} style={{
                    width:"100%", padding:"14px", borderRadius:14, fontWeight:800, fontSize:15, border:"none", cursor:"pointer",
                    background:tradeType==="buy"?"linear-gradient(135deg,#34d399,#059669)":"linear-gradient(135deg,#f87171,#dc2626)",
                    color:"#fff", boxShadow:tradeType==="buy"?"0 6px 24px rgba(52,211,153,.4)":"0 6px 24px rgba(248,113,113,.4)",
                  }}>
                    {tradeType==="buy"?"🟢 Sotib Olish":"🔴 Sotish"} — {tradeAmt||"..."} {coin.sym}
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Upgrade dialog ────────────────────────────────── */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border/50">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
              <AlertCircle className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">Limit to'ldi</DialogTitle>
            <DialogDescription className="text-center pt-2 text-base">
              Joriy reja limiti tugadi. Pro ga o'ting — fayl, rasm va barcha funksiyalar cheksiz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2 mt-6">
            <Link href="/settings" className="w-full">
              <Button className="w-full h-11 text-base bg-primary hover:bg-primary/90">Rejalarni ko'rish & Upgrade</Button>
            </Link>
            <Button variant="ghost" className="w-full h-11" onClick={() => setShowUpgradeDialog(false)}>Keyinroq</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
