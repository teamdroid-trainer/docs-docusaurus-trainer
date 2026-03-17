import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api/msa-security/security-microservice-api",
    },
    {
      type: "category",
      label: "Auth",
      link: {
        type: "doc",
        id: "api/msa-security/auth",
      },
      items: [
        {
          type: "doc",
          id: "api/msa-security/iniciar-sesion",
          label: "Iniciar sesión",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/msa-security/cerrar-sesion",
          label: "Cerrar sesión",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "MFA Auth",
      link: {
        type: "doc",
        id: "api/msa-security/mfa-auth",
      },
      items: [
        {
          type: "doc",
          id: "api/msa-security/inicia-flujo-mfa",
          label: "Inicia flujo MFA",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/msa-security/verifica-otp-y-completa-login",
          label: "Verifica OTP y completa Login",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Users Management",
      link: {
        type: "doc",
        id: "api/msa-security/users-management",
      },
      items: [
        {
          type: "doc",
          id: "api/msa-security/listar-todos-los-usuarios",
          label: "Listar todos los usuarios",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/msa-security/dar-de-alta-a-un-usuario",
          label: "Dar de alta a un usuario",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/msa-security/obtener-usuario-por-id",
          label: "Obtener usuario por ID",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
