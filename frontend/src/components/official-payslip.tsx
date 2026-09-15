import { bulletinNumber, bulletinRate } from "@/lib/format";
import type { BulletinMeta, Department, Employee, Payslip, PayslipLine, Settings } from "@/lib/types";

function cell(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return "";
  return bulletinNumber(value, digits);
}

function rateCell(value: number | null | undefined) {
  if (!value) return value === 0 ? bulletinRate(0) : "";
  return bulletinRate(value);
}

function siretDisplay(siret: string) {
  const compact = siret.replace(/\s/g, "");
  if (compact.length < 14) return siret;
  return `${compact.slice(0, 9)} ${compact.slice(9)}`;
}

function LineRow({ line }: { line: PayslipLine }) {
  if (line.kind === "header") {
    return (
      <tr className="section-row">
        <td colSpan={7}>{line.label}</td>
      </tr>
    );
  }

  const cls = line.kind === "total" ? "total-row" : undefined;
  const rate = line.kind === "earning" || line.kind === "indemnity" ? "" : rateCell(line.employeeRate);
  const baseDigits = line.kind === "earning" ? 3 : 3;

  return (
    <tr className={cls}>
      <td>{line.label}</td>
      <td className="num">{cell(line.quantity, line.kind === "indemnity" ? 3 : 2)}</td>
      <td className="num">{cell(line.base, baseDigits)}</td>
      <td className="num">{rate}</td>
      <td className="num">{cell(line.gain)}</td>
      <td className="num">{cell(line.employeeAmount)}</td>
      <td className="num">{cell(line.employerAmount)}</td>
    </tr>
  );
}

