import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createProject,
  getProjectById,
  updateProject,
  uploadProjectFile,
} from "../../lib/api";

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
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [name, setName] = useState("");
  const [type, setType] = useState("ATEMPORAL");
  const [expiresAt, setExpiresAt] = useState("");
  const [description, setDescription] = useState("");
  const [hasNoExpiration, setHasNoExpiration] = useState(false);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverImageName, setCoverImageName] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [existingCoverImageUrl, setExistingCoverImageUrl] = useState<string | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);

  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);

  useEffect(() => {
    async function loadProjectForEdit() {
      if (!id) return;

      try {
        setLoadingProject(true);

        const data = await getProjectById(id);

        setName(data.name || "");
        setType(data.type || "ATEMPORAL");
        setExpiresAt(data.expires_at ? String(data.expires_at).split("T")[0] : "");
        setDescription(data.description || "");
        setHasNoExpiration(Boolean(data.has_no_expiration));

        setCoverImageName(data.cover_image_name || null);
        setPdfName(data.pdf_name || null);
        setCoverPreview(data.cover_image_url || null);

        setExistingCoverImageUrl(data.cover_image_url || null);
        setExistingPdfUrl(data.pdf_url || null);

        setQuotas(
          (data.quotas || []).map((quota: any) => ({
            id: Date.now() + Math.floor(Math.random() * 100000) + Number(quota.quantity_total || 0),
            name: quota.name || "",
            description: quota.description || "",
            type: quota.quota_type || "",
            unitPrice: String(quota.unit_price ?? ""),
            quantity: String(quota.quantity_total ?? ""),
          }))
        );
      } catch (error) {
        console.error("Erro ao carregar projeto para edição:", error);
        alert("Não foi possível carregar os dados do projeto.");
      } finally {
        setLoadingProject(false);
      }
    }

    loadProjectForEdit();
  }, [id]);

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

      let uploadedCoverUrl: string | null = existingCoverImageUrl;
      let uploadedCoverName: string | null = coverImageName;
      let uploadedPdfUrl: string | null = existingPdfUrl;
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

      if (isEditMode && id) {
        await updateProject(id, payload);
      } else {
        await createProject(payload);
      }

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

  if (loadingProject) {
    return (
      <div className="p-10 text-center text-slate-500">
        Carregando projeto para edição...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] p-8 text-white shadow-lg">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-red-100">
          Cadastro
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">
          {isEditMode ? "Editar projeto" : "Novo projeto"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-red-50">
          {isEditMode
            ? "Atualize as informações do projeto, revise os materiais e ajuste as cotas disponíveis."
            : "Cadastre um novo projeto especial, defina suas informações principais, anexe a imagem de capa para exibição nos cards e envie o PDF comercial."}
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
                              handleQuotaChange(quota.id, "unitPrice", e.target.value)
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
                              handleQuotaChange(quota.id, "quantity", e.target.value)
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
                              handleQuotaChange(quota.id, "description", e.target.value)
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
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="Preview da capa"
                      className="max-h-[220px] rounded-xl object-contain"
                    />
                  ) : (
                    <div>
                      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
                        🖼️
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        Nenhuma imagem selecionada
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        PNG, JPG ou WEBP
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <label
                    htmlFor="cover-upload"
                    className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                  >
                    {coverImageName ? "Trocar capa" : "Adicionar capa"}
                  </label>

                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setCoverFile(file);
                      setCoverImageName(file?.name || null);

                      if (file) {
                        const previewUrl = URL.createObjectURL(file);
                        setCoverPreview(previewUrl);
                      } else {
                        setCoverPreview(existingCoverImageUrl);
                      }
                    }}
                    className="hidden"
                  />

                  {coverImageName && (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <span className="font-semibold">Arquivo:</span>{" "}
                      {coverImageName}
                    </div>
                  )}

                  {(coverFile || coverImageName) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCoverFile(null);
                        setCoverImageName(null);
                        setCoverPreview(null);
                        setExistingCoverImageUrl(null);
                      }}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Remover capa
                    </button>
                  )}
                </div>
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
                      {pdfName ? "PDF selecionado com sucesso" : "Nenhum PDF selecionado"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {pdfName ? pdfName : "Apenas arquivos PDF"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label
                    htmlFor="pdf-upload"
                    className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                  >
                    {pdfName ? "Trocar PDF" : "Adicionar PDF"}
                  </label>

                  <input
                    id="pdf-upload"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setPdfFile(file);
                      setPdfName(file?.name || null);
                    }}
                    className="hidden"
                  />

                  {pdfName && (
                    <button
                      type="button"
                      onClick={() => {
                        setPdfFile(null);
                        setPdfName(null);
                        setExistingPdfUrl(null);
                      }}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Remover PDF
                    </button>
                  )}
                </div>
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
                  {saving ? "Salvando..." : isEditMode ? "Salvar alterações" : "Salvar projeto"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}