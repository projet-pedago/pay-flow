import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { requireStaff } from "../auth.js";
import { queryPostgres } from "../lib/postgres.js";

const schema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  budget: z.number().nonnegative(),
  color: z.string().min(4),
});

type DepartmentRow = {
  id: string;
  name: string;
  code: string;
  budget: string;
  color: string;
};

function mapDepartment(row: DepartmentRow) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    budget: Number(row.budget),
    color: row.color,
  };
}

export const departmentsRouter = Router();

departmentsRouter.use(requireStaff);

/*
 * GET /departments
 * Liste des départements depuis PostgreSQL
 */
departmentsRouter.get("/", async (_req, res) => {
  try {
    const result = await queryPostgres<DepartmentRow>(`
      SELECT id, name, code, budget, color
      FROM departments
      ORDER BY name
    `);

    res.json(result.rows.map(mapDepartment));
  } catch (error) {
    console.error("[PostgreSQL] GET departments:", error);
    res.status(500).json({ error: "Erreur base de données" });
  }
});

/*
 * POST /departments
 * Création d'un département
 */
departmentsRouter.post("/", async (req, res) => {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Données invalides",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const departmentId = randomUUID();

    const result = await queryPostgres<DepartmentRow>(
      `
      INSERT INTO departments (
        id,
        name,
        code,
        budget,
        color
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, code, budget, color
      `,
      [
        departmentId,
        parsed.data.name,
        parsed.data.code,
        parsed.data.budget,
        parsed.data.color,
      ],
    );

    res.status(201).json(mapDepartment(result.rows[0]));
  } catch (error) {
    console.error("[PostgreSQL] POST department:", error);
    res.status(500).json({ error: "Erreur base de données" });
  }
});

/*
 * PUT /departments/:id
 */
departmentsRouter.put("/:id", async (req, res) => {
  const parsed = schema.partial().safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides" });
    return;
  }

  try {
    const current = await queryPostgres<DepartmentRow>(
      `
      SELECT id, name, code, budget, color
      FROM departments
      WHERE id = $1
      `,
      [req.params.id],
    );

    if (current.rowCount === 0) {
      res.status(404).json({ error: "Département introuvable" });
      return;
    }

    const existing = mapDepartment(current.rows[0]);

    const result = await queryPostgres<DepartmentRow>(
      `
      UPDATE departments
      SET
        name = $2,
        code = $3,
        budget = $4,
        color = $5
      WHERE id = $1
      RETURNING id, name, code, budget, color
      `,
      [
        req.params.id,
        parsed.data.name ?? existing.name,
        parsed.data.code ?? existing.code,
        parsed.data.budget ?? existing.budget,
        parsed.data.color ?? existing.color,
      ],
    );

    res.json(mapDepartment(result.rows[0]));
  } catch (error) {
    console.error("[PostgreSQL] PUT department:", error);
    res.status(500).json({ error: "Erreur base de données" });
  }
});

/*
 * DELETE /departments/:id
 */
departmentsRouter.delete("/:id", async (req, res) => {
  try {
    // Même sécurité que l'ancien store.json :
    // interdiction de supprimer un département utilisé par un employé.
    const employee = await queryPostgres(
      `
      SELECT 1
      FROM employees
      WHERE department_id = $1
      LIMIT 1
      `,
      [req.params.id],
    );

    if ((employee.rowCount ?? 0) > 0) {
      res.status(409).json({
        error: "Ce département a encore des employés",
      });
      return;
    }

    const result = await queryPostgres(
      `
      DELETE FROM departments
      WHERE id = $1
      RETURNING id
      `,
      [req.params.id],
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Département introuvable" });
      return;
    }

    res.status(204).end();
  } catch (error) {
    console.error("[PostgreSQL] DELETE department:", error);
    res.status(500).json({ error: "Erreur base de données" });
  }
});
