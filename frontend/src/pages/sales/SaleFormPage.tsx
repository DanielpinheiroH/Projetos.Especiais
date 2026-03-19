import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  createSale,
  getProjectById,
  getProjects,
} from "../../lib/api";

type ProjectOption = {
  id: string;
  name: string;
  status: string;
};

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

type ProjectDetails = {
  id: string;
  name: string;
  quotas: ProjectQuota[];
};

type SaleItem = {
  id: number;
  quotaId: string;
  quantity: string;
  originalUnitPrice: string;
  discountPercentage: string;
};

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function calculateFinalUnitPrice(
  originalUnitPrice: number,
  discountPercentage: number
) {
  const discountFactor = Math.max(0, 100 - discountPercentage) / 100;
  return originalUnitPrice * discountFactor;
}

export function SaleFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const projectIdFromUrl = searchParams.get("projectId");

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProjectName, setSelectedProjectName] = useState("");
  const [projectQuotas, setProjectQuotas] = useState<ProjectQuota[]>([]);

  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [advertiserName, setAdvertiserName] = useState("");
  const [executiveName, setExecutiveName] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<SaleItem[]>([
    {
      id: Date.now(),
      quotaId: "",
      quantity: "1",
      originalUnitPrice: "",
      discountPercentage: "0",
    },
  ]);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingQuotas, setLoadingQuotas] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadProjects() {
    try {
      setLoadingProjects(true);
      const data = await getProjects();

      const normalized = (data || []).map((project: any) => ({
        id: String(project.id),
        name: String(project.name),
        status: String(project.status || ""),
      }));

      setProjects(normalized);
    } catch (error) {
      console.error("Erro ao carregar projetos:", error);
    } finally {
      setLoadingProjects(false);
    }
  }

  async function loadProjectDetails(projectId: string) {
    if (!projectId) {
      setProjectQuotas([]);
      setSelectedProjectName("");
      return;
    }

    try {
      setLoadingQuotas(true);
      const data: ProjectDetails & { name: string } = await getProjectById(projectId);

      setSelectedProjectName(data.name || "");
      setProjectQuotas(data.quotas || []);
    } catch (error) {
      console.error("Erro ao carregar cotas do projeto:", error);
      setProjectQuotas([]);
      setSelectedProjectName("");
    } finally {
      setLoadingQuotas(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (projectIdFromUrl) {
      setSelectedProjectId(projectIdFromUrl);
    }
  }, [projectIdFromUrl]);

  useEffect(() => {
    loadProjectDetails(selectedProjectId);
  }, [selectedProjectId]);

  function handleAddItem() {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        quotaId: "",
        quantity: "1",
        originalUnitPrice: "",
        discountPercentage: "0",
      },
    ]);
  }

  function handleRemoveItem(itemId: number) {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  function handleItemChange(
    itemId: number,
    field: keyof Omit<SaleItem, "id">,
    value: string
  ) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        const updated = { ...item, [field]: value };

        if (field === "quotaId") {
          const selectedQuota = projectQuotas.find((q) => q.id === value);
          if (selectedQuota) {
            updated.originalUnitPrice = String(selectedQuota.unit_price || 0);
          }
        }

        return updated;
      })
    );
  }

  const computedItems = useMemo(() => {
    return items.map((item) => {
      const quantity = Number(item.quantity || 0);
      const originalUnitPrice = Number(item.originalUnitPrice || 0);
      const discountPercentage = Number(item.discountPercentage || 0);

      const finalUnitPrice = calculateFinalUnitPrice(
        originalUnitPrice,
        discountPercentage
      );

      const finalTotalPrice = finalUnitPrice * quantity;

      const quota = projectQuotas.find((q) => q.id === item.quotaId);

      return {
        ...item,
        quota,
        quantity,
        originalUnitPrice,
        discountPercentage,
        finalUnitPrice,
        finalTotalPrice,
      };
    });
  }, [items, projectQuotas]);

  const subtotal = useMemo(() => {
    return computedItems.reduce(
      (acc, item) => acc + item.originalUnitPrice * item.quantity,
      0
    );
  }, [computedItems]);

  const totalFinal = useMemo(() => {
    return computedItems.reduce((acc, item) => acc + item.finalTotalPrice, 0);
  }, [computedItems]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedProjectId) {
      alert("Selecione um projeto.");
      return;
    }

    if (!saleDate) {
      alert("Informe a data da venda.");
      return;
    }

    if (!advertiserName.trim()) {
      alert("Informe o anunciante.");
      return;
    }

    if (!executiveName.trim()) {
      alert("Informe o executivo.");
      return;
    }

    const validItems = computedItems.filter(
      (item) => item.quotaId && item.quantity > 0
    );

    if (validItems.length === 0) {
      alert("Adicione pelo menos um item válido à venda.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        projectId: selectedProjectId,
        saleDate,
        advertiserName,
        executiveName,
        notes,
        items: validItems.map((item) => ({
          quotaId: item.quotaId,
          quantity: item.quantity,
          originalUnitPrice: item.originalUnitPrice,
          discountPercentage: item.discountPercentage,
          finalUnitPrice: item.finalUnitPrice,
          finalTotalPrice: item.finalTotalPrice,
        })),
      };

      await createSale(payload);
      alert("Venda registrada com sucesso.");
      navigate(`/vendas/projeto/${selectedProjectId}`);
    } catch (error) {
      console.error("Erro ao salvar venda:", error);
      alert("Não foi possível salvar a venda.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] p-8 text-white shadow-lg">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-red-100">
          Comercial
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">
          Registrar venda
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-red-50">
          Registre a venda de uma ou mais cotas do projeto, defina descontos e
          acompanhe o valor final da operação.
        </p>
      </section>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="text-lg font-semibold text-slate-900">
                  Informações da venda
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Preencha os dados principais da operação comercial.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Projeto
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-red-300 focus:bg-white"
                    disabled={loadingProjects}
                  >
                    <option value="">
                      {loadingProjects
                        ? "Carregando projetos..."
                        : "Selecione um projeto"}
                    </option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Data da venda
                  </label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-red-300 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Anunciante
                  </label>
                  <input
                    value={advertiserName}
                    onChange={(e) => setAdvertiserName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-red-300 focus:bg-white"
                    placeholder="Nome do anunciante"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Executivo
                  </label>
                  <input
                    value={executiveName}
                    onChange={(e) => setExecutiveName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-red-300 focus:bg-white"
                    placeholder="Nome do executivo"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Observações
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-red-300 focus:bg-white"
                    placeholder="Adicione observações relevantes sobre esta venda..."
                  />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Itens da venda
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Adicione uma ou mais cotas relacionadas à venda.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand-dark)]"
                >
                  Adicionar item
                </button>
              </div>

              <div className="space-y-4">
                {computedItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-800">
                        Item {index + 1}
                      </h4>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-5">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Cota
                        </label>
                        <select
                          value={item.quotaId}
                          onChange={(e) =>
                            handleItemChange(item.id, "quotaId", e.target.value)
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-red-300"
                          disabled={!selectedProjectId || loadingQuotas}
                        >
                          <option value="">
                            {loadingQuotas ? "Carregando..." : "Selecionar"}
                          </option>
                          {projectQuotas.map((quota) => (
                            <option key={quota.id} value={quota.id}>
                              {quota.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Quantidade
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(item.id, "quantity", e.target.value)
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-red-300"
                          placeholder="Qtd"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Valor original
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.originalUnitPrice}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "originalUnitPrice",
                              e.target.value
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-red-300"
                          placeholder="0,00"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Desconto %
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={item.discountPercentage}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "discountPercentage",
                              e.target.value
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-red-300"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Valor final
                        </label>
                        <input
                          type="text"
                          value={formatMoney(item.finalTotalPrice)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-3 py-3 outline-none"
                          readOnly
                        />
                      </div>
                    </div>

                    {item.quota && (
                      <div className="mt-4 rounded-2xl border border-dashed border-red-200 bg-white p-4 text-sm text-slate-500">
                        Disponível: {item.quota.quantity_available} unidade(s)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Resumo da venda
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Acompanhe os totais antes de concluir o registro.
              </p>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">Projeto</span>
                  <strong className="text-slate-800">
                    {selectedProjectName || "Não selecionado"}
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">Itens</span>
                  <strong className="text-slate-800">
                    {computedItems.filter((item) => item.quotaId).length} item(ns)
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">Subtotal</span>
                  <strong className="text-slate-800">
                    {formatMoney(subtotal)}
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-[var(--brand-soft-2)] px-4 py-3">
                  <span className="font-medium text-slate-700">Total final</span>
                  <strong className="text-[var(--brand-dark)]">
                    {formatMoney(totalFinal)}
                  </strong>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Orientações
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Antes de salvar, confira se as cotas e valores estão corretos.
              </p>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  Verifique se o projeto selecionado está ativo.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  Confirme os descontos aplicados antes de concluir.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  O valor final deve refletir corretamente a negociação.
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Finalizar registro
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Salve a venda para atualizar o histórico e os indicadores comerciais.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/vendas")}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--brand-dark)] disabled:opacity-70"
            >
              {saving ? "Salvando..." : "Salvar venda"}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}