export function OfficialPayslip({
  payslip,
  employee,
  department,
  settings,
  bulletin,
}: {
  payslip: Payslip;
  employee: Employee;
  department?: Department;
  settings: Settings;
  bulletin: BulletinMeta;
}) {
  const dates = [...bulletin.leaveDates, { from: "", to: "" }, { from: "", to: "" }, { from: "", to: "" }].slice(0, 3);
  const person = `${employee.civility ?? "M"} ${employee.lastName.toUpperCase()} ${employee.firstName.toUpperCase()}`;

  return (
    <article className="bulletin-officiel shadow-sm">
      <table className="meta">
        <tbody>
          <tr>
            <td>
              <div className="k">Période du {bulletin.periodStart} au {bulletin.periodEnd}</div>
            </td>
            <td>
              <div className="k">Paiement le {bulletin.paymentDate} par {bulletin.paymentMethod}</div>
            </td>
            <td>
              <div className="k">Matricule {employee.matricule}</div>
            </td>
            <td>
              <div className="k">Ancienneté {bulletin.seniority}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="parties">
        <tbody>
          <tr>
            <td>
              <div className="company-name">{settings.companyName}</div>
              <div>{settings.companyAddress}</div>
              <div>
                {settings.companyPostalCode} {settings.companyCity}
              </div>
              <div className="siret">
                <span>SIRET</span>
                <span>APE/NAF</span>
                <span>{siretDisplay(settings.siret)}</span>
                <span>{settings.ape}</span>
              </div>
              <div className="kv">
                <span>Conv. coll.</span>
                <span>{settings.conventionCollective}</span>
                <span>Indice</span>
                <span>{employee.classificationIndex}</span>
                <span>Niveau</span>
                <span></span>
                <span>Coef.</span>
                <span>{employee.coefficient}</span>
                <span>Horaire</span>
                <span>{bulletinNumber(employee.contractHours, 3)}</span>
              </div>
            </td>
            <td className="title-block">
              <h1>BULLETIN DE PAIE</h1>
              <div style={{ marginTop: 28 }}>
                {bulletin.hireDate}
                <div>Date Ancienneté</div>
              </div>
            </td>
            <td>
              <div className="person-name">{person}</div>
              <div>{employee.address}</div>
              <div>
                {employee.postalCode} {employee.city}
              </div>
              <div style={{ marginTop: 8 }}>N° Séc.Soc. {employee.socialSecurityNumber}</div>
              <div className="kv" style={{ marginTop: 14 }}>
                <span>Emploi</span>
                <span>{employee.jobTitle}</span>
                <span>Qualification</span>
                <span>{employee.qualification || ""}</span>
                <span>Département</span>
                <span>{department?.name ?? ""}</span>
                <span>Catégorie</span>
                <span>{employee.category}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="lines">
        <thead>
          <tr>
            <th className="col-des">Désignation</th>
            <th className="col-nb">Nombre</th>
            <th className="col-base">Base</th>
            <th className="col-taux">Taux salarial</th>
            <th className="col-gain">Gain</th>
            <th className="col-ret">Retenue</th>
            <th className="col-pat">Part employeur</th>
          </tr>
        </thead>
        <tbody>
          {payslip.lines.map((line) => (
            <LineRow key={line.id + line.label} line={line} />
          ))}
        </tbody>
      </table>

      <table className="bottom">
        <tbody>
          <tr>
            <td style={{ width: "58%" }}>
              <div className="leave-box">
                <table>
                  <thead>
                    <tr>
                      <th>Compteurs</th>
                      <th>Pris</th>
                      <th>Restant</th>
                      <th>Acquis</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Congés</td>
                      <td>{bulletinNumber(bulletin.leaveBalance.taken, 3)}</td>
                      <td>{bulletinNumber(bulletin.leaveBalance.remaining, 3)}</td>
                      <td>{bulletinNumber(bulletin.leaveBalance.acquired, 3)}</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginTop: 10, fontWeight: 700 }}>Dates de congés</div>
                <table style={{ marginTop: 4 }}>
                  <thead>
                    <tr>
                      <th>Du</th>
                      <th>Au</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dates.map((item, index) => (
                      <tr key={index}>
                        <td>{item.from || "\u00a0"}</td>
                        <td>{item.to || "\u00a0"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </td>
            <td>
              <div className="net-box">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div>Allègement des cotisations employeur</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{bulletinNumber(payslip.employerRelief)}</div>
                    <div style={{ marginTop: 10 }}>Total versé par l'employeur</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{bulletinNumber(payslip.employerCost)}</div>
                  </div>
                  <div>
                    <div className="net-label">NET A PAYER</div>
                    <div className="net-pay">{bulletinNumber(payslip.net)}</div>
                  </div>
                </div>
                <div className="mention">
                  Gain dont évolution de la rémunération liée à la suppression des cotisations chômage et maladie{" "}
                  {bulletinNumber(payslip.csgUnimposedMention)}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="legal">
        Pour vous aider à faire valoir vos droits, conservez ce bulletin de paie sans limitation de durée.
        <br />
        Pour la définition des termes employés, se reporter au site internet service-public.fr rubrique cotisations sociales.
      </div>

      <table className="pas">
        <tbody>
          <tr>
            <td colSpan={5}>
              NET A PAYER avant le prélèvement à la source {bulletinNumber(payslip.netBeforePas)}
            </td>
          </tr>
          <tr>
            <th>Impôt sur le revenu</th>
            <th>Base RNF</th>
            <th>Taux PAS</th>
            <th>Montant PAS mensuel</th>
            <th>Montant PAS Annuel</th>
          </tr>
          <tr>
            <td>Impôt sur le revenu prélevé à la source</td>
            <td className="num">{bulletinNumber(payslip.netImposable)}</td>
            <td className="num">{bulletinRate(payslip.pasRate)}</td>
            <td className="num">{bulletinNumber(payslip.pasAmount)}</td>
            <td className="num">{bulletinNumber(bulletin.cumuls.year.netImposable * (payslip.pasRate || 0))}</td>
          </tr>
        </tbody>
      </table>

      <table className="cumuls">
        <thead>
          <tr>
            <th></th>
            <th>Salaire brut</th>
            <th>Charges salariales</th>
            <th>Charges patronales</th>
            <th>Avantages en nature</th>
            <th>Net imposable</th>
            <th>Heures travaillées</th>
            <th>Nbre Hres HS/HC</th>
            <th>Montant HS/HC exo</th>
          </tr>
        </thead>
        <tbody>
          {(["Période", "Année"] as const).map((label) => {
            const row = label === "Période" ? bulletin.cumuls.period : bulletin.cumuls.year;
            return (
              <tr key={label}>
                <td>{label}</td>
                <td className="num">{bulletinNumber(row.gross)}</td>
                <td className="num">{bulletinNumber(row.employeeCharges)}</td>
                <td className="num">{bulletinNumber(row.employerCharges)}</td>
                <td className="num">{bulletinNumber(row.benefitsInKind)}</td>
                <td className="num">{bulletinNumber(row.netImposable)}</td>
                <td className="num">{bulletinNumber(row.hours)}</td>
                <td className="num">{bulletinNumber(row.overtimeHours)}</td>
                <td className="num">{bulletinNumber(row.overtimeExempt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </article>
  );
}
