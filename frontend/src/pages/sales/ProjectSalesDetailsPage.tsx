import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getProjectById } from "../../lib/api";

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

type ProjectDetails = {
  id: string;
  name: string;
  status: string;
  type: string;
  description: string | null;
  sales: ProjectSale[];
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatMoney(value?: string | number | null) {
  const numeric = Number(value || 0);
  return numeric.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function ProjectSalesDetailsPage() {
  const { id } = useParams();

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProject() {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getProjectById(id);
      setProject(data);
    } catch (error) {
      console.error("Erro ao carregar detalhes de vendas do projeto:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProject();
  }, [id]);

  const totalSales = useMemo(() => {
    return project?.sales?.length || 0;
  }, [project]);

  const totalRevenue = useMemo(() => {
    return (
      project?.sales?.reduce((acc, sale) => {
        return acc + Number(sale.final_total_price || 0);
      }, 0) || 0
    );
  }, [project]);

  const totalQuotasSold = useMemo(() => {
    return (
      project?.sales?.reduce((acc, sale) => {
        return acc + Number(sale.quantity || 0);
      }, 0) || 0
    );
  }, [project]);

  const averageTicket = useMemo(() => {
    if (!totalSales) return 0;
    return totalRevenue / totalSales;
  }, [totalRevenue, totalSales]);

  const cards = [
    { title: "Total de vendas", value: String(totalSales) },
    { title: "Faturamento do projeto", value: formatMoney(totalRevenue) },
    { title: "Cotas vendidas", value: String(totalQuotasSold) },
    { title: "Ticket médio", value: formatMoney(averageTicket) },
  ];

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500">
        Carregando detalhes de vendas...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-10 text-center text-slate-500">
        Projeto não encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-red-400">
            Detalhes de vendas
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">
            {project.name}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Histórico completo de vendas deste projeto.
          </p>
        </div>

        <button className="rounded-2xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-dark)]">
          Exportar vendas do projeto
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{card.title}</p>
            <strong className="mt-3 block text-2xl font-bold tracking-tight text-slate-900">
              {card.value}
            </strong>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold">Histórico de vendas</h3>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">Data</th>
              <th className="px-6 py-4 text-left font-semibold">Anunciante</th>
              <th className="px-6 py-4 text-left font-semibold">Executivo</th>
              <th className="px-6 py-4 text-left font-semibold">Cota</th>
              <th className="px-6 py-4 text-left font-semibold">Qtd</th>
              <th className="px-6 py-4 text-left font-semibold">Desconto</th>
              <th className="px-6 py-4 text-left font-semibold">Valor final</th>
            </tr>
          </thead>

          <tbody>
            {project.sales && project.sales.length > 0 ? (
              project.sales.map((sale, index) => (
                <tr
                  key={`${sale.id}-${index}`}
                  className="border-t border-slate-100 hover:bg-red-50/40"
                >
                  <td className="px-6 py-4">{formatDate(sale.sale_date)}</td>
                  <td className="px-6 py-4">{sale.advertiser_name || "-"}</td>
                  <td className="px-6 py-4">{sale.executive_name || "-"}</td>
                  <td className="px-6 py-4">{sale.quota_name || "-"}</td>
                  <td className="px-6 py-4">{sale.quantity || 0}</td>
                  <td className="px-6 py-4">
                    {Number(sale.discount_percentage || 0)}%
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {formatMoney(sale.final_total_price)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  Nenhuma venda registrada para este projeto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}