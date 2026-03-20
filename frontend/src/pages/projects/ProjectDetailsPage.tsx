import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  deactivateProject,
  deleteProject,
  getProjectById,
  getProjectPdfDownloadUrl,
} from "../../lib/api";

type ProjectQuota = {
  id: string;
  name: string;
  description: string | null;
  quota_type: string;
  unit_price: string | number;
  quantity_total: number;
  quantity_sold: number;
  quantity_available: number;
};

type ProjectSale = {
  id: string;
  sale_date: string;
  advertiser_name?: string;
  executive_name?: string;
  quota_name?: string;
  quantity?: number;
  original_unit_price?: string | number;
  discount_percentage?: string | number;
  final_unit_price?: string | number;
  final_total_price?: string | number;
};

type ProjectDetails = {
  id: string;
  name: string;
  type: string;
  status: string;
  expires_at: string | null;
  has_no_expiration: boolean;
  created_at: string;
  updated_at: string;
  description: string | null;
  cover_image_url?: string | null;
  cover_image_name?: string | null;
  pdf_name: string | null;
  pdf_url: string | null;
  quotas: ProjectQuota[];
  sales: ProjectSale[];
};

function formatDate(value?: string | null) {
  if (!value) return "Sem validade";
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatMoney(value?: string | number | null) {
  const numeric = Number(value || 0);
  return numeric.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatType(type: string) {
  if (type === "ESPECIAL_COM_DATA") return "Especial com data";
  if (type === "ESPECIFICO_PARA_MARCA") return "Específico para marca";
  if (type === "ATEMPORAL") return "Atemporal";
  if (type === "EVENTO") return "Evento";
  return type;
}

function statusBadge(status: string) {
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

function sanitizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

export function ProjectDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [deactivating, setDeactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadProject() {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getProjectById(id);
      setProject(data);
    } catch (error) {
      console.error("Erro ao buscar projeto:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate() {
    if (!id) return;

    const confirmed = window.confirm(
      "Tem certeza que deseja desativar este projeto?"
    );

    if (!confirmed) return;

    try {
      setDeactivating(true);
      await deactivateProject(id);
      await loadProject();
    } catch (error) {
      console.error("Erro ao desativar projeto:", error);
      alert("Não foi possível desativar o projeto.");
    } finally {
      setDeactivating(false);
    }
  }

  async function handleDelete() {
    if (!id) return;

    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este projeto? Essa ação não poderá ser desfeita."
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      await deleteProject(id);
      navigate("/projetos");
    } catch (error) {
      console.error("Erro ao excluir projeto:", error);
      alert("Não foi possível excluir o projeto.");
    } finally {
      setDeleting(false);
    }
  }

  function handleRegisterSale() {
    if (!project?.id) return;
    navigate(`/vendas/nova?projectId=${project.id}`);
  }

  function handleExportSales() {
    if (!project) return;

    if (!project.sales.length) {
      alert("Não há vendas para exportar neste projeto.");
      return;
    }

    const data = project.sales.map((sale) => ({
      Data: formatDate(sale.sale_date),
      Anunciante: sale.advertiser_name || "",
      Executivo: sale.executive_name || "",
      Cota: sale.quota_name || "",
      Quantidade: Number(sale.quantity || 0),
      "Valor Original": Number(sale.original_unit_price || 0),
      "Desconto (%)": Number(sale.discount_percentage || 0),
      "Valor Final": Number(sale.final_total_price || 0),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    worksheet["!cols"] = [
      { wch: 14 },
      { wch: 28 },
      { wch: 24 },
      { wch: 24 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas");

    const safeProjectName = sanitizeFileName(project.name);
    XLSX.writeFile(workbook, `vendas_${safeProjectName}.xlsx`);
  }

  useEffect(() => {
    loadProject();
  }, [id]);

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500">
        Carregando detalhes do projeto...
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
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[320px_1fr]">
          <div className="border-b border-slate-100 bg-slate-50 lg:border-b-0 lg:border-r lg:border-slate-100">
            <div className="flex h-full min-h-[320px] items-center justify-center p-8">
              {project.cover_image_url ? (
                <img
                  src={project.cover_image_url}
                  alt={project.name}
                  className="h-[260px] w-[180px] rounded-[24px] object-cover shadow-xl ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex h-[260px] w-[180px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white text-center text-sm text-slate-400">
                  Sem capa
                </div>
              )}
            </div>
          </div>

          <div className="p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-red-400">
                  Projeto
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {project.name}
                </h2>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(
                      project.status
                    )}`}
                  >
                    {project.status}
                  </span>

                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    {formatType(project.type)}
                  </span>

                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    Validade: {formatDate(project.expires_at)}
                  </span>
                </div>

                <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">
                  {project.description || "Sem descrição cadastrada."}
                </p>
              </div>

              <div className="w-full xl:w-[280px]">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Visão geral
                  </p>

                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Status</span>
                      <strong className="text-slate-900">{project.status}</strong>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Tipo</span>
                      <strong className="text-right text-slate-900">
                        {formatType(project.type)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Validade</span>
                      <strong className="text-right text-slate-900">
                        {formatDate(project.expires_at)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Criado em</span>
                      <strong className="text-slate-900">
                        {formatDate(project.created_at)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
              <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Editar
              </button>

              <button
                onClick={handleDeactivate}
                disabled={deactivating || project.status === "INATIVO"}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
              >
                {deactivating ? "Desativando..." : "Desativar projeto"}
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-2xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              >
                {deleting ? "Excluindo..." : "Excluir projeto"}
              </button>

              <button
                onClick={handleExportSales}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand-dark)]"
              >
                Exportar vendas
              </button>

              <button
                onClick={handleRegisterSale}
                className="rounded-2xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
              >
                Registrar venda
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Status</p>
          <strong className="mt-2 block text-xl text-slate-900">
            {project.status}
          </strong>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Tipo</p>
          <strong className="mt-2 block text-xl text-slate-900">
            {formatType(project.type)}
          </strong>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Validade</p>
          <strong className="mt-2 block text-xl text-slate-900">
            {formatDate(project.expires_at)}
          </strong>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Sem validade</p>
          <strong className="mt-2 block text-xl text-slate-900">
            {project.has_no_expiration ? "Sim" : "Não"}
          </strong>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Informações adicionais
          </h3>

          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span>Data de criação</span>
              <strong className="text-slate-900">
                {formatDate(project.created_at)}
              </strong>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span>Última atualização</span>
              <strong className="text-slate-900">
                {formatDate(project.updated_at)}
              </strong>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span>Total de cotas</span>
              <strong className="text-slate-900">{project.quotas.length}</strong>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span>Total de vendas</span>
              <strong className="text-slate-900">{project.sales.length}</strong>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              PDF comercial
            </h3>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                project.pdf_url
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {project.pdf_url ? "Disponível" : "Não anexado"}
            </span>
          </div>

          <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-800">
              {project.pdf_name || "Nenhum arquivo cadastrado"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Material comercial vinculado ao projeto.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {project.pdf_url ? (
              <a
                href={getProjectPdfDownloadUrl(project.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand-dark)]"
              >
                Baixar PDF
              </a>
            ) : (
              <button
                disabled
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-400 opacity-70"
              >
                Sem PDF
              </button>
            )}

            <button className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Substituir PDF
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">
            Cotas do projeto
          </h3>

          <button className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-slate-50">
            Adicionar cota
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Cota</th>
                <th className="px-4 py-3 text-left">Descrição</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Valor</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-left">Vendidas</th>
                <th className="px-4 py-3 text-left">Disponíveis</th>
              </tr>
            </thead>

            <tbody>
              {project.quotas.length > 0 ? (
                project.quotas.map((quota) => (
                  <tr
                    key={quota.id}
                    className="border-t border-slate-100 transition hover:bg-red-50/30"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {quota.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {quota.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {quota.quota_type}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatMoney(quota.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {quota.quantity_total}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {quota.quantity_sold}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {quota.quantity_available}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Nenhuma cota cadastrada para este projeto.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">
            Histórico de vendas
          </h3>

          <button
            onClick={handleExportSales}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand-dark)]"
          >
            Exportar vendas do projeto
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Anunciante</th>
                <th className="px-4 py-3 text-left">Executivo</th>
                <th className="px-4 py-3 text-left">Cota</th>
                <th className="px-4 py-3 text-left">Quantidade</th>
                <th className="px-4 py-3 text-left">Valor original</th>
                <th className="px-4 py-3 text-left">Desconto</th>
                <th className="px-4 py-3 text-left">Valor final</th>
              </tr>
            </thead>

            <tbody>
              {project.sales.length > 0 ? (
                project.sales.map((sale, index) => (
                  <tr
                    key={`${sale.id}-${index}`}
                    className="border-t border-slate-100 transition hover:bg-red-50/30"
                  >
                    <td className="px-4 py-3">{formatDate(sale.sale_date)}</td>
                    <td className="px-4 py-3">
                      {sale.advertiser_name || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {sale.executive_name || "-"}
                    </td>
                    <td className="px-4 py-3">{sale.quota_name || "-"}</td>
                    <td className="px-4 py-3">{sale.quantity || 0}</td>
                    <td className="px-4 py-3">
                      {formatMoney(sale.original_unit_price)}
                    </td>
                    <td className="px-4 py-3">
                      {sale.discount_percentage || 0}%
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatMoney(sale.final_total_price)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Nenhuma venda registrada para este projeto.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}