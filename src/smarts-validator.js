(function (global, factory) {
  "use strict";

  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    define([], factory);
  } else {
    global.SMARTSValidator = factory();
  }
})(typeof window !== "undefined" ? window : globalThis, function factory() {
  "use strict";

  class SMARTSParseError extends Error {
    constructor(message, position, input) {
      const source = typeof input === "string" ? input : String(input ?? "");
      const pointer = `${source}\n${" ".repeat(Math.max(0, position))}^`;
      super(`${message} at position ${position}\n${pointer}`);
      this.name = "SMARTSParseError";
      this.position = position;
      this.input = source;
    }
  }

  class SMARTSParser {
    static ELEMENTS = new Set([
      "H", "He",
      "Li", "Be", "B", "C", "N", "O", "F", "Ne",
      "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
      "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn",
      "Ga", "Ge", "As", "Se", "Br", "Kr",
      "Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd",
      "In", "Sn", "Sb", "Te", "I", "Xe",
      "Cs", "Ba", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy",
      "Ho", "Er", "Tm", "Yb", "Lu",
      "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg",
      "Tl", "Pb", "Bi", "Po", "At", "Rn",
      "Fr", "Ra", "Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf",
      "Es", "Fm", "Md", "No", "Lr",
      "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn",
      "Nh", "Fl", "Mc", "Lv", "Ts", "Og"
    ]);

    static AROMATIC_SYMBOLS = new Set(["b", "c", "n", "o", "p", "s", "as", "se"]);
    static BOND_PRIMITIVES = new Set(["-", "=", "#", ":", "~", "/", "\\"]);
    static CHIRAL_CLASSES = {
      TH: [1, 2],
      AL: [1, 2],
      SP: [1, 3],
      TB: [1, 20],
      OH: [1, 30]
    };

    constructor(input) {
      this.input = input;
      this.i = 0;
      this.atomIndex = 0;
      this.pendingRings = new Map();
      this._lastPrimitiveWasCharge = false;
    }

    parse() {
      if (typeof this.input !== "string" || this.input.length === 0) {
        this.fail("SMARTS must be a non-empty string", 0);
      }

      const ws = this.input.search(/\s/);
      if (ws !== -1) {
        this.fail("Whitespace is not allowed in SMARTS", ws);
      }

      const ok = this.parsePattern(null);
      if (!ok) {
        this.fail("Expected SMARTS pattern");
      }

      if (!this.eof()) {
        const ch = this.peek();
        if (ch === ")") this.fail('Unexpected ")"');
        if (ch === "]") this.fail('Unexpected "]"');
        if (ch === ">") this.fail('Unexpected ">"');
        this.fail(`Unexpected token "${ch}"`);
      }

      if (this.pendingRings.size > 0) {
        const first = this.pendingRings.keys().next().value;
        this.fail(`Unclosed ring closure "${first}"`, this.input.length);
      }

      return true;
    }

    parsePattern(stopChar) {
      let sawComponent = false;

      while (true) {
        if (stopChar && this.peek() === stopChar) {
          return sawComponent;
        }

        if (this.eof()) {
          return sawComponent;
        }

        if (!this.isAtomStart()) {
          return sawComponent;
        }

        this.parseChain();
        sawComponent = true;

        if (this.peek() === ".") {
          this.i++;
          if (this.eof()) {
            this.fail('Pattern cannot end with "."', this.i - 1);
          }
          if (stopChar && this.peek() === stopChar) {
            this.fail('Pattern cannot end with "." before closing delimiter', this.i - 1);
          }
          if (!this.isAtomStart()) {
            this.fail('Expected atom after "."');
          }
          continue;
        }

        return sawComponent;
      }
    }

    parseChain() {
      let currentAtom = this.parseAtom();

      while (true) {
        while (true) {
          if (this.peek() === "(") {
            this.parseBranch();
            continue;
          }

          const save = this.i;
          let bondText = null;

          if (this.isBondExprStart()) {
            const start = this.i;
            this.parseBondExpression();
            bondText = this.input.slice(start, this.i);
          }

          if (this.isRingNumberStart()) {
            const ringId = this.parseRingNumber();
            this.registerRing(currentAtom, ringId, bondText);
            continue;
          }

          this.i = save;
          break;
        }

        if (this.eof()) break;
        if (this.peek() === "." || this.peek() === ")") break;
        if (this.peek() === "]") this.fail('Unexpected "]"');
        if (this.peek() === ">") break;

        if (this.isBondExprStart()) {
          this.parseBondExpression();
          if (!this.isAtomStart()) {
            this.fail("Expected atom after bond expression");
          }
          currentAtom = this.parseAtom();
          continue;
        }

        if (this.isAtomStart()) {
          currentAtom = this.parseAtom();
          continue;
        }

        break;
      }
    }

    parseBranch() {
      this.expect("(");

      if (this.peek() === ")") {
        this.fail("Empty branch");
      }

      if (this.isBondExprStart()) {
        this.parseBondExpression();
        if (!this.isAtomStart()) {
          this.fail("Expected atom after branch bond");
        }
      }

      const ok = this.parsePattern(")");
      if (!ok) {
        this.fail("Empty branch");
      }

      this.expect(")");
    }

    parseAtom() {
      if (this.peek() === "[") {
        this.parseBracketAtom();
      } else {
        this.parseBareAtom();
      }

      this.atomIndex += 1;
      return this.atomIndex;
    }

    parseBareAtom() {
      const token = this.matchAtomIdentity({ allowHydrogen: true });
      if (!token) {
        this.fail("Expected atom");
      }
      this.i += token.length;
    }

    parseBracketAtom() {
      this.expect("[");
      if (this.peek() === "]") {
        this.fail("Empty bracket atom");
      }
      this.parseAtomExpr();
      this.expect("]");
    }

    parseAtomExpr() {
      this.parseAtomOr();
    }

    parseAtomOr() {
      this.parseAtomLowAnd();
      while (this.peek() === ",") {
        this.i++;
        this.parseAtomLowAnd();
      }
    }

    parseAtomLowAnd() {
      this.parseAtomHighAnd();
      while (this.peek() === ";") {
        this.i++;
        this.parseAtomHighAnd();
      }
    }

    parseAtomHighAnd() {
      this.parseAtomUnary();
      while (true) {
        if (this.peek() === "&") {
          this.i++;
          this._lastPrimitiveWasCharge = false;
          this.parseAtomUnary();
          continue;
        }
        if (this.isImplicitAtomAndStart()) {
          if (this._lastPrimitiveWasCharge && (this.peek() === "+" || this.peek() === "-")) {
            this.fail("Adjacent charge primitives must be separated by an explicit operator (& , ;)");
          }
          this.parseAtomUnary();
          continue;
        }
        break;
      }
    }

    parseAtomUnary() {
      while (this.peek() === "!") {
        this.i++;
      }
      if (!this.isAtomPrimaryStart()) {
        this.fail("Expected atom primitive");
      }
      this.parseAtomPrimary();
    }

    parseAtomPrimary() {
      this._lastPrimitiveWasCharge = false;

      if (this.startsWith("$(")) {
        this.i += 2;
        const ok = this.parsePattern(")");
        if (!ok) {
          this.fail("Empty recursive SMARTS");
        }
        this.expect(")");
        return;
      }

      if (this.isIsotopeStart()) {
        const n = this.parseUnsignedInt();
        if (n < 1 || n > 999) {
          this.fail("Isotope must be in the range 1..999");
        }
        const id = this.matchAtomIdentity({ allowHydrogen: true });
        if (!id) {
          this.fail("Isotope must be followed by an atom identity");
        }
        this.i += id.length;
        return;
      }

      if (this.peek() === "#") {
        this.i++;
        const n = this.parseUnsignedInt();
        if (n < 1 || n > 118) {
          this.fail("Atomic number must be in the range 1..118");
        }
        return;
      }

      const id = this.matchAtomIdentity({ allowHydrogen: false });
      if (id) {
        this.i += id.length;
        return;
      }

      const ch = this.peek();

      if (
        ch === "H" || ch === "h" || ch === "D" ||
        ch === "X" || ch === "x" || ch === "v" ||
        ch === "R" || ch === "r"
      ) {
        this.i++;
        this.parseOptionalUnsignedInt();
        return;
      }

      if (ch === "+" || ch === "-") {
        this._lastPrimitiveWasCharge = true;
        this.parseCharge();
        return;
      }

      if (ch === "@") {
        this.parseChirality();
        return;
      }

      if (ch === "^") {
        this.parseHybridization();
        return;
      }

      if (ch === ":") {
        this.parseAtomMap();
        return;
      }

      this.fail(`Invalid atom primitive "${ch}"`);
    }

    parseCharge() {
      const sign = this.peek();
      this.i++;

      if (this.peek() === sign) {
        while (this.peek() === sign) {
          this.i++;
        }
        return;
      }

      if (this.isDigit(this.peek())) {
        this.parseUnsignedInt();
      }
    }

    parseChirality() {
      this.expect("@");

      if (this.peek() === "@") {
        this.i++;
        return;
      }

      const maybeClass = this.input.slice(this.i, this.i + 2);
      if (maybeClass in SMARTSParser.CHIRAL_CLASSES) {
        this.i += 2;
        const n = this.parseUnsignedInt();
        const [lo, hi] = SMARTSParser.CHIRAL_CLASSES[maybeClass];
        if (n < lo || n > hi) {
          this.fail(`@${maybeClass}${n} is out of allowed range ${lo}..${hi}`);
        }
      }
    }

    parseHybridization() {
      this.expect("^");
      const n = this.parseUnsignedInt();
      if (n > 8) {
        this.fail("Hybridization ^n must be in the range 0..8");
      }
    }

    parseAtomMap() {
      this.expect(":");
      const n = this.parseUnsignedInt();
      if (n < 1) {
        this.fail("Atom map must be >= 1");
      }
    }

    parseBondExpression() {
      this.parseBondOr();
    }

    parseBondOr() {
      this.parseBondAnd();
      while (this.peek() === ",") {
        this.i++;
        this.parseBondAnd();
      }
    }

    parseBondAnd() {
      this.parseBondUnary();
      while (this.peek() === "&" || this.peek() === ";") {
        this.i++;
        this.parseBondUnary();
      }
    }

    parseBondUnary() {
      while (this.peek() === "!") {
        this.i++;
      }
      this.parseBondPrimary();
    }

    parseBondPrimary() {
      const ch = this.peek();
      if (!SMARTSParser.BOND_PRIMITIVES.has(ch)) {
        this.fail("Expected bond primitive");
      }
      this.i++;
    }

    parseRingNumber() {
      if (this.isDigit(this.peek())) {
        const d = this.peek();
        this.i++;
        return d;
      }

      if (this.peek() !== "%") {
        this.fail("Expected ring number");
      }

      this.i++;

      if (this.peek() === "(") {
        this.i++;
        const n = this.parseUnsignedInt();
        if (n < 1 || n > 99999) {
          this.fail("Ring closure number must be in the range 1..99999");
        }
        if (this.peek() !== ")") {
          this.fail('Expected ")" after extended ring number');
        }
        this.i++;
        return `%(${n})`;
      }

      const d1 = this.peek();
      const d2 = this.peek(1);
      if (!this.isDigit(d1) || !this.isDigit(d2)) {
        this.fail('After "%" expected exactly two digits or "(digits)"');
      }
      this.i += 2;
      return `%${d1}${d2}`;
    }

    registerRing(atomIndex, ringId, bondText) {
      const prev = this.pendingRings.get(ringId);

      if (!prev) {
        this.pendingRings.set(ringId, { atomIndex, bondText });
        return;
      }

      if (prev.atomIndex === atomIndex) {
        this.fail(`Ring closure "${ringId}" cannot connect an atom to itself`);
      }

      if (prev.bondText && bondText && prev.bondText !== bondText) {
        this.fail(
          `Conflicting bond expressions for ring closure "${ringId}": "${prev.bondText}" vs "${bondText}"`
        );
      }

      this.pendingRings.delete(ringId);
    }

    isAtomStart() {
      if (this.peek() === "[") {
        return true;
      }
      return !!this.matchAtomIdentity({ allowHydrogen: true });
    }

    isAtomPrimaryStart() {
      if (this.startsWith("$(")) return true;
      if (this.isIsotopeStart()) return true;
      if (this.peek() === "#") return true;
      if (this.matchAtomIdentity({ allowHydrogen: false })) return true;

      const ch = this.peek();
      return (
        ch === "H" || ch === "h" || ch === "D" ||
        ch === "X" || ch === "x" || ch === "v" ||
        ch === "R" || ch === "r" ||
        ch === "+" || ch === "-" || ch === "@" ||
        ch === "^" || ch === ":"
      );
    }

    isImplicitAtomAndStart() {
      const ch = this.peek();
      if (!ch) return false;
      if (ch === "]" || ch === "," || ch === ";" || ch === "&") return false;
      return ch === "!" || this.isAtomPrimaryStart();
    }

    isBondExprStart() {
      const ch = this.peek();
      return ch === "!" || SMARTSParser.BOND_PRIMITIVES.has(ch);
    }

    isRingNumberStart() {
      return this.isDigit(this.peek()) || this.peek() === "%";
    }

    isIsotopeStart() {
      if (!this.isDigit(this.peek())) {
        return false;
      }

      let j = this.i;
      while (this.isDigit(this.input[j])) {
        j++;
      }

      const rest = this.input.slice(j);
      if (!rest) return false;

      if (rest[0] === "*") return true;
      if (rest[0] === "A" || rest[0] === "a") return true;

      const lower2 = rest.slice(0, 2);
      const lower1 = rest.slice(0, 1);
      if (SMARTSParser.AROMATIC_SYMBOLS.has(lower2)) return true;
      if (SMARTSParser.AROMATIC_SYMBOLS.has(lower1)) return true;

      const el2 = rest.slice(0, 2);
      const el1 = rest.slice(0, 1);
      if (SMARTSParser.ELEMENTS.has(el2)) return true;
      if (SMARTSParser.ELEMENTS.has(el1)) return true;

      return false;
    }

    matchAtomIdentity(options) {
      const allowHydrogen = !!(options && options.allowHydrogen);
      const ch = this.peek();
      if (!ch) return null;

      if (ch === "*") return "*";

      const lower2 = this.input.slice(this.i, this.i + 2);
      const lower1 = this.input.slice(this.i, this.i + 1);
      if (SMARTSParser.AROMATIC_SYMBOLS.has(lower2)) return lower2;
      if (SMARTSParser.AROMATIC_SYMBOLS.has(lower1)) return lower1;

      const two = this.input.slice(this.i, this.i + 2);
      const one = this.input.slice(this.i, this.i + 1);
      if (SMARTSParser.ELEMENTS.has(two)) return two;
      if (SMARTSParser.ELEMENTS.has(one)) {
        if (one === "H" && !allowHydrogen) return null;
        return one;
      }

      if (ch === "A" || ch === "a") return ch;

      return null;
    }

    parseUnsignedInt() {
      const start = this.i;
      while (this.isDigit(this.peek())) {
        this.i++;
      }
      if (this.i === start) {
        this.fail("Expected unsigned integer");
      }
      return Number(this.input.slice(start, this.i));
    }

    parseOptionalUnsignedInt() {
      const start = this.i;
      while (this.isDigit(this.peek())) {
        this.i++;
      }
      if (this.i === start) {
        return null;
      }
      return Number(this.input.slice(start, this.i));
    }

    expect(ch) {
      if (this.peek() !== ch) {
        this.fail(`Expected "${ch}"`);
      }
      this.i++;
    }

    startsWith(s) {
      return this.input.startsWith(s, this.i);
    }

    peek(ahead) {
      const n = typeof ahead === "number" ? ahead : 0;
      return this.input[this.i + n] ?? "";
    }

    eof() {
      return this.i >= this.input.length;
    }

    isDigit(ch) {
      return ch >= "0" && ch <= "9";
    }

    fail(message, pos) {
      throw new SMARTSParseError(message, typeof pos === "number" ? pos : this.i, this.input);
    }
  }

  function splitTopLevelReaction(input) {
    let inBracket = false;
    let parenDepth = 0;
    const topLevelGt = [];

    for (let i = 0; i < input.length; i++) {
      const ch = input[i];

      if (inBracket) {
        if (ch === "]") inBracket = false;
        continue;
      }

      if (ch === "[") {
        inBracket = true;
        continue;
      }

      if (ch === "(") {
        parenDepth++;
        continue;
      }

      if (ch === ")") {
        if (parenDepth > 0) {
          parenDepth--;
        }
        continue;
      }

      if (ch === ">" && parenDepth === 0) {
        topLevelGt.push(i);
      }
    }

    if (topLevelGt.length === 0) {
      return null;
    }

    if (topLevelGt.length === 2) {
      const g1 = topLevelGt[0];
      const g2 = topLevelGt[1];

      const reactants = input.slice(0, g1);
      const agents = input.slice(g1 + 1, g2);
      const products = input.slice(g2 + 1);

      if (!reactants) {
        throw new SMARTSParseError(
          "Reaction SMARTS must have a non-empty reactant side",
          g1,
          input
        );
      }

      if (!products) {
        throw new SMARTSParseError(
          "Reaction SMARTS must have a non-empty product side",
          g2 + 1,
          input
        );
      }

      return {
        reactants,
        agents,
        products,
        kind: "reaction"
      };
    }

    if (topLevelGt.length === 1) {
      const g = topLevelGt[0];

      if (input[g + 1] !== ">") {
        throw new SMARTSParseError(
          'Single ">" is not supported; use ">>" or "reactants>agents>products"',
          g,
          input
        );
      }

      if (input.indexOf(">>", g + 1) !== g + 1) {
        throw new SMARTSParseError("Invalid reaction separator", g, input);
      }

      if (input.indexOf(">", g + 2) !== -1) {
        throw new SMARTSParseError(
          "Mixed reaction separators are not allowed",
          input.indexOf(">", g + 2),
          input
        );
      }

      const reactants = input.slice(0, g);
      const products = input.slice(g + 2);

      if (!reactants) {
        throw new SMARTSParseError(
          "Reaction SMARTS must have a non-empty reactant side",
          g,
          input
        );
      }

      if (!products) {
        throw new SMARTSParseError(
          "Reaction SMARTS must have a non-empty product side",
          g + 2,
          input
        );
      }

      return {
        reactants,
        agents: "",
        products,
        kind: "reaction"
      };
    }

    throw new SMARTSParseError(
      "Invalid reaction SMARTS separator structure",
      topLevelGt[2],
      input
    );
  }

  function validateSMARTS(smarts) {
    try {
      if (typeof smarts !== "string" || smarts.length === 0) {
        throw new SMARTSParseError("SMARTS must be a non-empty string", 0, smarts);
      }

      const reaction = splitTopLevelReaction(smarts);

      if (reaction) {
        new SMARTSParser(reaction.reactants).parse();

        if (reaction.agents) {
          new SMARTSParser(reaction.agents).parse();
        }

        new SMARTSParser(reaction.products).parse();

        return {
          valid: true,
          kind: reaction.kind,
          errors: []
        };
      }

      new SMARTSParser(smarts).parse();

      return {
        valid: true,
        kind: "pattern",
        errors: []
      };
    } catch (err) {
      return {
        valid: false,
        kind: null,
        errors: [err instanceof Error ? err.message : String(err)]
      };
    }
  }

  return {
    SMARTSParseError: SMARTSParseError,
    SMARTSParser: SMARTSParser,
    splitTopLevelReaction: splitTopLevelReaction,
    validateSMARTS: validateSMARTS
  };
});