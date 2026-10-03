import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
                RS
              </div>
              <span className="font-semibold">ReleaseSignal</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Turn every test run into a release decision. Explainable quality gates for confident releases.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-3">Product</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#capabilities" className="hover:text-foreground transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  Demo
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-3">Built by</h3>
            <p className="text-sm text-muted-foreground mb-3">Everton S. Andrade</p>
            <div className="flex gap-3">
              <a
                href="https://github.com/EvertonSt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                GitHub <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://www.linkedin.com/in/everton-s-andrade-760407128/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                LinkedIn <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          {new Date().getFullYear()} ReleaseSignal. Built with TypeScript, Next.js, and careful engineering.
        </div>
      </div>
    </footer>
  );
}
