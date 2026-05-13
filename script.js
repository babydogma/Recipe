const STORAGE_SELECTED = "portionly:selected:v5";
const STORAGE_NOTES = "portionly:notes:v5";
const STORAGE_SETTINGS = "portionly:settings:v5";
const STORAGE_UI = "portionly:ui:v6";

const APP_CATEGORIES = window.CATEGORIES || [];
const APP_RECIPES = window.RECIPES || [];

let activeCategory = "all";
let selectedIds = loadJson(STORAGE_SELECTED, []);
let notesMap = loadJson(STORAGE_NOTES, {});
let settings = normalizeSettings(loadJson(STORAGE_SETTINGS, { people: 1, days: 1 }));
let uiState = normalizeUiState(loadJson(STORAGE_UI, { search: "", selectedOnly: false }));
let expandedIds = new Set();
let editingNoteIds = new Set();

let categoryTabs;
let cardsGrid;
let recipesCount;
let selectedCountTop;
let basketFab;
let basketBadge;
let basketModal;
let selectionDock;
let toastEl;
let searchInput;
let selectedOnlyBtn;
let collapseAllBtn;
let resultsMeta;

const MIN_SETTING = 1;
const MAX_PEOPLE = 12;
const MAX_DAYS = 14;
const TAP_THRESHOLD = 10;
let toastTimer = null;

function resolveAssetPath(path) {
  return path || "";
}

function imageFallback(event) {
  const img = event.currentTarget;
  img.classList.add("image-missing");
  img.removeAttribute("src");
}

window.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  if (!cardsGrid || !recipesCount) {
    console.error("Portionly: required DOM nodes were not found");
    return;
  }
  recipesCount.textContent = APP_RECIPES.length;
  bindStaticEvents();
  renderAll();
});

function cacheDom() {
  categoryTabs = document.getElementById("categoryTabs");
  cardsGrid = document.getElementById("cardsGrid");
  recipesCount = document.getElementById("recipesCount");
  selectedCountTop = document.getElementById("selectedCountTop");
  basketFab = document.getElementById("basketFab");
  basketBadge = document.getElementById("basketBadge");
  basketModal = document.getElementById("basketModal");
  selectionDock = document.getElementById("selectionDock");
  toastEl = document.getElementById("toast");
  searchInput = document.getElementById("searchInput");
  selectedOnlyBtn = document.getElementById("selectedOnlyBtn");
  collapseAllBtn = document.getElementById("collapseAllBtn");
  resultsMeta = document.getElementById("resultsMeta");
}

function bindStaticEvents() {
  document.getElementById("clearAllBtn").addEventListener("click", clearSelection);
  document.getElementById("copyBtn").addEventListener("click", copyBasketText);
  basketFab.addEventListener("click", openBasketModal);
  selectionDock.addEventListener("click", openBasketModal);

  document.querySelectorAll("[data-close-modal]").forEach(button => {
    button.addEventListener("click", closeModals);
  });

  basketModal.addEventListener("click", event => {
    if (event.target === basketModal) closeModals();
  });

  document.querySelectorAll("[data-step]").forEach(button => {
    button.addEventListener("click", () => {
      const key = button.dataset.step;
      const delta = Number(button.dataset.delta || 0);
      updateSetting(key, delta);
    });
  });

  searchInput.addEventListener("input", () => {
    uiState.search = searchInput.value.trim();
    saveUiState();
    renderRecipes();
  });

  selectedOnlyBtn.addEventListener("click", () => {
    uiState.selectedOnly = !uiState.selectedOnly;
    selectedOnlyBtn.classList.toggle("active", uiState.selectedOnly);
    selectedOnlyBtn.setAttribute("aria-pressed", String(uiState.selectedOnly));
    saveUiState();
    renderRecipes();
  });

  collapseAllBtn.addEventListener("click", () => {
    expandedIds = new Set();
    editingNoteIds = new Set();
    renderRecipes();
    showToast("Все карточки свернуты");
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModals();
  });
}

