import { DEMO_EMPLOYEE_PASSWORD } from "../auth-constants.js";
import { getSupabaseAdmin } from "./supabase.js";

export async function provisionEmployeeLogin(email: string, name: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const { error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_EMPLOYEE_PASSWORD,
    email_confirm: true,
    app_metadata: { role: "employee" },
    user_metadata: { full_name: name },
  });
  if (error && !/already|registered|exists/i.test(error.message)) {
    console.warn(`Supabase: impossible de créer ${email}: ${error.message}`);
  }
}
