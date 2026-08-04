// Sidebar.jsx
import { MessageSquare, FileText, Briefcase, Plus, LogOut, Sparkles, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function Sidebar({
  sessions = [],
  activeSession,
  onPick,
  onNew,
  onTab,
  currentTab,
  user,
  onLogout,
  onRefresh
}) {
  const tabs = [
    { id: "chat", label: "Chat with AI", icon: MessageSquare },
    { id: "resume", label: "Resume Analyzer", icon: FileText },
    { id: "jobs", label: "Job Search", icon: Briefcase },
  ];

  const deleteSession = async (e, id) => {
    e.stopPropagation();

    try {
      await api.delete(`/chat/sessions/${id}`);
      toast.success("Chat deleted");
      onRefresh && onRefresh();
    } catch (err) {
      toast.error(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Could not delete"
      );
    }
  };

  return (
    <aside className="w-72 bg-[#0A0A0A] border-r border-white/10 flex flex-col">

      {/* HEADER */}
      <div className="p-5 flex items-center gap-2 border-b border-white/10">
        <Sparkles className="w-5 h-5 text-white" />
        <span className="font-semibold">SkillGap-AI</span>
      </div>

      {/* TABS */}
      <div className="p-3 space-y-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = currentTab === t.id;

          return (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
                active
                  ? "bg-[#1E1E1E] text-white"
                  : "text-gray-400 hover:bg-[#141414] hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* NEW CHAT */}
      <div className="px-3 mt-2">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 bg-white text-black py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          New chat
        </button>
      </div>

      {/* SESSIONS */}
      <div className="px-3 pt-4 text-xs text-gray-400">Recent chats</div>

      <div className="flex-1 overflow-y-auto px-2">
        {sessions.length === 0 && (
          <p className="text-gray-500 px-3">No chats yet</p>
        )}

        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => onPick(s.id)}
            className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm ${
              activeSession === s.id
                ? "bg-[#1E1E1E] text-white"
                : "text-gray-400 hover:bg-[#141414]"
            }`}
          >
            <span className="truncate">{s.title || "New chat"}</span>

            <button onClick={(e) => deleteSession(e, s.id)}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* USER */}
      <div className="p-3 border-t border-white/10 flex items-center gap-3">

        <div className="w-8 h-8 rounded-full bg-[#1E1E1E] flex items-center justify-center">
          {user?.name?.[0]?.toUpperCase() || "U"}
        </div>

        <div className="flex-1">
          <div>{user?.name}</div>
          <div className="text-xs text-gray-400">{user?.email}</div>
        </div>

        <button onClick={onLogout}>
          <LogOut />
        </button>

      </div>

    </aside>
  );
}