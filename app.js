// ================================================================
//  PRECIFICA FÁCIL — LÓGICA COMPLETA
//  com visual de edição de produto detalhado (CORRIGIDO)
// ================================================================

const KEY = "precifica-facil-v1";

const defaultState = {
  settings: {
    fixedCosts: [
      { id: crypto.randomUUID(), name: "Espaço / aluguel", value: 0, mode: "fixed" },
      { id: crypto.randomUUID(), name: "Água", value: 0, mode: "fixed" },
      { id: crypto.randomUUID(), name: "Luz", value: 0, mode: "fixed" },
      { id: crypto.randomUUID(), name: "Internet", value: 0, mode: "fixed" }
    ],
    salary: 0,
    monthlyHours: 160,
    targetMargin: 40
  },
  materials: [],
  products: []
};

let state = load();
let route = "dashboard";

// ===== UTILITÁRIOS =====
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || structuredClone(defaultState); } catch { return structuredClone(defaultState); }
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function money(v) { return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function num(v) { return Number(String(v).replace(",", ".")) || 0; }
function uid() { return crypto.randomUUID(); }
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }
function escAttr(s) { return esc(s); }

// ===== CÁLCULOS =====
function monthlyFixed() {
  return state.settings.fixedCosts.reduce((sum, c) => sum + (c.mode === "percent" ? 0 : num(c.value)), 0) + num(state.settings.salary);
}
function laborRate() {
  const hours = num(state.settings.monthlyHours);
  return hours > 0 ? num(state.settings.salary) / hours : 0;
}
function materialCost(materialId, qty) {
  const m = state.materials.find(x => x.id === materialId);
  return m ? num(m.price) / Math.max(num(m.purchaseQty), 0.000001) * num(qty) : 0;
}

// CÁLCULO COMPLETO DO PRODUTO
function productCalc(p) {
  const mats = (p.materials || []).map(x => ({
    ...x,
    cost: materialCost(x.materialId, x.qty),
    material: state.materials.find(m => m.id === x.materialId)
  }));
  const materials = mats.reduce((s, x) => s + x.cost, 0);

  let labor = 0;
  if (p.laborMode === "hour") {
    labor = laborRate() * num(p.labor);
  } else {
    labor = num(p.labor);
  }

  const fixedRate = num(p.fixedPercent) / 100;
  const fixed = monthlyFixed() * fixedRate;
  const subtotal = materials + labor + fixed + num(p.otherCost);
  const margin = num(p.margin ?? state.settings.targetMargin);
  const profit = subtotal * (margin / 100);
  const total = subtotal + profit;

  return {
    mats,
    materials,
    labor,
    fixed,
    other: num(p.otherCost),
    subtotal,
    margin,
    profit,
    total,
    laborRate: laborRate(),
    laborTime: num(p.labor)
  };
}

// ===== FORMATAR TEMPO =====
function formatTime(minutes) {
  if (!minutes || minutes <= 0) return '0min';
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// ===== RENDER PRINCIPAL =====
function render() {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.route === route));
  const app = document.getElementById("app");
  if (route === "dashboard") app.innerHTML = dashboard();
  if (route === "products") app.innerHTML = productsPage();
  if (route === "materials") app.innerHTML = materialsPage();
  if (route === "finance") app.innerHTML = financePage();
  bind();
}

