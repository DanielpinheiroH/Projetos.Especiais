const API_URL = import.meta.env.VITE_API_URL;

export type ProjectQuotaInput = {
  name: string;
  description?: string;
  type: string;
  unitPrice: number;
  quantity: number;
};

export type CreateProjectPayload = {
  name: string;
  type: string;
  description?: string;
  expiresAt?: string | null;
  hasNoExpiration?: boolean;
  status?: string;
  coverImageUrl?: string | null;
  coverImageName?: string | null;
  pdfUrl?: string | null;
  pdfName?: string | null;
  quotas?: ProjectQuotaInput[];
};

export type CreateSaleItemPayload = {
  quotaId: string;
  quantity: number;
  originalUnitPrice: number;
  discountPercentage: number;
  finalUnitPrice: number;
  finalTotalPrice: number;
};

export type CreateSalePayload = {
  projectId: string;
  saleDate: string;
  advertiserName: string;
  executiveName: string;
  notes?: string;
  items: CreateSaleItemPayload[];
};

export async function getProjects() {
  const response = await fetch(`${API_URL}/projects`);

  if (!response.ok) {
    throw new Error("Erro ao buscar projetos");
  }

  return response.json();
}

export async function getProjectById(id: string) {
  const response = await fetch(`${API_URL}/projects/${id}`);

  if (!response.ok) {
    throw new Error("Erro ao buscar detalhes do projeto");
  }

  return response.json();
}

export async function createProject(data: CreateProjectPayload) {
  const response = await fetch(`${API_URL}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Erro ao criar projeto");
  }

  return response.json();
}

export async function createSale(data: CreateSalePayload) {
  const response = await fetch(`${API_URL}/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Erro ao criar venda");
  }

  return response.json();
}

export async function deactivateProject(id: string) {
  const response = await fetch(`${API_URL}/projects/${id}/deactivate`, {
    method: "PATCH",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Erro ao desativar projeto");
  }

  return response.json();
}

export async function deleteProject(id: string) {
  const response = await fetch(`${API_URL}/projects/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Erro ao excluir projeto");
  }

  return true;
}

export async function uploadProjectFile(file: File, type: "cover" | "pdf") {
  const formData = new FormData();

  formData.append("type", type);
  formData.append("file", file);

  const response = await fetch(`${API_URL}/uploads`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Erro ao fazer upload do arquivo");
  }

  return response.json();
}