// analyzer.js — core analysis engine (no API, pure JS)

const SAMPLES = {
  crud: `DEFINE DATA LOCAL
01 CUSTOMER VIEW OF CUSTOMERS
   02 CUST-ID     (N8)
   02 CUST-NAME   (A30)
   02 CUST-ADDR   (A60)
   02 BALANCE     (N10.2)
   02 STATUS      (A1)
END-DEFINE
*
FORMAT PS=60 LS=80
*
READ CUSTOMERS BY CUST-ID
  IF STATUS = 'A'
    PERFORM CALC-BALANCE
    UPDATE (1)
  END-IF
END-READ
*
DEFINE SUBROUTINE CALC-BALANCE
  BALANCE := BALANCE * 1.05
  IF BALANCE > 99999
    MOVE 99999 TO BALANCE
  END-IF
END-SUBROUTINE
END`,

  batch: `DEFINE DATA LOCAL
01 #RUN-DATE    (D)
01 #CTR         (I4)
01 TRANS VIEW OF TRANSACTIONS
   02 TRANS-ID  (N10)
   02 AMOUNT    (N12.2)
   02 PROC-FLAG (A1)
END-DEFINE
*
MOVE *DATX TO #RUN-DATE
RESET #CTR
*
READ TRANSACTIONS BY TRANS-ID
  IF PROC-FLAG NE 'Y'
    PERFORM PROCESS-TRANS
    ADD 1 TO #CTR
  END-IF
END-READ
*
WRITE 'PROCESSED:' #CTR 'RECORDS'
*
DEFINE SUBROUTINE PROCESS-TRANS
  IF AMOUNT > 10000
    MOVE 'H' TO PROC-FLAG
  ELSE
    MOVE 'Y' TO PROC-FLAG
  END-IF
  UPDATE (1)
END-SUBROUTINE
END`,

  report: `DEFINE DATA LOCAL
01 DEPT VIEW OF DEPARTMENTS
   02 DEPT-ID   (N4)
   02 DEPT-NAME (A25)
01 EMP VIEW OF EMPLOYEES
   02 EMP-ID    (N8)
   02 EMP-NAME  (A30)
   02 SALARY    (N10.2)
   02 DEPT-REF  (N4)
01 #TOTAL       (N12.2)
01 #COUNT       (I4)
END-DEFINE
*
FORMAT PS=66 LS=132
EJECT
WRITE TITLE LEFT '*** DEPARTMENTAL SALARY REPORT ***'
*
READ DEPARTMENTS BY DEPT-ID
  RESET #TOTAL #COUNT
  READ EMPLOYEES BY DEPT-REF = DEPT-REF(DEPT.)
    ADD SALARY TO #TOTAL
    ADD 1 TO #COUNT
    WRITE EMP-NAME SALARY
  END-READ
  WRITE 'TOTAL:' #TOTAL 'COUNT:' #COUNT
END-READ
END`
};

