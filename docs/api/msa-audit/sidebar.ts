import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api/msa-audit/audit-microservice-api",
    },
    {
      type: "category",
      label: "Audit Log",
      link: {
        type: "doc",
        id: "api/msa-audit/audit-log",
      },
      items: [
        {
          type: "doc",
          id: "api/msa-audit/get-audit-logs",
          label: "Get Audit Logs",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/msa-audit/create-an-audit-log",
          label: "Create an Audit Log",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/msa-audit/async-stream-processing",
          label: "Async Stream Processing",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