// ===== DASHBOARD =====
function dashboard() {
  const products = state.products;
  const totals = products.reduce((a, p) => { const c = productCalc(p); a.cost += c.subtotal; a.sales += c.total; a.profit += c.profit; return a; }, { cost: 0, sales: 0, profit: 0 });

  const hasProducts = products.length > 0;
  const hasMaterials = state.materials.length > 0;
  const hasFinance = monthlyFixed() > 0;

  return `
    <div class="hero">
      <div class="hero-eyebrow">Bem-vinda ao Precifica! ❤️</div>
      <h2>Sua ferramenta completa para precificar seus produtos artesanais com confiança e precisão.</h2>
      <p>Cadastre seus custos, materiais e produtos. O preço sugerido considera tudo o que sua peça realmente custa.</p>
      <div class="money">${money(totals.sales)}</div>
      <div class="hero-sub">venda potencial dos ${products.length} produtos cadastrados</div>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-label"><span class="icon">⏱️</span> Custo por Hora</div>
        <div class="stat-value primary">${money(laborRate())}</div>
        <div class="stat-sub">Salário + custos fixos</div>
      </div>
      <div class="stat">
        <div class="stat-label"><span class="icon">📊</span> Custos Fixos</div>
        <div class="stat-value">${money(state.settings.fixedCosts.reduce((s,c) => s + (c.mode === "fixed" ? num(c.value) : 0), 0))}</div>
        <div class="stat-sub">Despesas mensais</div>
      </div>
      <div class="stat">
        <div class="stat-label"><span class="icon">📦</span> Materiais</div>
        <div class="stat-value">${state.materials.length}</div>
        <div class="stat-sub">Cadastrados</div>
      </div>
      <div class="stat">
        <div class="stat-label"><span class="icon">🛍️</span> Produtos</div>
        <div class="stat-value">${products.length}</div>
        <div class="stat-sub">Cadastrados</div>
      </div>
    </div>

    <div class="section-head"><div><h3>Ações Rápidas</h3></div></div>
    <div class="quick-actions">
      <a href="#" class="quick-action" data-route-go="finance">
        <div class="qa-icon purple">💰</div>
        <div class="qa-text"><div class="qa-title">Gerenciar Custos</div><div class="qa-desc">Aluguel, água, luz e mais</div></div>
      </a>
      <a href="#" class="quick-action" data-route-go="materials">
        <div class="qa-icon pink">🧵</div>
        <div class="qa-text"><div class="qa-title">Cadastrar Materiais</div><div class="qa-desc">Linhas, tecidos, contas...</div></div>
      </a>
      <a href="#" class="quick-action" data-route-go="products">
        <div class="qa-icon green">✨</div>
        <div class="qa-text"><div class="qa-title">Criar Produtos</div><div class="qa-desc">Adicione suas peças</div></div>
      </a>
      <a href="#" class="quick-action" data-route-go="products">
        <div class="qa-icon orange">🧮</div>
        <div class="qa-text"><div class="qa-title">Calcular Preço</div><div class="qa-desc">Descubra o preço ideal</div></div>
      </a>
    </div>

    ${!hasProducts || !hasMaterials || !hasFinance ? `
    <div class="section-head"><div><h3>✨ Começando do zero?</h3></div></div>
    <div class="card" style="border-style:dashed;border-color:#cdbde9;background:#fcfaff">
      <div class="kpi">
        <span class="kpi-label"><span style="display:inline-flex;width:22px;height:22px;border-radius:50%;background:var(--secondary);align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--primary);margin-right:6px;">1</span> Configure seu salário desejado e horas de trabalho</span>
        <span class="chip ${hasFinance ? 'success' : 'warning'}">${hasFinance ? '✅ Feito' : 'Pendente'}</span>
      </div>
      <div class="kpi">
        <span class="kpi-label"><span style="display:inline-flex;width:22px;height:22px;border-radius:50%;background:var(--secondary);align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--primary);margin-right:6px;">2</span> Cadastre todos os materiais que você usa</span>
        <span class="chip ${hasMaterials ? 'success' : 'warning'}">${hasMaterials ? '✅ Feito' : 'Pendente'}</span>
      </div>
      <div class="kpi">
        <span class="kpi-label"><span style="display:inline-flex;width:22px;height:22px;border-radius:50%;background:var(--secondary);align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--primary);margin-right:6px;">3</span> Crie seus produtos e calcule o preço ideal</span>
        <span class="chip ${hasProducts ? 'success' : 'warning'}">${hasProducts ? '✅ Feito' : 'Pendente'}</span>
      </div>
    </div>
    ` : ''}

    <div class="section-head"><div><h3>Produtos recentes</h3></div><button class="btn-link" data-route-go="products">Ver todos →</button></div>
    ${products.length ? products.slice(-3).reverse().map(p => {
      const c = productCalc(p);
      return `<div class="card list-card" style="cursor:pointer" data-action="view-product" data-id="${p.id}">
        <div class="thumb">${p.photo ? `<img src="${p.photo}" alt="">` : "✦"}</div>
        <div class="grow"><div class="card-title truncate">${esc(p.name)}</div><div class="muted">${(p.materials || []).length} materiais · ${c.margin}% de margem</div></div>
        <div class="price">${money(c.total)}</div>
      </div>`;
    }).join("") : `
      <div class="card empty">
        <span class="empty-icon">🛍️</span>
        <strong>Seu catálogo começa aqui</strong>
        Cadastre seu primeiro produto para descobrir o preço ideal.
        <br><br>
        <button class="btn btn-primary btn-sm" data-action="new-product">+ Novo produto</button>
      </div>
    `}
  `;
}

