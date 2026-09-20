CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    budget NUMERIC(14,2) NOT NULL DEFAULT 0,
    color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    department_id TEXT REFERENCES departments(id),
    job_title TEXT,
    contract_type TEXT NOT NULL,
    hire_date DATE NOT NULL,
    base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    iban TEXT,
    city TEXT,
    country TEXT,
    civility TEXT,
    matricule TEXT,
    address TEXT,
    postal_code TEXT,
    social_security_number TEXT,
    category TEXT,
    coefficient TEXT,
    classification_index TEXT,
    qualification TEXT,
    contract_hours NUMERIC(10,2),
    pas_rate NUMERIC(10,4),
    meal_ticket_5 NUMERIC(10,2),
    meal_ticket_1650 NUMERIC(10,2),
    contract_end_date DATE,
    entra_object_id TEXT,
    entra_user_principal_name TEXT,
    directory_role TEXT
);

CREATE TABLE IF NOT EXISTS payroll_periods (
    id TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    calculated_at TIMESTAMPTZ,
    validated_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payslips (
    id TEXT PRIMARY KEY,
    period_id TEXT REFERENCES payroll_periods(id),
    employee_id TEXT REFERENCES employees(id),
    worked_days NUMERIC(10,2),
    overtime_hours NUMERIC(10,2),
    bonus NUMERIC(12,2),
    base_salary NUMERIC(12,2),
    prorated_base NUMERIC(12,2),
    overtime_pay NUMERIC(12,2),
    gross NUMERIC(12,2),
    employee_charges NUMERIC(12,2),
    employer_charges NUMERIC(12,2),
    net NUMERIC(12,2),
    employer_cost NUMERIC(12,2),
    advance NUMERIC(12,2),
    hours NUMERIC(10,2),
    hourly_rate NUMERIC(12,4),
    indemnities JSONB NOT NULL DEFAULT '[]',
    net_before_pas NUMERIC(12,2),
    pas_rate NUMERIC(10,4),
    pas_amount NUMERIC(12,2),
    net_imposable NUMERIC(12,2),
    employer_relief NUMERIC(12,2),
    csg_unimposed_mention NUMERIC(12,2),
    lines JSONB NOT NULL DEFAULT '[]',
    version INTEGER,
    superseded BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days NUMERIC(10,2) NOT NULL,
    reason TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    decided_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS salary_advances (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    amount NUMERIC(12,2) NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    reason TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    decided_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS hr_documents (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    document_key TEXT NOT NULL,
    label TEXT NOT NULL,
    status TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    employee_id TEXT REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    at TIMESTAMPTZ NOT NULL,
    actor_email TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    link TEXT
);

CREATE TABLE IF NOT EXISTS contribution_rates (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    employee_rate NUMERIC(10,6) NOT NULL,
    employer_rate NUMERIC(10,6) NOT NULL,
    base TEXT NOT NULL,
    section TEXT
);

CREATE TABLE IF NOT EXISTS network_clients (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    siret TEXT,
    city TEXT,
    contact TEXT,
    email TEXT,
    website TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS network_partners (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    job_title TEXT,
    employee_id TEXT REFERENCES employees(id),
    client_id TEXT REFERENCES network_clients(id),
    company_name TEXT,
    daily_rate NUMERIC(12,2),
    vat_rate NUMERIC(8,4),
    status TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS network_invoices (
    id TEXT PRIMARY KEY,
    direction TEXT NOT NULL,
    client_id TEXT REFERENCES network_clients(id),
    partner_id TEXT REFERENCES network_partners(id),
    number TEXT NOT NULL,
    date DATE NOT NULL,
    label TEXT NOT NULL,
    amount_ht NUMERIC(12,2) NOT NULL,
    vat_rate NUMERIC(8,4),
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_employees_department
ON employees(department_id);

CREATE INDEX IF NOT EXISTS idx_payslips_employee
ON payslips(employee_id);

CREATE INDEX IF NOT EXISTS idx_payslips_period
ON payslips(period_id);

CREATE INDEX IF NOT EXISTS idx_leaves_employee
ON leave_requests(employee_id);

CREATE INDEX IF NOT EXISTS idx_advances_employee
ON salary_advances(employee_id);

CREATE INDEX IF NOT EXISTS idx_documents_employee
ON hr_documents(employee_id);