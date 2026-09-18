import assert from "node:assert/strict";
import { test } from "node:test";
import type { Store } from "../types.js";
import { CURRENT_SCHEMA, applyStoreMigrations } from "./store.js";

function demoStore(schemaVersion: number): Store {
  return {
    schemaVersion,
    settings: {
      companyName: "ANTARES DS",
      companyAddress: "10 rue",
      companyPostalCode: "92300",
      companyCity: "LEVALLOIS PERRET",
      siret: "1",
      ape: "7112B",
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
    employees: [
      {
        id: "emp-demo",
        firstName: "Aminata",
        lastName: "Diallo",
        email: "aminata.diallo@payrollflow.demo",
        phone: "n/c",
        departmentId: "dep-001",
        jobTitle: "Salarié",
        contractType: "CDI",
        hireDate: "2024-01-01",
        baseSalary: 2800,
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
      },
    ],
    rates: [{ id: "maladie", label: "Maladie", employeeRate: 0, employerRate: 0.13, base: "gross" }],
    periods: [{ id: "p1" }] as Store["periods"],
    payslips: [{ id: "s1", employeeId: "emp-demo" }] as Store["payslips"],
    users: [{ id: "u1", email: "admin@payrollflow.demo" }] as Store["users"],
    leaves: [{ id: "l1", employeeId: "emp-demo" }] as Store["leaves"],
    advances: [{ id: "a1", employeeId: "emp-demo" }] as Store["advances"],
    documents: [{ id: "d1", employeeId: "emp-demo" }] as Store["documents"],
    clients: [{ id: "c1" }] as Store["clients"],
    partners: [{ id: "n1" }] as Store["partners"],
    invoices: [{ id: "i1" }] as Store["invoices"],
    notifications: [{ id: "n1" }] as Store["notifications"],
    auditLog: [{ id: "x1" }] as Store["auditLog"],
  };
}

test("schema < 8 purge les objets démo et conserve départements / barème", () => {
  const store = demoStore(7);
  const dirty = applyStoreMigrations(store);
  assert.equal(dirty, true);
  assert.equal(store.schemaVersion, CURRENT_SCHEMA);
  assert.equal(store.employees.length, 0);
  assert.equal(store.payslips.length, 0);
  assert.equal(store.periods.length, 0);
  assert.equal(store.leaves.length, 0);
  assert.equal(store.advances.length, 0);
  assert.equal(store.documents.length, 0);
  assert.equal(store.users.length, 0);
  assert.equal(store.notifications.length, 0);
  assert.equal(store.departments.length, 1);
  assert.equal(store.rates.length, 1);
  assert.equal(store.settings.companyName, "ANTARES DS");
});

test("schema 8 conserve une fiche Microsoft déjà provisionnée", () => {
  const store = demoStore(8);
  store.employees[0].entraObjectId = "abc-123";
  store.employees[0].directoryRole = "employee";
  const dirty = applyStoreMigrations(store);
  assert.equal(dirty, false);
  assert.equal(store.employees.length, 1);
  assert.equal(store.employees[0].entraObjectId, "abc-123");
});
