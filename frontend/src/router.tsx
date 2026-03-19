import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { ProjectsPage } from "./pages/projects/ProjectsPage";
import { ProjectFormPage } from "./pages/projects/ProjectFormPage";
import { ProjectDetailsPage } from "./pages/projects/ProjectDetailsPage";
import { SalesPage } from "./pages/sales/SalesPage";
import { SaleFormPage } from "./pages/sales/SaleFormPage";
import { ProjectSalesDetailsPage } from "./pages/sales/ProjectSalesDetailsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "projetos", element: <ProjectsPage /> },
      { path: "projetos/novo", element: <ProjectFormPage /> },
      { path: "projetos/:id", element: <ProjectDetailsPage /> },
      { path: "vendas", element: <SalesPage /> },
      { path: "vendas/nova", element: <SaleFormPage /> },
      { path: "vendas/projeto/:id", element: <ProjectSalesDetailsPage /> },
    ],
  },
]);