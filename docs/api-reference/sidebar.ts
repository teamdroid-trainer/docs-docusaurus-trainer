import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api-reference/security-microservice-api",
    },
    {
      type: "category",
      label: "Autenticación",
      items: [
        {
          type: "doc",
          id: "api-reference/iniciar-sesion-de-usuario",
          label: "Iniciar sesión de usuario",
          className: "api-method post",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