// ===== PRODUTOS (lista) =====
function productsPage() {
  return `
    <div class="section-head"><div><h2>Produtos</h2><div class="subtitle">Suas peças e preços sugeridos</div></div><button class="btn btn-primary btn-sm" data-action="new-product">+ Novo</button></div>
    ${state.products.length ? state.products.slice().reverse().map(p => {
      const c = productCalc(p);
      return `
      <div class="card list-card" style="cursor:pointer" data-action="view-product" data-id="${p.id}">
        <div class="thumb">${p.photo ? `<img src="${p.photo}" alt="">` : "✦"}</div>
        <div class="grow"><div class="card-title truncate">${esc(p.name)}</div><div class="muted">${(p.materials || []).length} materiais · custo ${money(c.subtotal)}</div></div>
        <div><div class="price">${money(c.total)}</div><div style="display:flex;gap:4px;justify-content:flex-end;margin-top:4px"><button class="icon-action" data-action="edit-product" data-id="${p.id}" title="Editar">✎</button><button class="icon-action danger" data-action="delete-product" data-id="${p.id}" title="Excluir">×</button></div></div>
      </div>
    `}).join("") : `
      <div class="card empty">
        <span class="empty-icon">🛍️</span>
        <strong>Nenhum produto ainda</strong>
        Adicione uma foto, os materiais, sua mão de obra e o lucro.
        <br><br>
        <button class="btn btn-primary btn-sm" data-action="new-product">+ Criar primeiro produto</button>
      </div>
    `}
  `;
}

// ===== MATERIAIS =====
function materialsPage() {
  return `
    <div class="section-head"><div><h2>Materiais</h2><div class="subtitle">Tudo o que entra nas suas peças</div></div><button class="btn btn-primary btn-sm" data-action="new-material">+ Novo</button></div>
    ${state.materials.length ? state.materials.map(m => `
      <div class="card list-card">
        <div class="thumb">◇</div>
        <div class="grow"><div class="card-title">${esc(m.name)}</div><div class="muted">${money(num(m.price) / Math.max(num(m.purchaseQty), 0.000001))} / ${esc(m.unit)}</div><div class="muted" style="font-size:11px">${m.purchaseQty} ${esc(m.unit)} por ${money(m.price)}</div></div>
        <div style="display:flex;gap:4px"><button class="icon-action" data-action="edit-material" data-id="${m.id}" title="Editar">✎</button><button class="icon-action danger" data-action="delete-material" data-id="${m.id}" title="Excluir">×</button></div>
      </div>
    `).join("") : `
      <div class="card empty">
        <span class="empty-icon">🧵</span>
        <strong>Cadastre seus materiais</strong>
        Ex.: tecido, fita, linha, embalagem, ferragens...
        <br><br>
        <button class="btn btn-primary btn-sm" data-action="new-material">+ Adicionar material</button>
      </div>
    `}
  `;
}

