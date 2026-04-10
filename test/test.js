// SMARTS Validator Test Suite
// Supports both CommonJS (Node) and Browser environments

(function (global, factory) {
  "use strict";

  if (typeof module === "object" && typeof module.exports === "object") {
    const validator = require("../src/smarts-validator.js");
    module.exports = factory(validator);
  } else if (typeof define === "function" && define.amd) {
    define(["../src/smarts-validator"], factory);
  } else {
    global.SMARTSTestSuite = factory(global.SMARTSValidator);
  }
})(typeof window !== "undefined" ? window : globalThis, function factory(validator) {
  "use strict";

  const validateSMARTS = validator.validateSMARTS;

  const positiveCases = [
    { id: 1, input: "[+]", kind: "pattern", label: "cation", source: "openbabel" },
    { id: 2, input: "[-]", kind: "pattern", label: "anion", source: "openbabel" },
    { id: 3, input: "[#6][CX3](=O)", kind: "pattern", label: "aldehyde or ketone", source: "openbabel" },
    { id: 4, input: "[CX3H1](=O)[#6]", kind: "pattern", label: "aldehyde", source: "openbabel" },
    { id: 5, input: "[#6][CX3](=O)[#6]", kind: "pattern", label: "ketone", source: "openbabel" },
    { id: 6, input: "[#6][CX3](=S)", kind: "pattern", label: "thioaldehyde or thioketone", source: "openbabel" },
    { id: 7, input: "[CX3H1](=S)", kind: "pattern", label: "thioaldehyde", source: "openbabel" },
    { id: 8, input: "[#6]C(=[S])[#6]", kind: "pattern", label: "thioketone", source: "openbabel" },
    { id: 9, input: "[CX3]=N([#6,#1])[#6,#1]", kind: "pattern", label: "imine", source: "openbabel" },
    { id: 10, input: "[#6,#1]C([#6,#1])=[N][N]([#6,#1])[#6,#1]", kind: "pattern", label: "hydrazone", source: "openbabel" },
    { id: 11, input: "[#6,#1]C([#6,#1])=[N][N]([#6,#1])C(=[O])[N]([#6,#1])[#6,#1]", kind: "pattern", label: "semicarbazone", source: "openbabel" },
    { id: 12, input: "[#6,#1]C([#6,#1])=[N][N]([#6,#1])C(=[S])[N]([#6,#1])[#6,#1]", kind: "pattern", label: "thiosemicarbazone", source: "openbabel" },
    { id: 13, input: "[#6,#1]C([#6,#1])=[N][OH]", kind: "pattern", label: "oxime", source: "openbabel" },
    { id: 14, input: "[#6,#1]C([#6,#1])=[N][O][#6]", kind: "pattern", label: "oxime ether", source: "openbabel" },
    { id: 15, input: "[CX3]=C=O", kind: "pattern", label: "ketene", source: "openbabel" },
    { id: 16, input: "[CX3]=C=O", kind: "pattern", label: "keten acetyl derivative", source: "openbabel" },
    { id: 17, input: "[#6,#1]C([#6,#1])([OH])([OH])", kind: "pattern", label: "carbonyl hydrate", source: "openbabel" },
    { id: 18, input: "[#6,#1]C([#6,#1])([OH])(O[#6])", kind: "pattern", label: "hemiacetal", source: "openbabel" },
    { id: 19, input: "[#6,#1]C([#6,#1])(O[#6])(O[#6])", kind: "pattern", label: "acetal", source: "openbabel" },
    { id: 20, input: "[#6,#1]C([#6,#1])(N([#6,#1])[#6,#1])(O[#6])", kind: "pattern", label: "hemiaminal", source: "openbabel" },
    { id: 21, input: "[#6,#1]C([#6,#1])(N([#6,#1])[#6,#1])(N([#6,#1])[#6,#1])", kind: "pattern", label: "aminal", source: "openbabel" },
    { id: 22, input: "[#6,#1]C([#6,#1])(N([#6,#1])[#6,#1])([S][#6])", kind: "pattern", label: "thiohemiaminal", source: "openbabel" },
    { id: 23, input: "[#6,#1]C([#6,#1])([S][#6])([S][#6])", kind: "pattern", label: "thioacetal", source: "openbabel" },
    { id: 24, input: "[#6,#1]C([#6,#1])=C([#6,#1])N([#6,#1])[#6,#1]", kind: "pattern", label: "enamine", source: "openbabel" },
    { id: 25, input: "[#6,#1]C([#6,#1])=C([#6,#1])[OH]", kind: "pattern", label: "enol", source: "openbabel" },
    { id: 26, input: "[#6,#1]C([#6,#1])=C([#6,#1])O[#6]", kind: "pattern", label: "enol ether", source: "openbabel" },
    { id: 27, input: "[#6][OH]", kind: "pattern", label: "hydroxy compound", source: "openbabel" },
    { id: 28, input: "C[OH]", kind: "pattern", label: "alcohol", source: "openbabel" },
    { id: 29, input: "[#6][CH2][OH]", kind: "pattern", label: "primary alcohol", source: "openbabel" },
    { id: 30, input: "[#6][CH]([#6])[OH]", kind: "pattern", label: "secondary alcohol", source: "openbabel" },
    { id: 31, input: "[#6][C]([#6])([#6])[OH]", kind: "pattern", label: "tertiary alcohol", source: "openbabel" },
    { id: 32, input: "[#6,#1]C([#6,#1])([OH])C([#6,#1])([#6,#1])[OH]", kind: "pattern", label: "1,2-diol", source: "openbabel" },
    { id: 33, input: "[#6,#1]C([#6,#1])([OH])C([#6,#1])([#6,#1])[NH2]", kind: "pattern", label: "1,2-aminoalcohol", source: "openbabel" },
    { id: 34, input: "c[OH]", kind: "pattern", label: "phenol", source: "openbabel" },
    { id: 35, input: "[OH]cc[OH]", kind: "pattern", label: "1,2-diphenol", source: "openbabel" },
    { id: 36, input: "[OH]C=C[OH]", kind: "pattern", label: "enediol", source: "openbabel" },
    { id: 37, input: "[#6]O[#6]", kind: "pattern", label: "ether", source: "openbabel" },
    { id: 38, input: "COC", kind: "pattern", label: "dialkyl ether", source: "openbabel" },
    { id: 39, input: "cOC", kind: "pattern", label: "alkylaryl ether", source: "openbabel" },
    { id: 40, input: "cOc", kind: "pattern", label: "diaryl ether", source: "openbabel" },
    { id: 41, input: "[#6]S[#6]", kind: "pattern", label: "thioether", source: "openbabel" },
    { id: 42, input: "[#6]SS[#6]", kind: "pattern", label: "disulfide", source: "openbabel" },
    { id: 43, input: "[#6]OO[#6]", kind: "pattern", label: "peroxide", source: "openbabel" },
    { id: 44, input: "[#6]O[OH]", kind: "pattern", label: "hydroperoxide", source: "openbabel" },
    { id: 200, input: "[a]", kind: "pattern", label: "aryl", source: "openbabel" },
    { id: 201, input: "[!#6;$([N,O,S,F,Cl,Br,I,P])]", kind: "pattern", label: "heteroatom", source: "openbabel" },
    { id: 202, input: "[!#6;!$([+0]);!$([F,Cl,Br,I]);!$([o,s,nX3]);!$([Nv5,Pv5,Sv4,Sv6])]", kind: "pattern", label: "HBA", source: "openbabel" },
    { id: 203, input: "[$([N,O;!H0]),$(N(C)(C)C)]", kind: "pattern", label: "HBD", source: "openbabel" },
    { id: 204, input: "[R]", kind: "pattern", label: "Ring", source: "openbabel" },
    { id: 205, input: "[$([$([C;$(C=[$([O;D1;$(O=C)])])]);$(C[$([O;$([H1&-0,H0&-1])])]);$(C[#6,#1])])]", kind: "pattern", label: "carboxylic acid", source: "openbabel" },
    { id: 206, input: "[$([$([C;$(C=[$([O;D1;$(O=C)])])]);$(C(=O)O[#6]);$(C[#6,#1])])]", kind: "pattern", label: "ester", source: "openbabel" },
    { id: 207, input: "[$([N;+0,+1;$(N(=O)~[O;H0;-0,-1])])]", kind: "pattern", label: "nitro", source: "openbabel" },
    { id: 208, input: "[$([C;$(C#[N;D1])])]", kind: "pattern", label: "nitrile", source: "openbabel" },
    { id: 209, input: "[$([N;!$(N*=[!#6])]);$(N[$([a])]);!$(N~[!#6])]", kind: "pattern", label: "aniline", source: "openbabel" },
    { id: 210, input: "[$([N;$(N[$([$([C;$(C=[$([O;D1;$(O=C)])])]);$(C(=O)(N)N)])])])]", kind: "pattern", label: "urea", source: "openbabel" },
    { id: "rxn-1", input: "CCO>>CC=O", kind: "reaction", label: "simple oxidation", source: "custom" },
    { id: "rxn-2", input: "CCO.O>>CC=O.O", kind: "reaction", label: "multi-component reaction", source: "custom" },
    { id: "rxn-3", input: "CCO>O>CC=O", kind: "reaction", label: "reaction with agents", source: "custom" },
    { id: "rxn-4", input: "[C:1][OH:2]>>[C:1]=[O:2]", kind: "reaction", label: "mapped reaction", source: "custom" },
    { id: "rxn-5", input: "[C:1](=[O:2])[OH:3]>>[C:1](=[O:2])[O-:3]", kind: "reaction", label: "mapped deprotonation", source: "custom" },
    { id: "rxn-6", input: "[CH3:1][Br:2].[OH-:3]>>[CH3:1][OH:3].[Br-:2]", kind: "reaction", label: "substitution reaction", source: "custom" }
  ];

  const negativeCases = [
    { id: "neg-1", input: "", errorIncludes: "non-empty string", source: "derived" },
    { id: "neg-2", input: "C C", errorIncludes: "Whitespace is not allowed", source: "derived" },
    { id: "neg-3", input: "()", errorIncludes: "Expected SMARTS pattern", source: "derived" },
    { id: "neg-4", input: "C)", errorIncludes: 'Unexpected ")"', source: "derived" },
    { id: "neg-5", input: "C]", errorIncludes: 'Unexpected "]"', source: "derived" },
    { id: "neg-6", input: "C.", errorIncludes: 'Pattern cannot end with "."', source: "derived" },
    { id: "neg-7", input: "C..O", errorIncludes: 'Expected atom after "."', source: "derived" },
    { id: "neg-8", input: "C(", errorIncludes: "Empty branch", source: "derived" },
    { id: "neg-9", input: "C(O", errorIncludes: 'Expected ")"', source: "derived" },
    { id: "neg-10", input: "C(=)O", errorIncludes: "Expected atom after branch bond", source: "derived" },
    { id: "neg-11", input: "[", errorIncludes: "Expected atom primitive", source: "derived" },
    { id: "neg-12", input: "[C", errorIncludes: 'Expected "]"', source: "derived" },
    { id: "neg-13", input: "[]", errorIncludes: "Empty bracket atom", source: "derived" },
    { id: "neg-14", input: "[$()]", errorIncludes: "Empty recursive SMARTS", source: "derived" },
    { id: "neg-15", input: "C1CC", errorIncludes: "Unclosed ring closure", source: "derived" },
    { id: "neg-16", input: "C11", errorIncludes: "cannot connect an atom to itself", source: "derived" },
    { id: "neg-17", input: "C%1CC%1", errorIncludes: 'After "%" expected exactly two digits or "(digits)"', source: "derived" },
    { id: "neg-18", input: "[#0]", errorIncludes: "Atomic number must be in the range 1..118", source: "derived" },
    { id: "neg-19", input: "[#119]", errorIncludes: "Atomic number must be in the range 1..118", source: "derived" },
    { id: "neg-20", input: "[C:0]", errorIncludes: "Atom map must be >= 1", source: "derived" },
    { id: "neg-21", input: "[C+-]", errorIncludes: "Adjacent charge primitives", source: "derived" },
    { id: "neg-22", input: "[^9]", errorIncludes: "Hybridization ^n must be in the range 0..8", source: "derived" },
    { id: "neg-23", input: "[@TB21]", errorIncludes: "@TB21 is out of allowed range 1..20", source: "derived" },
    { id: "neg-24", input: "C=", errorIncludes: "Expected atom after bond expression", source: "derived" },
    { id: "neg-25", input: ">>CCO", errorIncludes: "non-empty reactant side", source: "derived" },
    { id: "neg-26", input: "CCO>>", errorIncludes: "non-empty product side", source: "derived" },
    { id: "neg-27", input: "CCO>CC", errorIncludes: 'Single ">" is not supported; use ">>" or "reactants>agents>products"', source: "derived" },
    { id: "neg-28", input: "A>>B>>C", errorIncludes: "Invalid reaction SMARTS separator structure", source: "derived" },
    { id: "neg-29", input: "CCO>>>CC=O", errorIncludes: "Invalid reaction SMARTS separator structure", source: "derived" },
    { id: "neg-ob-3a", input: "[#6][CX3](=O", errorIncludes: 'Expected ")"', source: "openbabel-derived", derivedFrom: 3 },
    { id: "neg-ob-9a", input: "[CX3]=N([#6,#1])[#6,#1", errorIncludes: 'Expected "]"', source: "openbabel-derived", derivedFrom: 9 },
    { id: "neg-ob-17a", input: "[#6,#1]C([#6,#1])([OH])([OH]", errorIncludes: 'Expected ")"', source: "openbabel-derived", derivedFrom: 17 },
    { id: "neg-ob-24a", input: "[#6,#1]C([#6,#1])=C([#6,#1])N([#6,#1])[#6,#1]]", errorIncludes: 'Unexpected "]"', source: "openbabel-derived", derivedFrom: 24 },
    { id: "neg-ob-37a", input: "[#6]O[#6].", errorIncludes: 'Pattern cannot end with "."', source: "openbabel-derived", derivedFrom: 37 },
    { id: "neg-30", input: "[C++-]", errorIncludes: "Adjacent charge primitives", source: "derived" },
    { id: "neg-31", input: "[C+++++-++]", errorIncludes: "Adjacent charge primitives", source: "derived" }
  ];

  const allCases = positiveCases.concat(
    negativeCases.map(function (tc) {
      return Object.assign({ kind: null }, tc);
    })
  );

  function runTestCase(testCase) {
    const result = validateSMARTS(testCase.input);
    const firstError = result && result.errors && result.errors[0] ? result.errors[0] : "";

    let passed;
    if (testCase.kind === "pattern" || testCase.kind === "reaction") {
      passed = result.valid === true && result.kind === testCase.kind;
    } else {
      passed = result.valid === false && firstError.indexOf(testCase.errorIncludes) !== -1;
    }

    return {
      id: testCase.id,
      input: testCase.input,
      label: testCase.label || "",
      expectedKind: testCase.kind,
      expectedErrorIncludes: testCase.errorIncludes || "",
      knownGap: !!testCase.knownGap,
      passed: passed,
      result: result
    };
  }

  function runTestSuite(options) {
    const opts = options || {};
    const includeKnownGaps = !!opts.includeKnownGaps;
    const cases = allCases.filter(function (tc) {
      return includeKnownGaps || !tc.knownGap;
    });

    const details = cases.map(runTestCase);
    const passed = details.filter(d => d.passed).length;
    const failed = details.length - passed;

    return { passed, failed, total: details.length, details };
  }

  if (typeof module !== "undefined" && !module.parent) {
    const results = runTestSuite();
    console.log(`\nSMARTS Validator Test Results`);
    console.log(`=============================`);
    console.log(`Passed: ${results.passed}/${results.total}`);
    console.log(`Failed: ${results.failed}/${results.total}`);
    
    if (results.failed > 0) {
      console.log(`\nFailed Tests:`);
      results.details.filter(d => !d.passed).forEach(d => {
        console.log(`  - ${d.id}: "${d.input}"`);
        console.log(`    Expected: ${d.expectedKind || d.expectedErrorIncludes}`);
        console.log(`    Got: valid=${d.result.valid}, kind=${d.result.kind}`);
        if (d.result.errors.length > 0) {
          console.log(`    Error: ${d.result.errors[0].substring(0, 100)}`);
        }
      });
      process.exit(1);
    } else {
      console.log(`\nAll ${results.total} tests passed!`);
      process.exit(0);
    }
  }

  return {
    positiveCases,
    negativeCases,
    allCases,
    runTestCase,
    runTestSuite
  };
});