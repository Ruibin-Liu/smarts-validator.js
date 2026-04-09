# SMARTS Validator

A standalone, zero-dependency JavaScript validator for [SMARTS](https://www.daylight.com/dayhtml/doc/theory/theory.smarts.html) (SMiles ARbitrary Target Specification) patterns and reaction SMARTS. Works in browsers (CDN) and Node.js.

## Installation

### NPM
```bash
npm install smarts-validator
```

### CDN (Browser)
```html
<script src="https://unpkg.com/smarts-validator/dist/smarts-validator.min.js"></script>
```

## Quick Start

### Browser (Global)
```html
<script src="dist/smarts-validator.min.js"></script>
<script>
  const result = SMARTSValidator.validateSMARTS("[#6][CX3](=O)");
  // result = { valid: true, kind: "pattern", errors: [] }

  const bad = SMARTSValidator.validateSMARTS("C1CC");
  // bad = { valid: false, kind: null, errors: ["Unclosed ring closure ..."] }
</script>
```

### Node.js (CommonJS)
```js
const { validateSMARTS } = require('smarts-validator');

const result = validateSMARTS("[#6][CX3](=O)");
console.log(result);
```

### ES Modules
```js
import { validateSMARTS } from 'smarts-validator';

const result = validateSMARTS("[#6][CX3](=O)");
console.log(result);
```

## API

The library exports:

| Export | Description |
|--------|-------------|
| `validateSMARTS(input)` | Main entry point. Returns `{ valid, kind, errors }` |
| `SMARTSParser` | Parser class (for advanced usage) |
| `SMARTSParseError` | Custom error class with position info |
| `splitTopLevelReaction(input)` | Reaction SMARTS splitter |

### Return Value

```js
{
  valid: boolean,       // true if the input is valid SMARTS
  kind: string | null,  // "pattern", "reaction", or null (on error)
  errors: string[]      // empty on success, descriptive messages on failure
}
```

## Features

### Pattern Validation
- Bare atoms: `C`, `c`, `n`, `O`, `[OH]`, `*`, `A`, `a`
- Bracket atoms: `[C]`, `[#6]`, `[C@H]`, `[N+1]`, `[!#6]`, `[$(C=O)]`
- Atom expression operators: `!`, `&`, `,`, `;` with correct precedence
- Bond types: `-`, `=`, `#`, `:`, `~`, `/`, `\`
- Bond expression operators: `!`, `&`, `,`, `;`
- Ring closures: `1`–`9`, `%10`–`%99`, `%(100)`–`%(99999)`
- Branches: `(...)`
- Fragment separation: `.`
- Recursive SMARTS: `$(...)`
- Chirality: `@`, `@@`, `@TH1`–`@TH2`, `@AL1`–`@AL2`, `@SP1`–`@SP3`, `@TB1`–`@TB20`, `@OH1`–`@OH30`
- Hybridization (OpenEye extension): `^0`–`^8`
- Isotopes: `[12C]`, `[2H]` (range 1–999)
- Atom maps: `:1`, `:2`, ...
- Charges: `+`, `++`, `+2`, `-`, `--`, `-3`, `+0`, `-0`

### Reaction SMARTS
- Two-part: `reactants>>products`
- Three-part: `reactants>agents>products` (single `>` separators)
- Multi-component: `CCO.O>>CC=O.O`
- Atom-mapped: `[C:1][OH:2]>>[C:1]=[O:2]`

### Error Reporting
Every error includes the exact position and a visual pointer:

```
Unclosed ring closure "1" at position 4
C1CC
    ^
```

## Comparison with Other Toolkits

### vs RDKit

| Behavior | RDKit | This Validator |
|----------|-------|---------------|
| Empty string `""` | Returns empty molecule (valid) | **Rejected** — must be non-empty |
| Whitespace `C C` | Accepted | **Rejected** |
| `[#0]` (atomic number 0) | Accepted | **Rejected** — range 1–118 |
| `[#119]` (atomic number 119) | Accepted | **Rejected** — range 1–118 |
| `[C:0]` (atom map 0) | Accepted | **Rejected** — must be ≥ 1 |
| `[^9]` (hybridization) | Rejected (unknown token) | **Rejected** — range 0–8 |
| `[+0]` / `[-0]` (zero charge) | Rejected | **Accepted** — valid explicit zero charge |
| Conflicting ring bonds `C=1CCCCC#1` | Accepted | **Rejected** — bond mismatch |
| `@TH3`, `@SP4`, `@AL3`, `@OH31` | Accepted silently | **Rejected** — out-of-range chirality |
| Error messages | Generic "Failed parsing SMARTS" | **Specific** — describes exact issue with position |

### vs OpenBabel

| Behavior | OpenBabel | This Validator |
|----------|-----------|---------------|
| `^` (hybridization) | Not supported | Supported (OpenEye extension, `^0`–`^8`) |
| `>>` reaction SMARTS | Not supported as input | Supported |
| `reactants>agents>products` | Not supported | Supported |
| Conflicting ring bonds `C=1CCCCC#1` | Rejected | Rejected (same) |
| `[+0]` / `[-0]` | Rejected | Accepted |

### Stricter-than-standard validations

These are intentionally stricter than Daylight spec (where the spec is ambiguous or permissive):

- Empty input is rejected
- Whitespace is rejected
- Atomic numbers are clamped to 1–118
- Atom map numbers must be ≥ 1
- Isotope numbers are clamped to 1–999
- Chirality permutation indices are range-checked
- Conflicting ring closure bond types are rejected
- Hybridization indices are clamped to 0–8

## Running Tests

```bash
npm test
```

Or in browser:
```html
<script src="src/smarts-validator.js"></script>
<script src="test/test.js"></script>
<script>
  const result = SMARTSTestSuite.runTestSuite();
  console.log(`Passed: ${result.passed}/${result.total}`);
</script>
```

### Test Coverage

- **44 positive pattern cases** from OpenBabel's SMARTS library (functional group patterns)
- **6 positive reaction cases** (oxidation, substitution, mapped reactions, agents)
- **34 negative cases** covering syntax errors, range violations, structural errors, and derived malformed variants of positive cases

## Architecture

The parser is a hand-written recursive descent parser (no code generation, no dependencies), with:

- **Operator precedence** for atom expressions: OR (`,`) > low-AND (`;`) > high-AND (`&`/implicit) > unary (`!`) > primary
- **Operator precedence** for bond expressions: OR (`,`) > AND (`&`/`;`) > unary (`!`) > primary
- **Implicit conjunction**: adjacent atom primitives inside `[]` are implicitly ANDed (e.g., `[OH]` = `O&H`)
- **Backtracking-free**: all decisions are made with 1-character lookahead
- **Ring closure tracking**: pending ring openings are tracked and validated for conflicts

## Project Structure

```
smarts-validator/
├── src/
│   └── smarts-validator.js     # Source (UMD module)
├── test/
│   └── test.js                 # Test suite
├── dist/                       # Built files (npm run build)
│   ├── smarts-validator.js     # UMD build
│   ├── smarts-validator.esm.js # ES module build
│   └── smarts-validator.min.js # Minified for CDN
├── package.json
└── README.md
```

## License

Same as the parent project.