function renderAll() {
  renderSettings();
  renderCategories();
  renderRecipes();
  updateSelectionUI();
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveSelected() {
  localStorage.setItem(STORAGE_SELECTED, JSON.stringify(selectedIds));
}

function saveNotes() {
  localStorage.setItem(STORAGE_NOTES, JSON.stringify(notesMap));
}

function saveSettings() {
  localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
}

function saveUiState() {
  localStorage.setItem(STORAGE_UI, JSON.stringify(uiState));
}

function normalizeSettings(next) {
  return {
    people: clamp(Number(next?.people) || 1, MIN_SETTING, MAX_PEOPLE),
    days: clamp(Number(next?.days) || 1, MIN_SETTING, MAX_DAYS)
  };
}

function normalizeUiState(next) {
  return {
    search: typeof next?.search === "string" ? next.search : "",
    selectedOnly: Boolean(next?.selectedOnly)
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getTargetPortions() {
  return settings.people * settings.days;
}

function updateSetting(key, delta) {
  if (!["people", "days"].includes(key)) return;
  const max = key === "people" ? MAX_PEOPLE : MAX_DAYS;
  settings[key] = clamp(settings[key] + delta, MIN_SETTING, max);
  saveSettings();
  renderSettings();
  renderRecipes();
  updateSelectionUI();
  if (isModalOpen(basketModal)) renderBasketModal();
}

function renderSettings() {
  const portions = getTargetPortions();
  document.getElementById("peopleValue").textContent = settings.people;
  document.getElementById("daysValue").textContent = settings.days;
  document.getElementById("portionValue").textContent = `${portions} ${plural(portions, "порция", "порции", "порций")}`;
  document.getElementById("scenarioText").textContent = `${settings.people} ${plural(settings.people, "человек", "человека", "человек")} · ${settings.days} ${plural(settings.days, "день", "дня", "дней")}`;
  searchInput.value = uiState.search;
  selectedOnlyBtn.classList.toggle("active", uiState.selectedOnly);
  selectedOnlyBtn.setAttribute("aria-pressed", String(uiState.selectedOnly));
}

function renderCategories() {
  categoryTabs.innerHTML = APP_CATEGORIES.map(category => {
    const count = category.id === "all" ? APP_RECIPES.length : APP_RECIPES.filter(recipe => recipe.category === category.id).length;
    return `
      <button class="category-tab ${category.id === activeCategory ? "active" : ""}" type="button" data-category="${category.id}">
        <span>${category.icon}</span>
        <strong>${category.title}</strong>
        <small>${count}</small>
      </button>
    `;
  }).join("");

  categoryTabs.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      renderCategories();
      renderRecipes();
    });
  });
}

function getVisibleRecipes() {
  const query = normalizeName(uiState.search);
  let list = activeCategory === "all"
    ? APP_RECIPES
    : APP_RECIPES.filter(recipe => recipe.category === activeCategory);

  if (uiState.selectedOnly) {
    list = list.filter(recipe => selectedIds.includes(recipe.id));
  }

  if (query) {
    list = list.filter(recipe => {
      const haystack = [recipe.title, recipe.meta, ...recipe.ingredients.map(item => item.name)].join(" ");
      return normalizeName(haystack).includes(query);
    });
  }

  return list;
}

function renderRecipes() {
  const visibleRecipes = getVisibleRecipes();
  updateResultsMeta(visibleRecipes.length);

  if (!visibleRecipes.length) {
    cardsGrid.innerHTML = `<div class="empty-state">Ничего не найдено. Попробуй другой запрос или отключи фильтр «Только выбранные».</div>`;
    return;
  }

  cardsGrid.innerHTML = visibleRecipes.map(recipe => recipeCardTemplate(recipe)).join("");
  bindCardEvents();
}

function updateResultsMeta(count) {
  const parts = [`Найдено ${count} ${plural(count, "блюдо", "блюда", "блюд")}`];
  if (activeCategory !== "all") {
    const category = APP_CATEGORIES.find(item => item.id === activeCategory);
    if (category) parts.push(`в категории «${category.title}»`);
  }
  if (uiState.selectedOnly) parts.push("только среди выбранных");
  if (uiState.search) parts.push(`по запросу «${uiState.search}»`);
  resultsMeta.textContent = parts.join(" · ");
}

