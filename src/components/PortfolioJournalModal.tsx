import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ExternalLink,
  Mail,
  Copy,
  Check,
  Code2,
  Camera,
  Layers,
  MapPin,
  Phone,
  Calendar,
  Globe,
  Quote,
  Briefcase,
  GraduationCap,
  Trophy,
} from 'lucide-react';
import {
  PORTFOLIO_OWNER,
  PORTFOLIO_PROJECTS,
  WORK_EXPERIENCE,
  EDUCATION,
  TESTIMONIALS,
  SKILL_CATEGORIES,
  ISLAND_NPCS,
  ISLAND_SHELLS,
} from '../data/portfolioData';
import { calculatePortfolioProgress, getCompletionTitle } from '../game/logic';
import { soundManager } from '../audio/soundSynthesizer';

interface PortfolioJournalModalProps {
  visitedNpcs: Set<string>;
  collectedShells: Set<string>;
  onClose: () => void;
}

type TabType = 'overview' | 'projects' | 'resume' | 'skills' | 'secrets' | 'contact';

export const PortfolioJournalModal: React.FC<PortfolioJournalModalProps> = ({
  visitedNpcs,
  collectedShells,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [copiedPhone, setCopiedPhone] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const progress = calculatePortfolioProgress(
    visitedNpcs.size,
    collectedShells.size,
    ISLAND_NPCS.length,
    ISLAND_SHELLS.length
  );

  const islandRank = getCompletionTitle(
    visitedNpcs.size,
    ISLAND_NPCS.length,
    collectedShells.size,
    ISLAND_SHELLS.length
  );

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(PORTFOLIO_OWNER.email);
    setCopiedEmail(true);
    soundManager.playFootstep();
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(PORTFOLIO_OWNER.phone);
    setCopiedPhone(true);
    soundManager.playFootstep();
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const filteredProjects =
    selectedCategory === 'All'
      ? PORTFOLIO_PROJECTS
      : PORTFOLIO_PROJECTS.filter((p) => p.badge.toLowerCase().includes(selectedCategory.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-amber-950/45 select-none pointer-events-auto">
      {/* Journal Book Container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-amber-50 rounded-3xl shadow-2xl border-4 border-amber-900/30 flex flex-col overflow-hidden text-amber-950">
        {/* Book Header / Ribbon */}
        <div className="bg-amber-800 text-amber-100 px-5 sm:px-8 py-4 flex items-center justify-between border-b-2 border-amber-900/40">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📖</span>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight font-display">
                Isle of Troy • Raymart Troy’s Portfolio Guide
              </h2>
              <div className="flex items-center gap-2 text-xs text-amber-200/90 font-medium">
                <span>{islandRank}</span>
                <span>•</span>
                <span className="font-mono">{progress.percentage}% Explored</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-amber-700 text-amber-200 transition-colors"
            title="Close Guide [Esc]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-amber-200 bg-amber-100/70 px-4 sm:px-8 overflow-x-auto gap-2 py-2">
          {[
            { id: 'overview', label: 'About Raymart', icon: '👤' },
            { id: 'projects', label: 'Featured Works', icon: '🎨' },
            { id: 'resume', label: 'Resume & History', icon: '📄' },
            { id: 'skills', label: 'Skills & Toolkit', icon: '⚡' },
            { id: 'secrets', label: 'Island Lore & Shells', icon: '🐚' },
            { id: 'contact', label: 'Contact & Hire', icon: '📬' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                soundManager.playFootstep();
              }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-amber-950 shadow-sm'
                  : 'text-amber-900/80 hover:bg-amber-200/60'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-amber-50/50">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6">
              {/* Profile Card */}
              <div className="p-6 rounded-3xl bg-white border border-amber-200/80 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="w-24 h-24 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-4xl shadow-inner">
                  <span>🎨</span>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                    <h3 className="text-2xl font-extrabold tracking-tight text-amber-950 font-display">
                      {PORTFOLIO_OWNER.name}
                    </h3>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Multimedia Artist
                    </span>
                  </div>
                  <p className="text-sm font-bold text-amber-800 mb-2">{PORTFOLIO_OWNER.title}</p>
                  <p className="text-sm text-amber-900/90 italic font-semibold mb-3">
                    {PORTFOLIO_OWNER.tagline}
                  </p>
                  <p className="text-sm leading-relaxed text-amber-900/90 font-medium mb-4">
                    {PORTFOLIO_OWNER.bio}
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-amber-900 font-semibold border-t border-amber-100 pt-3">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      {PORTFOLIO_OWNER.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      Born {PORTFOLIO_OWNER.birthday}
                    </span>
                    <a
                      href={PORTFOLIO_OWNER.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-amber-700 hover:text-amber-950 underline"
                    >
                      <Globe className="w-4 h-4 text-amber-600" />
                      imraymarttroy.online
                    </a>
                  </div>
                </div>
              </div>

              {/* Progress & Badges Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-amber-100/70 border border-amber-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                    <Trophy className="w-4 h-4 text-amber-600" />
                    <span>Exploration Rank</span>
                  </div>
                  <p className="text-sm font-extrabold text-amber-950">{islandRank}</p>
                  <p className="text-xs text-amber-800/80 mt-1">
                    Talk to all 5 island villagers and find all 8 shells!
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-100/70 border border-amber-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                    <span>💬</span>
                    <span>Villagers Consulted</span>
                  </div>
                  <p className="text-2xl font-black text-amber-950 font-mono">
                    {visitedNpcs.size} / {ISLAND_NPCS.length}
                  </p>
                  <div className="w-full bg-amber-200 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-amber-600 h-full rounded-full transition-all"
                      style={{ width: `${(visitedNpcs.size / ISLAND_NPCS.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-100/70 border border-amber-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Golden Shells</span>
                  </div>
                  <p className="text-2xl font-black text-amber-950 font-mono">
                    {collectedShells.size} / {ISLAND_SHELLS.length}
                  </p>
                  <div className="w-full bg-amber-200 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${(collectedShells.size / ISLAND_SHELLS.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Real Testimonials Carousel / Grid */}
              <div>
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-2">
                  <Quote className="w-4 h-4 text-amber-600" />
                  <span>Client Testimonials from imraymarttroy.online</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TESTIMONIALS.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs flex flex-col justify-between"
                    >
                      <p className="text-xs text-amber-950/90 italic leading-relaxed mb-3">
                        “{t.quote}”
                      </p>
                      <span className="text-xs font-extrabold text-amber-800 block text-right font-display">
                        — {t.author}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROJECTS */}
          {activeTab === 'projects' && (
            <div className="flex flex-col gap-5">
              {/* Category Pills */}
              <div className="flex flex-wrap gap-2">
                {['All', 'Brand Identity', 'Photography', 'Video & Motion', 'Viral Media'].map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-amber-700 text-white'
                          : 'bg-amber-200/70 text-amber-900 hover:bg-amber-200'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>

              {/* Projects List */}
              <div className="grid grid-cols-1 gap-4">
                {filteredProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-5 rounded-2xl bg-white border border-amber-200 shadow-xs flex flex-col gap-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-base sm:text-lg font-extrabold text-amber-950 font-display">
                            {proj.title}
                          </h4>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                            {proj.badge}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-amber-800">
                          {proj.role} • <span className="font-mono text-amber-700">{proj.period}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {proj.demoUrl && (
                          <a
                            href={proj.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <span>Open Project</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed font-medium">
                      {proj.summary}
                    </p>

                    {/* Key Highlights */}
                    <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-1.5">
                        Creative Highlights:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-xs text-amber-950">
                        {proj.highlights.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Tech Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {proj.technologies.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md bg-amber-100 text-[11px] font-mono font-medium text-amber-900"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: RESUME & HISTORY */}
          {activeTab === 'resume' && (
            <div className="flex flex-col gap-6">
              {/* Experience */}
              <div>
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                  <span>Work Experience</span>
                </h4>
                <div className="flex flex-col gap-3">
                  {WORK_EXPERIENCE.map((exp, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="font-extrabold text-sm sm:text-base text-amber-950 font-display">
                          {exp.role} — <span className="text-amber-800">{exp.company}</span>
                        </h5>
                        <span className="text-xs font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                          {exp.period}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed font-medium">
                        {exp.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education */}
              <div>
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-600" />
                  <span>Education & Theatrical Roots</span>
                </h4>
                <div className="flex flex-col gap-3">
                  {EDUCATION.map((edu, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="font-extrabold text-sm sm:text-base text-amber-950 font-display">
                          {edu.degree} — <span className="text-amber-800">{edu.institution}</span>
                        </h5>
                        <span className="text-xs font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                          {edu.period}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed font-medium">
                        {edu.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SKILLS & TOOLKIT */}
          {activeTab === 'skills' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SKILL_CATEGORIES.map((cat) => (
                <div
                  key={cat.name}
                  className="p-5 rounded-2xl bg-white border border-amber-200 shadow-xs flex flex-col gap-4"
                >
                  <div className="flex items-center gap-2 border-b border-amber-100 pb-2.5">
                    {cat.name.includes('Visual') ? (
                      <Layers className="w-5 h-5 text-amber-600" />
                    ) : cat.name.includes('Video') ? (
                      <Code2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Camera className="w-5 h-5 text-purple-600" />
                    )}
                    <h4 className="font-extrabold text-sm sm:text-base text-amber-950 font-display">
                      {cat.name}
                    </h4>
                  </div>

                  <div className="flex flex-col gap-3">
                    {cat.skills.map((skill) => (
                      <div key={skill.name} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-amber-950">
                          <span>{skill.name}</span>
                          <span className="font-mono text-amber-700">{skill.level}%</span>
                        </div>
                        <div className="w-full bg-amber-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-600 h-full rounded-full"
                            style={{ width: `${skill.level}%` }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {skill.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] text-amber-800/80 font-mono bg-amber-50 px-1.5 py-0.2 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: SECRETS & SHELLS */}
          {activeTab === 'secrets' && (
            <div className="flex flex-col gap-6">
              {/* NPC Discovery Log */}
              <div>
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-2">
                  <span>🏝️</span>
                  <span>Villagers & Island Mentors</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ISLAND_NPCS.map((npc) => {
                    const isMet = visitedNpcs.has(npc.id);
                    return (
                      <div
                        key={npc.id}
                        className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                          isMet
                            ? 'bg-white border-amber-300'
                            : 'bg-amber-100/40 border-amber-200/50 opacity-60'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${npc.accentColor}25` }}
                        >
                          {npc.avatarIcon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs sm:text-sm text-amber-950">
                              {npc.name}
                            </span>
                            {isMet && (
                              <span className="text-[10px] font-bold px-1.5 rounded bg-emerald-100 text-emerald-800">
                                Met
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-amber-800">{npc.role}</p>
                          <p className="text-[10px] text-amber-900/70 italic mt-0.5">
                            {isMet ? npc.summaryQuote : 'Explore the island to find this villager!'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shells Checklist */}
              <div>
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Golden Nautilus Shells ({collectedShells.size}/8)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ISLAND_SHELLS.map((shell) => {
                    const isFound = collectedShells.has(shell.id);
                    return (
                      <div
                        key={shell.id}
                        className={`p-3 rounded-xl border flex items-start gap-3 ${
                          isFound
                            ? 'bg-amber-100/80 border-amber-300'
                            : 'bg-white/60 border-amber-200/60'
                        }`}
                      >
                        <span className="text-xl">{isFound ? '🐚' : '❓'}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-amber-950">{shell.name}</span>
                            <span className="text-[10px] font-mono text-amber-700">
                              {isFound ? 'Discovered' : 'Hidden'}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-900/80 mt-0.5">
                            {isFound ? shell.lore : shell.hint}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CONTACT & HIRE */}
          {activeTab === 'contact' && (
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto gap-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-600/20 text-amber-700 flex items-center justify-center text-3xl">
                <span>✉️</span>
              </div>

              <div>
                <h3 className="text-2xl font-extrabold text-amber-950 font-display">
                  Let’s Tell Your Brand’s Story
                </h3>
                <p className="text-xs sm:text-sm text-amber-900/80 font-medium mt-1">
                  Raymart Troy is based in Manila, Philippines and available for multimedia design, video editing, branding, and creative collaborations.
                </p>
              </div>

              {/* Email & Phone Cards */}
              <div className="w-full flex flex-col gap-2.5">
                <div className="w-full p-4 rounded-2xl bg-white border border-amber-200 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5 text-left">
                    <Mail className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-800/70 block">
                        Email Address
                      </span>
                      <span className="font-mono text-xs sm:text-sm font-semibold text-amber-950">
                        {PORTFOLIO_OWNER.email}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCopyEmail}
                    className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="w-full p-4 rounded-2xl bg-white border border-amber-200 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5 text-left">
                    <Phone className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-800/70 block">
                        Phone / Contact
                      </span>
                      <span className="font-mono text-xs sm:text-sm font-semibold text-amber-950">
                        {PORTFOLIO_OWNER.phone}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCopyPhone}
                    className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    {copiedPhone ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Social Channels Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
                <a
                  href={`mailto:${PORTFOLIO_OWNER.email}?subject=Hello%20Raymart%20Troy%20-%20Creative%20Project`}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Direct Email</span>
                </a>

                <a
                  href={PORTFOLIO_OWNER.behance}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  <span>Behance Portfolio</span>
                </a>

                <a
                  href={PORTFOLIO_OWNER.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  <span>Instagram</span>
                </a>

                <a
                  href={PORTFOLIO_OWNER.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  <span>Facebook</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