// ===== FINANCEIRO =====
function financePage() {
  return `
    <div class="section-head"><div><h2>Financeiro</h2><div class="subtitle">Custos que precisam aparecer no preço</div></div></div>

    <div class="card">
      <div class="card-title">💰 Salário / pró-labore</div>
      <div class="card-desc">Quanto você quer receber por mês trabalhando no negócio?</div>
      <div class="form-grid" style="margin-top:12px">
        ${field("salary", "Seu salário mensal", state.settings.salary, "number", "", true)}
        ${field("monthlyHours", "Horas produtivas / mês", state.settings.monthlyHours, "number", "", true)}
        ${field("targetMargin", "Margem de lucro padrão (%)", state.settings.targetMargin, "number", "", true)}
      </div>
      <div style="background:var(--secondary);border-radius:14px;padding:12px 16px;margin-top:10px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;color:var(--muted-foreground)">Valor da sua hora de trabalho</span>
        <span style="font-size:20px;font-weight:700;color:var(--primary)">${money(laborRate())}</span>
      </div>
      <button class="btn btn-primary btn-block" data-action="save-finance" style="margin-top:12px">Salvar configurações</button>
    </div>

    <div class="section-head"><div><h3>Custos fixos mensais</h3><div class="subtitle">Valores fixos ou percentuais</div></div><button class="btn btn-ghost btn-sm" data-action="add-fixed">+ Adicionar</button></div>

    ${state.settings.fixedCosts.map(c => `
      <div class="card" data-fixed-card="${c.id}">
        <div class="form-grid">
          ${field("fc-name", "Descrição", c.name, "text", "", true)}
          <div class="field"><label>Tipo</label><select data-fc-mode="${c.id}"><option value="fixed" ${c.mode === "fixed" ? "selected" : ""}>Valor fixo</option><option value="percent" ${c.mode === "percent" ? "selected" : ""}>Percentual</option></select></div>
          ${field("fc-value", "Valor", c.value, "number", "", true)}
          <div style="display:flex;align-items:end"><button class="btn btn-danger btn-block btn-sm" data-action="remove-fixed" data-id="${c.id}">Remover</button></div>
        </div>
      </div>
    `).join("")}

    <div class="total-box">
      <div class="total-row"><span class="label">Custos fixos</span><strong>${money(state.settings.fixedCosts.filter(x => x.mode === "fixed").reduce((s, x) => s + num(x.value), 0))}</strong></div>
      <div class="total-row"><span class="label">Salário / pró-labore</span><strong>${money(state.settings.salary)}</strong></div>
      <div class="total-row final"><span class="label">Base mensal</span><strong>${money(monthlyFixed())}</strong></div>
    </div>

    <div class="section-head"><div><h3>💾 Backup dos dados</h3><div class="subtitle">Leve seus cadastros para outro aparelho.</div></div></div>
    <div class="actions">
      <button class="btn btn-ghost" data-action="export">📥 Exportar</button>
      <button class="btn btn-ghost" data-action="import">📤 Importar</button>
      <input id="importFile" type="file" accept=".json" hidden>
    </div>
  `;
}

function field(id, label, value, type = "text", placeholder = "", full = false) {
  return `<div class="field ${full ? "full" : ""}"><label>${label}</label><input id="${id}" type="${type}" value="${escAttr(value ?? "")}" placeholder="${escAttr(placeholder)}"></div>`;
}

// ================================================================
//  VISUALIZAÇÃO DETALHADA DO PRODUTO (CORRIGIDA)
//  - Foto pequena (52x52)
//  - Layout limpo como no print
// ================================================================

