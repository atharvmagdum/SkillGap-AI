//Resume Analyzer
import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function ResumeAnalyzer() {
  const [file, setFile] = useState(null);
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const inputRef = useRef(null);

  const onPick = (f) => {
    if (!f) return;

    const valid = /\.(pdf|docx|txt)$/i.test(f.name);

    if (!valid) {
      toast.error("Only PDF, DOCX and TXT supported");
      return;
    }

    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!file || !role.trim()) {
      toast.error("Upload resume and enter target role");
      return;
    }

    setLoading(true);

    try {
      const fd = new FormData();

      fd.append("file", file);
      fd.append("target_role", role);
      fd.append("location", location);

      const { data } = await api.post("/resume/analyze", fd);

      setResult(data);

      toast.success("Resume analyzed successfully");
    } catch (err) {
      toast.error(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Analysis failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-12">

        <h1 className="text-4xl font-semibold mb-2">
          Resume Analyzer
        </h1>

        <p className="text-gray-400 mb-8">
          Upload your resume and compare it against a target role.
        </p>

        <form onSubmit={submit} className="space-y-4">

          <div
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer border border-dashed border-white/20 rounded-2xl p-8 text-center bg-[#141414]"
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0])}
            />

            <Upload className="mx-auto mb-3" />

            {file ? (
              <p>{file.name}</p>
            ) : (
              <p>Click to upload resume</p>
            )}
          </div>

          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Target Role"
            className="w-full bg-[#141414] rounded-xl p-3 border border-white/10"
          />

          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
            className="w-full bg-[#141414] rounded-xl p-3 border border-white/10"
          />

          <button
            disabled={loading}
            className="bg-white text-black px-6 py-3 rounded-xl"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin w-4 h-4" />
                Analyzing...
              </span>
            ) : (
              "Analyze Resume"
            )}
          </button>
        </form>

        {result && (
          <div className="mt-10 space-y-6">

            <div className="bg-[#141414] rounded-2xl p-6">
              <h2 className="text-2xl font-bold">
                ATS Score: {result.ats_score}/100
              </h2>

              <p className="text-gray-300 mt-3">
                {result.summary}
              </p>
            </div>

            <div className="bg-[#141414] rounded-2xl p-6">
              <h3 className="font-semibold mb-3">
                Strengths
              </h3>

              <ul className="list-disc pl-6">
                {result.strengths?.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="bg-[#141414] rounded-2xl p-6">
              <h3 className="font-semibold mb-3">
                Missing Skills
              </h3>

              <ul className="list-disc pl-6">
                {result.missing_skills?.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="bg-[#141414] rounded-2xl p-6">
              <h3 className="font-semibold mb-3">
                Resume Improvements
              </h3>

              <ul className="list-disc pl-6">
                {result.resume_improvements?.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="bg-[#141414] rounded-2xl p-6">
              <h3 className="font-semibold mb-3">
                ATS Keywords To Add
              </h3>

              <div className="flex flex-wrap gap-2">
                {result.keyword_suggestions?.map((item, i) => (
                  <span
                    key={i}
                    className="bg-gray-800 px-3 py-1 rounded-full text-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
