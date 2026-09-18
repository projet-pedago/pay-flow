import assert from "node:assert/strict";
import { test } from "node:test";
import type { Employee } from "../types.js";
import { findEmployeeForMicrosoft, microsoftUpnTaken } from "./entra-link.js";

function employee(partial: Partial<Employee> & Pick<Employee, "id" | "email">): Employee {
  return {
    firstName: "Test",
    lastName: "User",
    phone: "n/c",
    departmentId: "dep-001",
    jobTitle: "Salarié",
    contractType: "CDI",
    hireDate: "2024-01-01",
    baseSalary: 3000,
    status: "active",
    iban: "FR76",
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
    ...partial,
  };
}

const aminata = employee({
  id: "emp-001",
  firstName: "Aminata",
  lastName: "Diallo",
  email: "aminata.diallo@payrollflow.demo",
});

const linked = employee({
  id: "emp-002",
  email: "jp.kouame@payrollflow.demo",
  entraObjectId: "84d7aaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  entraUserPrincipalName: "emp-01@tenant.onmicrosoft.com",
});

const pending = employee({
  id: "emp-003",
  email: "fatou.ndiaye@payrollflow.demo",
  entraUserPrincipalName: "emp-02@tenant.onmicrosoft.com",
});

const roster = [aminata, linked, pending];

test("oid Entra gagne sur l’UPN et l’email RH", () => {
  const found = findEmployeeForMicrosoft(roster, {
    id: linked.entraObjectId!,
    email: "emp-02@tenant.onmicrosoft.com",
  });
  assert.equal(found?.id, "emp-002");
});

test("UPN Entra rattache un compte dont l’email RH ne correspond pas", () => {
  const found = findEmployeeForMicrosoft(roster, {
    id: "11111111-2222-3333-4444-555555555555",
    email: "EMP-02@tenant.onmicrosoft.com",
  });
  assert.equal(found?.id, "emp-003");
});

test("email RH identique reste le repli de première connexion", () => {
  const found = findEmployeeForMicrosoft(roster, {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    email: "aminata.diallo@payrollflow.demo",
  });
  assert.equal(found?.id, "emp-001");
});

test("aucun match si l’UPN Entra n’est pas sur une fiche", () => {
  const found = findEmployeeForMicrosoft(roster, {
    id: "00000000-0000-0000-0000-000000000000",
    email: "emp-01@lassissisaliouyaoibraoutloo.onmicrosoft.com",
  });
  assert.equal(found, undefined);
});

test("un UPN ne peut pas être associé à deux fiches", () => {
  const taken = microsoftUpnTaken(roster, "emp-01@tenant.onmicrosoft.com", "emp-001");
  assert.equal(taken?.id, "emp-002");
  assert.equal(microsoftUpnTaken(roster, "emp-01@tenant.onmicrosoft.com", "emp-002"), undefined);
});
