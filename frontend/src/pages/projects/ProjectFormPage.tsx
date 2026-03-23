import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject, uploadProjectFile } from "../../lib/api";

type Quota = {
  id: number;
  name: string;
  description: string;
  type: string;
  unitPrice: string;
  quantity: string;
};

export function ProjectFormPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [type, setType] = useState("ATEMPORAL");
  const [expiresAt, setExpiresAt] = useState("");
  const [description, setDescription] = useState("");
  const [hasNoExpiration, setHasNoExpiration] = useState(false);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverImageName, setCoverImageName] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);

  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [saving, setSaving] = useState(false);

  function handleAddQuota() {
    setQuotas((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: "",
        description: "",
        type: "",
        unitPrice: "",
        quantity: "",
      },
    ]);
  }

  function handleRemoveQuota(id: number) {
    setQuotas((prev) => prev.filter((quota) => quota.id !== id));
  }

  function handleQuotaChange(
    id: number,
    field: keyof Omit<Quota, "id">,
    value: string
  ) {
    setQuotas((prev) =>
      prev.map((quota) =>
        quota.id === id ? { ...quota, [field]: value } : quota
      )
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);

      let uploadedCoverUrl: string | null = null;
      let uploadedCoverName: string | null = coverImageName;
      let uploadedPdfUrl: string | null = null;
      let uploadedPdfName: string | null = pdfName;

      if (coverFile) {
        const uploadedCover = await uploadProjectFile(coverFile, "cover");
        uploadedCoverUrl = uploadedCover.url;
        uploadedCoverName = uploadedCover.fileName;
      }

      if (pdfFile) {
        const uploadedPdf = await uploadProjectFile(pdfFile, "pdf");
        uploadedPdfUrl = uploadedPdf.url;
        uploadedPdfName = uploadedPdf.fileName;
      }

      const payload = {
        name,
        type,
        description,
        expiresAt: hasNoExpiration ? null : expiresAt || null,
        hasNoExpiration,
        status: hasNoExpiration || type === "ATEMPORAL" ? "ATEMPORAL" : "ATIVO",
        coverImageUrl: uploadedCoverUrl,
        coverImageName: uploadedCoverName,
        pdfUrl: uploadedPdfUrl,
        pdfName: uploadedPdfName,
        quotas: quotas.map((quota) => ({
          name: quota.name,
          description: quota.description,
          type: quota.type,
          unitPrice: Number(quota.unitPrice || 0),
          quantity: Number(quota.quantity || 0),
        })),
      };

      await createProject(payload);
      navigate("/projetos");
    } catch (error) {
      console.error("Erro ao salvar projeto:", error);

      let message = "Erro ao salvar projeto.";

      if (error instanceof Error) {
        message = error.message;
      }

      try {
        const parsed = JSON.parse(message);
        if (parsed?.message) {
          message = parsed.message;
        }
      } catch {
        // mantém a mensagem original
      }

      alert(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] p-8 text-white shadow-lg">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-red-100">
          Cadastro
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">Novo projeto</h2>
        <p className="mt-2 max-w-2xl text-sm text-red-50">
          Cadastre um novo projeto especial, defina suas informações principais,
          anexe a imagem de capa para exibição nos cards e envie o PDF comercial.
        </p>
      </section>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="text-lg font-semibold text-slate-900">
                  Informações principais
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Preencha os dados básicos do projeto.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Nome do projeto
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-red-300 focus:bg-white"
                    placeholder="Ex: Especial Eleições 2026"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Tipo de projeto
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-red-300 focus:bg-white"
                  >
                    <option value="ATEMPORAL">Atemporal</option>
                    <option value="ESPECIAL_COM_DATA">Especial com Data</option>
                    <option value="EVENTO">Evento</option>
                    <option value="ESPECIFICO_PARA_MARCA">
                      Específico para Marca
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Data de validade
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    disabled={hasNoExpiration || type === "ATEMPORAL"}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-red-300 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={hasNoExpiration}
                      onChange={(e) => setHasNoExpiration(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Este projeto não possui data de validade
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Descrição
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-red-300 focus:bg-white"
                    placeholder="Descreva o projeto, objetivo, diferencial comercial..."
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Cotas</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Adicione as cotas disponíveis para venda neste projeto.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddQuota}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Adicionar cota
                </button>
              </div>

              <div className="space-y-4">
                {quotas.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Nenhuma cota adicionada ainda.
                  </div>
                ) : (
                  quotas.map((quota, index) => (
                    <div
                      key={quota.id}
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="font-semibold text-slate-800">
                          Cota {index + 1}
                        </h4>

                        <button
                          type="button"
                          onClick={() => handleRemoveQuota(quota.id)}
                          className="rounded-xl border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Remover
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Nome da cota
                          </label>
                          <input
                            value={quota.name}
                            onChange={(e) =>
                              handleQuotaChange(quota.id, "name", e.target.value)
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-red-300 focus:bg-white"
                            placeholder="Ex: Cota Oferecimento"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Tipo da cota
                          </label>
                          <input
                            value={quota.type}
                            onChange={(e) =>
                              handleQuotaChange(quota.id, "type", e.target.value)
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-red-300 focus:bg-white"
                            placeholder="Ex: Patrocínio"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Valor unitário
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={quota.unitPrice}
                            onChange={(e) =>
                              handleQuotaChange(
                                quota.id,
                                "unitPrice",
                                e.target.value
                              )
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-red-300 focus:bg-white"
                            placeholder="0,00"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Quantidade
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={quota.quantity}
                            onChange={(e) =>
                              handleQuotaChange(
                                quota.id,
                                "quantity",
                                e.target.value
                              )
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-red-300 focus:bg-white"
                            placeholder="0"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Descrição da cota
                          </label>
                          <textarea
                            value={quota.description}
                            onChange={(e) =>
                              handleQuotaChange(
                                quota.id,
                                "description",
                                e.target.value
                              )
                            }
                            rows={3}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-red-300 focus:bg-white"
                            placeholder="Detalhes adicionais da cota..."
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="text-lg font-semibold text-slate-900">
                  Imagem de capa
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Essa imagem será usada nos cards da listagem de projetos.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-red-200 bg-[var(--brand-soft-2)] p-6 text-center">
                  <div>
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
                      🖼️
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      Faça upload da imagem do projeto
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Recomendado para exibição nos cards
                    </p>
                  </div>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setCoverFile(file);
                    setCoverImageName(file?.name || null);
                  }}
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="text-lg font-semibold text-slate-900">
                  PDF comercial
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Anexe o mídia kit ou material comercial do projeto.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-red-200 bg-[var(--brand-soft-2)] p-6 text-center">
                  <div>
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
                      📄
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      Faça upload do PDF comercial
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Apenas arquivos PDF
                    </p>
                  </div>
                </div>

                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setPdfFile(file);
                    setPdfName(file?.name || null);
                  }}
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="text-lg font-semibold text-slate-900">
                  Resumo do cadastro
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Revise as informações antes de salvar.
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">Projeto</span>
                  <strong className="text-right text-slate-900">
                    {name || "-"}
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">Imagem de capa</span>
                  <strong className="text-right text-slate-900">
                    {coverImageName || "Não enviada"}
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">PDF comercial</span>
                  <strong className="text-right text-slate-900">
                    {pdfName || "Não enviado"}
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">Cotas</span>
                  <strong className="text-right text-slate-900">
                    {quotas.length} cadastrada{quotas.length === 1 ? "" : "s"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="text-lg font-semibold text-slate-900">
                  Finalizar cadastro
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Salve o projeto para disponibilizá-lo na plataforma.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/projetos")}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar projeto"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}