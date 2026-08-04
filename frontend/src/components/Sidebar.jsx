import {
  MessageSquare,
  FileText,
  Briefcase,
  Plus,
  LogOut,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { api } from "../lib/api";
import { toast } from "sonner";

export default function Sidebar({
  open,
  setOpen,
  sessions = [],
  activeSession,
  onPick,
  onNew,
  onTab,
  currentTab,
  user,
  onLogout,
  onRefresh,
}) {
  const tabs = [
    {
      id: "chat",
      label: "Chat with AI",
      icon: MessageSquare,
    },
    {
      id: "resume",
      label: "Resume Analyzer",
      icon: FileText,
    },
    {
      id: "jobs",
      label: "Job Search",
      icon: Briefcase,
    },
  ];

  const deleteSession = async (e, id) => {
    e.stopPropagation();

    try {
      await api.delete(`/chat/sessions/${id}`);
      toast.success("Chat deleted");
      onRefresh?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Could not delete"
      );
    }
  };

  return (
    <aside
      className={`
      fixed md:relative
      top-0 left-0
      z-50
      h-full
      w-72
      bg-[#0A0A0A]
      border-r border-white/10
      flex flex-col
      transform transition-transform duration-300 ease-in-out
      ${open ? "translate-x-0" : "-translate-x-full"}
      md:translate-x-0
      `}
    >
      {/* Mobile Header */}

      <div className="md:hidden flex items-center justify-between p-5 border-b border-white/10">

        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold">
            SkillGap-AI
          </span>
        </div>

        <button onClick={() => setOpen(false)}>
          <X className="w-6 h-6" />
        </button>

      </div>

      {/* Desktop Header */}

      <div className="hidden md:flex p-5 items-center gap-2 border-b border-white/10">

        <Sparkles className="w-5 h-5 text-white" />

        <span className="font-semibold">
          SkillGap-AI
        </span>

      </div>

      {/* Tabs */}

      <div className="p-3 space-y-1">

        {tabs.map((t) => {

          const Icon = t.icon;

          const active = currentTab === t.id;

          return (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${
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

      {/* New Chat */}

      <div className="px-3 mt-2">

        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 bg-white text-black py-2 rounded-xl hover:bg-gray-200 transition"
        >
          <Plus className="w-4 h-4" />

          New chat

        </button>

      </div>

      {/* Recent Chats */}

      <div className="px-3 pt-5 text-xs text-gray-400">
        Recent chats
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">

        {sessions.length === 0 && (
          <p className="text-gray-500 px-3 py-2">
            No chats yet
          </p>
        )}

        {sessions.map((s) => (

          <div
            key={s.id}
            onClick={() => onPick(s.id)}
            className={`group flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer transition ${
              activeSession === s.id
                ? "bg-[#1E1E1E] text-white"
                : "text-gray-400 hover:bg-[#141414]"
            }`}
          >

            <span className="truncate flex-1 mr-2">
              {s.title || "New chat"}
            </span>

            <button
              onClick={(e) => deleteSession(e, s.id)}
              className="opacity-0 group-hover:opacity-100 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>

          </div>

        ))}

      </div>

      {/* User */}

      <div className="border-t border-white/10 p-4 flex items-center gap-3">

        <div className="w-9 h-9 rounded-full bg-[#1E1E1E] flex items-center justify-center font-semibold">

          {user?.name?.[0]?.toUpperCase() || "U"}

        </div>

        <div className="flex-1 overflow-hidden">

          <div className="truncate font-medium">
            {user?.name}
          </div>

          <div className="truncate text-xs text-gray-400">
            {user?.email}
          </div>

        </div>

        <button
          onClick={onLogout}
          className="hover:text-red-400 transition"
        >
          <LogOut className="w-5 h-5" />
        </button>

      </div>

    </aside>
  );
}
