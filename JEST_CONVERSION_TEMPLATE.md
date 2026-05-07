# Quick Reference: Jest Conversion Template

## Copy-Paste Template for New Service Files

```javascript
// ============================================
// 1. FILE HEADER - Replace this exactly
// ============================================
const mongoose = require('mongoose');
jest.mock('../../../models/YourModel');
jest.mock('../../../models/OtherModel');

const YourModel = require('../../../models/YourModel');
const OtherModel = require('../../../models/OtherModel');
const yourService = require('../../../services/yourService');

// ============================================
// 2. HELPER FUNCTION - Copy this
// ============================================
describe('Your Service', () => {
  const testId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const otherId = new mongoose.Types.ObjectId();

  const createMockQuery = (resolvedValue) => ({
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(resolvedValue),
  });

  // ============================================
  // 3. BEFORE EACH - Setup mocks
  // ============================================
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock for documents (findById, findOne, etc.)
    YourModel.findById = jest.fn().mockResolvedValue({
      _id: testId,
      property: 'value',
      createdAt: new Date(),
      save: jest.fn().mockResolvedValue({...})
    });

    // Mock for query chains (find, etc.)
    YourModel.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: testId, property: 'value' }
      ]),
    });

    // Mock for static methods
    YourModel.create = jest.fn().mockResolvedValue({
      _id: testId,
      property: 'value',
    });
    
    YourModel.countDocuments = jest.fn().mockResolvedValue(3);
    YourModel.deleteMany = jest.fn().mockResolvedValue({deletedCount: 1});
  });

  // ============================================
  // 4. TEST CONVERSION PATTERNS
  // ============================================
  
  // PATTERN: Simple truthy check
  // BEFORE: assert(result);
  // AFTER:
  it('should return result', async () => {
    const result = await yourService.method();
    expect(result).toBeDefined();
  });

  // PATTERN: Property check
  // BEFORE: assert.ok(result.property);
  // AFTER:
  it('should have property', async () => {
    const result = await yourService.method();
    expect(result.property).toBeDefined();
  });

  // PATTERN: Equality check
  // BEFORE: assert.strictEqual(result, 'expected');
  // AFTER:
  it('should equal value', async () => {
    const result = await yourService.method();
    expect(result).toBe('expected');
  });

  // PATTERN: Array check
  // BEFORE: assert(Array.isArray(result));
  // AFTER:
  it('should return array', async () => {
    const result = await yourService.method();
    expect(Array.isArray(result)).toBe(true);
  });

  // PATTERN: Error throwing
  // BEFORE: 
  // try {
  //   await service.method();
  //   assert.fail('Should throw');
  // } catch(e) {
  //   assert(e);
  // }
  // AFTER:
  it('should throw error', async () => {
    await expect(
      yourService.method()
    ).rejects.toThrow();
  });

  // PATTERN: Mock call verification
  // BEFORE: assert(Model.findById.called);
  // AFTER:
  it('should call findById', async () => {
    await yourService.method();
    expect(YourModel.findById).toHaveBeenCalled();
  });
});
```

## Step-by-Step Conversion Process

### Step 1: Identify old structure
```bash
grep -n "const assert" tests/unit/services/yourService.test.js
grep -n "require('../../" tests/unit/services/yourService.test.js
```

### Step 2: Apply template
1. Replace header (imports and mocks)
2. Add helper createMockQuery()
3. Add beforeEach with jest.clearAllMocks()

### Step 3: Convert test by describe block
1. Open first describe block
2. Convert each it() test using patterns above
3. Run: `npm test -- yourService.test.js --watchAll=false`
4. Fix any mock issues
5. Move to next describe block

### Step 4: Common fixes needed

**Error: "Cannot read properties of undefined (reading 'X')"**
→ Mock is not returning expected object
→ Check that findById returns object with property X

**Error: "Model.X is not a function"**  
→ Mock method not set up
→ Add to beforeEach: `YourModel.X = jest.fn().mockResolvedValue(...)`

**Error: "Cannot read properties of undefined (reading 'lean')"**
→ Query chain broken
→ Change from `createMockQuery()` to full chain:
```javascript
YourModel.findOne = jest.fn().mockReturnValue({
  lean: jest.fn().mockResolvedValue({...})
});
```

**Error: Import path not found**
→ Wrong relative path
→ Change `../../services` to `../../../services`

## Test Running Commands

```bash
# Run single file
npm test -- messageEditService.test.js --watchAll=false

# Run all message services
npm test -- "tests/unit/services/message" --watchAll=false

# Run with verbose output
npm test -- serviceFile.test.js --watchAll=false --verbose

# Run specific describe block
npm test -- serviceFile.test.js -t "describe block name" --watchAll=false
```

## Mock Patterns by Use Case

### Use Case: Get single record by ID
```javascript
Model.findById = jest.fn().mockResolvedValue({
  _id: testId,
  name: 'test'
});
```

### Use Case: Get records with filtering
```javascript
Model.find = jest.fn().mockReturnValue({
  lean: jest.fn().mockResolvedValue([
    { _id: testId1, name: 'test1' },
    { _id: testId2, name: 'test2' }
  ])
});
```

### Use Case: Update and return
```javascript
Model.findByIdAndUpdate = jest.fn().mockReturnValue({
  populate: jest.fn().mockResolvedValue({...})
});
```

### Use Case: Create new record
```javascript
Model.create = jest.fn().mockResolvedValue({
  _id: testId,
  name: 'new'
});
```

### Use Case: Count records
```javascript
Model.countDocuments = jest.fn().mockResolvedValue(5);
```

### Use Case: Delete records
```javascript
Model.deleteMany = jest.fn().mockResolvedValue({
  deletedCount: 3
});
```

### Use Case: Aggregate/Stats
```javascript
Model.aggregate = jest.fn().mockResolvedValue([
  { _id: null, count: 10, total: 100 }
]);
```

## Checklist for Each File

- [ ] Replace import paths (../../ to ../../../)
- [ ] Add jest.mock() calls for all models
- [ ] Add createMockQuery helper
- [ ] Add beforeEach with jest.clearAllMocks()
- [ ] Set up all static method mocks
- [ ] Convert first describe block (test all patterns)
- [ ] Run test and verify
- [ ] Convert remaining describe blocks
- [ ] Final full run with all tests
- [ ] Commit with message "Convert [service].test.js to Jest"

## Expected Results

After following this template:
- No syntax errors (files should compile)
- All tests should run (no module errors)
- Expect 70-80% passing on first run
- Remaining failures from complex mocks
- Most fixable with mock adjustments

## Time Estimates

| File Size | Tests | Time Est |
|-----------|-------|----------|
| Small (<100 lines) | <10 | 30 min |
| Medium (100-200 lines) | 10-20 | 1-1.5 hr |
| Large (200+ lines) | 20+ | 1.5-2 hr |

---

Use this template for: messageThreadService, messageSearchService, messageForwardingService, messagePinService, etc.
