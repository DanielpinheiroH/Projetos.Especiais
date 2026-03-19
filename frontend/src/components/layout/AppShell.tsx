import { NavLink, Outlet } from "react-router-dom";

const navItem =
  "flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition-all";

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-slate-200 bg-white/95 px-5 py-6 backdrop-blur">
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-soft-2)] p-2">
                <img
                  src="/logo.gif"
                  alt="Logo Metrópoles"
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <h1 className="text-lg font-bold leading-tight tracking-tight">
                  Projetos Especiais
                </h1>
                <p className="text-sm text-slate-500">Metrópoles</p>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${navItem} ${
                  isActive
                    ? "bg-[var(--brand)] text-white shadow-sm"
                    : "text-slate-600 hover:bg-[var(--brand-soft)] hover:text-[var(--brand-dark)]"
                }`
              }
            >
              Dashboard
            </NavLink>

            <NavLink
              to="/projetos"
              className={({ isActive }) =>
                `${navItem} ${
                  isActive
                    ? "bg-[var(--brand)] text-white shadow-sm"
                    : "text-slate-600 hover:bg-[var(--brand-soft)] hover:text-[var(--brand-dark)]"
                }`
              }
            >
              Projetos
            </NavLink>

            <NavLink
              to="/vendas"
              className={({ isActive }) =>
                `${navItem} ${
                  isActive
                    ? "bg-[var(--brand)] text-white shadow-sm"
                    : "text-slate-600 hover:bg-[var(--brand-soft)] hover:text-[var(--brand-dark)]"
                }`
              }
            >
              Vendas
            </NavLink>
          </nav>

          <div className="mt-10 rounded-2xl border border-red-100 bg-[var(--brand-soft-2)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
              Ambiente interno
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Sistema para gestão de projetos comerciais especiais do Metrópoles.
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>

          <footer className="border-t border-slate-200 bg-white px-6 py-3">
  <div className="mx-auto flex max-w-7xl items-center justify-between text-xs text-slate-500">
    
    <div className="flex items-center gap-2">
      <span>Desenvolvido por Daniel</span>
    </div>

    <div className="flex items-center gap-2">
      <img
        src="/logo-maisacessado.webp"
        alt="Metrópoles"
        className="h-6 opacity-80"
      />
    </div>

  </div>
</footer>
        </div>
      </div>
    </div>
  );
}