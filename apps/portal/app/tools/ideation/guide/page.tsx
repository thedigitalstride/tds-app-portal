'use client';

import {
  Lightbulb,
  Rocket,
  Layers,
  LayoutDashboard,
  BarChart3,
  Sparkles,
  FileText,
  Users,
  ThumbsUp,
} from 'lucide-react';
import { HelpPageLayout, type TocSection } from '@/components/help/help-page-layout';
import { HelpSection } from '@/components/help/help-section';
import { HelpStep } from '@/components/help/help-step';
import { HelpTip } from '@/components/help/help-tip';
import { HelpFeatureCard } from '@/components/help/help-feature-card';
import { StageWalkthrough } from './stage-walkthrough';

const SECTIONS: TocSection[] = [
  { id: 'overview', title: 'Overview' },
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'five-stages', title: 'The Five Stages' },
  { id: 'dashboard', title: 'Your Dashboard' },
  { id: 'scoring', title: 'Scoring & Evaluation' },
  { id: 'tips', title: 'Tips & Best Practices' },
];

export default function IdeationGuidePage() {
  return (
    <HelpPageLayout
      toolName="Ideation"
      backHref="/tools/ideation"
      backLabel="Back to Ideation"
      title="How Ideation Works"
      subtitle="Everything you need to turn rough ideas into structured, team-ready PRDs."
      sections={SECTIONS}
    >
      {/* ── Overview ───────────────────────────────────── */}
      <HelpSection id="overview" title="Overview" icon={Lightbulb} accentColor="#8B6F47">
        <p>
          Ideation is your AI-powered thinking partner for turning a rough spark into a
          structured Product Requirements Document (PRD). Instead of staring at a blank page,
          you have a guided conversation that walks you through five stages — from capturing the
          raw idea to producing a polished, downloadable document your team can act on.
        </p>
        <p>
          Each stage focuses on a different aspect of the idea. The AI asks targeted questions,
          suggests angles you might not have considered, and keeps you moving forward. You can
          take it at your own pace — save progress, come back later, or blitz through in one sitting.
        </p>
        <h3 className="text-base font-semibold text-neutral-900 pt-2">When to use it</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600">
          <li>You have a new feature or tool idea and want to flesh it out properly</li>
          <li>You need a structured PRD but don&apos;t want to start from scratch</li>
          <li>You want an AI to challenge your assumptions and find blind spots</li>
          <li>You want team buy-in before investing development time</li>
        </ul>
      </HelpSection>

      {/* ── Getting Started ─────────────────────────────── */}
      <HelpSection id="getting-started" title="Getting Started" icon={Rocket} accentColor="#B85C3A">
        <div className="space-y-5">
          <HelpStep number={1} title="Create a new idea">
            Click <strong>New Idea</strong> on the dashboard. Choose a template to get a head start
            (like &ldquo;New Tool for Toolbox&rdquo; or &ldquo;Process Improvement&rdquo;), or
            start blank if you prefer a clean slate. You can also pick from{' '}
            <strong>AI Inspiration</strong> — curated prompts that spark new directions.
          </HelpStep>

          <HelpStep number={2} title="Chat with the AI">
            Each stage is a conversation. The AI asks questions, you answer naturally. It extracts
            structure from your responses — problem statements, target users, feature lists — so
            you don&apos;t have to fill in rigid forms. Just talk through your thinking.
          </HelpStep>

          <HelpStep number={3} title="Advance through stages">
            When the AI has enough context for the current stage, a{' '}
            <strong>readiness indicator</strong> fills up. You can advance to the next stage
            whenever you&apos;re ready — there&apos;s no hard lock, so you&apos;re always in control
            of the pace.
          </HelpStep>
        </div>
      </HelpSection>

      {/* ── The Five Stages ─────────────────────────────── */}
      <HelpSection id="five-stages" title="The Five Stages" icon={Layers} accentColor="#2D7A8A">
        <p>
          Each stage builds on the last. Think of it as zooming in — starting wide with the raw
          idea and ending with a precise, actionable document.
        </p>
        <StageWalkthrough />
      </HelpSection>

      {/* ── Your Dashboard ──────────────────────────────── */}
      <HelpSection id="dashboard" title="Your Dashboard" icon={LayoutDashboard} accentColor="#6B4FA0">
        <p>
          The dashboard is your home base. Every idea you&apos;ve created lives here, organised by
          status so you can see what&apos;s in flight at a glance.
        </p>

        <h3 className="text-base font-semibold text-neutral-900 pt-2">Status pipeline</h3>
        <p className="text-sm text-neutral-600">
          Ideas flow through these stages: <strong>Draft</strong> (work in progress) →{' '}
          <strong>Approved</strong> (greenlit by the team) →{' '}
          <strong>In Progress</strong> (being built) →{' '}
          <strong>Completed</strong> (shipped) →{' '}
          <strong>Archived</strong> (shelved for now). Use the filter pills to focus on what matters.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          <HelpFeatureCard icon={FileText} title="Idea Cards">
            Each card shows the title, current stage, score, and vote count. Click any card to
            jump straight into the workspace and continue where you left off.
          </HelpFeatureCard>
          <HelpFeatureCard icon={ThumbsUp} title="Voting">
            Team members can upvote or downvote ideas to signal priority. The vote score helps
            surface the ideas the team is most excited about.
          </HelpFeatureCard>
          <HelpFeatureCard icon={Users} title="Collaboration">
            Collaborators are shown on each card. Everyone with tool access can view, vote, and
            comment on ideas — keeping the whole team in the loop.
          </HelpFeatureCard>
          <HelpFeatureCard icon={Sparkles} title="AI Inspiration">
            Not sure what to build next? The Inspiration panel suggests fresh ideas based on
            common agency challenges. Pick one to kick-start a new conversation.
          </HelpFeatureCard>
        </div>
      </HelpSection>

      {/* ── Scoring & Evaluation ────────────────────────── */}
      <HelpSection id="scoring" title="Scoring & Evaluation" icon={BarChart3} accentColor="#1A6B3C">
        <p>
          Once your idea has enough substance, you can ask the AI to score it. Scoring gives you
          an objective, data-informed view of whether the idea is worth pursuing.
        </p>

        <h3 className="text-base font-semibold text-neutral-900 pt-2">Three dimensions</h3>
        <div className="grid gap-3 sm:grid-cols-3 pt-1">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
            <p className="text-sm font-semibold text-neutral-900">Viability</p>
            <p className="mt-1 text-xs text-neutral-500">Market need, feasibility, and alignment with goals</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
            <p className="text-sm font-semibold text-neutral-900">Uniqueness</p>
            <p className="mt-1 text-xs text-neutral-500">Differentiation from existing solutions</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
            <p className="text-sm font-semibold text-neutral-900">Effort</p>
            <p className="mt-1 text-xs text-neutral-500">Estimated complexity and resources needed</p>
          </div>
        </div>

        <h3 className="text-base font-semibold text-neutral-900 pt-3">Recommendations</h3>
        <p className="text-sm text-neutral-600">
          The AI combines all three dimensions into a single recommendation:{' '}
          <span className="font-medium text-green-700">Strong Go</span>,{' '}
          <span className="font-medium text-emerald-700">Go</span>,{' '}
          <span className="font-medium text-amber-700">Conditional</span>,{' '}
          <span className="font-medium text-orange-700">Reconsider</span>, or{' '}
          <span className="font-medium text-red-700">No Go</span>.
          This isn&apos;t a final verdict — it&apos;s a conversation starter for your team.
        </p>

        <HelpTip variant="tip">
          Score early and often. Running a score after the Research stage helps you decide whether
          to invest time in the Refine and PRD stages.
        </HelpTip>
      </HelpSection>

      {/* ── Tips & Best Practices ───────────────────────── */}
      <HelpSection id="tips" title="Tips & Best Practices" icon={Sparkles} accentColor="#3b82f6">
        <div className="space-y-3">
          <HelpTip variant="tip">
            <strong>Be specific in Seed.</strong> The more context you give in the first stage,
            the sharper the AI&apos;s questions become in later stages. &ldquo;A dashboard&rdquo;
            is vague — &ldquo;A client-facing SEO health dashboard&rdquo; gives the AI much more
            to work with.
          </HelpTip>

          <HelpTip variant="tip">
            <strong>Use file attachments.</strong> You can attach documents, screenshots, or
            research to any message. The AI will incorporate them into its analysis — great for
            competitor screenshots or existing specs.
          </HelpTip>

          <HelpTip variant="warning">
            <strong>Don&apos;t skip Research.</strong> It&apos;s tempting to jump from Shape
            straight to PRD, but the Research stage is where the AI finds gaps in your thinking.
            Skipping it often means a weaker PRD.
          </HelpTip>

          <HelpTip variant="tip">
            <strong>Score at the right time.</strong> You can score at any stage, but the most
            useful scores come after Research when there&apos;s enough data for a meaningful
            assessment.
          </HelpTip>

          <HelpTip variant="note">
            <strong>Undo is your friend.</strong> Made a wrong turn in the conversation? Use
            the undo button to roll back messages and try a different direction. The AI adapts
            to whatever path you take.
          </HelpTip>
        </div>
      </HelpSection>
    </HelpPageLayout>
  );
}