function viewProductModal(productId) {
  const p = state.products.find(x => x.id === productId);
  if (!p) return toast("Produto não encontrado");
  const c = productCalc(p);

  const hasMaterials = c.mats.length > 0;

  modal(`Editar Produto`, `
    <!-- Cabeçalho com nome e foto (foto pequena) -->
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
      <div style="width:52px;height:52px;border-radius:14px;background:var(--secondary);display:grid;place-items:center;overflow:hidden;flex:none;border:1px solid var(--border);font-size:20px">
        ${p.photo ? `<img src="${p.photo}" alt="" style="width:100%;height:100%;object-fit:cover">` : "✦"}
      </div>
      <div>
        <div style="font-size:18px;font-weight:600;font-family:'Playfair Display',serif">${esc(p.name)}</div>
        <div style="font-size:13px;color:var(--muted-foreground);font-family:'Inter',sans-serif">${p.description || 'Sem descrição'}</div>
      </div>
    </div>

    <!-- MATERIAIS -->
    <div style="margin-top:8px;margin-bottom:4px;font-weight:600;font-size:15px;font-family:'Inter',sans-serif">Materiais</div>
    <div class="card" style="padding:14px;margin-bottom:8px">
      ${hasMaterials ? `
        <div class="materials-list">
          ${c.mats.map(m => `
            <div class="material-item">
              <div>
                <span class="mat-name">${esc(m.material?.name || 'Material')}</span>
                <span class="mat-detail"> — ${m.qty} ${m.material?.unit || 'un.'}</span>
              </div>
              <span class="mat-price">${money(m.cost)}</span>
            </div>
          `).join('')}
          <div class="material-subtotal">
            <span>Subtotal</span>
            <span>${money(c.materials)}</span>
          </div>
        </div>
      ` : `
        <div style="color:var(--muted-foreground);font-size:13px;text-align:center;padding:8px;font-family:'Inter',sans-serif">Nenhum material adicionado</div>
      `}
    </div>

    <!-- TRABALHO -->
    <div style="margin-top:12px;margin-bottom:4px;font-weight:600;font-size:15px;font-family:'Inter',sans-serif">Trabalho</div>
    <div class="labor-display">
      <div class="labor-time">
        <span style="font-size:16px">⏱️</span>
        <span class="time">${formatTime(c.laborTime * 60)}</span>
        <span class="time-label">de trabalho</span>
      </div>
      <div class="labor-value">${money(c.labor)}</div>
    </div>

    <!-- LUCRO -->
    <div style="margin-top:12px;margin-bottom:4px;font-weight:600;font-size:15px;font-family:'Inter',sans-serif">Lucro</div>
    <div class="profit-display">
      <span class="profit-percent">💰 <span class="percent">${c.margin}%</span> de lucro</span>
      <span class="profit-value">+${money(c.profit)}</span>
    </div>

    <!-- PREÇO FINAL -->
    <div style="margin-top:16px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-weight:600;font-size:15px;font-family:'Inter',sans-serif">Preço final</span>
      <button class="edit-btn" data-action="edit-product" data-id="${p.id}">✎ Editar preço final</button>
    </div>

    <div class="price-breakdown">
      <div class="breakdown-total">
        <span class="total-label">Total</span>
        <span class="total-value">${money(c.total)}</span>
      </div>

      <div class="breakdown-row">
        <span class="label">Preço Base</span>
        <span class="value primary">${money(c.subtotal + c.profit)}</span>
      </div>

      <div class="breakdown-row sub">
        <span class="label">Custo total</span>
        <span class="value">${money(c.subtotal)}</span>
      </div>

      <div class="breakdown-row sub" style="padding-left:32px">
        <span class="label">Materiais</span>
        <span class="value">${money(c.materials)}</span>
      </div>

      <div class="breakdown-row sub" style="padding-left:32px">
        <span class="label">Trabalho</span>
        <span class="value">${money(c.labor)}</span>
      </div>

      <div class="breakdown-row">
        <span class="label">Lucro (${c.margin}%)</span>
        <span class="value success">+${money(c.profit)}</span>
      </div>

      <div class="breakdown-row">
        <span class="label">Taxas</span>
        <span class="value danger">${money(c.other)}</span>
      </div>
    </div>

    <!-- AÇÕES -->
    <div class="actions" style="margin-top:16px">
      <button class="btn btn-primary" data-action="edit-product" data-id="${p.id}">✎ Editar produto</button>
      <button class="btn btn-danger" data-action="delete-product" data-id="${p.id}">🗑️ Excluir</button>
    </div>
  `);

  // Re-bind para os botões dentro do modal
  setTimeout(() => {
    document.querySelectorAll("#modalRoot [data-action]").forEach(b => {
      b.onclick = () => actions(b.dataset.action, b.dataset.id);
    });
  }, 50);
}

// ================================================================
//  MODAL (genérico)
// ================================================================

function modal(title, body) {
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-head">
          <h2>${title}</h2>
          <button class="close" data-action="close-modal">✕</button>
        </div>
        ${body}
      </div>
    </div>
  `;
  bind();
}

// ===== MATERIAL MODAL =====
function materialModal(m = {}) {
  modal(m.id ? "Editar material" : "Novo material", `
    ${field("m-name", "Nome do material", m.name || "", "text", "Ex.: Fita de cetim", true)}
    <div class="form-grid">
      <div class="field"><label>Unidade de medida</label><select id="m-unit">${["unidade", "metro", "cm", "kg", "g", "litro", "ml"].map(x => `<option ${m.unit === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      ${field("m-qty", "Quantidade comprada", m.purchaseQty || 1, "number", "", false)}
      ${field("m-price", "Preço pago (R$)", m.price || 0, "number", "", false)}
    </div>
    <div class="total-box"><div class="total-row final"><span class="label">Custo por ${m.unit || "unidade"}</span><strong id="m-unit-cost">${money(num(m.price) / Math.max(num(m.purchaseQty), 0.000001))}</strong></div></div>
    <button class="btn btn-primary btn-block" data-action="save-material" data-id="${m.id || ""}" style="margin-top:12px">Salvar material</button>
  `);
  ["m-qty", "m-price", "m-unit"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateMaterialPreview);
  });
}

