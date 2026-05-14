/* Portionly — stable static app logic */
(() => {
  "use strict";

  const STORAGE_SELECTED = "portionly:selected:v8";
  const STORAGE_NOTES = "portionly:notes:v8";
  const STORAGE_SETTINGS = "portionly:settings:v8";

  const MIN_SETTING = 1;
  const MAX_PEOPLE = 12;
  const MAX_DAYS = 14;

  const state = {
    activeCategory: "all",
    selectedIds: [],
    notesMap: {},
    settings: { people: 1, days: 1 },
    search: "",
    selectedOnly: false,
    expandedIds: new Set(),
    editingNoteIds: new Set(),
    toastTimer: null,
    refs: {}
  };

  function getCategories() {
    return Array.isArray(window.CATEGORIES) ? window.CATEGORIES : [];
  }

  function getRecipes() {
    return Array.isArray(window.RECIPES) ? window.RECIPES : [];
  }

  function init() {
    cacheDom();

    if (!hasRequiredDom()) {
      console.error("Portionly: missing required DOM nodes");
      return;
    }

    if (!getCategories().length || !getRecipes().length) {
      renderFatalError("Не загружены данные рецептов. Проверь recipes-data.js и порядок подключения файлов.");
      return;
    }

    state.selectedIds = filterExistingRecipeIds(loadJson(STORAGE_SELECTED, []));
    state.notesMap = loadJson(STORAGE_NOTES, {});
    state.settings = normalizeSettings(loadJson(STORAGE_SETTINGS, { people: 1, days: 1 }));

    bindStaticEvents();
    renderAll();
  }

  function cacheDom() {
    state.refs = {
      categoryTabs: document.getElementById("categoryTabs"),
      cardsGrid: document.getElementById("cardsGrid"),
      recipesCount: document.getElementById("recipesCount"),
      selectedCountTop: document.getElementById("selectedCountTop"),
      basketFab: document.getElementById("basketFab"),
      basketBadge: document.getElementById("basketBadge"),
      basketModal: document.getElementById("basketModal"),
      selectionDock: document.getElementById("selectionDock"),
      toastEl: document.getElementById("toast"),
      searchInput: document.getElementById("searchInput"),
      selectedOnlyBtn: document.getElementById("selectedOnlyBtn"),
      collapseAllBtn: document.getElementById("collapseAllBtn"),
      resultsMeta: document.getElementById("resultsMeta"),
      clearAllBtn: document.getElementById("clearAllBtn"),
      copyBtn: document.getElementById("copyBtn"),
      peopleValue: document.getElementById("peopleValue"),
      daysValue: document.getElementById("daysValue"),
      portionValue: document.getElementById("portionValue"),
      scenarioText: document.getElementById("scenarioText"),
      basketSubTitle: document.getElementById("basketSubTitle"),
      selectedStrip: document.getElementById("selectedStrip"),
      basketSummary: document.getElementById("basketSummary"),
      totalsList: document.getElementById("totalsList"),
      recipeSummaryList: document.getElementById("recipeSummaryList")
    };
  }

  function hasRequiredDom() {
    const r = state.refs;
    return Boolean(r.cardsGrid && r.categoryTabs && r.recipesCount && r.searchInput && r.basketModal);
  }

  function bindStaticEvents() {
    const r = state.refs;

    r.clearAllBtn?.addEventListener("click", clearSelection);
    r.copyBtn?.addEventListener("click", copyBasketText);
    r.basketFab?.addEventListener("click", openBasketModal);
    r.selectionDock?.addEventListener("click", openBasketModal);

    document.querySelectorAll("[data-close-modal]").forEach(button => {
      button.addEventListener("click", closeModals);
    });

    r.basketModal?.addEventListener("click", event => {
      if (event.target === r.basketModal) closeModals();
    });

    document.querySelectorAll("[data-step]").forEach(button => {
      button.addEventListener("click", () => {
        updateSetting(button.dataset.step, Number(button.dataset.delta || 0));
      });
    });

    r.searchInput?.addEventListener("input", () => {
      state.search = r.searchInput.value.trim();
      renderRecipes();
    });

    r.selectedOnlyBtn?.addEventListener("click", () => {
      state.selectedOnly = !state.selectedOnly;
      renderSelectedOnlyButton();
      renderRecipes();
    });

    r.collapseAllBtn?.addEventListener("click", () => {
      state.expandedIds.clear();
      state.editingNoteIds.clear();
      renderRecipes();
      showToast("Все карточки свернуты");
    });

    r.cardsGrid?.addEventListener("click", handleCardsGridClick);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeModals();
    });
  }

  function handleCardsGridClick(event) {
    const action = event.target.closest("[data-action]");

    if (action) {
      event.stopPropagation();
      const recipeId = action.dataset.recipeId;
      const actionName = action.dataset.action;

      if (actionName === "expand") toggleExpanded(recipeId);
      if (actionName === "note-open") openNoteEditor(recipeId);
      if (actionName === "note-cancel") cancelNoteEditor(recipeId);
      if (actionName === "note-save") saveNote(recipeId);
      if (actionName === "note-remove") removeNote(recipeId);
      return;
    }

    if (event.target.closest("button, textarea, input, select, a")) return;

    const card = event.target.closest("[data-card-id]");
    if (!card) return;

    toggleRecipe(card.dataset.cardId);
  }

  function renderAll() {
    state.refs.recipesCount.textContent = getRecipes().length;
    renderSettings();
    renderCategories();
    renderSelectedOnlyButton();
    renderRecipes();
    updateSelectionUI();
  }

  function renderSettings() {
    const portions = getTargetPortions();
    const r = state.refs;

    r.peopleValue.textContent = state.settings.people;
    r.daysValue.textContent = state.settings.days;
    r.portionValue.textContent = `${portions} ${plural(portions, "порция", "порции", "порций")}`;
    r.scenarioText.textContent = `${state.settings.people} ${plural(state.settings.people, "человек", "человека", "человек")} · ${state.settings.days} ${plural(state.settings.days, "день", "дня", "дней")}`;

    document.querySelectorAll('[data-step="people"][data-delta="-1"]').forEach(btn => btn.disabled = state.settings.people <= MIN_SETTING);
    document.querySelectorAll('[data-step="days"][data-delta="-1"]').forEach(btn => btn.disabled = state.settings.days <= MIN_SETTING);
    document.querySelectorAll('[data-step="people"][data-delta="1"]').forEach(btn => btn.disabled = state.settings.people >= MAX_PEOPLE);
    document.querySelectorAll('[data-step="days"][data-delta="1"]').forEach(btn => btn.disabled = state.settings.days >= MAX_DAYS);
  }

  function renderSelectedOnlyButton() {
    const btn = state.refs.selectedOnlyBtn;
    if (!btn) return;
    btn.classList.toggle("active", state.selectedOnly);
    btn.setAttribute("aria-pressed", String(state.selectedOnly));
  }

  function renderCategories() {
    const categories = getCategories();
    const recipes = getRecipes();

    state.refs.categoryTabs.innerHTML = categories.map(category => {
      const count = category.id === "all"
        ? recipes.length
        : recipes.filter(recipe => recipe.category === category.id).length;

      return `
        <button class="category-tab ${category.id === state.activeCategory ? "active" : ""}" type="button" data-category="${escapeHTML(category.id)}">
          <span>${escapeHTML(category.icon)}</span>
          <strong>${escapeHTML(category.title)}</strong>
          <small>${count}</small>
        </button>
      `;
    }).join("");

    state.refs.categoryTabs.querySelectorAll("[data-category]").forEach(button => {
      button.addEventListener("click", () => {
        state.activeCategory = button.dataset.category;
        renderCategories();
        renderRecipes();
      });
    });
  }

  function renderRecipes() {
    const visibleRecipes = getVisibleRecipes();
    updateResultsMeta(visibleRecipes.length);

    if (!visibleRecipes.length) {
      state.refs.cardsGrid.innerHTML = `<div class="empty-state">Ничего не найдено. Попробуй другой запрос или отключи фильтр «Только выбранные».</div>`;
      return;
    }

    state.refs.cardsGrid.innerHTML = visibleRecipes.map(recipeCardTemplate).join("");
  }

  function getVisibleRecipes() {
    const recipes = getRecipes();
    const query = normalizeName(state.search);

    let list = state.activeCategory === "all"
      ? recipes
      : recipes.filter(recipe => recipe.category === state.activeCategory);

    if (state.selectedOnly) {
      list = list.filter(recipe => state.selectedIds.includes(recipe.id));
    }

    if (query) {
      list = list.filter(recipe => {
        const haystack = [
          recipe.title,
          recipe.meta,
          ...recipe.ingredients.map(item => item.name)
        ].join(" ");

        return normalizeName(haystack).includes(query);
      });
    }

    return list;
  }

  function updateResultsMeta(count) {
    const parts = [`Найдено ${count} ${plural(count, "блюдо", "блюда", "блюд")}`];

    if (state.activeCategory !== "all") {
      const category = getCategories().find(item => item.id === state.activeCategory);
      if (category) parts.push(`в категории «${category.title}»`);
    }

    if (state.selectedOnly) parts.push("только среди выбранных");
    if (state.search) parts.push(`по запросу «${state.search}»`);

    state.refs.resultsMeta.textContent = parts.join(" · ");
  }

  function recipeCardTemplate(recipe) {
    const category = getCategories().find(item => item.id === recipe.category);
    const selected = state.selectedIds.includes(recipe.id);
    const expanded = state.expandedIds.has(recipe.id);
    const editingNote = state.editingNoteIds.has(recipe.id);
    const note = (state.notesMap[recipe.id] || "").trim();
    const targetPortions = getTargetPortions();
    const scaledIngredients = getScaledIngredients(recipe, targetPortions);
    const scaledNutrition = getScaledNutrition(recipe, targetPortions);
    const image = recipe.heroImage || recipe.image;

    return `
      <article class="recipe-card ${selected ? "selected" : ""}" data-card-id="${escapeHTML(recipe.id)}">
        <div class="recipe-hero">
          <img src="${escapeHTML(image)}" alt="${escapeHTML(recipe.title)}" loading="lazy" onerror="window.handleRecipeImageError(this)">
          <div class="recipe-hero-overlay"></div>
          <span class="recipe-category-badge">${escapeHTML(category?.icon || "🍽️")} ${escapeHTML(category?.title || "Блюдо")}</span>
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

          <button class="expand-toggle ${expanded ? "open" : ""}" type="button" data-action="expand" data-recipe-id="${escapeHTML(recipe.id)}" aria-expanded="${expanded}">
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

              ${(!note && !editingNote) ? `<button class="note-trigger" type="button" data-action="note-open" data-recipe-id="${escapeHTML(recipe.id)}">+ Добавить заметку</button>` : ``}

              ${(note && !editingNote) ? `
                <div class="saved-note">
                  <p>${escapeHTML(note).replace(/\n/g, "<br>")}</p>
                  <div class="note-actions">
                    <button class="tiny-btn" type="button" data-action="note-open" data-recipe-id="${escapeHTML(recipe.id)}">Редактировать</button>
                    <button class="tiny-btn ghost" type="button" data-action="note-remove" data-recipe-id="${escapeHTML(recipe.id)}">Удалить</button>
                  </div>
                </div>` : ``}

              ${editingNote ? `
                <div class="note-editor">
                  <textarea data-note-input="${escapeHTML(recipe.id)}" rows="4" placeholder="Напиши свою заметку по этому блюду...">${escapeHTML(note)}</textarea>
                  <div class="note-actions">
                    <button class="tiny-btn" type="button" data-action="note-save" data-recipe-id="${escapeHTML(recipe.id)}">Сохранить</button>
                    <button class="tiny-btn ghost" type="button" data-action="note-cancel" data-recipe-id="${escapeHTML(recipe.id)}">Отмена</button>
                  </div>
                </div>` : ``}
            </section>
          </div>
        </div>
      </article>`;
  }

  function toggleExpanded(recipeId) {
    if (!recipeId) return;

    if (state.expandedIds.has(recipeId)) {
      state.expandedIds.delete(recipeId);
      state.editingNoteIds.delete(recipeId);
    } else {
      state.expandedIds.add(recipeId);
    }

    renderRecipes();
  }

  function openNoteEditor(recipeId) {
    state.editingNoteIds.add(recipeId);
    state.expandedIds.add(recipeId);
    renderRecipes();
  }

  function cancelNoteEditor(recipeId) {
    state.editingNoteIds.delete(recipeId);
    renderRecipes();
  }

  function saveNote(recipeId) {
    const field = state.refs.cardsGrid.querySelector(`[data-note-input="${cssEscape(recipeId)}"]`);
    if (!field) return;

    const value = field.value.trim();
    if (value) state.notesMap[recipeId] = value;
    else delete state.notesMap[recipeId];

    state.editingNoteIds.delete(recipeId);
    saveJson(STORAGE_NOTES, state.notesMap);
    renderRecipes();
    if (isModalOpen()) renderBasketModal();
    showToast(value ? "Заметка сохранена" : "Заметка очищена");
  }

  function removeNote(recipeId) {
    delete state.notesMap[recipeId];
    state.editingNoteIds.delete(recipeId);
    saveJson(STORAGE_NOTES, state.notesMap);
    renderRecipes();
    if (isModalOpen()) renderBasketModal();
    showToast("Заметка удалена");
  }

  function toggleRecipe(recipeId) {
    const recipe = getRecipe(recipeId);
    if (!recipe) return;

    if (state.selectedIds.includes(recipeId)) {
      state.selectedIds = state.selectedIds.filter(id => id !== recipeId);
      showToast(`Убрано: ${recipe.title}`);
    } else {
      state.selectedIds = [...state.selectedIds, recipeId];
      showToast(`Добавлено: ${recipe.title}`);
    }

    saveJson(STORAGE_SELECTED, state.selectedIds);
    renderRecipes();
    updateSelectionUI();
    if (isModalOpen()) renderBasketModal();
  }

  function clearSelection() {
    if (!state.selectedIds.length) {
      showToast("Выбор уже пустой");
      return;
    }

    state.selectedIds = [];
    saveJson(STORAGE_SELECTED, state.selectedIds);
    renderRecipes();
    updateSelectionUI();
    if (isModalOpen()) renderBasketModal();
    showToast("Выбор очищен");
  }

  function updateSelectionUI() {
    const count = state.selectedIds.length;
    const portions = getTargetPortions();
    const r = state.refs;

    r.selectedCountTop.textContent = count;
    r.basketBadge.textContent = count;
    r.basketFab.classList.toggle("visible", count > 0);
    r.selectionDock.classList.toggle("visible", count > 0);

    document.getElementById("selectionDockTitle").textContent = `${count} ${plural(count, "блюдо выбрано", "блюда выбрано", "блюд выбрано")}`;
    document.getElementById("selectionDockMeta").textContent = `${portions} ${plural(portions, "порция", "порции", "порций")} на каждое блюдо · нажми для итогов`;
  }

  function updateSetting(key, delta) {
    if (!["people", "days"].includes(key)) return;

    const max = key === "people" ? MAX_PEOPLE : MAX_DAYS;
    state.settings[key] = clamp(state.settings[key] + delta, MIN_SETTING, max);

    saveJson(STORAGE_SETTINGS, state.settings);
    renderSettings();
    renderRecipes();
    updateSelectionUI();
    if (isModalOpen()) renderBasketModal();
  }

  function openBasketModal() {
    renderBasketModal();
    state.refs.basketModal.classList.add("visible");
    state.refs.basketModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeModals() {
    state.refs.basketModal.classList.remove("visible");
    state.refs.basketModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function renderBasketModal() {
    const selectedRecipes = state.selectedIds.map(getRecipe).filter(Boolean);
    const targetPortions = getTargetPortions();
    const r = state.refs;

    r.basketSubTitle.textContent = `${state.settings.people} ${plural(state.settings.people, "человек", "человека", "человек")} × ${state.settings.days} ${plural(state.settings.days, "день", "дня", "дней")} = ${targetPortions} ${plural(targetPortions, "порция", "порции", "порций")} на каждое выбранное блюдо`;

    if (!selectedRecipes.length) {
      r.selectedStrip.innerHTML = `<div class="modal-empty">Ничего не выбрано.</div>`;
      r.basketSummary.innerHTML = "";
      r.totalsList.innerHTML = `<div class="modal-empty">Выбери блюда — и тут появится список продуктов.</div>`;
      r.recipeSummaryList.innerHTML = "";
      return;
    }

    r.selectedStrip.innerHTML = selectedRecipes.map(recipe => `
      <button class="selected-chip" type="button" data-remove-id="${escapeHTML(recipe.id)}">${escapeHTML(recipe.title)} <span>×</span></button>
    `).join("");

    r.selectedStrip.querySelectorAll("[data-remove-id]").forEach(button => {
      button.addEventListener("click", () => toggleRecipe(button.dataset.removeId));
    });

    const totals = calculateTotals(selectedRecipes, targetPortions);

    r.basketSummary.innerHTML = `
      <div class="summary-pill"><span>Выбрано</span><strong>${selectedRecipes.length} ${plural(selectedRecipes.length, "блюдо", "блюда", "блюд")}</strong></div>
      <div class="summary-pill"><span>На блюдо</span><strong>${targetPortions} ${plural(targetPortions, "порция", "порции", "порций")}</strong></div>
      <div class="summary-pill"><span>Калории</span><strong>${formatNumber(totals.nutrition.kcal)} ккал</strong></div>
      <div class="summary-pill"><span>Б / Ж / У</span><strong>${formatNumber(totals.nutrition.protein)} / ${formatNumber(totals.nutrition.fat)} / ${formatNumber(totals.nutrition.carbs)}</strong></div>
    `;

    r.totalsList.innerHTML = totals.numeric.map(item => `
      <div class="total-item">
        <div><strong>${escapeHTML(item.name)}</strong><small>${item.sources.length} ${plural(item.sources.length, "блюдо", "блюда", "блюд")}</small></div>
        <span>${formatAmount(item.amount, item.unit)}</span>
      </div>
    `).join("");

    if (totals.taste.length) {
      r.totalsList.innerHTML += `<div class="taste-block"><strong>По вкусу / без точной граммовки</strong><p>${totals.taste.map(item => escapeHTML(item.name)).join(", ")}</p></div>`;
    }

    r.recipeSummaryList.innerHTML = selectedRecipes.map(recipe => {
      const nutrition = getScaledNutrition(recipe, targetPortions);
      const note = state.notesMap[recipe.id];
      const image = recipe.heroImage || recipe.image;

      return `
        <article class="recipe-summary">
          <img src="${escapeHTML(image)}" alt="${escapeHTML(recipe.title)}" onerror="window.handleRecipeImageError(this)">
          <div>
            <h4>${escapeHTML(recipe.title)}</h4>
            <p>${targetPortions} ${plural(targetPortions, "порция", "порции", "порций")} · ${formatNumber(nutrition.kcal)} ккал</p>
            <p>Б ${formatNumber(nutrition.protein)} • Ж ${formatNumber(nutrition.fat)} • У ${formatNumber(nutrition.carbs)}</p>
            ${note ? `<p class="summary-note">📝 ${escapeHTML(note)}</p>` : ``}
          </div>
        </article>
      `;
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
    const scaled = {
      kcal: roundSmart(recipe.nutrition.kcal * targetPortions),
      protein: roundSmart(recipe.nutrition.protein * targetPortions),
      fat: roundSmart(recipe.nutrition.fat * targetPortions),
      carbs: roundSmart(recipe.nutrition.carbs * targetPortions)
    };

    if (base) {
      base.kcal += scaled.kcal;
      base.protein += scaled.protein;
      base.fat += scaled.fat;
      base.carbs += scaled.carbs;
    }

    return scaled;
  }

  function copyBasketText() {
    const selectedRecipes = state.selectedIds.map(getRecipe).filter(Boolean);
    if (!selectedRecipes.length) return;

    const totals = calculateTotals(selectedRecipes, getTargetPortions());
    const lines = [
      "Portionly — список продуктов",
      `Людей: ${state.settings.people}`,
      `Дней: ${state.settings.days}`,
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

    const text = lines.join("\n");

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => showCopySuccess()).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function showCopySuccess() {
    if (state.refs.copyBtn) {
      state.refs.copyBtn.textContent = "Скопировано";
      setTimeout(() => { state.refs.copyBtn.textContent = "Скопировать"; }, 1200);
    }
    showToast("Список скопирован");
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    showCopySuccess();
  }

  function getTargetPortions() {
    return state.settings.people * state.settings.days;
  }

  function getRecipe(recipeId) {
    return getRecipes().find(recipe => recipe.id === recipeId);
  }

  function filterExistingRecipeIds(ids) {
    const allowed = new Set(getRecipes().map(recipe => recipe.id));
    return Array.isArray(ids) ? ids.filter(id => allowed.has(id)) : [];
  }

  function normalizeSettings(next) {
    return {
      people: clamp(Number(next?.people) || 1, MIN_SETTING, MAX_PEOPLE),
      days: clamp(Number(next?.days) || 1, MIN_SETTING, MAX_DAYS)
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function isModalOpen() {
    return state.refs.basketModal.classList.contains("visible");
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Portionly: localStorage save failed", error);
    }
  }

  function showToast(text) {
    const toastEl = state.refs.toastEl;
    if (!toastEl) return;

    clearTimeout(state.toastTimer);
    toastEl.textContent = text;
    toastEl.classList.add("visible");
    state.toastTimer = setTimeout(() => toastEl.classList.remove("visible"), 1800);
  }

  function renderFatalError(message) {
    const grid = document.getElementById("cardsGrid");
    if (!grid) return;
    grid.innerHTML = `<div class="empty-state">${escapeHTML(message)}</div>`;
  }

  function roundSmart(value) {
    if (!Number.isFinite(Number(value))) return value;
    return Math.round(Number(value) * 10) / 10;
  }

  function normalizeName(name) {
    return String(name).toLowerCase().replace(/ё/g, "е").trim();
  }

  function formatAmount(amount, unit) {
    return `${formatNumber(amount)} ${unit}`;
  }

  function formatNumber(value) {
    if (!Number.isFinite(Number(value))) return String(value);
    const number = Math.round(Number(value) * 10) / 10;
    return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(".", ",");
  }

  function plural(value, one, few, many) {
    const number = Math.abs(value) % 100;
    const lastDigit = number % 10;

    if (number > 10 && number < 20) return many;
    if (lastDigit > 1 && lastDigit < 5) return few;
    if (lastDigit === 1) return one;
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

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value).replace(/"/g, '\\"');
  }

  window.handleRecipeImageError = function handleRecipeImageError(img) {
    const card = img.closest(".recipe-card, .recipe-summary");
    if (card) card.classList.add("missing-image");
    img.removeAttribute("src");
    img.alt = "Фото не найдено";
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