function recipeCardTemplate(recipe) {
  const category = APP_CATEGORIES.find(item => item.id === recipe.category);
  const selected = selectedIds.includes(recipe.id);
  const expanded = expandedIds.has(recipe.id);
  const editingNote = editingNoteIds.has(recipe.id);
  const note = (notesMap[recipe.id] || "").trim();
  const targetPortions = getTargetPortions();
  const scaledIngredients = getScaledIngredients(recipe, targetPortions);
  const scaledNutrition = getScaledNutrition(recipe, targetPortions);

  return `
    <article class="recipe-card ${selected ? "selected" : ""}" data-card-id="${recipe.id}">
      <div class="recipe-hero">
        <img src="${resolveAssetPath(recipe.heroImage || recipe.image)}" alt="${escapeHTML(recipe.title)}" loading="lazy" onerror="imageFallback(event)">
        <div class="recipe-hero-overlay"></div>
        <span class="recipe-category-badge">${category?.icon || "🍽️"} ${category?.title || "Блюдо"}</span>
        ${selected ? `<span class="selected-stamp">✓ Добавлено</span>` : ``}
      </div>

      <div class="recipe-card-body">
        <div class="recipe-card-head">
          <div>
            <h3>${escapeHTML(recipe.title)}</h3>
            <p class="recipe-meta">${escapeHTML(recipe.meta || `${recipe.portions} ${plural(recipe.portions, "порция", "порции", "порций")}`)}</p>
          </div>
          <div class="selection-indicator ${selected ? "active" : ""}" aria-hidden="true">${selected ? "✓" : "+"}</div>
        </div>

        <div class="nutrition-block">
          <div class="nutrition-head">
            <span>На 1 порцию</span>
            <small>Выбранный сценарий: ${targetPortions} ${plural(targetPortions, "порция", "порции", "порций")}</small>
          </div>
          <div class="nutrition-row">
            <span>${formatNumber(recipe.nutrition.kcal)} ккал</span>
            <span>Б ${formatNumber(recipe.nutrition.protein)}</span>
            <span>Ж ${formatNumber(recipe.nutrition.fat)}</span>
            <span>У ${formatNumber(recipe.nutrition.carbs)}</span>
          </div>
          <div class="scaled-inline">Итого для выбранного сценария: ${formatNumber(scaledNutrition.kcal)} ккал · Б ${formatNumber(scaledNutrition.protein)} · Ж ${formatNumber(scaledNutrition.fat)} · У ${formatNumber(scaledNutrition.carbs)}</div>
        </div>

        <button class="expand-toggle ${expanded ? "open" : ""}" type="button" data-expand="${recipe.id}" aria-expanded="${expanded}">
          <span>${expanded ? "Скрыть детали" : "Ингредиенты, шаги и заметки"}</span>
          <b>⌄</b>
        </button>

        <div class="recipe-details ${expanded ? "visible" : ""}">
          <section class="detail-card">
            <div class="detail-head">
              <h4>Ингредиенты</h4>
              <small>на ${targetPortions} ${plural(targetPortions, "порцию", "порции", "порций")}</small>
            </div>
            <div class="ingredients-grid">
              ${scaledIngredients.map(item => `
                <div class="ingredient-row">
                  <span>${escapeHTML(item.name)}</span>
                  <strong>${item.amount === null ? escapeHTML(item.unit) : formatAmount(item.amount, item.unit)}</strong>
                </div>`).join("")}
            </div>
          </section>

          <section class="detail-card">
            <div class="detail-head">
              <h4>Как готовить</h4>
              <small>${recipe.steps.length} ${plural(recipe.steps.length, "шаг", "шага", "шагов")}</small>
            </div>
            <ol class="steps-list">
              ${recipe.steps.map(step => `<li>${escapeHTML(step)}</li>`).join("")}
            </ol>
          </section>

          <section class="detail-card note-card">
            <div class="detail-head">
              <h4>Заметка</h4>
              <small>${note ? "сохранена" : "пусто"}</small>
            </div>
            ${(!note && !editingNote) ? `<button class="note-trigger" type="button" data-note-open="${recipe.id}">+ Добавить заметку</button>` : ``}
            ${(note && !editingNote) ? `
              <div class="saved-note">
                <p>${escapeHTML(note).replace(/\n/g, "<br>")}</p>
                <div class="note-actions">
                  <button class="tiny-btn" type="button" data-note-open="${recipe.id}">Редактировать</button>
                  <button class="tiny-btn ghost" type="button" data-note-remove="${recipe.id}">Удалить</button>
                </div>
              </div>` : ``}
            ${editingNote ? `
              <div class="note-editor">
                <textarea data-note-input="${recipe.id}" rows="4" placeholder="Напиши свою заметку по этому блюду...">${escapeHTML(note)}</textarea>
                <div class="note-actions">
                  <button class="tiny-btn" type="button" data-note-save="${recipe.id}">Сохранить</button>
                  <button class="tiny-btn ghost" type="button" data-note-cancel="${recipe.id}">Отмена</button>
                </div>
              </div>` : ``}
          </section>
        </div>
      </div>
    </article>`;
}

