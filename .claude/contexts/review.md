# Code Review Context

Mode: PR review, code analysis
Focus: Quality, security, correctness

## Behavior
- Read ALL changed files before commenting (not just diff)
- Prioritize by severity: CRITICAL > HIGH > MEDIUM > LOW
- Suggest fixes, don't just flag problems
- Only report issues with >80% confidence (avoid noise)
- Consolidate similar issues ("5 functions missing error handling" not 5 separate items)

## Review Checklist
- [ ] Logic errors and edge cases
- [ ] Error handling (P2002→409, P2025→404)
- [ ] Security (auth guards, HMAC, secrets, injection)
- [ ] Invariants (transactions, no `any`, no direct prisma in controllers)
- [ ] Performance (N+1 queries, missing indexes)
- [ ] Test coverage for new code paths

## Output
Group findings by file, severity first.
End with APPROVE / WARN / BLOCK verdict.
