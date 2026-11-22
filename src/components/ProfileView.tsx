import React, { useState } from "react";
import {
  User,
  Save,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { BrokerName, TradeHistoryRecord, UserProfile } from "../types";

interface ProfileViewProps {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  history: TradeHistoryRecord[];
  onClearHistory: () => void;
  onNotify: (msg: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onUpdateProfile,
  history,
  onClearHistory,
  onNotify,
}) => {
  const [name, setName] = useState(profile.name);
  const [userId, setUserId] = useState(profile.userId);
  const [tier, setTier] = useState<"Free" | "Pro">(profile.tier);
  const [broker, setBroker] = useState<BrokerName>(profile.broker);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      name: name.trim() || "MAHIM HOSSEN",
      userId: userId.trim() || "op_hacker@gmail.com",
      tier,
      broker,
    });
    onNotify("Profile settings saved");
  };

  const sessionWins = history.filter((h) => h.outcome === "WIN").length;
  const sessionLosses = history.filter((h) => h.outcome === "LOSS").length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* Profile Form */}
      <section className="lg:col-span-5 rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-5 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-blue-600/25 border border-blue-400/30 flex items-center justify-center">
            <User className="w-5 h-5 text-sky-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Trader Profile</h2>
            <p className="text-xs text-slate-400">Account identity & defaults</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-400">Display Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#07112B] border border-blue-400/20 text-sm text-white focus:outline-none focus:border-blue-400"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-400">Your ID / Email</span>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#07112B] border border-blue-400/20 text-sm font-mono text-white focus:outline-none focus:border-blue-400"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-400">Plan Tier</span>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as "Free" | "Pro")}
                className="w-full h-11 px-3 rounded-xl bg-[#07112B] border border-blue-400/20 text-sm text-white focus:outline-none"
              >
                <option value="Free" className="bg-[#0B1736]">Free</option>
                <option value="Pro" className="bg-[#0B1736]">Pro</option>
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-400">Default Broker</span>
              <select
                value={broker}
                onChange={(e) => setBroker(e.target.value as BrokerName)}
                className="w-full h-11 px-3 rounded-xl bg-[#07112B] border border-blue-400/20 text-sm text-white focus:outline-none"
              >
                <option value="Quotex" className="bg-[#0B1736]">Quotex</option>
                <option value="Pocket Option" className="bg-[#0B1736]">Pocket Option</option>
                <option value="IQ Option" className="bg-[#0B1736]">IQ Option</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            className="w-full min-h-[46px] rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(37,99,235,0.35)]"
          >
            <Save className="w-4 h-4" />
            Save Profile
          </button>
        </form>
      </section>

      {/* Signal Outcome Log */}
      <section className="lg:col-span-7 rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-5 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Signal History Log</h2>
            <p className="text-xs text-slate-400 font-mono">
              Session: {sessionWins}W · {sessionLosses}L (feeds Overview Accuracy)
            </p>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onClearHistory();
                onNotify("Cleared session signal history");
              }}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#07112B] border border-rose-400/25 text-xs font-semibold text-rose-300 hover:bg-rose-500/15 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear log
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="py-14 text-center rounded-2xl bg-[#07112B]/65 border border-blue-900/35 text-sm text-slate-400">
            No signals logged yet this session. Mark Win or Loss after generating a signal in Live Signals or Future Signals.
          </div>
        ) : (
          <div className="divide-y divide-blue-900/40 rounded-2xl bg-[#07112B]/80 border border-blue-900/40 max-h-[380px] overflow-y-auto">
            {history.map((rec) => (
              <div
                key={rec.id}
                className="px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      rec.direction === "CALL"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-rose-500/15 text-rose-400"
                    }`}
                  >
                    {rec.direction === "CALL" ? (
                      <ArrowUp className="w-4 h-4" />
                    ) : (
                      <ArrowDown className="w-4 h-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {rec.pairSymbol} · {rec.market}
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      Entry {rec.entryTime} · {rec.confidence}%
                    </div>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 text-xs font-mono font-bold ${
                    rec.outcome === "WIN" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {rec.outcome === "WIN" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {rec.outcome}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