function bindCardEvents() {
  cardsGrid.querySelectorAll("[data-expand]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      toggleExpanded(button.dataset.expand);
    });
  });

  cardsGrid.querySelectorAll("[data-note-open]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      editingNoteIds.add(button.dataset.noteOpen);
      expandedIds.add(button.dataset.noteOpen);
      renderRecipes();
    });
  });

  cardsGrid.querySelectorAll("[data-note-cancel]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      editingNoteIds.delete(button.dataset.noteCancel);
      renderRecipes();
    });
  });

  cardsGrid.querySelectorAll("[data-note-save]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      const recipeId = button.dataset.noteSave;
      const field = cardsGrid.querySelector(`[data-note-input="${recipeId}"]`);
      if (!field) return;
      const value = field.value.trim();
      if (value) notesMap[recipeId] = value; else delete notesMap[recipeId];
      editingNoteIds.delete(recipeId);
      saveNotes();
      renderRecipes();
      if (isModalOpen(basketModal)) renderBasketModal();
      showToast(value ? "Заметка сохранена" : "Заметка очищена");
    });
  });

  cardsGrid.querySelectorAll("[data-note-remove]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      delete notesMap[button.dataset.noteRemove];
      editingNoteIds.delete(button.dataset.noteRemove);
      saveNotes();
      renderRecipes();
      if (isModalOpen(basketModal)) renderBasketModal();
      showToast("Заметка удалена");
    });
  });

  cardsGrid.querySelectorAll("[data-card-id]").forEach(card => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    card.addEventListener("pointerdown", event => {
      if (isInteractiveTarget(event.target)) return;
      tracking = true;
      startX = event.clientX;
      startY = event.clientY;
    });

    card.addEventListener("pointerup", event => {
      if (!tracking || isInteractiveTarget(event.target)) {
        tracking = false;
        return;
      }
      const dx = Math.abs(event.clientX - startX);
      const dy = Math.abs(event.clientY - startY);
      tracking = false;
      if (dx <= TAP_THRESHOLD && dy <= TAP_THRESHOLD) toggleRecipe(card.dataset.cardId);
    });

    card.addEventListener("pointercancel", () => {
      tracking = false;
    });
  });
}

function isInteractiveTarget(target) {
  return !!target.closest("button, textarea, input, select, a");
}

function toggleExpanded(recipeId) {
  if (expandedIds.has(recipeId)) {
    expandedIds.delete(recipeId);
    editingNoteIds.delete(recipeId);
  } else {
    expandedIds.add(recipeId);
  }
  renderRecipes();
}

function toggleRecipe(recipeId) {
  const recipe = getRecipe(recipeId);
  if (!recipe) return;

  if (selectedIds.includes(recipeId)) {
    selectedIds = selectedIds.filter(id => id !== recipeId);
    showToast(`Убрано: ${recipe.title}`);
  } else {
    selectedIds = [...selectedIds, recipeId];
    showToast(`Добавлено: ${recipe.title}`);
  }

  saveSelected();
  renderRecipes();
  updateSelectionUI();
  if (isModalOpen(basketModal)) renderBasketModal();
}

function clearSelection() {
  if (!selectedIds.length) {
    showToast("Выбор уже пустой");
    return;
  }
  selectedIds = [];
  saveSelected();
  renderRecipes();
  updateSelectionUI();
  if (isModalOpen(basketModal)) renderBasketModal();
  showToast("Выбор очищен");
}

function updateSelectionUI() {
  const count = selectedIds.length;
  const portions = getTargetPortions();
  selectedCountTop.textContent = count;
  basketBadge.textContent = count;
  basketFab.classList.toggle("visible", count > 0);
  selectionDock.classList.toggle("visible", count > 0);
  document.getElementById("selectionDockTitle").textContent = `${count} ${plural(count, "блюдо выбрано", "блюда выбрано", "блюд выбрано")}`;
  document.getElementById("selectionDockMeta").textContent = `${portions} ${plural(portions, "порция", "порции", "порций")} на каждое блюдо · нажми для итогов`;
}

