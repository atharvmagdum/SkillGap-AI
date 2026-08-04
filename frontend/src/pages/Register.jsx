// Register.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { api, setAuth } from "../lib/api";
import { Sparkles, Loader2 } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("All fields are required");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 chars");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/auth/register", {
        name,
        email,
        password,
      });

      setAuth(data.token, data.user);
      toast.success("Account created");
      navigate("/");
    } catch (err) {
      toast.error(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-6">
      <div className="w-full max-w-md">

        <div className="flex items-center gap-2 mb-10">
          <Sparkles className="w-6 h-6 text-white" />
          <span className="text-xl font-semibold tracking-tight">
            SkillGap-AI
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl tracking-tighter font-semibold mb-2">
          Create account
        </h1>

        <p className="text-[#A3A3A3] mb-10">
          Start landing roles you actually want.
        </p>

        <form onSubmit={submit} className="space-y-4">

          <div>
            <label className="text-sm text-[#A3A3A3]">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-white/30"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="text-sm text-[#A3A3A3]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-white/30"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm text-[#A3A3A3]">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-white/30"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-[#F9F9F9] text-black hover:bg-white rounded-full px-6 py-3 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create account
          </button>
        </form>

        <p className="text-sm text-[#A3A3A3] mt-6">
          Have an account?{" "}
          <Link to="/login" className="text-white underline underline-offset-4">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
}