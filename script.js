// =============================================================
// CARDÁPIO DIGITAL — lógica do site + painel admin
// =============================================================
// ⚠️ Antes de publicar, troque a senha abaixo:
const ADMIN_PASSWORD = 'admin123';
// =============================================================

const STORAGE_KEY = 'cardapio_digital_data';
const AUTH_KEY = 'cardapio_digital_auth';

const CATEGORY_COLORS = ['#ff6247', '#12a594', '#ffc93c', '#6c5ce7', '#ff6fa8'];

const DEFAULT_DATA = {
  businessName: 'Meu Cardápio',
  emoji: '🍽️',
  tagline: 'Feito com carinho pra você escolher',
  categories: ['Entradas', 'Pratos principais', 'Bebidas', 'Sobremesas'],
  items: [
    {
      id: 'seed-1',
      name: 'Item de exemplo',
      category: 'Pratos principais',
      description: 'Troque por uma descrição real do seu produto: ingredientes, tamanho ou detalhes que ajudem o cliente a escolher.',
      price: 29.9,
      stock: true,
      image: null
    },
    {
      id: 'seed-2',
      name: 'Outro exemplo',
      category: 'Bebidas',
      description: 'Este é só um item de demonstração. Edite ou remova no painel do lojista.',
      price: 9.5,
      stock: true,
      image: null
    }
  ]
};

let state = loadState();

// -------------------------------------------------------------
// estado / persistência
// -------------------------------------------------------------
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredCloneSafe(DEFAULT_DATA);
    const parsed = JSON.parse(raw);
    return {
      businessName: parsed.businessName || DEFAULT_DATA.businessName,
      emoji: parsed.emoji || DEFAULT_DATA.emoji,
      tagline: parsed.tagline ?? DEFAULT_DATA.tagline,
      categories: Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : [...DEFAULT_DATA.categories],
      items: Array.isArray(parsed.items) ? parsed.items : []
    };
  } catch (e) {
    console.error('Erro ao carregar dados, usando padrão.', e);
    return structuredCloneSafe(DEFAULT_DATA);
  }
}

function structuredCloneSafe(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Erro ao salvar dados.', e);
    showToast('Não foi possível salvar. Espaço de armazenamento cheio?');
  }
}

function categoryColor(category) {
  const idx = state.categories.indexOf(category);
  return CATEGORY_COLORS[(idx < 0 ? 0 : idx) % CATEGORY_COLORS.length];
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function uid() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// -------------------------------------------------------------
// toast
// -------------------------------------------------------------
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => { toast.hidden = true; }, 250);
  }, 2200);
}

// -------------------------------------------------------------
// ROTEAMENTO (menu público x admin)
// -------------------------------------------------------------
function router() {
  const isAdmin = window.location.hash === '#admin';
  document.getElementById('view-menu').hidden = isAdmin;
  document.getElementById('view-admin').hidden = !isAdmin;

  if (isAdmin) {
    const authed = sessionStorage.getItem(AUTH_KEY) === 'true';
    document.getElementById('adminLogin').hidden = authed;
    document.getElementById('adminPanel').hidden = !authed;
    if (authed) renderAdmin();
  } else {
    renderMenu();
  }
}

window.addEventListener('hashchange', router);

// -------------------------------------------------------------
// VISÃO PÚBLICA — CARDÁPIO
// -------------------------------------------------------------
let activeCategory = 'Todos';
let searchTerm = '';

function renderMenu() {
  document.getElementById('brandEmoji').textContent = state.emoji;
  document.getElementById('brandName').textContent = state.businessName;

  renderCategoryPills();

  const grid = document.getElementById('menuGrid');
  const emptyState = document.getElementById('emptyState');
  grid.innerHTML = '';

  const term = searchTerm.trim().toLowerCase();
  const items = state.items.filter(item => {
    const matchesCategory = activeCategory === 'Todos' || item.category === activeCategory;
    const matchesSearch = !term ||
      item.name.toLowerCase().includes(term) ||
      (item.description || '').toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  if (!items.length) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  items.forEach(item => grid.appendChild(buildItemCard(item)));
}

function renderCategoryPills() {
  const wrap = document.getElementById('categoryPills');
  wrap.innerHTML = '';

  const all = ['Todos', ...state.categories];
  all.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'pill' + (cat === activeCategory ? ' is-active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      activeCategory = cat;
      renderMenu();
    });
    wrap.appendChild(btn);
  });
}

