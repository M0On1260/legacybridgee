// compare.js — generates before/after code snippets

function generateComparison(code) {
  const hasView    = /VIEW OF (\w+)/i.exec(code);
  const hasSub     = /DEFINE SUBROUTINE (\w+)/i.exec(code);
  const hasUpdate  = /\bUPDATE\b/i.test(code);
  const hasRead    = /\bREAD\b/i.test(code);
  const hasBalance = /BALANCE/i.test(code);
  const hasBatch   = /MOVE \*DATX/i.test(code);

  const viewName = hasView ? hasView[1] : 'ENTITY';
  const subName  = hasSub  ? hasSub[1]  : 'PROCESS';

  const before = code.split('\n').slice(0, 24).join('\n');

  let after = '';

  if (hasBatch) {
    after = `// Batch Job → Spring Batch (Java)
@Configuration
public class BatchJobConfig {

  @Bean
  public Job processJob(JobBuilderFactory jbf,
                        Step processStep) {
    return jbf.get("processJob")
      .start(processStep)
      .build();
  }

  @Bean
  public Step processStep(StepBuilderFactory sbf,
      ItemReader<Transaction> reader,
      ItemProcessor<Transaction, Transaction> proc,
      ItemWriter<Transaction> writer) {
    return sbf.get("processStep")
      .<Transaction, Transaction>chunk(100)
      .reader(reader)
      .processor(proc)
      .writer(writer)
      .build();
  }
}

@Service
public class TransactionProcessor
    implements ItemProcessor<Transaction, Transaction> {

  @Override
  public Transaction process(Transaction t) {
    if (t.getAmount().compareTo(BD_10000) > 0) {
      t.setProcFlag("H");
    } else {
      t.setProcFlag("Y");
    }
    return t;
  }
}`;
  } else if (hasBalance || hasRead) {
    after = `// ${viewName} Service — Java + Spring Boot
@RestController
@RequestMapping("/api/${viewName.toLowerCase()}s")
public class ${cap(viewName)}Controller {

  @Autowired
  private ${cap(viewName)}Service service;

  @GetMapping
  public List<${cap(viewName)}> getAll(
      @RequestParam(required=false) String status) {
    return service.findByStatus(status);
  }

  @PutMapping("/{id}/recalculate")
  public ${cap(viewName)} recalculate(@PathVariable Long id) {
    return service.recalculate(id);
  }
}

@Service
public class ${cap(viewName)}Service {

  @Autowired
  private ${cap(viewName)}Repository repo;

  public List<${cap(viewName)}> findByStatus(String status) {
    if (status == null) return repo.findAll();
    return repo.findByStatus(status);
  }

  public ${cap(viewName)} recalculate(Long id) {
    ${cap(viewName)} entity = repo.findById(id)
      .orElseThrow(EntityNotFoundException::new);
    ${subName.toLowerCase()}(entity);
    return repo.save(entity);
  }

  private void ${subName.toLowerCase()}(${cap(viewName)} e) {
    BigDecimal newBalance = e.getBalance()
      .multiply(BigDecimal.valueOf(1.05));
    e.setBalance(newBalance.min(BigDecimal.valueOf(99999)));
  }
}

@Repository
public interface ${cap(viewName)}Repository
    extends JpaRepository<${cap(viewName)}, Long> {
  List<${cap(viewName)}> findByStatus(String status);
}`;
  } else {
    after = `// Modernized Service — Java + Spring Boot
@RestController
@RequestMapping("/api/report")
public class ReportController {

  @Autowired
  private ReportService service;

  @GetMapping("/departments")
  public List<DeptSummaryDTO> getDeptReport() {
    return service.buildDeptReport();
  }
}

@Service
public class ReportService {

  @Autowired
  private DepartmentRepository deptRepo;

  @Autowired
  private EmployeeRepository empRepo;

  public List<DeptSummaryDTO> buildDeptReport() {
    return deptRepo.findAll().stream()
      .map(dept -> {
        List<Employee> emps =
          empRepo.findByDeptId(dept.getId());
        BigDecimal total = emps.stream()
          .map(Employee::getSalary)
          .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new DeptSummaryDTO(
          dept.getName(), emps.size(), total);
      })
      .collect(Collectors.toList());
  }
}`;
  }

  return { before, after };
}

function cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
