import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getProjects } from "../../lib/api";

function statusClass(status: string) {
  if (status === "ATIVO") {
    return "bg-red-100 text-red-700 border-red-200";
  }

  if (status === "ATEMPORAL") {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }

  if (status === "INATIVO") {
    return "bg-slate-200 text-slate-700 border-slate-300";
  }

  return "bg-slate-100 text-slate-500 border-slate-200";
}

function formatType(type: string) {
  if (type === "ESPECIAL_COM_DATA") return "Especial com data";
  if (type === "ESPECIFICO_PARA_MARCA") return "Específico para marca";
  if (type === "ATEMPORAL") return "Atemporal";
  if (type === "EVENTO") return "Evento";
  return type;
}

function formatDate(date?: string | null) {
  if (!date) return "Sem validade";
  return new Date(date).toLocaleDateString("pt-BR");
}

type ProjectFilter = "TODOS" | "ATIVOS" | "INATIVOS";

export function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectFilter>("TODOS");

  async function loadProjects() {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      console.error("Erro ao carregar projetos:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !term ||
        String(project.name || "").toLowerCase().includes(term) ||
        String(project.type || "").toLowerCase().includes(term) ||
        String(project.description || "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "TODOS"
          ? true
          : statusFilter === "ATIVOS"
          ? project.status === "ATIVO" || project.status === "ATEMPORAL"
          : project.status === "INATIVO";

      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const totalProjects = projects.length;
  const activeProjects = projects.filter(
    (project) => project.status === "ATIVO" || project.status === "ATEMPORAL"
  ).length;
  const inactiveProjects = projects.filter(
    (project) => project.status === "INATIVO"
  ).length;

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500">
        Carregando projetos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[28px] bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] p-7 text-white shadow-lg md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-red-100">
            Gestão comercial
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Projetos</h2>
          <p className="mt-2 text-sm leading-6 text-red-50/95">
            Acompanhe os projetos especiais, consulte materiais comerciais e
            acesse rapidamente os detalhes de cada oportunidade.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar projeto"
            className="min-w-[240px] rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/70 outline-none backdrop-blur-sm"
          />

          <Link
            to="/projetos/novo"
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[var(--brand-dark)] shadow-sm transition hover:-translate-y-0.5 hover:bg-red-50"
          >
            Novo projeto
          </Link>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Filtrar por status
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Atemporais entram como ativos.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStatusFilter("TODOS")}
              className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                statusFilter === "TODOS"
                  ? "bg-[var(--brand)] text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Todos ({totalProjects})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("ATIVOS")}
              className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                statusFilter === "ATIVOS"
                  ? "bg-[var(--brand)] text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Ativos ({activeProjects})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("INATIVOS")}
              className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                statusFilter === "INATIVOS"
                  ? "bg-[var(--brand)] text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Inativos ({inactiveProjects})
            </button>
          </div>
        </div>
      </section>

      {filteredProjects.length === 0 ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-800">
            Nenhum projeto encontrado
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Ajuste a busca ou altere o filtro selecionado.
          </p>
        </section>
      ) : (
        <section className="grid gap-5">
          {filteredProjects.map((project) => (
            <article
              key={project.id}
              className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="grid gap-0 lg:grid-cols-[240px_1fr]">
                <div className="border-b border-slate-100 bg-slate-50 lg:border-b-0 lg:border-r lg:border-slate-100">
                  <div className="flex h-full min-h-[260px] items-center justify-center p-6">
                    {project.cover_image_url ? (
                      <img
                        src={project.cover_image_url}
                        alt={project.name}
                        className="h-[220px] w-[150px] rounded-2xl object-cover shadow-lg ring-1 ring-slate-200"
                      />
                    ) : (
                      <div className="flex h-[220px] w-[150px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center text-sm text-slate-400">
                        Sem capa
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                            project.status
                          )}`}
                        >
                          {project.status}
                        </span>

                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          {formatType(project.type)}
                        </span>
                      </div>

                      <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
                        {project.name}
                      </h3>

                      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                        {project.description || "Sem descrição cadastrada."}
                      </p>
                    </div>

                    <div className="w-full lg:w-[240px]">
                      <div className="rounded-3xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Visão geral
                        </p>

                        <div className="mt-4 space-y-3 text-sm">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="text-slate-500">Validade</span>
                            <strong className="text-right text-slate-900">
                              {formatDate(project.expires_at)}
                            </strong>
                          </div>

                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="text-slate-500">Tipo</span>
                            <strong className="text-right text-slate-900">
                              {formatType(project.type)}
                            </strong>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Status</span>
                            <strong className="text-right text-slate-900">
                              {project.status}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      {project.pdf_url ? (
                        <a
                          href={`http://localhost:3333/api/projects/${project.id}/download-pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand-dark)]"
                        >
                          Baixar PDF
                        </a>
                      ) : (
                        <span className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-400">
                          Sem PDF
                        </span>
                      )}

                      <span className="text-sm text-slate-400">
                        {project.pdf_name || "Nenhum material vinculado"}
                      </span>
                    </div>

                    <Link
                      to={`/projetos/${project.id}`}
                      className="inline-flex items-center justify-center rounded-2xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                    >
                      Ver detalhes
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}