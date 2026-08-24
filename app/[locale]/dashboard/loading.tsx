// Next.js shows this automatically while a dashboard page (or its data) is loading — wrapped
// in the dashboard layout already, so only the content area needs a placeholder here, not the
// nav/container around it. `aria-hidden` since it's purely decorative; the real loading state
// is already announced by the browser's own navigation/loading affordances.
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="bg-muted h-8 w-48 animate-pulse rounded-md" />
      <div className="bg-muted h-4 w-full max-w-sm animate-pulse rounded-md" />
    </div>
  );
}
