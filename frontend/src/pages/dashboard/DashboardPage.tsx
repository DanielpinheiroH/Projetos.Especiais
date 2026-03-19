import { useEffect, useMemo, useState } from "react";
import { getProjectById, getProjects } from "../../lib/api";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ProjectSale = {
  id: string;
  sale_date: string;
  executive_name?: string;
  final_total_price?: string | number;
};

type ProjectQuota = {
  id: string;
  quantity_sold: number;
};

type ProjectItem = {
  id: string;
  name: string;
  status: string;
  expires_at?: string | null;
  quotas?: ProjectQuota[];
  sales?: ProjectSale[];
};

type MonthlyRevenueItem = {
  monthKey: string;
  monthLabel: string;
  revenue: number;
  salesCount: number;
};

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function getMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
}

function formatAxisMoney(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return `R$ ${value}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    value?: number;
    dataKey?: string;
    payload?: MonthlyRevenueItem;
  }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <div className="mt-2 space-y-1 text-sm text-slate-600">
        <p>
          Faturamento: <strong>{formatMoney(row.revenue)}</strong>
        </p>
        <p>
          Vendas: <strong>{row.salesCount}</strong>
        </p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("6");
  const [selectedMonth, setSelectedMonth] = useState("all");

  async function loadDashboardData() {
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
              expires_at: details.expires_at || null,
              quotas: details.quotas || [],
              sales: details.sales || [],
            };
          } catch (error) {
            console.error(`Erro ao carregar projeto ${project.id}:`, error);

            return {
              id: String(project.id),
              name: String(project.name),
              status: String(project.status || ""),
              expires_at: project.expires_at || null,
              quotas: [],
              sales: [],
            };
          }
        })
      );

      setProjects(detailedProjects);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const allSales = useMemo(() => {
    return projects.flatMap((project) =>
      (project.sales || []).map((sale) => ({
        ...sale,
        project_name: project.name,
      }))
    );
  }, [projects]);

  const totalProjects = useMemo(() => projects.length, [projects]);

  const activeProjects = useMemo(() => {
    return projects.filter(
      (project) =>
        project.status === "ATIVO" || project.status === "ATEMPORAL"
    ).length;
  }, [projects]);

  const expiredProjects = useMemo(() => {
    const today = new Date();

    return projects.filter((project) => {
      if (!project.expires_at) return false;
      const expiry = new Date(project.expires_at);
      return expiry < today;
    }).length;
  }, [projects]);

  const soldQuotas = useMemo(() => {
    return projects.reduce((acc, project) => {
      const totalProjectSold =
        project.quotas?.reduce(
          (sum, quota) => sum + Number(quota.quantity_sold || 0),
          0
        ) || 0;

      return acc + totalProjectSold;
    }, 0);
  }, [projects]);

  const totalRevenue = useMemo(() => {
    return allSales.reduce(
      (sum, sale) => sum + Number(sale.final_total_price || 0),
      0
    );
  }, [allSales]);

  const monthlyRevenue = useMemo<MonthlyRevenueItem[]>(() => {
    const grouped = new Map<string, MonthlyRevenueItem>();

    allSales.forEach((sale) => {
      if (!sale.sale_date) return;

      const date = new Date(sale.sale_date);
      if (Number.isNaN(date.getTime())) return;

      const key = getMonthKey(date);
      const current = grouped.get(key);

      if (current) {
        current.revenue += Number(sale.final_total_price || 0);
        current.salesCount += 1;
      } else {
        grouped.set(key, {
          monthKey: key,
          monthLabel: getMonthLabel(date),
          revenue: Number(sale.final_total_price || 0),
          salesCount: 1,
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey)
    );
  }, [allSales]);

  const periodFilteredMonths = useMemo(() => {
    const months = Number(selectedPeriod || 6);
    return monthlyRevenue.slice(-months);
  }, [monthlyRevenue, selectedPeriod]);

  const availableMonths = useMemo(
    () => periodFilteredMonths,
    [periodFilteredMonths]
  );

  const chartData = useMemo(() => {
    return periodFilteredMonths;
  }, [periodFilteredMonths]);

  const selectedMonthProjects = useMemo(() => {
    const grouped = new Map<string, number>();

    allSales.forEach((sale) => {
      if (!sale.sale_date) return;

      const saleDate = new Date(sale.sale_date);
      const saleMonthKey = getMonthKey(saleDate);

      if (selectedMonth !== "all" && saleMonthKey !== selectedMonth) return;
      if (!periodFilteredMonths.some((m) => m.monthKey === saleMonthKey)) {
        return;
      }

      const projectName = String((sale as any).project_name || "Sem projeto");
      const revenue = Number(sale.final_total_price || 0);

      grouped.set(projectName, (grouped.get(projectName) || 0) + revenue);
    });

    return Array.from(grouped.entries())
      .map(([projectName, revenue]) => ({
        projectName,
        revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [allSales, selectedMonth, periodFilteredMonths]);

  const ranking = useMemo(() => {
    const executiveMap = new Map<
      string,
      { name: string; revenue: number; projects: Set<string> }
    >();

    allSales.forEach((sale) => {
      const executive = String(sale.executive_name || "").trim();
      const revenue = Number(sale.final_total_price || 0);
      const projectName = String((sale as any).project_name || "").trim();

      if (!executive) return;

      if (!executiveMap.has(executive)) {
        executiveMap.set(executive, {
          name: executive,
          revenue: 0,
          projects: new Set<string>(),
        });
      }

      const current = executiveMap.get(executive)!;
      current.revenue += revenue;

      if (projectName) {
        current.projects.add(projectName);
      }
    });

    return Array.from(executiveMap.values())
      .map((item) => ({
        name: item.name,
        revenue: item.revenue,
        projects: Array.from(item.projects),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [allSales]);

  const periodSales = useMemo(() => {
    const validMonthKeys = new Set(periodFilteredMonths.map((m) => m.monthKey));

    return allSales.filter((sale) => {
      if (!sale.sale_date) return false;
      return validMonthKeys.has(getMonthKey(new Date(sale.sale_date)));
    });
  }, [allSales, periodFilteredMonths]);

  const periodRevenue = useMemo(() => {
    return periodSales.reduce(
      (sum, sale) => sum + Number(sale.final_total_price || 0),
      0
    );
  }, [periodSales]);

  const periodSalesCount = useMemo(() => periodSales.length, [periodSales]);

  const periodAverageTicket = useMemo(() => {
    if (!periodSalesCount) return 0;
    return periodRevenue / periodSalesCount;
  }, [periodRevenue, periodSalesCount]);

  const cards = [
    { title: "Total de projetos", value: String(totalProjects) },
    { title: "Projetos ativos", value: String(activeProjects) },
    { title: "Projetos expirados", value: String(expiredProjects) },
    { title: "Cotas vendidas", value: String(soldQuotas) },
    { title: "Faturamento total", value: formatMoney(totalRevenue) },
  ];

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500">
        Carregando dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] p-8 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-red-100">
          Painel comercial
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight">
          Dashboard de Projetos Especiais
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-red-50">
          Acompanhe os projetos ativos, desempenho comercial, cotas vendidas e
          faturamento em um só lugar.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-slate-500">{card.title}</p>
            <strong className="mt-3 block text-2xl font-bold tracking-tight text-slate-900">
              {card.value}
            </strong>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Faturamento do período
          </p>
          <strong className="mt-3 block text-2xl font-bold tracking-tight text-slate-900">
            {formatMoney(periodRevenue)}
          </strong>
          <p className="mt-2 text-xs text-slate-400">
            Considerando{" "}
            {selectedPeriod === "3"
              ? "3 meses"
              : selectedPeriod === "6"
              ? "6 meses"
              : "12 meses"}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Vendas no período</p>
          <strong className="mt-3 block text-2xl font-bold tracking-tight text-slate-900">
            {periodSalesCount}
          </strong>
          <p className="mt-2 text-xs text-slate-400">
            Registros no intervalo selecionado
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Ticket médio do período
          </p>
          <strong className="mt-3 block text-2xl font-bold tracking-tight text-slate-900">
            {formatMoney(periodAverageTicket)}
          </strong>
          <p className="mt-2 text-xs text-slate-400">
            Média por venda no período
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Faturamento mensal</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Visualize a evolução do faturamento por mês.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <select
                  value={selectedPeriod}
                  onChange={(e) => {
                    setSelectedPeriod(e.target.value);
                    setSelectedMonth("all");
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
                >
                  <option value="3">Últimos 3 meses</option>
                  <option value="6">Últimos 6 meses</option>
                  <option value="12">Últimos 12 meses</option>
                </select>

                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
                >
                  <option value="all">Todos os meses do período</option>
                  {availableMonths.map((month) => (
                    <option key={month.monthKey} value={month.monthKey}>
                      {month.monthLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-[360px] rounded-2xl bg-slate-50/60 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />

                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      yAxisId="left"
                      tickFormatter={formatAxisMoney}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      width={72}
                    />

                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />

                    <Tooltip content={<CustomTooltip />} />

                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      radius={[12, 12, 0, 0]}
                      maxBarSize={48}
                    >
                      {chartData.map((entry) => {
                        const isSelected =
                          selectedMonth !== "all" &&
                          entry.monthKey === selectedMonth;

                        return (
                          <Cell
                            key={entry.monthKey}
                            fill={isSelected ? "#991b1b" : "#dc2626"}
                          />
                        );
                      })}
                    </Bar>

                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="salesCount"
                      stroke="#0f172a"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#0f172a" }}
                      activeDot={{ r: 6, fill: "#0f172a" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[340px] items-center justify-center rounded-2xl border border-dashed border-red-100 bg-[var(--brand-soft-2)] text-red-400">
                Nenhuma venda registrada ainda
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h3 className="text-lg font-semibold">Faturamento por projeto</h3>
              <p className="mt-1 text-sm text-slate-500">
                {selectedMonth === "all"
                  ? "Resultado dos projetos no período selecionado."
                  : "Resultado dos projetos no mês selecionado."}
              </p>
            </div>

            {selectedMonthProjects.length > 0 ? (
              <div className="space-y-4">
                {selectedMonthProjects.map((item) => {
                  const maxRevenue = Math.max(
                    ...selectedMonthProjects.map((p) => p.revenue),
                    1
                  );
                  const width = Math.max(8, (item.revenue / maxRevenue) * 100);

                  return (
                    <div key={item.projectName} className="space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-medium text-slate-700">
                          {item.projectName}
                        </span>
                        <span className="text-sm text-slate-500">
                          {formatMoney(item.revenue)}
                        </span>
                      </div>

                      <div className="h-3 rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full bg-[var(--brand)] transition-all"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Nenhum faturamento encontrado para esse filtro.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Ranking comercial</h3>
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-600">
              Atualizado
            </span>
          </div>

          <div className="space-y-3">
            {ranking.length > 0 ? (
              ranking.map((item, index) => (
                <div
                  key={item.name}
                  className="rounded-2xl bg-slate-50 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-sm font-semibold text-white">
                        {index + 1}
                      </div>

                      <div>
                        <p className="font-medium text-slate-700">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.projects.length} projeto(s) vendido(s)
                        </p>
                      </div>
                    </div>

                    <span className="text-sm font-semibold text-slate-700">
                      {formatMoney(item.revenue)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.projects.map((project) => (
                      <span
                        key={project}
                        className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200"
                      >
                        {project}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Nenhuma venda registrada ainda.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}