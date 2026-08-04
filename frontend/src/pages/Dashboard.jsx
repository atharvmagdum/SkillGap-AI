import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

  const loadSessions = async () => {
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
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const onLogout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-black text-[#F9F9F9]">

      <Sidebar
        sessions={sessions}
        activeSession={activeSession}
        onPick={(id) => {
          setActiveSession(id);
          setTab("chat");
        }}
        onNew={() => {
          setActiveSession(null);
          setTab("chat");
          setChatKey(Date.now());
        }}
        onTab={setTab}
        currentTab={tab}
        user={user}
        onLogout={onLogout}
        onRefresh={loadSessions}
      />

      <main className="flex-1 overflow-hidden flex flex-col">

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

        {tab === "resume" && <ResumeAnalyzer />}
        {tab === "jobs" && <JobsPanel />}

      </main>
    </div>
  );
}