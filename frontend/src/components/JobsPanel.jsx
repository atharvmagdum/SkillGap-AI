import { useState } from "react";
import {
  Search,
  Loader2,
  Briefcase,
  MapPin,
  ExternalLink,
  Target,
  Upload
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function JobsPanel() {
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [resume, setResume] = useState(null);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const search = async (e) => {
    e.preventDefault();

    if (!role.trim()) {
      toast.error("Enter a role");
      return;
    }

    if (!resume) {
      toast.error("Upload your resume");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("resume", resume);
      formData.append("role", role);
      formData.append("location", location);

      const { data } = await api.post(
        "/jobs/search",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );

      setResults(data);

      if (data.count === 0) {
        toast.info("No jobs found");
      }

    } catch (e) {
      toast.error(
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "Search failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (score) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 75) return "bg-blue-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-12">

        <h1 className="text-4xl font-semibold">
          AI Job Matching
        </h1>

        <p className="text-gray-400 mt-2">
          Upload your resume and discover jobs ranked by AI.
        </p>

        <form
          onSubmit={search}
          className="mt-8 space-y-4"
        >

          {/* Resume Upload */}
          <label className="flex items-center justify-center gap-3 border border-dashed border-white/20 rounded-xl p-6 cursor-pointer bg-[#141414] hover:bg-[#1a1a1a]">
            <Upload className="w-5 h-5" />

            <span>
              {resume
                ? resume.name
                : "Upload Resume (PDF / DOCX)"}
            </span>

            <input
              type="file"
              className="hidden"
              accept=".pdf,.docx"
              onChange={(e) =>
                setResume(e.target.files[0])
              }
            />
          </label>

          <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3">

            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role (e.g. Full Stack Developer)"
              className="bg-[#141414] border border-white/10 rounded-xl px-4 py-3"
            />

            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="bg-[#141414] border border-white/10 rounded-xl px-4 py-3"
            />

            <button
              disabled={loading}
              className="bg-white text-black px-6 py-3 rounded-xl flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                <Search className="w-4 h-4" />
              )}

              Find Jobs
            </button>

          </div>
        </form>

        {results && (
          <div className="mt-10">

            <div className="text-sm text-gray-400 mb-6">
              Found {results.count} matching jobs
            </div>

            <div className="grid md:grid-cols-2 gap-5">

              {(results.jobs || []).map((job, index) => (
                <div
                  key={index}
                  className="bg-[#141414] border border-white/10 rounded-2xl p-5"
                >

                  <div className="flex justify-between items-center mb-3">

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Briefcase className="w-3 h-3" />
                      {job.source}
                    </div>

                    <div
                      className={`px-3 py-1 rounded-full text-xs text-white ${getMatchColor(
                        job.match_score || 0
                      )}`}
                    >
                      {job.match_score || 0}% Match
                    </div>

                  </div>

                  <h3 className="font-semibold text-lg">
                    {job.title}
                  </h3>

                  <div className="text-gray-400 mt-1">
                    {job.company}
                  </div>

                  {job.location && (
                    <div className="flex items-center gap-1 text-sm mt-3 text-gray-400">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </div>
                  )}

                  {job.match_reason && (
                    <div className="mt-4 p-3 rounded-xl bg-black/30 border border-white/5">

                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Target className="w-4 h-4" />
                        AI Insight
                      </div>

                      <p className="text-sm text-gray-400">
                        {job.match_reason}
                      </p>

                    </div>
                  )}

                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 text-blue-400"
                  >
                    Apply Now
                    <ExternalLink className="w-4 h-4" />
                  </a>

                </div>
              ))}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}