function updateMaterialPreview() {
  const qty = num(document.getElementById("m-qty")?.value);
  const price = num(document.getElementById("m-price")?.value);
  const el = document.getElementById("m-unit-cost");
  if (el) el.textContent = money(price / Math.max(qty, 0.000001));
}

// ===== PRODUCT MODAL (editor completo) =====
function productModal(p = {}) {
  const selected = p.materials || [];
  modal(p.id ? "Editar produto" : "Novo produto", `
    ${field("p-name", "Nome do produto", p.name || "", "text", "Ex.: Bolsa Aurora", true)}
    <div class="field full"><label>Foto do produto</label><div class="upload"><div class="photo-picker"><div class="photo-preview" id="photoPreview">${p.photo ? `<img src="${p.photo}" alt="">` : "📷"}</div><div><input id="p-photo" type="file" accept="image/*"><div class="muted">Use uma foto quadrada para facilitar a identificação.</div></div></div></div></div>
    ${field("p-description", "Descrição", p.description || "", "text", "Opcional", true)}

    <div class="section-head"><div><h3>Materiais usados</h3><div class="subtitle">Informe quanto da unidade cadastrada entra nesta peça.</div></div><button class="btn btn-ghost btn-sm" data-action="add-product-material">+ Material</button></div>
    <div id="productMaterials">${selected.map(materialLine).join("")}</div>

    <div class="card" style="background:#fcfaff;margin-top:8px">
      <div class="form-grid">
        <div class="field"><label>⏱️ Mão de obra</label>
          <input id="p-labor" type="number" step="0.01" value="${escAttr(p.labor ?? 0)}" placeholder="0">
          <div style="font-size:10px;color:var(--muted-foreground);margin-top:2px">${p.laborMode === "hour" ? `⏱️ ${money(laborRate())}/hora` : '💰 Valor fixo por peça'}</div>
        </div>
        <div class="field"><label>Forma</label>
          <select id="p-labor-mode">
            <option value="hour" ${p.laborMode === "hour" ? "selected" : ""}>⏱️ Horas trabalhadas</option>
            <option value="fixed" ${p.laborMode !== "hour" ? "selected" : ""}>💰 Valor fixo</option>
          </select>
        </div>
        ${field("p-fixed", "Rateio dos custos fixos (%)", p.fixedPercent ?? 5, "number", "", true)}
        ${field("p-other", "Outros custos (R$)", p.otherCost ?? 0, "number", "", true)}
        ${field("p-margin", "Lucro (%)", p.margin ?? state.settings.targetMargin, "number", "", true)}
      </div>
      <div id="productPreview"></div>
    </div>
    <button class="btn btn-primary btn-block" data-action="save-product" data-id="${p.id || ""}">Salvar produto</button>
  `);

  const photoInput = document.getElementById("p-photo");
  if (photoInput) {
    photoInput.addEventListener("change", e => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const preview = document.getElementById("photoPreview");
        if (preview) preview.innerHTML = `<img src="${r.result}" alt="">`;
      };
      r.readAsDataURL(f);
    });
  }

  ["p-labor", "p-labor-mode", "p-fixed", "p-other", "p-margin"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateProductPreview);
  });
  updateProductPreview();
}

function materialLine(x) {
  const m = state.materials.find(v => v.id === x.materialId);
  return `<div class="material-row" data-pm="${x.materialId}">
    <div class="field"><label>${esc(m?.name || "Material removido")}</label><div class="mini">${m ? money(num(m.price) / Math.max(num(m.purchaseQty), 0.000001)) + " / " + m.unit : "indisponível"}</div></div>
    <div class="field"><label>Qtd.</label><input class="pm-qty" data-mid="${x.materialId}" type="number" min="0" step="0.01" value="${x.qty}"></div>
    <div class="mini" style="padding-bottom:11px">${money(materialCost(x.materialId, x.qty))}</div>
    <button class="icon-action danger remove-pm" data-mid="${x.materialId}" title="Remover">×</button>
  </div>`;
}

