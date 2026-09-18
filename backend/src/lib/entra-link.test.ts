import assert from "node:assert/strict";
import { test } from "node:test";
import type { Employee, Store } from "../types.js";
import { isPayrollEmployee } from "./directory-role.js";
import { findEmployeeForMicrosoft, identityNamesFromGraph, upsertMicrosoftEmployee } from "./entra-link.js";

function emptyStore(): Store {
  return {
    schemaVersion: 8,
    settings: {
      companyName: "PayRollFlow",
      companyAddress: "",
      companyPostalCode: "",
      companyCity: "Paris",
      siret: "",
      ape: "",
      conventionCollective: "Syntec",
      paymentMethod: "Virement",
      currency: "EUR",
      workingDays: 22,
      monthlyHours: 151.67,
      overtimeRate: 1.25,
      smicHourly: 11.88,
      fillonT: 0.3195,
      advanceCapRatio: 0.3,
    },
    departments: [{ id: "dep-001", name: "Ingénierie", code: "ING", budget: 1, color: "#000" }],
    employees: [],
    rates: [],
    periods: [],
    payslips: [],
    users: [],
    leaves: [],
    advances: [],
    documents: [],
    clients: [],
    partners: [],
    invoices: [],
    notifications: [],
    auditLog: [],
  };
}

test("Graph givenName/surname ou displayName fournissent l’identité", () => {
  assert.deepEqual(
    identityNamesFromGraph({ givenName: "Alexis", surname: "Yao", displayName: "A. Yao" }),
    { firstName: "Alexis", lastName: "Yao" },
  );
  assert.deepEqual(identityNamesFromGraph({ displayName: "Alexis Yao" }), {
    firstName: "Alexis",
    lastName: "Yao",
  });
});

test("la première connexion crée la fiche interne à partir de l’oid Microsoft", () => {
  const store = emptyStore();
  const created = upsertMicrosoftEmployee(store, {
    oid: "abc-123",
    email: "alexis.yao@tenant.onmicrosoft.com",
    name: "Alexis Yao",
    givenName: "Alexis",
    familyName: "Yao",
    role: "employee",
  });
  assert.equal(store.employees.length, 1);
  assert.equal(created.entraObjectId, "abc-123");
  assert.equal(created.firstName, "Alexis");
  assert.equal(created.lastName, "Yao");
  assert.equal(created.email, "alexis.yao@tenant.onmicrosoft.com");
  assert.equal(created.directoryRole, "employee");
  assert.equal(store.documents.length, 4);
});

test("une connexion suivante recharge la même fiche sans en créer une seconde", () => {
  const store = emptyStore();
  const first = upsertMicrosoftEmployee(store, {
    oid: "abc-123",
    email: "alexis.yao@tenant.onmicrosoft.com",
    name: "Alexis Yao",
    givenName: "Alexis",
    familyName: "Yao",
    role: "employee",
  });
  first.baseSalary = 3500;
  first.jobTitle = "Ingénieur DevOps";
  const second = upsertMicrosoftEmployee(store, {
    oid: "abc-123",
    email: "alexis.yao@tenant.onmicrosoft.com",
    name: "Alexis Yao",
    givenName: "Alexis",
    familyName: "Yao",
    role: "employee",
  });
  assert.equal(store.employees.length, 1);
  assert.equal(second.id, first.id);
  assert.equal(second.baseSalary, 3500);
  assert.equal(second.jobTitle, "Ingénieur DevOps");
});

test("un admin ou un RH reçoit une fiche interne, pas une fiche de paie", () => {
  const store = emptyStore();
  const admin = upsertMicrosoftEmployee(store, {
    oid: "oid-admin",
    email: "ibrahim@tenant.onmicrosoft.com",
    name: "ibrahim yao",
    role: "admin",
  });
  assert.equal(admin.directoryRole, "admin");
  assert.equal(admin.jobTitle, "Administrateur");
  assert.equal(isPayrollEmployee(admin), false);
  const hr = upsertMicrosoftEmployee(store, {
    oid: "oid-hr",
    email: "sogodogo@tenant.onmicrosoft.com",
    name: "Sogo Dogo",
    role: "hr",
  });
  assert.equal(hr.directoryRole, "hr");
  assert.equal(isPayrollEmployee(hr), false);
});

test("findEmployeeForMicrosoft suit l’oid puis l’UPN, jamais un email RH démo", () => {
  const roster: Employee[] = [
    {
      id: "emp-001",
      firstName: "Aminata",
      lastName: "Diallo",
      email: "aminata.diallo@payrollflow.demo",
      phone: "n/c",
      departmentId: "dep-001",
      jobTitle: "Salarié",
      contractType: "CDI",
      hireDate: "2024-01-01",
      baseSalary: 0,
      status: "active",
      iban: "",
      city: "Paris",
      country: "France",
      civility: "M",
      matricule: "1001",
      address: "",
      postalCode: "",
      socialSecurityNumber: "",
      category: "Non Cadre",
      coefficient: "220",
      classificationIndex: "1.3.1",
      qualification: "",
      contractHours: 151.67,
      pasRate: 0,
      mealTicket5: 0,
      mealTicket1650: 0,
      entraObjectId: "oid-1",
      entraUserPrincipalName: "emp-01@tenant.onmicrosoft.com",
    },
  ];
  assert.equal(findEmployeeForMicrosoft(roster, { id: "oid-1", email: "other@x.com" })?.id, "emp-001");
  assert.equal(
    findEmployeeForMicrosoft(roster, { id: "missing", email: "emp-01@tenant.onmicrosoft.com" })?.id,
    "emp-001",
  );
  assert.equal(
    findEmployeeForMicrosoft(roster, { id: "missing", email: "aminata.diallo@payrollflow.demo" }),
    undefined,
  );
});