function openBasketModal() {
  renderBasketModal();
  basketModal.classList.add("visible");
  basketModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function renderBasketModal() {
  const selectedRecipes = selectedIds.map(getRecipe).filter(Boolean);
  const selectedStrip = document.getElementById("selectedStrip");
  const totalsList = document.getElementById("totalsList");
  const recipeSummaryList = document.getElementById("recipeSummaryList");
  const basketSummary = document.getElementById("basketSummary");
  const basketSubTitle = document.getElementById("basketSubTitle");
  const targetPortions = getTargetPortions();

  basketSubTitle.textContent = `${settings.people} ${plural(settings.people, "человек", "человека", "человек")} × ${settings.days} ${plural(settings.days, "день", "дня", "дней")} = ${targetPortions} ${plural(targetPortions, "порция", "порции", "порций")} на каждое выбранное блюдо`;

  if (!selectedRecipes.length) {
    selectedStrip.innerHTML = `<div class="modal-empty">Ничего не выбрано.</div>`;
    basketSummary.innerHTML = "";
    totalsList.innerHTML = `<div class="modal-empty">Выбери блюда — и тут появится список продуктов.</div>`;
    recipeSummaryList.innerHTML = "";
    return;
  }

  selectedStrip.innerHTML = selectedRecipes.map(recipe => `
    <button class="selected-chip" type="button" data-remove="${recipe.id}">${escapeHTML(recipe.title)} <span>×</span></button>`).join("");

  selectedStrip.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", () => {
      selectedIds = selectedIds.filter(id => id !== button.dataset.remove);
      saveSelected();
      renderRecipes();
      updateSelectionUI();
      renderBasketModal();
      const recipe = getRecipe(button.dataset.remove);
      if (recipe) showToast(`Убрано: ${recipe.title}`);
    });
  });

  const totals = calculateTotals(selectedRecipes, targetPortions);

  basketSummary.innerHTML = `
    <div class="summary-pill"><span>Выбрано</span><strong>${selectedRecipes.length} ${plural(selectedRecipes.length, "блюдо", "блюда", "блюд")}</strong></div>
    <div class="summary-pill"><span>На блюдо</span><strong>${targetPortions} ${plural(targetPortions, "порция", "порции", "порций")}</strong></div>
    <div class="summary-pill"><span>Калории</span><strong>${formatNumber(totals.nutrition.kcal)} ккал</strong></div>
    <div class="summary-pill"><span>Б / Ж / У</span><strong>${formatNumber(totals.nutrition.protein)} / ${formatNumber(totals.nutrition.fat)} / ${formatNumber(totals.nutrition.carbs)}</strong></div>`;

  totalsList.innerHTML = totals.numeric.map(item => `
    <div class="total-item">
      <div><strong>${escapeHTML(item.name)}</strong><small>${item.sources.length} ${plural(item.sources.length, "блюдо", "блюда", "блюд")}</small></div>
      <span>${formatAmount(item.amount, item.unit)}</span>
    </div>`).join("");

  if (totals.taste.length) {
    totalsList.innerHTML += `<div class="taste-block"><strong>По вкусу / без точной граммовки</strong><p>${totals.taste.map(item => escapeHTML(item.name)).join(", ")}</p></div>`;
  }

  recipeSummaryList.innerHTML = selectedRecipes.map(recipe => {
    const nutrition = getScaledNutrition(recipe, targetPortions);
    const note = notesMap[recipe.id];
    return `
      <article class="recipe-summary">
        <img src="${resolveAssetPath(recipe.heroImage || recipe.image)}" alt="${escapeHTML(recipe.title)}" onerror="imageFallback(event)">
        <div>
          <h4>${escapeHTML(recipe.title)}</h4>
          <p>${targetPortions} ${plural(targetPortions, "порция", "порции", "порций")} · ${formatNumber(nutrition.kcal)} ккал</p>
          <p>Б ${formatNumber(nutrition.protein)} • Ж ${formatNumber(nutrition.fat)} • У ${formatNumber(nutrition.carbs)}</p>
          ${note ? `<p class="summary-note">📝 ${escapeHTML(note)}</p>` : ``}
        </div>
      </article>`;
  }).join("");
}

