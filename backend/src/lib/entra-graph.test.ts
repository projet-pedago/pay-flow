import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FALLBACK_PAYFLOW_APPROLE_IDS,
  envAppRoleCatalog,
  payflowRolesFromAssignments,
  visibleEntraUsers,
  withEmployeeLinks,
  type EntraDirectoryUser,
} from "./entra-graph.js";

const directory: EntraDirectoryUser[] = [
  {
    id: "oid-admin",
    displayName: "Djuma",
    userPrincipalName: "djuma@tenant.onmicrosoft.com",
    mail: null,
    givenName: "Djuma",
    surname: "Ismael",
    accountEnabled: true,
    roles: ["PAYFLOW_ADMIN"],
    linkedEmployeeId: null,
    linkedEmployeeName: null,
  },
  {
    id: "oid-hr",
    displayName: "Alexie",
    userPrincipalName: "alexie@tenant.onmicrosoft.com",
    mail: null,
    givenName: "Alexie",
    surname: "Kablan",
    accountEnabled: true,
    roles: ["PAYFLOW_HR"],
    linkedEmployeeId: null,
    linkedEmployeeName: null,
  },
  {
    id: "oid-emp",
    displayName: "Employee01",
    userPrincipalName: "emp-01@tenant.onmicrosoft.com",
    mail: null,
    givenName: "Employee01",
    surname: "Test",
    accountEnabled: true,
    roles: ["PAYFLOW_EMPLOYEE"],
    linkedEmployeeId: null,
    linkedEmployeeName: null,
  },
  {
    id: "oid-test",
    displayName: "Test Employee",
    userPrincipalName: "test.employee@tenant.onmicrosoft.com",
    mail: null,
    givenName: "Test",
    surname: "Employee",
    accountEnabled: true,
    roles: ["PAYFLOW_EMPLOYEE"],
    linkedEmployeeId: null,
    linkedEmployeeName: null,
  },
];

test("admin voit Admin + RH + Employés PayFlow, pas le tenant entier", () => {
  const names = visibleEntraUsers(directory, "admin").map((item) => item.displayName);
  assert.deepEqual(names.sort(), ["Alexie", "Djuma", "Employee01", "Test Employee"].sort());
});

test("RH ne voit que PAYFLOW_EMPLOYEE", () => {
  const names = visibleEntraUsers(directory, "hr").map((item) => item.displayName);
  assert.deepEqual(names.sort(), ["Employee01", "Test Employee"].sort());
});

test("un salarié ne voit aucun compte", () => {
  assert.equal(visibleEntraUsers(directory, "employee").length, 0);
});

test("le lien fiche RH se fait par oid ou UPN, pas par store.users", () => {
  const linked = withEmployeeLinks(directory, [
    {
      id: "emp-001",
      firstName: "Aminata",
      lastName: "Diallo",
      entraObjectId: "oid-emp",
      entraUserPrincipalName: "emp-01@tenant.onmicrosoft.com",
    },
  ]);
  const emp = linked.find((item) => item.id === "oid-emp");
  assert.equal(emp?.linkedEmployeeId, "emp-001");
  assert.equal(emp?.linkedEmployeeName, "Aminata Diallo");
  assert.equal(linked.find((item) => item.id === "oid-admin")?.linkedEmployeeId, null);
});

const catalog = envAppRoleCatalog();

test("ignore PayFlow-Frontend, PayFlow-Provisioning et le rôle par défaut", () => {
  const roles = payflowRolesFromAssignments(
    [
      {
        appRoleId: "00000000-0000-0000-0000-000000000000",
        resourceDisplayName: "PayFlow-Frontend",
      },
      {
        appRoleId: "00000000-0000-0000-0000-000000000000",
        resourceDisplayName: "PayFlow-Provisioning",
      },
      {
        appRoleId: "394165ce-9655-44b9-aca2-12b406dcc69a",
        resourceDisplayName: "PayFlow-Provisioning",
      },
    ],
    catalog,
  );
  assert.deepEqual(roles, []);
});

test("ne retient que les rôles nommés de la ressource PayFlow", () => {
  const employee = Object.entries(FALLBACK_PAYFLOW_APPROLE_IDS).find(([, role]) => role === "PAYFLOW_EMPLOYEE")?.[0];
  const admin = Object.entries(FALLBACK_PAYFLOW_APPROLE_IDS).find(([, role]) => role === "PAYFLOW_ADMIN")?.[0];
  const roles = payflowRolesFromAssignments(
    [
      { appRoleId: employee, resourceDisplayName: "PayFlow" },
      { appRoleId: "00000000-0000-0000-0000-000000000000", resourceDisplayName: "PayFlow-Frontend" },
      { appRoleId: admin, resourceDisplayName: "PayFlow" },
    ],
    catalog,
  );
  assert.deepEqual(roles, ["PAYFLOW_ADMIN", "PAYFLOW_EMPLOYEE"]);
});