function buildItemCard(item) {
  const card = document.createElement('article');
  card.className = 'item-card' + (item.stock ? '' : ' is-out');
  card.style.setProperty('--accent', categoryColor(item.category));

  const thumb = document.createElement('div');
  thumb.className = 'item-thumb';
  if (item.image) {
    const img = document.createElement('img');
    img.src = item.image;
    img.alt = item.name;
    thumb.appendChild(img);
  } else {
    thumb.textContent = state.emoji;
  }

  const body = document.createElement('div');
  body.className = 'item-body';

  const info = document.createElement('div');
  info.className = 'item-info';
  info.innerHTML = `
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description || '')}</p>
    ${item.stock
      ? `<span class="item-tag">${escapeHtml(item.category)}</span>`
      : `<span class="out-badge">Esgotado</span>`}
  `;

  const priceCol = document.createElement('div');
  priceCol.className = 'item-price-col';
  priceCol.innerHTML = `<span class="item-price">${formatPrice(item.price)}</span>`;

  body.appendChild(info);
  body.appendChild(priceCol);
  card.appendChild(thumb);
  card.appendChild(body);
  return card;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// -------------------------------------------------------------
// LOGIN ADMIN
// -------------------------------------------------------------
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const value = document.getElementById('loginPassword').value;
  const errorText = document.getElementById('loginError');

  if (value === ADMIN_PASSWORD) {
    sessionStorage.setItem(AUTH_KEY, 'true');
    errorText.hidden = true;
    document.getElementById('loginPassword').value = '';
    router();
  } else {
    errorText.hidden = false;
  }
});

document.getElementById('backToMenuBtn').addEventListener('click', () => {
  window.location.hash = '';
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem(AUTH_KEY);
  router();
});

document.getElementById('openAdminBtn').addEventListener('click', () => {
  window.location.hash = '#admin';
});

document.getElementById('viewMenuBtn').addEventListener('click', () => {
  window.location.hash = '';
});

// -------------------------------------------------------------
// VISÃO ADMIN
// -------------------------------------------------------------
let editingImageData = null; // base64 da imagem em edição/novo item

function renderAdmin() {
  document.getElementById('adminBrandEmoji').textContent = state.emoji;

  document.getElementById('cfgEmoji').value = state.emoji;
  document.getElementById('cfgName').value = state.businessName;
  document.getElementById('cfgTag').value = state.tagline;

  renderCategoryChips();
  populateCategorySelect();
  renderAdminItemList();
}

// ---- configurações ----
document.getElementById('saveCfgBtn').addEventListener('click', () => {
  const emoji = document.getElementById('cfgEmoji').value.trim() || '🍽️';
  const name = document.getElementById('cfgName').value.trim() || 'Meu Cardápio';
  const tag = document.getElementById('cfgTag').value.trim();

  state.emoji = emoji;
  state.businessName = name;
  state.tagline = tag;
  saveState();
  renderAdmin();
  showToast('Configurações salvas!');
});

// ---- categorias ----
function renderCategoryChips() {
  const wrap = document.getElementById('categoryChips');
  wrap.innerHTML = '';

  state.categories.forEach(cat => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = `${escapeHtml(cat)} <button type="button" aria-label="Remover categoria">×</button>`;
    chip.querySelector('button').addEventListener('click', () => removeCategory(cat));
    wrap.appendChild(chip);
  });

  if (!state.categories.length) {
    wrap.innerHTML = '<span class="hint">Nenhuma categoria ainda. Adicione a primeira abaixo.</span>';
  }
}

