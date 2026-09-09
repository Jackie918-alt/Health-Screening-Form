import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Survey admin — We Kongsi",
  // Response data must never reach a search index.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
