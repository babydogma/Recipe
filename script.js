/* Portionly — clean static app logic v22 */
(() => {
  "use strict";

  const STORAGE_SELECTED = "portionly:selected:v14";
  const STORAGE_NOTES = "portionly:notes:v14";
  const STORAGE_RECIPE_SETTINGS = "portionly:recipe-settings:v14";
  const STORAGE_FAVORITES = "portionly:favorites:v16";
  const STORAGE_PANTRY = "portionly:pantry:v20";

  const MIN_SETTING = 1;
  const MAX_PEOPLE = 12;
  const MAX_DAYS = 14;

  const state = {
    activeCategory: "all",
    selectedIds: [],
    favoriteIds: [],
    expandedIds: new Set(),
    editingNoteIds: new Set(),
    notesMap: {},
    recipeSettings: {},
    pantryMap: {},
    search: "",
    searchOpen: false,
    aboutOpen: false,
    toastTimer: null,
    refs: {}
  };

  const INGREDIENT_GROUPS = [
    { id: "vegetables", title: "Овощи и зелень" },
    { id: "meat", title: "Мясо и рыба" },
    { id: "dairy", title: "Молочка и яйца" },
    { id: "grains", title: "Крупы, хлеб и лаваш" },
    { id: "fruits", title: "Фрукты, ягоды и сладкое" },
    { id: "oils", title: "Масла, специи и соусы" },
    { id: "taste", title: "По вкусу" },
    { id: "other", title: "Другое" }
  ];

  document.addEventListener("DOMContentLoaded", init);

  window.handleRecipeImageError = (image) => {
    const card = image.closest(".recipe-card, .selected-dish-chip");
    image.removeAttribute("src");
    image.classList.add("image-missing");
    card?.classList.add("missing-image");
  };

  function init() {
    cacheDom();

    if (!hasRequiredDom()) {
      console.error("Portionly: не найдены обязательные DOM-элементы");
      return;
    }

    if (!getCategories().length || !getRecipes().length) {
      renderFatalError("Не загружены данные рецептов. Проверь recipes-data.js и порядок подключения файлов.");
      return;
    }

    state.selectedIds = filterExistingRecipeIds(loadJson(STORAGE_SELECTED, []));
    state.favoriteIds = filterExistingRecipeIds(loadJson(STORAGE_FAVORITES, []));
    state.notesMap = loadJson(STORAGE_NOTES, {});
    state.recipeSettings = normalizeRecipeSettingsMap(loadJson(STORAGE_RECIPE_SETTINGS, {}));
    state.pantryMap = normalizePantryMap(loadJson(STORAGE_PANTRY, {}));

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
      resultsMeta: document.getElementById("resultsMeta"),
      clearAllBtn: document.getElementById("clearAllBtn"),
      copyBtn: document.getElementById("copyBtn"),
      basketSubTitle: document.getElementById("basketSubTitle"),
      selectedStrip: document.getElementById("selectedStrip"),
      totalsList: document.getElementById("totalsList")
    };
  }

  function hasRequiredDom() {
    const r = state.refs;
    return Boolean(r.cardsGrid && r.categoryTabs && r.searchInput && r.basketModal && r.totalsList);
  }

  function bindStaticEvents() {
    const r = state.refs;

    r.aboutToggleBtn?.addEventListener("click", toggleAboutPanel);
    r.aboutCloseBtn?.addEventListener("click", closeAboutPanel);
    r.searchToggleBtn?.addEventListener("click", openSearch);
    r.searchCloseBtn?.addEventListener("click", closeSearch);
    r.selectionDock?.addEventListener("click", openBasketModal);
    r.clearAllBtn?.addEventListener("click", clearSelection);
    r.copyBtn?.addEventListener("click", copyBasketText);

    r.categoryTabs?.addEventListener("click", handleCategoryClick);
    r.cardsGrid?.addEventListener("click", handleCardsGridClick);
    r.totalsList?.addEventListener("click", handleTotalsListClick);
    r.totalsList?.addEventListener("input", handleTotalsListInput);
    r.totalsList?.addEventListener("blur", handleTotalsListBlur, true);

    r.searchInput?.addEventListener("input", () => {
      state.search = r.searchInput.value.trim();
      renderRecipes();
    });

    document.querySelectorAll("[data-close-modal]").forEach((button) => {
      button.addEventListener("click", closeModals);
    });

    r.basketModal?.addEventListener("click", (event) => {
      if (event.target === r.basketModal) closeModals();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (state.searchOpen) closeSearch();
      else closeModals();
    });
  }

  function renderAll() {
    renderAboutPanel();
    renderSearchState();
    renderCategories();
    renderRecipes();
    updateSelectionUI();
  }

  function getCategories() {
    return Array.isArray(window.CATEGORIES) ? window.CATEGORIES : [];
  }

  function getRecipes() {
    return Array.isArray(window.RECIPES) ? window.RECIPES : [];
  }

  function handleCategoryClick(event) {
    const button = event.target.closest("[data-category]");
    if (!button) return;

    state.activeCategory = button.dataset.category || "all";
    renderCategories();
    renderRecipes();
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

  function renderCategories() {
    const categories = getCategories();
    const recipes = getRecipes();

    state.refs.categoryTabs.innerHTML = categories.map((category) => {
      const count = category.id === "all"
        ? recipes.length
        : recipes.filter((recipe) => recipe.category === category.id).length;

      return `
        <button class="category-tab ${category.id === state.activeCategory ? "active" : ""}" type="button" data-category="${escapeHTML(category.id)}" aria-pressed="${category.id === state.activeCategory}">
          <span>${escapeHTML(category.icon || "")}</span>
          <strong>${escapeHTML(category.title || "Категория")}</strong>
          <small>${count}</small>
        </button>`;
    }).join("");
  }

  function renderRecipes() {
    const visibleRecipes = getVisibleRecipes();
    updateResultsMeta(visibleRecipes.length);

    if (!visibleRecipes.length) {
      state.refs.cardsGrid.innerHTML = `<div class="empty-state">Ничего не найдено. Попробуй другой запрос или другую категорию.</div>`;
      return;
    }

    state.refs.cardsGrid.innerHTML = visibleRecipes.map(recipeCardTemplate).join("");
  }

  function getVisibleRecipes() {
    const query = normalizeName(state.search);
    let list = state.activeCategory === "all"
      ? getRecipes()
      : getRecipes().filter((recipe) => recipe.category === state.activeCategory);

    if (!query) return list;

    return list.filter((recipe) => {
      const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients.map((item) => item.name).join(" ") : "";
      const haystack = [recipe.title, recipe.meta, recipe.cookTime, ingredients].join(" ");
      return normalizeName(haystack).includes(query);
    });
  }

  function updateResultsMeta(count) {
    const parts = [`Найдено ${count} ${plural(count, "блюдо", "блюда", "блюд")}`];

    if (state.activeCategory !== "all") {
      const category = getCategories().find((item) => item.id === state.activeCategory);
      if (category) parts.push(`в категории «${category.title}»`);
    }

    if (state.search) parts.push(`по запросу «${state.search}»`);
    state.refs.resultsMeta.textContent = parts.join(" · ");
  }

  function recipeCardTemplate(recipe) {
    const category = getCategories().find((item) => item.id === recipe.category);
    const selected = state.selectedIds.includes(recipe.id);
    const expanded = state.expandedIds.has(recipe.id);
    const editingNote = state.editingNoteIds.has(recipe.id);
    const note = (state.notesMap[recipe.id] || "").trim();
    const plan = getRecipePlan(recipe.id);
    const targetPortions = getTargetPortions(recipe.id);
    const scaledIngredients = getScaledIngredients(recipe, targetPortions);
    const image = getRecipeImage(recipe);

    return `
      <article class="recipe-card ${selected ? "selected" : ""} ${image ? "" : "missing-image"}" data-card-id="${escapeHTML(recipe.id)}">
        <div class="recipe-hero">
          ${image
            ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(recipe.title)}" loading="lazy" onerror="window.handleRecipeImageError(this)">`
            : `<div class="recipe-no-image"><span>Фото не добавлено</span></div>`}
          <div class="recipe-hero-overlay"></div>
          <span class="recipe-category-badge"><i></i>${escapeHTML(getShortCategoryTitle(category))}</span>
          <button class="favorite-btn ${isFavorite(recipe.id) ? "active" : ""}" type="button" data-action="favorite" data-recipe-id="${escapeHTML(recipe.id)}" aria-label="${isFavorite(recipe.id) ? "Убрать из избранного" : "Добавить в избранное"}" aria-pressed="${isFavorite(recipe.id)}">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="m12 3 2.82 5.72 6.31.92-4.56 4.44 1.08 6.28L12 17.39l-5.65 2.97 1.08-6.28-4.56-4.44 6.31-.92L12 3Z"/></svg>
          </button>
        </div>

        <div class="recipe-card-body">
          <div class="recipe-time-line">
            <span class="cook-time-badge" aria-label="Время приготовления">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M12 7v5l3 1.8"/>
                <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/>
                <path d="M8 2h8"/>
              </svg>
              ${escapeHTML(getCookTimeLabel(recipe))}
            </span>
          </div>

          <h3>${escapeHTML(recipe.title)}</h3>

          <div class="nutrition-block nutrition-block--base">
            <span>Расчёт на 1 порцию</span>
            <div class="nutrition-row">
              <strong>${formatNumber(recipe.nutrition?.kcal || 0)} ккал</strong>
              <strong>Б ${formatNumber(recipe.nutrition?.protein || 0)}</strong>
              <strong>Ж ${formatNumber(recipe.nutrition?.fat || 0)}</strong>
              <strong>У ${formatNumber(recipe.nutrition?.carbs || 0)}</strong>
            </div>
          </div>

          <button class="expand-toggle ${expanded ? "open" : ""}" type="button" data-action="expand" data-recipe-id="${escapeHTML(recipe.id)}" aria-expanded="${expanded}">
            <span>Ингредиенты, шаги и заметки</span>
            <b>›</b>
          </button>

          <div class="recipe-details ${expanded ? "visible" : ""}">
            <section class="recipe-plan-card">
              <div class="recipe-plan-head">
                <div>
                  <h4>Расчёт блюда</h4>
                  <small>только для этой карточки</small>
                </div>
                <strong data-plan-total>${targetPortions} ${plural(targetPortions, "порция", "порции", "порций")}</strong>
              </div>
              <div class="recipe-plan-row" aria-label="Расчёт количества порций">
                ${recipeStepperTemplate(recipe.id, "people", "Людей", plan.people, MIN_SETTING, MAX_PEOPLE)}
                ${recipeStepperTemplate(recipe.id, "days", "Дней", plan.days, MIN_SETTING, MAX_DAYS)}
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
                <small>${(recipe.steps || []).length} ${plural((recipe.steps || []).length, "шаг", "шага", "шагов")}</small>
              </div>
              <ol class="steps-list">
                ${(recipe.steps || []).map((step) => `<li>${escapeHTML(step)}</li>`).join("")}
              </ol>
            </section>

            <section class="detail-card note-card">
              <div class="detail-head">
                <h4>Заметка</h4>
                <small>${note ? "сохранена" : "пусто"}</small>
              </div>
              ${noteEditorTemplate(recipe.id, note, editingNote)}
            </section>
          </div>
        </div>
      </article>`;
  }

  function noteEditorTemplate(recipeId, note, editingNote) {
    if (editingNote) {
      return `
        <div class="note-editor">
          <textarea data-note-input="${escapeHTML(recipeId)}" rows="4" placeholder="Напиши заметку по этому блюду...">${escapeHTML(note)}</textarea>
          <div class="note-actions">
            <button class="tiny-btn" type="button" data-action="note-save" data-recipe-id="${escapeHTML(recipeId)}">Сохранить</button>
            <button class="tiny-btn ghost" type="button" data-action="note-cancel" data-recipe-id="${escapeHTML(recipeId)}">Отмена</button>
          </div>
        </div>`;
    }

    if (note) {
      return `
        <div class="saved-note">
          <p>${escapeHTML(note).replace(/\n/g, "<br>")}</p>
          <div class="note-actions">
            <button class="tiny-btn" type="button" data-action="note-open" data-recipe-id="${escapeHTML(recipeId)}">Редактировать</button>
            <button class="tiny-btn ghost" type="button" data-action="note-remove" data-recipe-id="${escapeHTML(recipeId)}">Удалить</button>
          </div>
        </div>`;
    }

    return `<button class="note-trigger" type="button" data-action="note-open" data-recipe-id="${escapeHTML(recipeId)}">+ Добавить заметку</button>`;
  }

  function recipeStepperTemplate(recipeId, key, label, value, min, max) {
    return `
      <div class="recipe-stepper" data-stepper-key="${escapeHTML(key)}">
        <span>${escapeHTML(label)}</span>
        <div>
          <button type="button" data-action="recipe-step" data-recipe-id="${escapeHTML(recipeId)}" data-key="${escapeHTML(key)}" data-delta="-1" ${value <= min ? "disabled" : ""} aria-label="Уменьшить ${escapeHTML(label.toLowerCase())}">−</button>
          <strong data-stepper-value>${value}</strong>
          <button type="button" data-action="recipe-step" data-recipe-id="${escapeHTML(recipeId)}" data-key="${escapeHTML(key)}" data-delta="1" ${value >= max ? "disabled" : ""} aria-label="Увеличить ${escapeHTML(label.toLowerCase())}">+</button>
        </div>
      </div>`;
  }

  function ingredientRowsTemplate(items) {
    return items.map((item) => `
      <div class="ingredient-row">
        <span>${escapeHTML(item.name)}</span>
        <strong>${item.amount === null ? escapeHTML(item.unit || "по вкусу") : formatAmount(item.amount, item.unit)}</strong>
      </div>`).join("");
  }

  function handleCardsGridClick(event) {
    const action = event.target.closest("[data-action]");

    if (action) {
      event.preventDefault();
      event.stopPropagation();

      const recipeId = action.dataset.recipeId;
      const actionName = action.dataset.action;

      if (actionName === "expand") toggleExpanded(recipeId);
      if (actionName === "favorite") toggleFavorite(recipeId);
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

  function toggleExpanded(recipeId) {
    if (!recipeId) return;

    const card = state.refs.cardsGrid?.querySelector(`[data-card-id="${cssEscape(recipeId)}"]`);
    const shouldExpand = !state.expandedIds.has(recipeId);

    if (shouldExpand) state.expandedIds.add(recipeId);
    else {
      state.expandedIds.delete(recipeId);
      state.editingNoteIds.delete(recipeId);
    }

    if (!card) return;
    if (state.editingNoteIds.has(recipeId)) return replaceRecipeCard(recipeId);

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

  function toggleRecipe(recipeId) {
    const recipe = getRecipe(recipeId);
    if (!recipe) return;

    const selected = state.selectedIds.includes(recipeId);

    if (selected) {
      state.selectedIds = state.selectedIds.filter((id) => id !== recipeId);
      showToast(`Убрано: ${recipe.title}`, "neutral");
    } else {
      state.selectedIds = [...state.selectedIds, recipeId];
      showToast(`Добавлено: ${recipe.title}`, "success");
    }

    saveJson(STORAGE_SELECTED, state.selectedIds);
    updateRecipeSelectionUI(recipeId);
    updateSelectionUI();
    if (isModalOpen()) renderBasketModal();
  }

  function toggleFavorite(recipeId) {
    const recipe = getRecipe(recipeId);
    if (!recipe) return;

    if (state.favoriteIds.includes(recipeId)) {
      state.favoriteIds = state.favoriteIds.filter((id) => id !== recipeId);
      showToast("Убрано из избранного", "neutral");
    } else {
      state.favoriteIds = [...state.favoriteIds, recipeId];
      showToast("Добавлено в избранное", "success");
    }

    saveJson(STORAGE_FAVORITES, state.favoriteIds);
    updateRecipeFavoriteUI(recipeId);
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

  function updateRecipeSelectionUI(recipeId) {
    const card = state.refs.cardsGrid?.querySelector(`[data-card-id="${cssEscape(recipeId)}"]`);
    if (!card) return;
    card.classList.toggle("selected", state.selectedIds.includes(recipeId));
  }

  function updateRecipeFavoriteUI(recipeId) {
    const card = state.refs.cardsGrid?.querySelector(`[data-card-id="${cssEscape(recipeId)}"]`);
    const button = card?.querySelector('[data-action="favorite"]');
    if (!button) return;

    const active = state.favoriteIds.includes(recipeId);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", active ? "Убрать из избранного" : "Добавить в избранное");
  }

  function updateRecipeCardDynamic(recipeId) {
    const recipe = getRecipe(recipeId);
    const card = state.refs.cardsGrid?.querySelector(`[data-card-id="${cssEscape(recipeId)}"]`);
    if (!recipe || !card) return;

    const plan = getRecipePlan(recipeId);
    const targetPortions = getTargetPortions(recipeId);
    const portionsText = `${targetPortions} ${plural(targetPortions, "порция", "порции", "порций")}`;

    const planTotal = card.querySelector("[data-plan-total]");
    if (planTotal) planTotal.textContent = portionsText;

    const label = card.querySelector("[data-ingredients-portions-label]");
    if (label) label.textContent = `на ${targetPortions} ${plural(targetPortions, "порцию", "порции", "порций")}`;

    const grid = card.querySelector("[data-ingredients-grid]");
    if (grid) grid.innerHTML = ingredientRowsTemplate(getScaledIngredients(recipe, targetPortions));

    updateStepperDynamic(card, "people", plan.people, MIN_SETTING, MAX_PEOPLE);
    updateStepperDynamic(card, "days", plan.days, MIN_SETTING, MAX_DAYS);
  }

  function updateStepperDynamic(card, key, value, min, max) {
    const stepper = card.querySelector(`[data-stepper-key="${key}"]`);
    if (!stepper) return;

    const valueEl = stepper.querySelector("[data-stepper-value]");
    const minus = stepper.querySelector('[data-delta="-1"]');
    const plus = stepper.querySelector('[data-delta="1"]');

    if (valueEl) valueEl.textContent = value;
    if (minus) minus.disabled = value <= min;
    if (plus) plus.disabled = value >= max;
  }

  function openNoteEditor(recipeId) {
    state.expandedIds.add(recipeId);
    state.editingNoteIds.add(recipeId);
    replaceRecipeCard(recipeId);
  }

  function cancelNoteEditor(recipeId) {
    state.editingNoteIds.delete(recipeId);
    replaceRecipeCard(recipeId);
  }

  function saveNote(recipeId) {
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
    delete state.notesMap[recipeId];
    state.editingNoteIds.delete(recipeId);
    saveJson(STORAGE_NOTES, state.notesMap);
    replaceRecipeCard(recipeId);
    if (isModalOpen()) renderBasketModal();
    showToast("Заметка удалена", "neutral");
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

  function clearSelection() {
    if (!state.selectedIds.length) {
      showToast("Выбор уже пустой", "neutral");
      return;
    }

    const previousIds = [...state.selectedIds];
    state.selectedIds = [];
    saveJson(STORAGE_SELECTED, state.selectedIds);
    previousIds.forEach(updateRecipeSelectionUI);
    updateSelectionUI();
    renderBasketModal();
    showToast("Выбор очищен", "neutral");
  }

  function updateSelectionUI() {
    const count = state.selectedIds.length;
    const r = state.refs;

    if (r.selectionDockCount) r.selectionDockCount.textContent = count;

    if (r.selectionDock) {
      r.selectionDock.hidden = count === 0;
      r.selectionDock.classList.toggle("visible", count > 0);
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

  function isModalOpen() {
    return state.refs.basketModal?.classList.contains("visible");
  }

  function renderBasketModal() {
    const selectedRecipes = state.selectedIds.map(getRecipe).filter(Boolean);
    const totalPortions = getSelectedTotalPortions();
    const r = state.refs;

    r.basketSubTitle.textContent = selectedRecipes.length
      ? `Каждое блюдо считается по своим настройкам. Всего: ${totalPortions} ${plural(totalPortions, "порция", "порции", "порций")}.`
      : "Выбери блюда, чтобы получить список продуктов.";

    if (!selectedRecipes.length) {
      r.selectedStrip.innerHTML = `<div class="modal-empty">Ничего не выбрано.</div>`;
      r.totalsList.innerHTML = `<div class="modal-empty">Выбери блюда — и тут появится список продуктов.</div>`;
      return;
    }

    r.selectedStrip.innerHTML = selectedRecipes.map(selectedDishChipTemplate).join("");
    r.selectedStrip.querySelectorAll("[data-remove-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleRecipe(button.dataset.removeId);
      });
    });

    const totals = calculateTotals(selectedRecipes);
    r.totalsList.innerHTML = basketProductsTemplate(totals, selectedRecipes, totalPortions);
  }

  function selectedDishChipTemplate(recipe) {
    const portions = getTargetPortions(recipe.id);
    const image = getRecipeImage(recipe);

    return `
      <article class="selected-dish-chip ${image ? "" : "missing-image"}">
        ${image
          ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(recipe.title)}" onerror="window.handleRecipeImageError(this)">`
          : `<div class="selected-dish-chip__placeholder" aria-hidden="true">—</div>`}
        <div class="selected-dish-chip__body">
          <strong>${escapeHTML(recipe.title)}</strong>
          <span>${portions} ${plural(portions, "порция", "порции", "порций")}</span>
        </div>
        <button class="selected-dish-chip__remove" type="button" data-remove-id="${escapeHTML(recipe.id)}" aria-label="Убрать ${escapeHTML(recipe.title)} из корзины">×</button>
      </article>`;
  }

  function calculateTotals(selectedRecipes) {
    const numericMap = new Map();
    const tasteMap = new Map();
    const nutrition = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

    selectedRecipes.forEach((recipe) => {
      const targetPortions = getTargetPortions(recipe.id);
      const nutritionFactor = targetPortions;

      nutrition.kcal += Number(recipe.nutrition?.kcal || 0) * nutritionFactor;
      nutrition.protein += Number(recipe.nutrition?.protein || 0) * nutritionFactor;
      nutrition.fat += Number(recipe.nutrition?.fat || 0) * nutritionFactor;
      nutrition.carbs += Number(recipe.nutrition?.carbs || 0) * nutritionFactor;

      getScaledIngredients(recipe, targetPortions).forEach((ingredient) => {
        const normalized = normalizeIngredientItem(ingredient);
        const group = ingredient.amount === null || ingredient.amount === undefined
          ? "taste"
          : getIngredientGroup(normalized.name);

        if (ingredient.amount === null || ingredient.amount === undefined) {
          tasteMap.set(normalizeName(normalized.name), { name: normalized.name, unit: normalized.unit, group: "taste", amount: null, sources: [recipe.title] });
          return;
        }

        const key = `${normalizeName(normalized.name)}__${normalized.unit.toLowerCase()}`;
        if (!numericMap.has(key)) numericMap.set(key, { name: normalized.name, unit: normalized.unit, amount: 0, sources: [], group });

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

  function basketProductsTemplate(totals, selectedRecipes, totalPortions) {
    const groups = buildIngredientGroups(totals).filter((group) => group.items.length);
    const nutrition = totals.nutrition;

    const summary = `
      <section class="basket-inline-summary" aria-label="Итоги корзины">
        <div><small>Выбрано</small><strong>${selectedRecipes.length} ${plural(selectedRecipes.length, "блюдо", "блюда", "блюд")}</strong></div>
        <div><small>Порции</small><strong>${totalPortions}</strong></div>
        <div><small>Калории</small><strong>${formatNumber(nutrition.kcal)} ккал</strong></div>
        <div><small>Б / Ж / У</small><strong>${formatNumber(nutrition.protein)} / ${formatNumber(nutrition.fat)} / ${formatNumber(nutrition.carbs)}</strong></div>
      </section>`;

    const products = groups.map((group) => `
      <section class="ingredient-group">
        <header class="ingredient-group__head">
          <div class="ingredient-group__title"><i></i><strong>${escapeHTML(group.title)}</strong></div>
          <small>${group.items.length}</small>
        </header>
        <div class="ingredient-group__items">
          ${group.items.map((item) => item.amount === null ? tasteItemTemplate(item) : pantryIngredientTemplate(item)).join("")}
        </div>
      </section>`).join("");

    return `${summary}${products || `<div class="modal-empty">Нет ингредиентов для расчёта.</div>`}`;
  }

  function pantryIngredientTemplate(item) {
    const key = getPantryKey(item);
    const pantry = getPantryState(item);
    const checked = Boolean(pantry);
    const needed = roundSmart(Number(item.amount) || 0);

    return `
      <div class="total-item pantry-row ${checked ? "has-home" : ""}" data-pantry-key="${escapeHTML(key)}">
        <button class="pantry-check" type="button" data-pantry-toggle="${escapeHTML(key)}" data-needed="${escapeHTML(needed)}" data-unit="${escapeHTML(item.unit)}" aria-pressed="${checked}" aria-label="${checked ? "Убрать отметку" : "Отметить, что есть дома"}">${checked ? "✓" : ""}</button>
        <strong>${escapeHTML(item.name)}</strong>
        <span class="total-amount ${checked ? "owned-mode" : ""}">
          ${checked
            ? `<input class="owned-input" data-owned-input="${escapeHTML(key)}" inputmode="decimal" type="text" value="${formatNumber(pantry.amount)}" aria-label="Сколько есть дома"><em>из ${formatAmount(needed, item.unit)}</em>`
            : formatAmount(needed, item.unit)}
        </span>
      </div>`;
  }

  function tasteItemTemplate(item) {
    return `
      <div class="total-item total-item--taste">
        <span class="pantry-check pantry-check--ghost" aria-hidden="true"></span>
        <strong>${escapeHTML(item.name)}</strong>
        <span class="total-amount">${escapeHTML(item.unit || "по вкусу")}</span>
      </div>`;
  }

  function handleTotalsListClick(event) {
    const toggle = event.target.closest("[data-pantry-toggle]");
    if (!toggle) return;

    event.preventDefault();
    event.stopPropagation();

    const key = toggle.dataset.pantryToggle;
    const needed = parseAmountInput(toggle.dataset.needed);
    const unit = toggle.dataset.unit || "";
    if (!key || !Number.isFinite(needed)) return;

    if (state.pantryMap[key]?.checked) delete state.pantryMap[key];
    else state.pantryMap[key] = { checked: true, amount: roundSmart(needed), unit };

    savePantryMap();
    renderBasketModal();
  }

  function handleTotalsListInput(event) {
    const input = event.target.closest("[data-owned-input]");
    if (!input) return;

    input.value = input.value.replace(/[^0-9.,]/g, "");
    const key = input.dataset.ownedInput;
    const amount = parseAmountInput(input.value);
    if (!key || !Number.isFinite(amount)) return;

    const current = state.pantryMap[key] || { checked: true };
    state.pantryMap[key] = { ...current, checked: true, amount: Math.max(0, roundSmart(amount)) };
    savePantryMap();
  }

  function handleTotalsListBlur(event) {
    const input = event.target.closest("[data-owned-input]");
    if (!input) return;

    const key = input.dataset.ownedInput;
    const amount = parseAmountInput(input.value);
    if (!key) return;

    const current = state.pantryMap[key] || { checked: true };
    const normalized = Number.isFinite(amount) ? Math.max(0, roundSmart(amount)) : 0;
    state.pantryMap[key] = { ...current, checked: true, amount: normalized };
    savePantryMap();
    renderBasketModal();
  }

  function buildIngredientGroups(totals) {
    const groups = new Map(INGREDIENT_GROUPS.map((group) => [group.id, { ...group, items: [] }]));

    totals.numeric.forEach((item) => {
      const id = groups.has(item.group) ? item.group : "other";
      groups.get(id).items.push(item);
    });

    totals.taste.forEach((item) => groups.get("taste").items.push(item));
    return Array.from(groups.values());
  }

  function getIngredientGroup(name) {
    const value = normalizeName(name);

    if (/(куриц|говядин|свинин|фарш|рыб|треск|лосос|индейк|мяс)/.test(value)) return "meat";
    if (/(яйц|молок|сыр|творог|йогурт|кефир|сметан|сливк)/.test(value)) return "dairy";
    if (/(хлеб|лаваш|круп|гречк|рис|булгур|овсян|хлоп|макарон|мук|манк|сухар|картоф)/.test(value)) return "grains";
    if (/(банан|ягод|орех|мед|мёд|сахар|фрукт|мюсли|гранол)/.test(value)) return "fruits";
    if (/(масл|соус|паприк|перец|соль|спец|чеснок)/.test(value)) return "oils";
    if (/(огур|помид|томат|зелень|салат|лук|морков|перец слад|кабач|капуст|овощ)/.test(value)) return "vegetables";

    return "other";
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
    else if (value.includes("куриный фарш")) name = "Куриный фарш";

    return { name, unit: String(ingredient.unit || "").trim() };
  }

  function copyBasketText() {
    const selectedRecipes = state.selectedIds.map(getRecipe).filter(Boolean);
    if (!selectedRecipes.length) {
      showToast("Корзина пустая", "neutral");
      return;
    }

    const totals = calculateTotals(selectedRecipes);
    const lines = ["Список продуктов:"];

    buildIngredientGroups(totals).filter((group) => group.items.length).forEach((group) => {
      lines.push("", group.title + ":");
      group.items.forEach((item) => {
        lines.push(`- ${item.name}: ${item.amount === null ? (item.unit || "по вкусу") : formatAmount(item.amount, item.unit)}`);
      });
    });

    navigator.clipboard?.writeText(lines.join("\n"))
      .then(() => showToast("Список скопирован", "success"))
      .catch(() => showToast("Не получилось скопировать", "neutral"));
  }

  function getRecipe(recipeId) {
    return getRecipes().find((recipe) => recipe.id === recipeId);
  }

  function getRecipeImage(recipe) {
    return String(recipe?.heroImage || recipe?.image || "").trim();
  }

  function getCookTimeLabel(recipe) {
    if (!recipe) return "~";
    if (typeof recipe.cookTime === "string") return recipe.cookTime;
    if (recipe.cookTime && typeof recipe.cookTime.label === "string") return recipe.cookTime.label;
    return "~";
  }

  function getShortCategoryTitle(category) {
    const title = category?.title || "Блюдо";
    const normalized = normalizeName(title);
    if (normalized.includes("завтрак")) return "Завтрак";
    if (normalized.includes("обед")) return "Обед";
    return title;
  }

  function isFavorite(recipeId) {
    return state.favoriteIds.includes(recipeId);
  }

  function getRecipePlan(recipeId) {
    const saved = state.recipeSettings[recipeId] || {};
    return {
      people: clamp(Number(saved.people) || 1, MIN_SETTING, MAX_PEOPLE),
      days: clamp(Number(saved.days) || 1, MIN_SETTING, MAX_DAYS)
    };
  }

  function getTargetPortions(recipeId) {
    const plan = getRecipePlan(recipeId);
    return plan.people * plan.days;
  }

  function getSelectedTotalPortions() {
    return state.selectedIds.reduce((sum, id) => sum + getTargetPortions(id), 0);
  }

  function getScaledIngredients(recipe, targetPortions) {
    const basePortions = Math.max(1, Number(recipe.portions) || 1);
    const factor = targetPortions / basePortions;

    return (recipe.ingredients || []).map((ingredient) => ({
      name: ingredient.name,
      unit: ingredient.unit,
      amount: ingredient.amount === null || ingredient.amount === undefined
        ? null
        : roundSmart(Number(ingredient.amount) * factor)
    }));
  }

  function getPantryKey(item) {
    return `${normalizeName(item.name)}__${String(item.unit || "").toLowerCase()}`;
  }

  function getPantryState(item) {
    const key = getPantryKey(item);
    const saved = state.pantryMap[key];
    if (!saved?.checked) return null;

    const amount = Number.isFinite(Number(saved.amount))
      ? Math.max(0, roundSmart(Number(saved.amount)))
      : roundSmart(Number(item.amount) || 0);

    return { ...saved, amount };
  }

  function savePantryMap() {
    saveJson(STORAGE_PANTRY, state.pantryMap);
  }

  function normalizePantryMap(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) return {};

    return Object.entries(input).reduce((acc, [key, value]) => {
      if (!key || !value || typeof value !== "object") return acc;
      const amount = Number(value.amount);
      acc[key] = {
        checked: Boolean(value.checked),
        amount: Number.isFinite(amount) ? Math.max(0, roundSmart(amount)) : 0,
        unit: typeof value.unit === "string" ? value.unit : ""
      };
      return acc;
    }, {});
  }

  function normalizeRecipeSettingsMap(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) return {};

    return Object.entries(input).reduce((acc, [recipeId, value]) => {
      if (!getRecipe(recipeId) || !value || typeof value !== "object") return acc;
      acc[recipeId] = {
        people: clamp(Number(value.people) || 1, MIN_SETTING, MAX_PEOPLE),
        days: clamp(Number(value.days) || 1, MIN_SETTING, MAX_DAYS)
      };
      return acc;
    }, {});
  }

  function filterExistingRecipeIds(ids) {
    if (!Array.isArray(ids)) return [];
    const validIds = new Set(getRecipes().map((recipe) => recipe.id));
    return ids.filter((id, index) => validIds.has(id) && ids.indexOf(id) === index);
  }

  function parseAmountInput(value) {
    const normalized = String(value ?? "").replace(/,/g, ".").trim();
    return normalized ? Number(normalized) : NaN;
  }

  function showToast(message, type = "neutral") {
    const toast = state.refs.toastEl;
    if (!toast) return;

    clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.className = `toast visible toast-${type}`;

    state.toastTimer = window.setTimeout(() => {
      toast.classList.remove("visible");
    }, 1700);
  }

  function renderFatalError(message) {
    state.refs.cardsGrid.innerHTML = `<div class="empty-state">${escapeHTML(message)}</div>`;
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
      console.error(`Portionly: не удалось сохранить ${key}`, error);
    }
  }

  function normalizeName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^a-zа-я0-9]+/gi, " ")
      .trim();
  }

  function formatAmount(amount, unit) {
    return `${formatNumber(amount)} ${unit || ""}`.trim();
  }

  function formatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(roundSmart(number));
  }

  function roundSmart(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.round(number * 10) / 10;
  }

  function plural(number, one, few, many) {
    const value = Math.abs(Number(number)) % 100;
    const last = value % 10;
    if (value > 10 && value < 20) return many;
    if (last > 1 && last < 5) return few;
    if (last === 1) return one;
    return many;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(value);
    return String(value).replace(/"/g, '\\"');
  }
})();