function removeCategory(cat) {
  const inUse = state.items.some(item => item.category === cat);
  if (inUse) {
    showToast('Essa categoria tem itens cadastrados. Mude a categoria deles antes de remover.');
    return;
  }
  state.categories = state.categories.filter(c => c !== cat);
  saveState();
  renderAdmin();
}

document.getElementById('addCategoryBtn').addEventListener('click', addCategory);
document.getElementById('newCategoryInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); addCategory(); }
});

function addCategory() {
  const input = document.getElementById('newCategoryInput');
  const value = input.value.trim();
  if (!value) return;
  if (state.categories.includes(value)) {
    showToast('Essa categoria já existe.');
    return;
  }
  state.categories.push(value);
  input.value = '';
  saveState();
  renderAdmin();
}

function populateCategorySelect() {
  const select = document.getElementById('itemCategory');
  const current = select.value;
  select.innerHTML = '';
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
  if (state.categories.includes(current)) select.value = current;
}

// ---- upload / redimensionamento de imagem ----
document.getElementById('itemImage').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const dataUrl = await resizeImage(file, 480, 0.7);
    editingImageData = dataUrl;
    showImagePreview(dataUrl);
  } catch (err) {
    console.error(err);
    showToast('Não foi possível processar essa imagem.');
  }
});

document.getElementById('removeImageBtn').addEventListener('click', () => {
  editingImageData = null;
  document.getElementById('itemImage').value = '';
  showImagePreview(null);
});

function showImagePreview(dataUrl) {
  const preview = document.getElementById('itemImagePreview');
  const removeBtn = document.getElementById('removeImageBtn');
  if (dataUrl) {
    preview.src = dataUrl;
    preview.hidden = false;
    removeBtn.hidden = false;
  } else {
    preview.hidden = true;
    removeBtn.hidden = true;
  }
}

function resizeImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---- formulário de item (criar / editar) ----
const itemForm = document.getElementById('itemForm');

itemForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const id = document.getElementById('itemId').value;
  const name = document.getElementById('itemName').value.trim();
  const category = document.getElementById('itemCategory').value;
  const description = document.getElementById('itemDescription').value.trim();
  const price = parseFloat(document.getElementById('itemPrice').value);
  const stock = document.getElementById('itemStock').checked;

  if (!name || !category || isNaN(price)) {
    showToast('Preencha nome, categoria e preço.');
    return;
  }

  if (id) {
    const existing = state.items.find(i => i.id === id);
    if (existing) {
      existing.name = name;
      existing.category = category;
      existing.description = description;
      existing.price = price;
      existing.stock = stock;
      existing.image = editingImageData;
    }
    showToast('Item atualizado!');
  } else {
    state.items.push({
      id: uid(),
      name, category, description, price, stock,
      image: editingImageData
    });
    showToast('Item adicionado!');
  }

  saveState();
  resetItemForm();
  renderAdmin();
});

document.getElementById('cancelEditBtn').addEventListener('click', resetItemForm);

function resetItemForm() {
  itemForm.reset();
  document.getElementById('itemId').value = '';
  document.getElementById('itemStock').checked = true;
  document.getElementById('itemFormTitle').textContent = 'Novo item';
  document.getElementById('submitItemBtn').textContent = 'Adicionar item';
  document.getElementById('cancelEditBtn').hidden = true;
  editingImageData = null;
  showImagePreview(null);
  populateCategorySelect();
}

