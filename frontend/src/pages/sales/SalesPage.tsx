import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { getProjectById, getProjects } from "../../lib/api";

type ProjectSale = {
  id: string;
  sale_date: string;
  advertiser_name?: string;
  executive_name?: string;
  quota_name?: string;
  quantity?: number;
  discount_percentage?: string | number;
  final_total_price?: string | number;
};

type ProjectItem = {
  id: string;
  name: string;
  status: string;
  sales: ProjectSale[];
};

type SalesFilter = "TODOS" | "ATIVOS" | "INATIVOS" | "COM_VENDAS" | "SEM_VENDAS";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function statusClass(status: string) {
  if (status === "ATIVO") {
    return "bg-red-100 text-red-700";
  }

  if (status === "ATEMPORAL") {
    return "bg-slate-100 text-slate-700";
  }

  if (status === "INATIVO") {
    return "bg-slate-200 text-slate-700";
  }

  return "bg-slate-100 text-slate-500";
}

function sanitizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

export function SalesPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SalesFilter>("COM_VENDAS");

  async function loadProjectsWithSales() {
    try {
      setLoading(true);

      const baseProjects = await getProjects();

      const detailedProjects = await Promise.all(
        (baseProjects || []).map(async (project: any) => {
          try {
            const details = await getProjectById(project.id);

            return {
              id: String(details.id),
              name: String(details.name),
              status: String(details.status || ""),
              sales: details.sales || [],
            };
          } catch (error) {
            console.error(`Erro ao carregar projeto ${project.id}:`, error);

            return {
              id: String(project.id),
              name: String(project.name),
              status: String(project.status || ""),
              sales: [],
            };
          }
        })
      );

      setProjects(detailedProjects);
    } catch (error) {
      console.error("Erro ao carregar vendas:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjectsWithSales();
  }, []);

  const enrichedProjects = useMemo(() => {
    return projects.map((project) => {
      const revenue =
        project.sales?.reduce(
          (sum, sale) => sum + Number(sale.final_total_price || 0),
          0
        ) || 0;

      const salesCount = project.sales?.length || 0;
      const averageTicket = salesCount > 0 ? revenue / salesCount : 0;

      const latestSale =
        [...(project.sales || [])]
          .filter((sale) => sale.sale_date)
          .sort(
            (a, b) =>
              new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
          )[0] || null;

      return {
        ...project,
        revenue,
        salesCount,
        averageTicket,
        latestSale,
      };
    });
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase();

    return enrichedProjects
      .filter((project) => {
        const matchesSearch =
          !term ||
          project.name.toLowerCase().includes(term) ||
          project.status.toLowerCase().includes(term);

        const matchesFilter =
          filter === "TODOS"
            ? true
            : filter === "ATIVOS"
            ? project.status === "ATIVO" || project.status === "ATEMPORAL"
            : filter === "INATIVOS"
            ? project.status === "INATIVO"
            : filter === "COM_VENDAS"
            ? project.salesCount > 0
            : project.salesCount === 0;

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [enrichedProjects, search, filter]);

  const totalSales = useMemo(() => {
    return enrichedProjects.reduce((acc, project) => acc + project.salesCount, 0);
  }, [enrichedProjects]);

  const totalRevenue = useMemo(() => {
    return enrichedProjects.reduce((acc, project) => acc + project.revenue, 0);
  }, [enrichedProjects]);

  const soldProjects = useMemo(() => {
    return enrichedProjects.filter((project) => project.salesCount > 0);
  }, [enrichedProjects]);

  const currentMonthSales = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return enrichedProjects.reduce((acc, project) => {
      const count =
        project.sales?.filter((sale) => {
          if (!sale.sale_date) return false;
          const saleDate = new Date(sale.sale_date);
          return saleDate.getMonth() === month && saleDate.getFullYear() === year;
        }).length || 0;

      return acc + count;
    }, 0);
  }, [enrichedProjects]);

  const bestProject = useMemo(() => {
    return [...enrichedProjects].sort((a, b) => b.revenue - a.revenue)[0] || null;
  }, [enrichedProjects]);

  const averageTicket = useMemo(() => {
    return totalSales > 0 ? totalRevenue / totalSales : 0;
  }, [totalRevenue, totalSales]);

  const latestSaleInfo = useMemo(() => {
    const allSales = enrichedProjects.flatMap((project) =>
      project.sales.map((sale) => ({
        ...sale,
        projectName: project.name,
      }))
    );

    return (
      allSales
        .filter((sale) => sale.sale_date)
        .sort(
          (a, b) =>
            new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
        )[0] || null
    );
  }, [enrichedProjects]);

  function handleExportXlsx() {
    const exportData = filteredProjects.map((project) => ({
      Projeto: project.name,
      Status: project.status,
      Vendas: project.salesCount,
      Faturamento: project.revenue,
      "Ticket Médio": project.averageTicket,
      "Última Venda": formatDate(project.latestSale?.sale_date || null),
    }));

    if (!exportData.length) {
      alert("Não há dados para exportar.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    worksheet["!cols"] = [
      { wch: 32 },
      { wch: 14 },
      { wch: 10 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas");

    XLSX.writeFile(workbook, `vendas_${sanitizeFileName(filter.toLowerCase())}.xlsx`);
  }

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500">
        Carregando vendas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] p-6 text-white shadow-lg md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-red-100">
            Comercial
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">Vendas</h2>
          <p className="mt-2 max-w-2xl text-sm text-red-50">
            Acompanhe os resultados comerciais e visualize os projetos com vendas registradas.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportXlsx}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[var(--brand-dark)] shadow-sm transition hover:-translate-y-0.5 hover:bg-red-50"
          >
            Exportar XLSX
          </button>

          <Link
            to="/vendas/nova"
            className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-white/20"
          >
            Nova venda
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por projeto ou status"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-red-300 focus:bg-white lg:max-w-sm"
          />

          <div className="flex flex-wrap gap-2">
            {[
              { key: "TODOS", label: "Todos" },
              { key: "COM_VENDAS", label: "Com vendas" },
              { key: "SEM_VENDAS", label: "Sem vendas" },
              { key: "ATIVOS", label: "Ativos" },
              { key: "INATIVOS", label: "Inativos" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key as SalesFilter)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  filter === item.key
                    ? "bg-[var(--brand)] text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-sm font-medium text-slate-500">Total de vendas</p>
          <strong className="mt-3 block text-2xl font-bold tracking-tight text-slate-900">
            {totalSales}
          </strong>
          <p className="mt-2 text-xs text-slate-400">registros concluídos</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-sm font-medium text-slate-500">Faturamento total</p>
          <strong className="mt-3 block text-2xl font-bold tracking-tight text-slate-900">
            {formatMoney(totalRevenue)}
          </strong>
          <p className="mt-2 text-xs text-slate-400">resultado acumulado</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-sm font-medium text-slate-500">Projetos vendidos</p>
          <strong className="mt-3 block text-2xl font-bold tracking-tight text-slate-900">
            {soldProjects.length}
          </strong>
          <p className="mt-2 text-xs text-slate-400">com pelo menos 1 venda</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-sm font-medium text-slate-500">Vendas este mês</p>
          <strong className="mt-3 block text-2xl font-bold tracking-tight text-slate-900">
            {currentMonthSales}
          </strong>
          <p className="mt-2 text-xs text-slate-400">movimentações recentes</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold">Projetos com vendas</h3>
            <p className="text-sm text-slate-500">
              Clique em ver detalhes para visualizar o histórico completo.
            </p>
          </div>

          <table className="w-full table-fixed text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Projeto</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-left font-semibold">Vendas</th>
                <th className="px-6 py-4 text-left font-semibold">Faturamento</th>
                <th className="px-6 py-4 text-left font-semibold">Ticket médio</th>
                <th className="px-6 py-4 text-left font-semibold">Ações</th>
              </tr>
            </thead>

            <tbody>
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="border-t border-slate-100 transition hover:bg-red-50/40"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {project.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          Projeto comercial
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                          project.status
                        )}`}
                      >
                        {project.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {project.salesCount}
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {formatMoney(project.revenue)}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {formatMoney(project.averageTicket)}
                    </td>

                    <td className="px-6 py-4">
                      <Link
                        to={`/vendas/projeto/${project.id}`}
                        className="font-medium text-[var(--brand-dark)] underline underline-offset-4"
                      >
                        Ver detalhes
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    Nenhum projeto encontrado para esse filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Resumo comercial</h3>
            <p className="mt-1 text-sm text-slate-500">
              Visão rápida do desempenho recente.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-[var(--brand-soft-2)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                Melhor projeto
              </p>
              <strong className="mt-2 block text-base text-slate-900">
                {bestProject?.name || "Nenhum"}
              </strong>
              <p className="mt-1 text-sm text-slate-500">
                {bestProject ? formatMoney(bestProject.revenue) : "R$ 0,00"} em vendas
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Ticket médio geral
              </p>
              <strong className="mt-2 block text-base text-slate-900">
                {formatMoney(averageTicket)}
              </strong>
              <p className="mt-1 text-sm text-slate-500">
                Média por venda registrada
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Projetos com vendas
              </p>
              <strong className="mt-2 block text-base text-slate-900">
                {soldProjects.length}
              </strong>
              <p className="mt-1 text-sm text-slate-500">
                Com movimentação registrada
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Última movimentação
              </p>
              <strong className="mt-2 block text-base text-slate-900">
                {latestSaleInfo ? formatDate(latestSaleInfo.sale_date) : "-"}
              </strong>
              <p className="mt-1 text-sm text-slate-500">
                {latestSaleInfo?.projectName || "Nenhuma venda registrada"}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}