function analyzeCode(code) {
  const lines = code.split('\n');
  const nonEmpty = lines.filter(l => l.trim()).length;

  // Token counts
  const count = (pattern) => (code.match(pattern) || []).length;

  const views       = count(/VIEW OF/gi);
  const subroutines = count(/DEFINE SUBROUTINE/gi);
  const updates     = count(/\bUPDATE\b/gi);
  const reads       = count(/\bREAD\b/gi);
  const ifs         = count(/\bIF\b/gi);
  const performs    = count(/\bPERFORM\b/gi);
  const defines     = count(/\bDEFINE DATA\b/gi);
  const formats     = count(/\bFORMAT\b/gi);
  const writes      = count(/\bWRITE\b/gi);
  const moves       = count(/\bMOVE\b/gi);
  const loops       = count(/\bREAD\b|\bFOR\b|\bREPEAT\b/gi);
  const hasEject    = /\bEJECT\b/i.test(code);
  const hasBatch    = /MOVE \*DATX|EJECT|WRITE TITLE/i.test(code);
  const hasGlobal   = /DEFINE DATA GLOBAL/i.test(code);
  const hasExternal = /CALLNAT|FETCH|STACK TOP/i.test(code);

  // Scores (0–100)
  const complexity = Math.min(99, 15 + ifs * 4 + subroutines * 6 + reads * 3 + updates * 5 + loops * 2);
  const coupling   = Math.min(99, views * 15 + updates * 10 + reads * 8 + (hasExternal ? 15 : 0) + (hasGlobal ? 10 : 0));
  const effortPts  = Math.round((complexity * 0.4 + coupling * 0.4 + nonEmpty * 0.2) / 10);

  // Effort label
  const effortLabel = effortPts > 8 ? '~4–6 months' : effortPts > 5 ? '~2–3 months' : effortPts > 2 ? '~4–6 weeks' : '~1–2 weeks';

  // Complexity label
  const complexityLabel = complexity > 70 ? 'High' : complexity > 40 ? 'Moderate' : 'Low';
  const complexityClass = complexity > 70 ? 'danger' : complexity > 40 ? 'warn' : 'ok';

  const couplingLabel = coupling > 60 ? 'Tight' : coupling > 30 ? 'Moderate' : 'Loose';
  const couplingClass = coupling > 60 ? 'danger' : coupling > 30 ? 'warn' : 'ok';

  // Layer breakdown (percentages sum ~100)
  const presTotal  = (formats > 0 ? 20 : 0) + (writes > 1 ? 15 : 0) + (hasEject ? 10 : 0);
  const dataTotal  = Math.min(100, views * 18 + reads * 12 + updates * 14);
  const logicTotal = Math.min(100, subroutines * 22 + performs * 10 + moves * 3 + 10);
  const ctrlTotal  = Math.min(100, ifs * 9 + loops * 6 + 5);

  const layers = [
    { label: 'Business logic',    pct: logicTotal, color: '#7B6EF6' },
    { label: 'Data access',       pct: dataTotal,  color: '#3ECFA0' },
    { label: 'Presentation / UI', pct: presTotal,  color: '#F5A623' },
    { label: 'Control flow',      pct: ctrlTotal,  color: '#F05C5C' }
  ];

  // Issues
  const issues = [];
  if (updates > 0)
    issues.push({ sev: 'high', text: `${updates} direct UPDATE call(s) — business logic entangled with data writes. Extract to a service layer before migration.` });
  if (formats > 0 && writes > 0)
    issues.push({ sev: 'high', text: 'Presentation logic (FORMAT/WRITE) embedded in the program. Must be separated into its own rendering layer.' });
  if (hasBatch)
    issues.push({ sev: 'med', text: 'Batch job patterns detected (*DATX, EJECT). These require async worker equivalents in a modern architecture.' });
  if (views > 1)
    issues.push({ sev: 'med', text: `${views} Adabas views defined inline. Replace with a repository pattern and relational schema (PostgreSQL / Aurora).` });
  if (hasGlobal)
    issues.push({ sev: 'med', text: 'DEFINE DATA GLOBAL found — shared mutable state. Dangerous in stateless microservices; refactor to explicit parameters.' });
  if (hasExternal)
    issues.push({ sev: 'med', text: 'External program calls (CALLNAT/FETCH/STACK) detected. Map these to internal API calls or message queue events.' });
  if (subroutines === 0 && nonEmpty > 15)
    issues.push({ sev: 'low', text: 'No subroutines — all logic is in the main block. Decompose into named functions before migrating.' });
  if (ifs > 4)
    issues.push({ sev: 'low', text: `${ifs} conditional branches. Review for dead code and simplification before conversion.` });
  if (!issues.length)
    issues.push({ sev: 'low', text: 'No critical issues found. Code is relatively clean — suitable for direct API wrapping in Phase 3.' });

  // Recommendations
  const recs = [];
  if (updates > 0)
    recs.push('Wrap every UPDATE call in a dedicated DataRepository class. Expose as a REST endpoint — decouple from business logic entirely.');
  if (formats > 0 || writes > 0)
    recs.push('Strip FORMAT/WRITE/EJECT from the core module. Move output to a separate reporting service (e.g. React + PDF generator).');
  if (views > 0)
    recs.push(`Map ${views} Adabas view(s) to relational tables (PostgreSQL recommended). Auto-generate JPA/Hibernate models from the field definitions.`);
  recs.push('Adopt a 3-layer architecture: DataRepository → BusinessService → PresentationController. Natural subroutines map 1-to-1 to service methods.');
  if (complexity > 50)
    recs.push('High complexity — run a pilot migration on the lowest-risk subroutine first to validate tooling and reduce overall transformation risk.');
  if (hasBatch)
    recs.push('Replace batch patterns with Spring Batch or AWS Step Functions. Schedule via cron/CloudWatch Events instead of MOVE *DATX.');

  // Phase recommendation
  const phase = effortPts > 7 ? 1 : effortPts > 3 ? 2 : 3;

  // Dependency nodes for graph
  const depNodes = [];
  const viewMatches = [...code.matchAll(/VIEW OF (\w+)/gi)];
  viewMatches.forEach(m => depNodes.push({ type: 'view', name: m[1] }));
  const subMatches = [...code.matchAll(/DEFINE SUBROUTINE (\w+)/gi)];
  subMatches.forEach(m => depNodes.push({ type: 'sub', name: m[1] }));
  const callMatches = [...code.matchAll(/PERFORM (\w+)/gi)];
  callMatches.forEach(m => depNodes.push({ type: 'call', name: m[1] }));

  return {
    lines: nonEmpty,
    complexity, complexityLabel, complexityClass,
    coupling, couplingLabel, couplingClass,
    effortPts, effortLabel,
    layers, issues, recs, phase,
    depNodes,
    subroutines, views, updates, reads, ifs
  };
}
