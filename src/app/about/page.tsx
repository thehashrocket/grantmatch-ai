import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'About | GrantMatch AI',
};

export default function AboutPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-[700px] w-[700px] rounded-full bg-blue-500/10 blur-3xl animate-pulse-slow" />
        <div className="absolute -right-32 top-10 h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-3xl animate-pulse-slower" />
        <div className="absolute left-16 bottom-10 h-[620px] w-[620px] rounded-full bg-purple-500/10 blur-3xl animate-pulse-slowest" />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-gray-50/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900/50" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24 space-y-16">
        <header className="text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            About GrantMatch AI
          </p>
          <h1 className="text-4xl md:text-5xl font-bold">
            Fueling the missions of nonprofits, cities, and schools
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            GrantMatch AI connects mission-driven teams with the funding that keeps
            programs alive. We pair high-quality grant data with human-centered design
            so you can spend less time hunting for opportunities and more time serving
            your community.
          </p>
        </header>

        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-white/80 p-8 shadow-sm backdrop-blur dark:bg-gray-950/70">
            <h2 className="text-2xl font-semibold mb-3">Built for people who do the work</h2>
            <p className="text-muted-foreground mb-4">
              We champion the operators behind every grant application:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Nonprofits</span> balancing
                impact with lean teams who need a smarter shortlist.
              </li>
              <li>
                <span className="font-medium text-foreground">City, county, and state staff</span>{' '}
                racing deadlines while juggling multiple programs.
              </li>
              <li>
                <span className="font-medium text-foreground">Schools and districts</span> seeking
                funding for students, educators, and facilities.
              </li>
              <li>
                <span className="font-medium text-foreground">Coalitions and partnerships</span>{' '}
                aligning around shared priorities and shared wins.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border/60 bg-white/80 p-8 shadow-sm backdrop-blur dark:bg-gray-950/70">
            <h2 className="text-2xl font-semibold mb-3">Why we built this</h2>
            <p className="text-muted-foreground mb-4">
              Funding shouldn&apos;t be a maze. GrantMatch AI cuts through the noise with:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li>
                AI-powered fit scores that surface the best-aligned opportunities for your
                mission.
              </li>
              <li>
                Fresh federal, state, and local data so you never miss a deadline.
              </li>
              <li>
                Clear explanations and links that make it easy to share and act quickly.
              </li>
              <li>
                A focus on accessibility and collaboration—because winning grants is a team sport.
              </li>
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-blue-600/10 via-emerald-500/10 to-purple-500/10 p-10 shadow-sm backdrop-blur">
          <div className="grid gap-6 md:grid-cols-2 md:items-center">
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold">Our promise</h3>
              <p className="text-muted-foreground">
                We obsess over clarity and momentum. Every feature we ship—fit scoring, deadline
                tracking, streamlined views—is designed to help you reclaim time and move funding
                forward faster. If something slows you down, tell us and we&apos;ll fix it.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-white/80 p-6 text-muted-foreground shadow-sm backdrop-blur dark:bg-gray-950/80">
              <p className="font-medium text-foreground mb-2">
                What success looks like with GrantMatch AI
              </p>
              <ul className="space-y-2">
                <li>• A prioritized list of grants that match your goals.</li>
                <li>• Confidence you&apos;re tracking every relevant deadline.</li>
                <li>• A clear story to share with stakeholders and collaborators.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="text-center space-y-4">
          <h3 className="text-2xl font-semibold">Ready to find your next grant?</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Jump into the dashboard, explore the latest opportunities, and use fit scores to decide
            where to focus first.
          </p>
          <div className="flex justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:translate-y-[-2px] hover:shadow-xl"
            >
              Go to dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