function startEditItem(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;

  document.getElementById('itemId').value = item.id;
  document.getElementById('itemName').value = item.name;
  populateCategorySelect();
  document.getElementById('itemCategory').value = item.category;
  document.getElementById('itemDescription').value = item.description || '';
  document.getElementById('itemPrice').value = item.price;
  document.getElementById('itemStock').checked = item.stock;
  editingImageData = item.image || null;
  showImagePreview(item.image || null);

  document.getElementById('itemFormTitle').textContent = 'Editar item';
  document.getElementById('submitItemBtn').textContent = 'Salvar alterações';
  document.getElementById('cancelEditBtn').hidden = false;

  document.getElementById('itemForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ---- lista de itens no admin ----
function renderAdminItemList() {
  const wrap = document.getElementById('adminItemList');
  wrap.innerHTML = '';

  if (!state.items.length) {
    wrap.innerHTML = '<p class="list-empty">Nenhum item cadastrado ainda. Use o formulário acima para começar.</p>';
    return;
  }

  state.items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'admin-item-row';

    const thumb = document.createElement('div');
    thumb.className = 'item-thumb';
    if (item.image) {
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.name;
      thumb.appendChild(img);
    } else {
      thumb.textContent = state.emoji;
    }

    const info = document.createElement('div');
    info.className = 'row-info';
    info.innerHTML = `<h4>${escapeHtml(item.name)}</h4><span>${escapeHtml(item.category)}</span>`;

    const price = document.createElement('div');
    price.className = 'row-price';
    price.textContent = formatPrice(item.price);

    const stockBtn = document.createElement('button');
    stockBtn.type = 'button';
    stockBtn.className = 'row-stock-toggle' + (item.stock ? '' : ' is-out');
    stockBtn.textContent = item.stock ? 'Em estoque' : 'Esgotado';
    stockBtn.addEventListener('click', () => {
      item.stock = !item.stock;
      saveState();
      renderAdminItemList();
    });

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'icon-btn';
    editBtn.setAttribute('aria-label', 'Editar item');
    editBtn.innerHTML = '✎';
    editBtn.addEventListener('click', () => startEditItem(item.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'icon-btn danger';
    deleteBtn.setAttribute('aria-label', 'Excluir item');
    deleteBtn.innerHTML = '🗑';
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Remover "${item.name}" do cardápio?`)) {
        state.items = state.items.filter(i => i.id !== item.id);
        saveState();
        renderAdmin();
      }
    });

    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.appendChild(stockBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(thumb);
    row.appendChild(info);
    row.appendChild(price);
    row.appendChild(actions);
    wrap.appendChild(row);
  });
}

// ---- backup: exportar / importar ----
document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cardapio-backup.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      state = {
        businessName: parsed.businessName || DEFAULT_DATA.businessName,
        emoji: parsed.emoji || DEFAULT_DATA.emoji,
        tagline: parsed.tagline ?? DEFAULT_DATA.tagline,
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        items: Array.isArray(parsed.items) ? parsed.items : []
      };
      saveState();
      renderAdmin();
      showToast('Backup importado com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('Arquivo inválido. Verifique se é um backup exportado por aqui.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// -------------------------------------------------------------
// QR CODE / compartilhamento
// -------------------------------------------------------------
function currentMenuUrl() {
  return window.location.href.split('#')[0];
}

function openQrModal() {
  const url = currentMenuUrl();
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;
  document.getElementById('qrImage').src = qrSrc;
  document.getElementById('qrLinkInput').value = url;
  document.getElementById('qrModal').hidden = false;
}

document.getElementById('shareBtn').addEventListener('click', openQrModal);
document.getElementById('closeQrModal').addEventListener('click', () => {
  document.getElementById('qrModal').hidden = true;
});
document.getElementById('qrModal').addEventListener('click', (e) => {
  if (e.target.id === 'qrModal') document.getElementById('qrModal').hidden = true;
});

document.getElementById('copyLinkBtn').addEventListener('click', async () => {
  const input = document.getElementById('qrLinkInput');
  input.select();
  try {
    await navigator.clipboard.writeText(input.value);
    showToast('Link copiado!');
  } catch {
    document.execCommand('copy');
    showToast('Link copiado!');
  }
});

// -------------------------------------------------------------
// busca (menu público)
// -------------------------------------------------------------
document.getElementById('searchInput').addEventListener('input', (e) => {
  searchTerm = e.target.value;
  renderMenu();
});

// -------------------------------------------------------------
// inicialização
// -------------------------------------------------------------
router();