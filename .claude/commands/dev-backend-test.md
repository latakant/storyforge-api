Write or fix unit tests for a NestJS service.

$ARGUMENTS

Parse: module name, service method (optional — if blank, cover all uncovered methods), fix/new.

---

**STEP 1 — Read the existing test file**
Read: `src/modules/<module>/<module>.service.spec.ts`
Note:
- Existing mock setup (PrismaService mock, how it's structured)
- Which methods are already tested
- Which are missing or thin (no error paths)

---

**STEP 2 — Read the service**
Read: `src/modules/<module>/<module>.service.ts`

For each public method, identify:
- Input parameters and types
- Prisma calls made (model, operation)
- Business rules applied
- Exceptions thrown (NotFoundException, ConflictException, BadRequestException)
- Return type

---

**STEP 3 — Map coverage gaps**

For each service method, check if the test file covers:
- [ ] Happy path (valid input → expected output)
- [ ] P2025 → NotFoundException (findUnique returns null)
- [ ] P2002 → ConflictException (unique constraint violation)
- [ ] Business rule violation → correct exception
- [ ] Edge cases (empty list → `[]`, not `null`)

---

**STEP 4 — Write tests using the existing mock pattern**

Standard test structure (follow what's already in the spec file):
```typescript
describe('<ServiceMethod>', () => {
  it('should return <entity> when found', async () => {
    // Arrange
    mockPrismaService.<model>.findUnique.mockResolvedValue(mockEntity)

    // Act
    const result = await service.get<Entity>(mockId)

    // Assert
    expect(result).toEqual(mockEntity)
    expect(mockPrismaService.<model>.findUnique).toHaveBeenCalledWith({
      where: { id: mockId },
    })
  })

  it('should throw NotFoundException when <entity> not found', async () => {
    mockPrismaService.<model>.findUnique.mockResolvedValue(null)
    await expect(service.get<Entity>('nonexistent')).rejects.toThrow(NotFoundException)
  })

  it('should throw ConflictException on duplicate', async () => {
    mockPrismaService.<model>.create.mockRejectedValue(
      new PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.0.0',
      })
    )
    await expect(service.create<Entity>(mockDto)).rejects.toThrow(ConflictException)
  })
})
```

Rules:
- One `it()` per scenario — keep tests focused
- Use `mockResolvedValue` for async Prisma calls
- Use `mockRejectedValue` for error scenarios
- Always assert both: the return value AND the Prisma call arguments
- Mock only what the method under test calls — don't over-mock

---

**STEP 5 — Run tests**
Run: `npx jest --testPathPattern=<module> --verbose`
All tests must pass. Fix any failures before continuing.

---

**STEP 6 — Check coverage**
Run: `npx jest --testPathPattern=<module> --coverage`
Every public method should have at minimum: 1 happy path + 1 error path.

---

**STEP 7 — Update TRACKER**
Append to `ai/TRACKER.md`:
```
[YYYY-MM-DD] TESTS — <module> — [N] test cases added covering [method list]
```

---

Output: methods now covered | test count before → after | all passing | coverage summary
