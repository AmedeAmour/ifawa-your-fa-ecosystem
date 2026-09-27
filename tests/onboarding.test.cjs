const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function onboarding() {
  const state = [];
  const accounts = [];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [
          state[index],
          (value) => {
            state[index] = value;
          },
        ];
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "@tanstack/react-router": { Link: "link", useNavigate: () => async () => {} },
    "@/lib/ifawa-auth": {
      signUpWithOnboarding: async (...args) => {
        accounts.push(args);
        return { status: "confirmation-required", user: null };
      },
    },
    "@/lib/store": { actions: {} },
    "@/data/mock": { signes: [{ slug: "gbe-medji", nom: "Gbé Mêdji" }] },
    "./primitives": { Btn: "button", Field: "field", Logo: "logo", Panel: "panel", inputCls: "" },
  };
  const exports = {};
  const source = fs.readFileSync("src/components/ifawa/OnboardingPage.tsx", "utf8");
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { exports, require: (name) => dependencies[name] },
  );
  function render() {
    cursor = 0;
    const nodes = [];
    function visit(node) {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node || typeof node !== "object") return;
      nodes.push(node);
      visit(node.props?.children);
    }
    visit(exports.OnboardingPage({ initiated: true }));
    return nodes;
  }
  const field = (label) =>
    render().find((node) => node.type === "field" && node.props.label === label).props.children;
  const fill = (label, value) => field(label).props.onChange({ target: { value } });
  const submit = () =>
    render()
      .find((node) => node.type === "form")
      .props.onSubmit({ preventDefault() {} });
  return { render, fill, submit, accounts };
}

test("initiated onboarding validates the journey before showing account fields and submits the selected experience", async () => {
  const flow = onboarding();
  const hasEmail = () => flow.render().some((node) => node.props?.type === "email");
  assert.equal(hasEmail(), false);
  await flow.submit();
  assert.ok(flow.render().some((node) => node.props?.list === "onboarding-signs"));
  flow.fill("Signe reçu", "Gbé Mêdji");
  flow.fill("Année d’initiation", "2020");
  await flow.submit();
  assert.equal(hasEmail(), false);
  await flow.submit();
  assert.ok(flow.render().some((node) => node.props?.name === "satisfaction"));
  const choice = flow
    .render()
    .find((node) => node.type === "input" && node.props.value === "Satisfait");
  choice.props.onChange({ target: { value: "Satisfait" } });
  flow.fill("Quelques mots sur vous", "   ");
  await flow.submit();
  assert.equal(hasEmail(), false);
  flow.fill("Quelques mots sur vous", " Mon parcours personnel. ");
  await flow.submit();
  assert.equal(hasEmail(), true);
  assert.equal(flow.accounts.length, 0);
  flow.fill("Pseudonyme", "Membre test");
  flow.fill("Adresse email", "test@example.com");
  flow.fill("Mot de passe", "test-password");
  await flow.submit();
  assert.equal(flow.accounts.length, 1);
  assert.equal(flow.accounts[0][2].satisfaction, "Satisfait");
  assert.equal(flow.accounts[0][2].annee, "2020");
  assert.equal(flow.accounts[0][2].temoignage, "Mon parcours personnel.");
});

test("a sign outside the suggestions is accepted and whitespace-only signs remain blocked", async () => {
  const flow = onboarding();
  flow.fill("Année d’initiation", "2020");
  flow.fill("Signe reçu", "   ");
  await flow.submit();
  assert.ok(flow.render().some((node) => node.props?.list === "onboarding-signs"));
  flow.fill("Signe reçu", " Mon signe personnel ");
  await flow.submit();
  flow
    .render()
    .find((node) => node.type === "input" && node.props.value === "Satisfait")
    .props.onChange({ target: { value: "Satisfait" } });
  flow.fill("Quelques mots sur vous", "Mon parcours.");
  await flow.submit();
  flow.fill("Pseudonyme", "Membre test");
  flow.fill("Adresse email", "test@example.com");
  flow.fill("Mot de passe", "test-password");
  await flow.submit();
  assert.equal(flow.accounts[0][2].signe, "Mon signe personnel");
});