function readProductMaterials() {
  return [...document.querySelectorAll(".pm-qty")].map(i => ({ materialId: i.dataset.mid, qty: num(i.value) }));
}

function updateProductPreview() {
  const temp = {
    materials: readProductMaterials(),
    labor: num(document.getElementById("p-labor")?.value),
    laborMode: document.getElementById("p-labor-mode")?.value || "hour",
    fixedPercent: num(document.getElementById("p-fixed")?.value),
    otherCost: num(document.getElementById("p-other")?.value),
    margin: num(document.getElementById("p-margin")?.value)
  };
  const c = productCalc(temp);
  const preview = document.getElementById("productPreview");
  if (preview) {
    preview.innerHTML = `
      <div class="total-box">
        <div class="total-row"><span class="label">Materiais</span><strong>${money(c.materials)}</strong></div>
        <div class="total-row"><span class="label">Mão de obra ${temp.laborMode === "hour" ? `(${money(c.laborRate)}/h)` : ''}</span><strong>${money(c.labor)}</strong></div>
        <div class="total-row"><span class="label">Custos fixos rateados</span><strong>${money(c.fixed)}</strong></div>
        <div class="total-row"><span class="label">Outros custos</span><strong>${money(c.other)}</strong></div>
        <div class="total-row" style="border-top:1px dashed #d8ccef;padding-top:8px;margin-top:4px"><span class="label" style="font-weight:600">Custo real</span><strong style="font-size:16px">${money(c.subtotal)}</strong></div>
        <div class="total-row"><span class="label">Lucro (${c.margin}%)</span><strong style="color:#1f9d68">+${money(c.profit)}</strong></div>
        <div class="total-row final"><span class="label">Preço sugerido</span><strong>${money(c.total)}</strong></div>
      </div>
    `;
  }
  document.querySelectorAll(".pm-qty").forEach(i => i.addEventListener("input", updateProductPreview));
}

// ================================================================
//  BIND & ACTIONS
// ================================================================

function bind() {
  document.querySelectorAll(".nav-item").forEach(b => {
    b.onclick = () => { route = b.dataset.route; render(); };
  });
  document.querySelectorAll("[data-route-go]").forEach(b => {
    b.onclick = (e) => {
      e.preventDefault();
      route = b.dataset.routeGo;
      render();
    };
  });
  document.querySelectorAll("[data-action]").forEach(b => {
    b.onclick = () => actions(b.dataset.action, b.dataset.id);
  });
  document.querySelectorAll(".remove-pm").forEach(b => {
    b.onclick = () => {
      b.closest(".material-row")?.remove();
      updateProductPreview();
    };
  });
  // View product (click no card)
  document.querySelectorAll("[data-action='view-product']").forEach(b => {
    b.onclick = () => viewProductModal(b.dataset.id);
  });
}

