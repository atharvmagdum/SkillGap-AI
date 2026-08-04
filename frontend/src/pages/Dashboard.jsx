import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";

import Sidebar from "../components/Sidebar";
import ChatPanel from "../components/ChatPanel";
import ResumeAnalyzer from "../components/ResumeAnalyzer";
import JobsPanel from "../components/JobsPanel";

import { api, getUser, clearAuth } from "../lib/api";

export default function Dashboard() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("chat");
  const [activeSession, setActiveSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [user] = useState(getUser() || null);
  const [chatKey, setChatKey] = useState(Date.now());

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const { data } = await api.get("/chat/sessions");
      setSessions(data);
    } catch (e) {
      if (e?.response?.status === 401) {
        clearAuth();
        navigate("/login");
      } else {
        console.error("Failed to load sessions");
      }
    }
  }, [navigate]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const onLogout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <div className="relative flex h-screen bg-black text-[#F9F9F9]">

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        sessions={sessions}
        activeSession={activeSession}
        onPick={(id) => {
          setActiveSession(id);
          setTab("chat");
          setSidebarOpen(false);
        }}
        onNew={() => {
          setActiveSession(null);
          setTab("chat");
          setChatKey(Date.now());
          setSidebarOpen(false);
        }}
        onTab={(value) => {
          setTab(value);
          setSidebarOpen(false);
        }}
        currentTab={tab}
        user={user}
        onLogout={onLogout}
        onRefresh={loadSessions}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">

        {/* Mobile Header */}
        <div className="md:hidden h-16 border-b border-white/10 flex items-center px-4 shrink-0">

          <button
            onClick={() => setSidebarOpen(true)}
            className="mr-4"
          >
            <Menu className="w-6 h-6" />
          </button>

          <h1 className="font-semibold text-lg">
            SkillGap-AI
          </h1>

        </div>

        {/* Pages */}
        <div className="flex-1 min-h-0">

          {tab === "chat" && (
            <ChatPanel
              key={chatKey}
              sessionId={activeSession}
              onSessionCreated={(id) => {
                setActiveSession(id);
                loadSessions();
              }}
              onMessageSent={loadSessions}
            />
          )}

          {tab === "resume" && (
            <ResumeAnalyzer />
          )}

          {tab === "jobs" && (
            <JobsPanel />
          )}

        </div>

      </main>

    </div>
  );
}
