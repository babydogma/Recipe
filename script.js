/* Portionly — static app logic, polished UX v15 */
(() => {
  "use strict";

  const STORAGE_SELECTED = "portionly:selected:v14";
  const STORAGE_NOTES = "portionly:notes:v14";
  const STORAGE_RECIPE_SETTINGS = "portionly:recipe-settings:v14";

  const MIN_SETTING = 1;
  const MAX_PEOPLE = 12;
  const MAX_DAYS = 14;

  const state = {
    activeCategory: "all",
    selectedIds: [],
    notesMap: {},
    recipeSettings: {},
    search: "",
    searchOpen: false,
    selectedOnly: false,
    aboutOpen: false,
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
    state.recipeSettings = normalizeRecipeSettingsMap(loadJson(STORAGE_RECIPE_SETTINGS, {}));

    bindStaticEvents();
    renderAll();
  }

  function cacheDom() {
    state.refs = {
      aboutToggleBtn: document.getElementById("aboutToggleBtn"),
      aboutCloseBtn: document.getElementById("aboutCloseBtn"),
      aboutPanel: document.getElementById("aboutPanel"),
      filterShell: document.getElementById("filterShell"),
      categoryTabs: document.getElementById("categoryTabs"),
      cardsGrid: document.getElementById("cardsGrid"),
      basketModal: document.getElementById("basketModal"),
      selectionDock: document.getElementById("selectionDock"),
      selectionDockCount: document.getElementById("selectionDockCount"),
      toastEl: document.getElementById("toast"),
      searchToggleBtn: document.getElementById("searchToggleBtn"),
      searchCloseBtn: document.getElementById("searchCloseBtn"),
      searchPanel: document.getElementById("searchPanel"),
      searchInput: document.getElementById("searchInput"),
      selectedOnlyBtn: document.getElementById("selectedOnlyBtn"),
      collapseAllBtn: document.getElementById("collapseAllBtn"),
      resultsMeta: document.getElementById("resultsMeta"),
      clearAllBtn: document.getElementById("clearAllBtn"),
      copyBtn: document.getElementById("copyBtn"),
      basketSubTitle: document.getElementById("basketSubTitle"),
      selectedStrip: document.getElementById("selectedStrip"),
      basketSummary: document.getElementById("basketSummary"),
      totalsList: document.getElementById("totalsList"),
      recipeSummaryList: document.getElementById("recipeSummaryList")
    };
  }

  function hasRequiredDom() {
    const r = state.refs;
    return Boolean(r.cardsGrid && r.categoryTabs && r.searchInput && r.basketModal);
  }

  function bindStaticEvents() {
    const r = state.refs;

    r.aboutToggleBtn?.addEventListener("click", toggleAboutPanel);
    r.aboutCloseBtn?.addEventListener("click", closeAboutPanel);
    r.clearAllBtn?.addEventListener("click", clearSelection);
    r.copyBtn?.addEventListener("click", copyBasketText);
    r.selectionDock?.addEventListener("click", openBasketModal);

    document.querySelectorAll("[data-close-modal]").forEach(button => {
      button.addEventListener("click", closeModals);
    });

    r.basketModal?.addEventListener("click", event => {
      if (event.target === r.basketModal) closeModals();
    });

    r.searchToggleBtn?.addEventListener("click", openSearch);
    r.searchCloseBtn?.addEventListener("click", closeSearch);

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
      showToast("Карточки свернуты", "neutral");
    });

    r.cardsGrid?.addEventListener("click", handleCardsGridClick);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        if (state.searchOpen) closeSearch();
        else closeModals();
      }
    });
  }

  function toggleAboutPanel() {
    state.aboutOpen = !state.aboutOpen;
    renderAboutPanel();
  }

  function closeAboutPanel() {
    state.aboutOpen = false;
    renderAboutPanel();
  }

  function renderAboutPanel() {
    const panel = state.refs.aboutPanel;
    const button = state.refs.aboutToggleBtn;
    if (!panel || !button) return;

    panel.classList.toggle("visible", state.aboutOpen);
    panel.setAttribute("aria-hidden", String(!state.aboutOpen));
    button.classList.toggle("active", state.aboutOpen);
    button.setAttribute("aria-expanded", String(state.aboutOpen));
  }

  function openSearch() {
    state.searchOpen = true;
    renderSearchState();
    requestAnimationFrame(() => state.refs.searchInput?.focus());
  }

  function closeSearch() {
    state.searchOpen = false;
    state.search = "";
    if (state.refs.searchInput) state.refs.searchInput.value = "";
    renderSearchState();
    renderRecipes();
  }

  function renderSearchState() {
    const shell = state.refs.filterShell;
    const panel = state.refs.searchPanel;
    if (!shell || !panel) return;
    shell.classList.toggle("search-open", state.searchOpen);
    panel.setAttribute("aria-hidden", String(!state.searchOpen));
  }

  function handleCardsGridClick(event) {
    const action = event.target.closest("[data-action]");

    if (action) {
      event.preventDefault();
      event.stopPropagation();
      const recipeId = action.dataset.recipeId;
      const actionName = action.dataset.action;

      if (actionName === "expand") toggleExpanded(recipeId);
      if (actionName === "recipe-step") updateRecipeSetting(recipeId, action.dataset.key, Number(action.dataset.delta || 0));
      if (actionName === "note-open") openNoteEditor(recipeId);
      if (actionName === "note-cancel") cancelNoteEditor(recipeId);
      if (actionName === "note-save") saveNote(recipeId);
      if (actionName === "note-remove") removeNote(recipeId);
      return;
    }

    if (event.target.closest("button, textarea, input, select, a")) return;

    const card = event.target.closest("[data-card-id]");
    if (!card) return;

    event.preventDefault();
    toggleRecipe(card.dataset.cardId);
  }

  function renderAll() {
    renderAboutPanel();
    renderSearchState();
    renderCategories();
    renderSelectedOnlyButton();
    renderRecipes();
    updateSelectionUI();
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
          recipe.cookTime,
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
    const plan = getRecipePlan(recipe.id);
    const targetPortions = getTargetPortions(recipe.id);
    const scaledIngredients = getScaledIngredients(recipe, targetPortions);
    const image = recipe.heroImage || recipe.image;
    const cookTime = getCookTimeLabel(recipe);

    return `
      <article class="recipe-card ${selected ? "selected" : ""}" data-card-id="${escapeHTML(recipe.id)}">
        <div class="recipe-hero">
          <img src="${escapeHTML(image)}" alt="${escapeHTML(recipe.title)}" loading="lazy" onerror="window.handleRecipeImageError(this)">
          <div class="recipe-hero-overlay"></div>
          <span class="recipe-category-badge">${escapeHTML(category?.icon || "🍽️")} ${escapeHTML(category?.title || "Блюдо")}</span>
          <span class="selected-stamp" data-selected-stamp ${selected ? "" : "hidden"}>✓ Добавлено</span>
        </div>

        <div class="recipe-card-body">
          <div class="recipe-card-head">
            <div class="recipe-title-block">
              <h3>${escapeHTML(recipe.title)}</h3>
            </div>
            <div class="cook-time-badge" aria-label="Время приготовления">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M12 7v5l3 1.8"/>
                <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/>
                <path d="M8 2h8"/>
              </svg>
              <span>${escapeHTML(cookTime)}</span>
            </div>
          </div>

          <div class="nutrition-block nutrition-block--base">
            <div class="nutrition-head">
              <span>Расчёт на 1 порцию</span>
            </div>
            <div class="nutrition-row">
              <span>${formatNumber(recipe.nutrition.kcal)} ккал</span>
              <span>Б ${formatNumber(recipe.nutrition.protein)}</span>
              <span>Ж ${formatNumber(recipe.nutrition.fat)}</span>
              <span>У ${formatNumber(recipe.nutrition.carbs)}</span>
            </div>
          </div>

          <button class="expand-toggle ${expanded ? "open" : ""}" type="button" data-action="expand" data-recipe-id="${escapeHTML(recipe.id)}" aria-expanded="${expanded}">
            <span>${expanded ? "Скрыть детали" : "Ингредиенты, шаги и заметки"}</span>
            <b>⌄</b>
          </button>

          <div class="recipe-details ${expanded ? "visible" : ""}">
            <section class="recipe-plan-card recipe-plan-card--compact">
              <div class="recipe-plan-head">
                <div>
                  <h4>Расчёт блюда</h4>
                  <small>только для этой карточки</small>
                </div>
                <strong data-plan-total>${targetPortions} ${plural(targetPortions, "порция", "порции", "порций")}</strong>
              </div>
              <div class="recipe-plan-compact-row" aria-label="Расчёт количества порций">
                ${recipeCompactStepperTemplate(recipe.id, "people", "people", "Людей", plan.people, MIN_SETTING, MAX_PEOPLE)}
                ${recipeCompactStepperTemplate(recipe.id, "days", "calendar", "Дней", plan.days, MIN_SETTING, MAX_DAYS)}
              </div>
            </section>

            <section class="detail-card">
              <div class="detail-head">
                <h4>Ингредиенты</h4>
                <small data-ingredients-portions-label>на ${targetPortions} ${plural(targetPortions, "порцию", "порции", "порций")}</small>
              </div>
              <div class="ingredients-grid" data-ingredients-grid>
                ${ingredientRowsTemplate(scaledIngredients)}
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

  function getCookTimeLabel(recipe) {
    if (!recipe) return "~";
    if (typeof recipe.cookTime === "string") return recipe.cookTime;
    if (recipe.cookTime && typeof recipe.cookTime.label === "string") return recipe.cookTime.label;
    return "~";
  }

  function ingredientRowsTemplate(items) {
    return items.map(item => `
      <div class="ingredient-row">
        <span>${escapeHTML(item.name)}</span>
        <strong>${item.amount === null ? escapeHTML(item.unit) : formatAmount(item.amount, item.unit)}</strong>
      </div>`).join("");
  }

  function recipeCompactStepperTemplate(recipeId, key, icon, label, value, min, max) {
    return `
      <div class="recipe-compact-stepper" data-stepper-key="${escapeHTML(key)}" aria-label="${escapeHTML(label)}">
        <span class="plan-icon" aria-hidden="true">${planIconTemplate(icon)}</span>
        <button type="button" data-action="recipe-step" data-recipe-id="${escapeHTML(recipeId)}" data-key="${escapeHTML(key)}" data-delta="-1" ${value <= min ? "disabled" : ""} aria-label="Уменьшить ${escapeHTML(label.toLowerCase())}">−</button>
        <strong data-stepper-value>${value}</strong>
        <button type="button" data-action="recipe-step" data-recipe-id="${escapeHTML(recipeId)}" data-key="${escapeHTML(key)}" data-delta="1" ${value >= max ? "disabled" : ""} aria-label="Увеличить ${escapeHTML(label.toLowerCase())}">+</button>
      </div>
    `;
  }

  function planIconTemplate(icon) {
    if (icon === "calendar") {
      return `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M7 3v3M17 3v3M4.5 9.2h15M6.2 5h11.6c1.3 0 2.2.9 2.2 2.2v10.6c0 1.3-.9 2.2-2.2 2.2H6.2C4.9 20 4 19.1 4 17.8V7.2C4 5.9 4.9 5 6.2 5Z"/>
          <path d="M8 12.5h.1M12 12.5h.1M16 12.5h.1M8 16h.1M12 16h.1"/>
        </svg>`;
    }

    return `
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M9.5 12.1a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z"/>
        <path d="M3.8 19.2c.5-3 2.7-5 5.7-5s5.2 2 5.7 5"/>
        <path d="M16.2 11.7a3 3 0 1 0 0-6"/>
        <path d="M16.9 14.3c2 .4 3.5 2.1 3.9 4.3"/>
      </svg>`;
  }

  function toggleExpanded(recipeId) {
    if (!recipeId) return;

    const card = state.refs.cardsGrid?.querySelector(`[data-card-id="${cssEscape(recipeId)}"]`);
    const wasExpanded = state.expandedIds.has(recipeId);
    const shouldExpand = !wasExpanded;
    const hadOpenEditor = state.editingNoteIds.has(recipeId);

    if (shouldExpand) {
      state.expandedIds.add(recipeId);
    } else {
      state.expandedIds.delete(recipeId);
      state.editingNoteIds.delete(recipeId);
    }

    if (!card) return;

    if (!shouldExpand && hadOpenEditor) {
      replaceRecipeCard(recipeId);
      return;
    }

    card.classList.toggle("expanded", shouldExpand);

    const details = card.querySelector(".recipe-details");
    if (details) details.classList.toggle("visible", shouldExpand);

    const toggle = card.querySelector('[data-action="expand"]');
    if (toggle) {
      toggle.classList.toggle("open", shouldExpand);
      toggle.setAttribute("aria-expanded", String(shouldExpand));
      const label = toggle.querySelector("span");
      if (label) label.textContent = shouldExpand ? "Скрыть детали" : "Ингредиенты, шаги и заметки";
    }
  }

  function updateRecipeSetting(recipeId, key, delta) {
    if (!recipeId || !["people", "days"].includes(key)) return;

    const plan = getRecipePlan(recipeId);
    const max = key === "people" ? MAX_PEOPLE : MAX_DAYS;
    const nextValue = clamp(plan[key] + delta, MIN_SETTING, max);

    if (nextValue === plan[key]) return;

    state.recipeSettings[recipeId] = { ...plan, [key]: nextValue };
    saveJson(STORAGE_RECIPE_SETTINGS, state.recipeSettings);
    updateRecipeCardDynamic(recipeId);
    updateSelectionUI();
    if (isModalOpen()) renderBasketModal();
  }

  function openNoteEditor(recipeId) {
    if (!recipeId) return;
    state.expandedIds.add(recipeId);
    state.editingNoteIds.add(recipeId);
    replaceRecipeCard(recipeId);
  }

  function cancelNoteEditor(recipeId) {
    if (!recipeId) return;
    state.editingNoteIds.delete(recipeId);
    replaceRecipeCard(recipeId);
  }

  function saveNote(recipeId) {
    if (!recipeId) return;

    const field = state.refs.cardsGrid?.querySelector(`[data-note-input="${cssEscape(recipeId)}"]`);
    if (!field) return;

    const value = field.value.trim();
    if (value) state.notesMap[recipeId] = value;
    else delete state.notesMap[recipeId];

    state.editingNoteIds.delete(recipeId);
    saveJson(STORAGE_NOTES, state.notesMap);
    replaceRecipeCard(recipeId);
    if (isModalOpen()) renderBasketModal();
    showToast(value ? "Заметка сохранена" : "Заметка очищена", "success");
  }

  function removeNote(recipeId) {
    if (!recipeId) return;

    delete state.notesMap[recipeId];
    state.editingNoteIds.delete(recipeId);
    saveJson(STORAGE_NOTES, state.notesMap);
    replaceRecipeCard(recipeId);
    if (isModalOpen()) renderBasketModal();
    showToast("Заметка удалена", "neutral");
  }

  function toggleRecipe(recipeId) {
    const recipe = getRecipe(recipeId);
    if (!recipe) return;

    const selected = state.selectedIds.includes(recipeId);

    if (selected) {
      state.selectedIds = state.selectedIds.filter(id => id !== recipeId);
      showToast("Убрано из корзины", "neutral");
    } else {
      state.selectedIds = [...state.selectedIds, recipeId];
      showToast("Добавлено в корзину", "success");
    }

    saveJson(STORAGE_SELECTED, state.selectedIds);

    if (state.selectedOnly) {
      renderRecipes();
    } else {
      updateRecipeSelectionUI(recipeId);
    }

    updateSelectionUI();
    if (isModalOpen()) renderBasketModal();
  }

  function clearSelection() {
    if (!state.selectedIds.length) {
      showToast("Выбор уже пустой", "neutral");
      return;
    }

    const previousIds = [...state.selectedIds];
    state.selectedIds = [];
    saveJson(STORAGE_SELECTED, state.selectedIds);

    if (state.selectedOnly) {
      renderRecipes();
    } else {
      previousIds.forEach(updateRecipeSelectionUI);
    }

    updateSelectionUI();
    if (isModalOpen()) renderBasketModal();
    showToast("Выбор очищен", "neutral");
  }

  function replaceRecipeCard(recipeId) {
    const recipe = getRecipe(recipeId);
    const currentCard = state.refs.cardsGrid?.querySelector(`[data-card-id="${cssEscape(recipeId)}"]`);
    if (!recipe || !currentCard) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = recipeCardTemplate(recipe).trim();
    const nextCard = wrapper.firstElementChild;
    if (nextCard) currentCard.replaceWith(nextCard);
  }

  function updateRecipeSelectionUI(recipeId) {
    const card = state.refs.cardsGrid?.querySelector(`[data-card-id="${cssEscape(recipeId)}"]`);
    if (!card) return;

    const selected = state.selectedIds.includes(recipeId);
    card.classList.toggle("selected", selected);

    const stamp = card.querySelector("[data-selected-stamp]");
    if (stamp) stamp.hidden = !selected;
  }

  function updateRecipeCardDynamic(recipeId) {
    const recipe = getRecipe(recipeId);
    const card = state.refs.cardsGrid?.querySelector(`[data-card-id="${cssEscape(recipeId)}"]`);
    if (!recipe || !card) return;

    const plan = getRecipePlan(recipeId);
    const targetPortions = getTargetPortions(recipeId);
    const scaledIngredients = getScaledIngredients(recipe, targetPortions);
    const portionsText = `${targetPortions} ${plural(targetPortions, "порция", "порции", "порций")}`;

    const planTotal = card.querySelector("[data-plan-total]");
    if (planTotal) planTotal.textContent = portionsText;

    const ingredientsPortionsLabel = card.querySelector("[data-ingredients-portions-label]");
    if (ingredientsPortionsLabel) ingredientsPortionsLabel.textContent = `на ${targetPortions} ${plural(targetPortions, "порцию", "порции", "порций")}`;

    const ingredientsGrid = card.querySelector("[data-ingredients-grid]");
    if (ingredientsGrid) ingredientsGrid.innerHTML = ingredientRowsTemplate(scaledIngredients);

    updateStepperDynamic(card, "people", plan.people, MIN_SETTING, MAX_PEOPLE);
    updateStepperDynamic(card, "days", plan.days, MIN_SETTING, MAX_DAYS);
  }

  function updateStepperDynamic(card, key, value, min, max) {
    const stepper = card.querySelector(`[data-stepper-key="${key}"]`);
    if (!stepper) return;

    const valueEl = stepper.querySelector("[data-stepper-value]");
    if (valueEl) valueEl.textContent = value;

    const minus = stepper.querySelector('[data-delta="-1"]');
    const plus = stepper.querySelector('[data-delta="1"]');
    if (minus) minus.disabled = value <= min;
    if (plus) plus.disabled = value >= max;
  }

  function updateSelectionUI() {
    const count = state.selectedIds.length;
    const r = state.refs;
    const hasSelection = count > 0;

    if (r.selectionDockCount) r.selectionDockCount.textContent = count;

    if (r.selectionDock) {
      r.selectionDock.hidden = !hasSelection;
      r.selectionDock.classList.toggle("visible", hasSelection);
      r.selectionDock.setAttribute("aria-label", `Открыть корзину, выбрано ${count} ${plural(count, "блюдо", "блюда", "блюд")}`);
    }
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
    const r = state.refs;
    const totalPortions = getSelectedTotalPortions();

    r.basketSubTitle.textContent = selectedRecipes.length
      ? `Каждое блюдо считается по своим настройкам. Всего: ${totalPortions} ${plural(totalPortions, "порция", "порции", "порций")}.`
      : "Выбери блюда, чтобы получить список продуктов.";

    if (!selectedRecipes.length) {
      r.selectedStrip.innerHTML = `<div class="modal-empty">Ничего не выбрано.</div>`;
      r.basketSummary.innerHTML = "";
      r.totalsList.innerHTML = `<div class="modal-empty">Выбери блюда — и тут появится список продуктов.</div>`;
      return;
    }

    r.selectedStrip.innerHTML = selectedRecipes.map(recipe => selectedDishChipTemplate(recipe)).join("");
    r.selectedStrip.querySelectorAll("[data-remove-id]").forEach(button => {
      button.addEventListener("click", () => toggleRecipe(button.dataset.removeId));
    });

    const totals = calculateTotals(selectedRecipes);

    r.basketSummary.innerHTML = `
      <div class="summary-pill summary-pill--accent">
        <span class="summary-icon" aria-hidden="true">⌘</span>
        <div><small>Выбрано</small><strong>${selectedRecipes.length} ${plural(selectedRecipes.length, "блюдо", "блюда", "блюд")}</strong></div>
      </div>
      <div class="summary-pill">
        <span class="summary-icon" aria-hidden="true">●</span>
        <div><small>Порций всего</small><strong>${totalPortions}</strong></div>
      </div>
      <div class="summary-pill">
        <span class="summary-icon" aria-hidden="true">◒</span>
        <div><small>Калории</small><strong>${formatNumber(totals.nutrition.kcal)} ккал</strong></div>
      </div>
      <div class="summary-pill">
        <span class="summary-icon" aria-hidden="true">◌</span>
        <div><small>Б / Ж / У</small><strong>${formatNumber(totals.nutrition.protein)} / ${formatNumber(totals.nutrition.fat)} / ${formatNumber(totals.nutrition.carbs)}</strong></div>
      </div>
    `;

    r.totalsList.innerHTML = ingredientGroupsTemplate(totals);
  }

  function selectedDishChipTemplate(recipe) {
    const portions = getTargetPortions(recipe.id);
    const image = recipe.heroImage || recipe.image;

    return `
      <article class="selected-dish-chip">
        <img src="${escapeHTML(image)}" alt="${escapeHTML(recipe.title)}" onerror="window.handleRecipeImageError(this)">
        <div class="selected-dish-chip__body">
          <strong>${escapeHTML(recipe.title)}</strong>
          <span>${portions} ${plural(portions, "порция", "порции", "порций")}</span>
        </div>
        <button class="selected-dish-chip__remove" type="button" data-remove-id="${escapeHTML(recipe.id)}" aria-label="Убрать ${escapeHTML(recipe.title)} из корзины">×</button>
      </article>
    `;
  }

  function calculateTotals(selectedRecipes) {
    const numericMap = new Map();
    const tasteMap = new Map();
    const nutrition = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

    selectedRecipes.forEach(recipe => {
      const targetPortions = getTargetPortions(recipe.id);
      getScaledNutrition(recipe, targetPortions, nutrition);

      getScaledIngredients(recipe, targetPortions).forEach(ingredient => {
        const normalized = normalizeIngredientItem(ingredient);
        const name = normalized.name;
        const unit = normalized.unit;
        const group = ingredient.amount === null || ingredient.amount === undefined
          ? "taste"
          : getIngredientGroup(name);

        if (ingredient.amount === null || ingredient.amount === undefined) {
          tasteMap.set(normalizeName(name), { name, unit, group: "taste" });
          return;
        }

        const key = `${normalizeName(name)}__${unit.toLowerCase()}`;
        if (!numericMap.has(key)) numericMap.set(key, { name, unit, amount: 0, sources: [], group });

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

  function normalizeIngredientItem(ingredient) {
    const rawName = String(ingredient.name || "").trim();
    const value = normalizeName(rawName);
    let name = rawName;

    if (value === "яйцо" || value === "яйца") name = "Яйца";
    else if (value.includes("помид") || value.includes("томат")) name = "Помидоры";
    else if (value.includes("огур")) name = "Огурцы";
    else if (value.includes("йогурт")) name = "Йогурт";
    else if (value.includes("творог")) name = "Творог";
    else if (value === "масло" || value.includes("растительное масло")) name = "Растительное масло";
    else if (value.includes("мед") || value.includes("мёд")) name = "Мёд";
    else if (value.includes("ягод")) name = "Ягоды";
    else if (value.includes("орех")) name = "Орехи";
    else if (value.includes("листья салата")) name = "Листья салата";
    else if (value.includes("сладкий перец")) name = "Сладкий перец";
    else if (value.includes("манка") || value.includes("мука")) name = "Манка/мука";
    else if (value.includes("мюсли") || value.includes("гранола")) name = "Мюсли/гранола";
    else if (value.includes("молоко или вода")) name = "Молоко/вода";

    return {
      name,
      unit: String(ingredient.unit || "").trim()
    };
  }

  function ingredientGroupsTemplate(totals) {
    const groups = buildIngredientGroups(totals);

    const rendered = groups
      .filter(group => group.items.length)
      .map(group => `
        <details class="ingredient-group" open>
          <summary class="ingredient-group__head">
            <div class="ingredient-group__title"><span>${group.icon}</span><strong>${group.title}</strong></div>
            <div class="ingredient-group__meta"><small>${group.items.length}</small><b>⌄</b></div>
          </summary>
          <div class="ingredient-group__items">
            ${group.items.map(item => `
              <div class="total-item">
                <strong>${escapeHTML(item.name)}</strong>
                <span>${item.amount === null ? escapeHTML(item.unit) : formatAmount(item.amount, item.unit)}</span>
              </div>
            `).join("")}
          </div>
        </details>
      `).join("");

    return rendered || `<div class="modal-empty">Нет ингредиентов для расчёта.</div>`;
  }

  function buildIngredientGroups(totals) {
    const groups = new Map();
    INGREDIENT_GROUPS.forEach(group => groups.set(group.id, { ...group, items: [] }));

    totals.numeric.forEach(item => {
      const groupId = groups.has(item.group) ? item.group : "other";
      groups.get(groupId).items.push(item);
    });

    totals.taste.forEach(item => groups.get("taste").items.push({ ...item, amount: null }));

    return Array.from(groups.values());
  }

  const INGREDIENT_GROUPS = [
    { id: "vegetables", title: "Овощи и зелень", icon: "🥬" },
    { id: "meat_fish", title: "Мясо и рыба", icon: "🥩" },
    { id: "dairy_eggs", title: "Молочка и яйца", icon: "🥚" },
    { id: "grains_bread", title: "Крупы, хлеб и лаваш", icon: "🌾" },
    { id: "fruit_sweet", title: "Фрукты, ягоды и сладкое", icon: "🍯" },
    { id: "oils_spices", title: "Масла, специи и соусы", icon: "🧂" },
    { id: "taste", title: "По вкусу", icon: "✨" },
    { id: "other", title: "Прочее", icon: "🛒" }
  ];

  function getIngredientGroup(name) {
    const value = normalizeName(name);

    if (includesAny(value, ["курин", "говядин", "рыб", "филе рыбы"])) return "meat_fish";
    if (includesAny(value, ["яй", "молоко", "молоко/вода", "сыр", "творог", "йогурт"])) return "dairy_eggs";
    if (includesAny(value, ["хлеб", "лаваш", "овся", "булгур", "греч", "манка", "мука", "сухари", "мюсли", "гранола"])) return "grains_bread";
    if (includesAny(value, ["банан", "ягод", "мед", "мёд", "сахар", "орех"])) return "fruit_sweet";
    if (includesAny(value, ["огур", "помид", "томат", "зелень", "салат", "карто", "капуст", "морков", "лук", "кабач", "сладкий перец", "чеснок", "овощ"])) return "vegetables";
    if (includesAny(value, ["масло", "специ", "соль", "перец", "паприка", "лимон", "заправ", "соус"])) return "oils_spices";

    return "other";
  }

  function includesAny(value, needles) {
    return needles.some(needle => value.includes(needle));
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

    const totals = calculateTotals(selectedRecipes);
    const lines = ["Portionly — список продуктов", "", "Выбранные блюда:"];

    selectedRecipes.forEach(recipe => {
      lines.push(`- ${recipe.title}: ${getTargetPortions(recipe.id)} ${plural(getTargetPortions(recipe.id), "порция", "порции", "порций")}`);
    });

    lines.push("", "Продукты:");

    buildIngredientGroups(totals).filter(group => group.items.length).forEach(group => {
      lines.push("", `${group.title}:`);
      group.items.forEach(item => lines.push(`- ${item.name}: ${item.amount === null ? item.unit : formatAmount(item.amount, item.unit)}`));
    });

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
    showToast("Список скопирован", "success");
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

  function getRecipePlan(recipeId) {
    return normalizeRecipeSetting(state.recipeSettings[recipeId] || { people: 1, days: 1 });
  }

  function getTargetPortions(recipeId) {
    const plan = getRecipePlan(recipeId);
    return plan.people * plan.days;
  }

  function getSelectedTotalPortions() {
    return state.selectedIds.reduce((sum, id) => sum + getTargetPortions(id), 0);
  }

  function getRecipe(recipeId) {
    return getRecipes().find(recipe => recipe.id === recipeId);
  }

  function filterExistingRecipeIds(ids) {
    const allowed = new Set(getRecipes().map(recipe => recipe.id));
    return Array.isArray(ids) ? ids.filter(id => allowed.has(id)) : [];
  }

  function normalizeRecipeSettingsMap(next) {
    const result = {};
    const allowed = new Set(getRecipes().map(recipe => recipe.id));

    if (!next || typeof next !== "object") return result;

    Object.entries(next).forEach(([recipeId, value]) => {
      if (allowed.has(recipeId)) result[recipeId] = normalizeRecipeSetting(value);
    });

    return result;
  }

  function normalizeRecipeSetting(next) {
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

  function showToast(text, tone = "success") {
    const toastEl = state.refs.toastEl;
    if (!toastEl) return;

    clearTimeout(state.toastTimer);
    toastEl.textContent = text;
    toastEl.className = `toast visible ${tone === "success" ? "toast-success" : "toast-neutral"}`;
    state.toastTimer = setTimeout(() => toastEl.classList.remove("visible"), 1250);
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
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value).replace(/\"/g, '\\\"');
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