function actions(action, id) {
  if (action === "close-modal") { document.getElementById("modalRoot").innerHTML = ""; return; }

  // ---- MATERIAIS ----
  if (action === "new-material") return materialModal();
  if (action === "edit-material") return materialModal(state.materials.find(x => x.id === id));
  if (action === "delete-material") {
    if (!confirm("Excluir este material?")) return;
    state.materials = state.materials.filter(x => x.id !== id);
    save(); render(); toast("Material excluído");
    return;
  }
  if (action === "save-material") {
    const item = {
      id: id || uid(),
      name: document.getElementById("m-name")?.value.trim() || "",
      unit: document.getElementById("m-unit")?.value || "unidade",
      purchaseQty: num(document.getElementById("m-qty")?.value),
      price: num(document.getElementById("m-price")?.value)
    };
    if (!item.name || item.purchaseQty <= 0) { toast("Preencha nome e quantidade."); return; }
    const idx = state.materials.findIndex(x => x.id === item.id);
    if (idx >= 0) state.materials[idx] = item;
    else state.materials.push(item);
    save(); document.getElementById("modalRoot").innerHTML = ""; render(); toast("Material salvo ✨");
    return;
  }

  // ---- PRODUTOS ----
  if (action === "new-product") return productModal();
  if (action === "edit-product") {
    const p = state.products.find(x => x.id === id);
    if (p) {
      document.getElementById("modalRoot").innerHTML = "";
      return productModal(p);
    }
    return toast("Produto não encontrado");
  }
  if (action === "view-product") return viewProductModal(id);
  if (action === "delete-product") {
    if (!confirm("Excluir este produto?")) return;
    state.products = state.products.filter(x => x.id !== id);
    save(); render(); toast("Produto excluído");
    return;
  }
  if (action === "add-product-material") {
    if (!state.materials.length) { toast("Cadastre um material primeiro."); return; }
    const wrap = document.getElementById("productMaterials");
    if (!wrap) return;
    const usedIds = readProductMaterials().map(x => x.materialId);
    const available = state.materials.find(m => !usedIds.includes(m.id)) || state.materials[0];
    wrap.insertAdjacentHTML("beforeend", materialLine({ materialId: available.id, qty: 1 }));
    bind(); updateProductPreview();
    return;
  }
  if (action === "save-product") {
    const existing = state.products.find(x => x.id === id);
    let photo = existing?.photo || "";
    const file = document.getElementById("p-photo")?.files[0];
    const saveIt = (photoData) => {
      const item = {
        id: id || uid(),
        name: document.getElementById("p-name")?.value.trim() || "",
        description: document.getElementById("p-description")?.value.trim() || "",
        photo: photoData,
        materials: readProductMaterials(),
        labor: num(document.getElementById("p-labor")?.value),
        laborMode: document.getElementById("p-labor-mode")?.value || "hour",
        fixedPercent: num(document.getElementById("p-fixed")?.value),
        otherCost: num(document.getElementById("p-other")?.value),
        margin: num(document.getElementById("p-margin")?.value)
      };
      if (!item.name) { toast("Informe o nome do produto."); return; }
      const idx = state.products.findIndex(x => x.id === item.id);
      if (idx >= 0) state.products[idx] = item;
      else state.products.push(item);
      save(); document.getElementById("modalRoot").innerHTML = ""; render(); toast("Produto salvo ✨");
    };
    if (file) {
      const r = new FileReader();
      r.onload = () => saveIt(r.result);
      r.readAsDataURL(file);
    } else {
      saveIt(photo);
    }
    return;
  }

  // ---- FINANCEIRO ----
  if (action === "save-finance") {
    state.settings.salary = num(document.getElementById("salary")?.value);
    state.settings.monthlyHours = num(document.getElementById("monthlyHours")?.value);
    state.settings.targetMargin = num(document.getElementById("targetMargin")?.value);
    save();
    document.querySelectorAll("[data-fixed-card]").forEach(card => {
      const cid = card.dataset.fixedCard;
      const c = state.settings.fixedCosts.find(x => x.id === cid);
      if (!c) return;
      const nameInput = card.querySelector("#fc-name");
      const valueInput = card.querySelector("#fc-value");
      const modeSelect = card.querySelector(`[data-fc-mode="${cid}"]`);
      if (nameInput) c.name = nameInput.value.trim() || c.name;
      if (valueInput) c.value = num(valueInput.value);
      if (modeSelect) c.mode = modeSelect.value;
    });
    save(); render(); toast("Configurações salvas ✨");
    return;
  }
  if (action === "add-fixed") {
    state.settings.fixedCosts.push({ id: uid(), name: "Novo custo", value: 0, mode: "fixed" });
    save(); render();
    return;
  }
  if (action === "remove-fixed") {
    state.settings.fixedCosts = state.settings.fixedCosts.filter(x => x.id !== id);
    save(); render();
    return;
  }

  // ---- BACKUP ----
  if (action === "export") {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "precifica-facil-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
    return;
  }
  if (action === "import") {
    document.getElementById("importFile")?.click();
    return;
  }
}

// ===== IMPORT FILE =====
document.addEventListener("change", e => {
  if (e.target.id === "importFile") {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        state = JSON.parse(r.result);
        save(); render(); toast("Backup importado ✅");
      } catch {
        toast("Arquivo inválido");
      }
    };
    r.readAsText(f);
  }
});

// ===== SETTINGS QUICK =====
document.getElementById("settingsQuick").onclick = () => { route = "finance"; render(); };

// ===== TOAST =====
function toast(msg) {
  const x = document.createElement("div");
  x.className = "toast";
  x.textContent = msg;
  document.body.appendChild(x);
  setTimeout(() => x.remove(), 2400);
}

// ===== INIT =====
render();