function calculateTotals(selectedRecipes, targetPortions) {
  const numericMap = new Map();
  const tasteMap = new Map();
  const nutrition = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

  selectedRecipes.forEach(recipe => {
    getScaledNutrition(recipe, targetPortions, nutrition);
    getScaledIngredients(recipe, targetPortions).forEach(ingredient => {
      const name = ingredient.name.trim();
      const unit = ingredient.unit.trim();

      if (ingredient.amount === null || ingredient.amount === undefined) {
        tasteMap.set(normalizeName(name), { name, unit });
        return;
      }

      const key = `${normalizeName(name)}__${unit.toLowerCase()}`;
      if (!numericMap.has(key)) numericMap.set(key, { name, unit, amount: 0, sources: [] });
      const item = numericMap.get(key);
      item.amount += Number(ingredient.amount);
      item.sources.push(recipe.title);
    });
  });

  return {
    numeric: Array.from(numericMap.values()).sort((a, b) => a.name.localeCompare(b.name, "ru")),
    taste: Array.from(tasteMap.values()).sort((a, b) => a.name.localeCompare(b.name, "ru")),
    nutrition
  };
}

function getScaledIngredients(recipe, targetPortions) {
  const factor = targetPortions / recipe.portions;
  return recipe.ingredients.map(item => ({
    ...item,
    amount: item.amount === null || item.amount === undefined ? null : roundSmart(Number(item.amount) * factor)
  }));
}

function getScaledNutrition(recipe, targetPortions, base = null) {
  const factor = targetPortions;
  const scaled = {
    kcal: roundSmart(recipe.nutrition.kcal * factor),
    protein: roundSmart(recipe.nutrition.protein * factor),
    fat: roundSmart(recipe.nutrition.fat * factor),
    carbs: roundSmart(recipe.nutrition.carbs * factor)
  };
  if (base) {
    base.kcal += scaled.kcal;
    base.protein += scaled.protein;
    base.fat += scaled.fat;
    base.carbs += scaled.carbs;
  }
  return scaled;
}

function roundSmart(value) {
  if (!Number.isFinite(Number(value))) return value;
  return Math.round(Number(value) * 10) / 10;
}

function copyBasketText() {
  const selectedRecipes = selectedIds.map(getRecipe).filter(Boolean);
  if (!selectedRecipes.length) return;

  const totals = calculateTotals(selectedRecipes, getTargetPortions());
  const lines = [
    "Portionly — список продуктов",
    `Людей: ${settings.people}`,
    `Дней: ${settings.days}`,
    `Порций на блюдо: ${getTargetPortions()}`,
    "",
    "Продукты:"
  ];

  totals.numeric.forEach(item => lines.push(`- ${item.name}: ${formatAmount(item.amount, item.unit)}`));
  if (totals.taste.length) {
    lines.push("", "По вкусу:");
    totals.taste.forEach(item => lines.push(`- ${item.name}`));
  }
  lines.push("", `КБЖУ итого: ${formatNumber(totals.nutrition.kcal)} ккал / Б ${formatNumber(totals.nutrition.protein)} / Ж ${formatNumber(totals.nutrition.fat)} / У ${formatNumber(totals.nutrition.carbs)}`);

  navigator.clipboard?.writeText(lines.join("\n"));
  const button = document.getElementById("copyBtn");
  button.textContent = "Скопировано";
  setTimeout(() => { button.textContent = "Скопировать"; }, 1200);
  showToast("Список скопирован");
}

function closeModals() {
  basketModal.classList.remove("visible");
  basketModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function isModalOpen(modal) {
  return modal.classList.contains("visible");
}

function getRecipe(recipeId) {
  return APP_RECIPES.find(recipe => recipe.id === recipeId);
}

function showToast(text) {
  clearTimeout(toastTimer);
  toastEl.textContent = text;
  toastEl.classList.add("visible");
  toastTimer = setTimeout(() => toastEl.classList.remove("visible"), 1800);
}

function normalizeName(name) {
  return String(name).toLowerCase().replace(/ё/g, "е").trim();
}

function formatAmount(amount, unit) {
  return `${formatNumber(amount)} ${unit}`;
}

function formatNumber(value) {
  if (!Number.isFinite(Number(value))) return String(value);
  const num = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(num) ? String(num) : num.toFixed(1).replace(".", ",");
}

function plural(value, one, few, many) {
  const n = Math.abs(value) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
