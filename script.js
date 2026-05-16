/* Portionly — static app logic, pantry partial amounts v64 */
(() => {
  "use strict";

  const STORAGE_SELECTED = "portionly:selected:v14";
  const STORAGE_NOTES = "portionly:notes:v14";
  const STORAGE_RECIPE_SETTINGS = "portionly:recipe-settings:v14";
  const STORAGE_FAVORITES = "portionly:favorites:v16";
  const STORAGE_PANTRY = "portionly:dish-pantry:v48";

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
    favoriteIds: [],
    pantryMap: {},
    aboutOpen: false,
    expandedIds: new Set(),
    basketExpandedIds: new Set(),
    basketPantryEditIds: new Set(),
    editingNoteIds: new Set(),
    toastTimer: null,
    cardsRendered: false,
    recipeViewReady: false,
    filterAnimationTimer: null,
    filterSwapTimer: null,
    filterSettleTimer: null,
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
    state.favoriteIds = filterExistingRecipeIds(loadJson(STORAGE_FAVORITES, []));
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
      selectedOnlyBtn: document.getElementById("selectedOnlyBtn"),
      collapseAllBtn: document.getElementById("collapseAllBtn"),
      resultsMeta: document.getElementById("resultsMeta"),
      clearAllBtn: document.getElementById("clearAllBtn"),
      copyBtn: document.getElementById("copyBtn"),
      basketSubTitle: document.getElementById("basketSubTitle"),
      basketTitle: document.getElementById("basketTitle"),
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
    r.categoryTabs?.addEventListener("scroll", updateCategoryEdgeMasks, { passive: true });
    window.addEventListener("resize", scheduleCategoryEdgeMaskUpdate);

    r.searchInput?.addEventListener("input", () => {
      state.search = r.searchInput.value.trim();
      renderRecipes({ animate: true });
    });

    r.selectedOnlyBtn?.addEventListener("click", () => {
      state.selectedOnly = !state.selectedOnly;
      renderSelectedOnlyButton();
      renderRecipes({ animate: true });
    });

    r.collapseAllBtn?.addEventListener("click", () => {
      state.expandedIds.clear();
      state.editingNoteIds.clear();
      renderRecipes();
      showToast("Карточки свернуты", "neutral");
    });

    r.cardsGrid?.addEventListener("click", handleCardsGridClick);
    r.selectedStrip?.addEventListener("click", handleBasketDishAction);
    r.selectedStrip?.addEventListener("change", handleDishPantryChange);
    r.selectedStrip?.addEventListener("input", handleDishPantryAmountInput);
    r.selectedStrip?.addEventListener("focusin", handleDishPantryAmountFocus);
    r.selectedStrip?.addEventListener("focusout", handleDishPantryAmountBlur);

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
    renderRecipes({ animate: true });
  }

  function renderSearchState() {
    const shell = state.refs.filterShell;
    const panel = state.refs.searchPanel;
    if (!shell || !panel) return;
    shell.classList.toggle("search-open", state.searchOpen);
    panel.setAttribute("aria-hidden", String(!state.searchOpen));
    scheduleCategoryEdgeMaskUpdate();
  }

  function scheduleCategoryEdgeMaskUpdate() {
    requestAnimationFrame(updateCategoryEdgeMasks);
  }

  function updateCategoryEdgeMasks() {
    const tabs = state.refs.categoryTabs;
    if (!tabs) return;

    const maxScroll = Math.max(0, tabs.scrollWidth - tabs.clientWidth);
    const hasLeftFade = tabs.scrollLeft > 4;
    const hasRightFade = tabs.scrollLeft < maxScroll - 4;

    tabs.classList.toggle("has-left-fade", hasLeftFade);
    tabs.classList.toggle("no-right-fade", !hasRightFade);
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
    const favoriteCount = state.favoriteIds.length;

    if (state.activeCategory === "favorites" && favoriteCount === 0) {
      state.activeCategory = "all";
    }

    const categoryItems = categories.flatMap(category => {
      const count = category.id === "all"
        ? recipes.length
        : recipes.filter(recipe => recipe.category === category.id).length;

      const baseItem = { ...category, count };

      if (category.id !== "all") return [baseItem];

      const items = [baseItem];

      if (favoriteCount > 0) {
        items.push({
          id: "favorites",
          title: "Избранное",
          icon: "★",
          count: favoriteCount
        });
      }

      return items;
    });

    state.refs.categoryTabs.innerHTML = categoryItems.map(category => `
      <button class="category-tab ${category.id === state.activeCategory ? "active" : ""}" type="button" data-category="${escapeHTML(category.id)}">
        <span class="category-tab__icon" aria-hidden="true">${categoryIconTemplate(category.id)}</span>
        <strong>${escapeHTML(category.title)}</strong>
        <small>${category.count}</small>
      </button>
    `).join("");

    state.refs.categoryTabs.querySelectorAll("[data-category]").forEach(button => {
      button.addEventListener("click", () => {
        state.activeCategory = button.dataset.category;
        renderCategories();
        renderRecipes({ animate: true });
      });
    });

    scheduleCategoryEdgeMaskUpdate();
  }

  function categoryIconTemplate(categoryId) {
    const id = String(categoryId || "");

    if (id === "favorites") {
      return `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path class="category-tab__icon-fill" d="m12 3.4 2.74 5.55 6.13.9-4.44 4.32 1.05 6.1L12 17.4l-5.48 2.88 1.05-6.1-4.44-4.32 6.13-.9L12 3.4Z"/>
        </svg>`;
    }

    if (id === "breakfast") {
      return `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M6.4 9.2h8.4v4.4a3.4 3.4 0 0 1-3.4 3.4H9.8a3.4 3.4 0 0 1-3.4-3.4V9.2Z"/>
          <path d="M14.8 10h1.3a2.2 2.2 0 0 1 0 4.4h-1.3"/>
          <path d="M5 18.4h12.2"/>
          <path d="M8.2 5.4c-.7.6-.7 1.2 0 1.8"/>
          <path d="M11 5c-.7.6-.7 1.4 0 2"/>
          <path d="M13.8 5.4c-.7.6-.7 1.2 0 1.8"/>
        </svg>`;
    }

    if (id === "main") {
      return `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M4.7 11.3h14.6c-.5 4.4-3.3 7-7.3 7s-6.8-2.6-7.3-7Z"/>
          <path d="M7 18.3h10"/>
          <path d="M8.3 9.4c.8-.9 1.9-1.3 3.2-.8 1.4.5 2.7.3 3.9-.8"/>
          <path d="M8.2 6.7c.7-.6 1.4-.8 2.2-.4"/>
        </svg>`;
    }

    if (id === "dessert") {
      return `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M12 20.2c-3.9-2.7-6.2-5.8-6.2-8.8 0-2.5 1.7-4.3 4-4.3 1.1 0 1.9.4 2.2 1 .3-.6 1.1-1 2.2-1 2.3 0 4 1.8 4 4.3 0 3-2.3 6.1-6.2 8.8Z"/>
          <path d="M9.1 6.8 7.8 4.3M12 7.7V4.2M14.9 6.8l1.3-2.5"/>
          <path d="M9.7 7.2c1.1-.5 3.5-.5 4.6 0"/>
          <path d="M9.4 11.3h.01M12 10.7h.01M14.6 11.3h.01M10.5 14h.01M13.5 14h.01M12 16.4h.01"/>
        </svg>`;
    }

    if (id === "all") {
      return `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M12 18.7a6.7 6.7 0 1 0 0-13.4 6.7 6.7 0 0 0 0 13.4Z"/>
          <path d="M3.8 4.6v6.1"/>
          <path d="M2.6 4.6v5.2"/>
          <path d="M5 4.6v5.2"/>
          <path d="M3.8 10.7v8.1"/>
          <path d="M20.2 4.8v14"/>
          <path d="M18.4 4.8c0 2.9.6 5.1 1.8 6"/>
        </svg>`;
    }

    return `
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M12 18.7a6.7 6.7 0 1 0 0-13.4 6.7 6.7 0 0 0 0 13.4Z"/>
      </svg>`;
  }

  function renderRecipes(options = {}) {
    ensureRecipeCardsRendered();

    const shouldAnimate = Boolean(options.animate) && state.recipeViewReady;
    const applyRecipeVisibility = () => {
      const visibleRecipes = getVisibleRecipes();
      const visibleIds = new Set(visibleRecipes.map(recipe => recipe.id));
      updateResultsMeta(visibleRecipes.length);

      state.refs.cardsGrid.querySelectorAll(".recipe-card[data-card-id]").forEach(card => {
        const recipeId = card.dataset.cardId;
        const visible = visibleIds.has(recipeId);
        card.hidden = !visible;
        card.classList.toggle("is-hidden", !visible);
        if (visible) syncRecipeCardState(card, recipeId);
      });

      const empty = state.refs.cardsGrid.querySelector("[data-empty-state]");
      if (empty) empty.hidden = visibleRecipes.length > 0;
    };

    if (shouldAnimate) {
      runCardsListTransition(applyRecipeVisibility);
    } else {
      applyRecipeVisibility();
    }

    state.recipeViewReady = true;
  }

  function runCardsListTransition(applyUpdate) {
    const grid = state.refs.cardsGrid;
    if (!grid) {
      applyUpdate();
      return;
    }

    window.clearTimeout(state.filterAnimationTimer);
    window.clearTimeout(state.filterSwapTimer);
    window.clearTimeout(state.filterSettleTimer);

    grid.classList.add("filter-transition");
    grid.classList.add("filter-transition-active");

    state.filterSwapTimer = window.setTimeout(() => {
      applyUpdate();

      requestAnimationFrame(() => {
        grid.classList.remove("filter-transition-active");
        state.filterSettleTimer = window.setTimeout(() => {
          grid.classList.remove("filter-transition");
        }, 220);
      });
    }, 90);
  }

  function ensureRecipeCardsRendered() {
    if (state.cardsRendered) return;

    state.refs.cardsGrid.innerHTML = `${getRecipes().map(recipeCardTemplate).join("")}<div class="empty-state" data-empty-state hidden>Ничего не найдено. Попробуй другой запрос или отключи фильтр «Только выбранные».</div>`;
    state.cardsRendered = true;
  }

  function syncRecipeCardState(card, recipeId) {
    if (!card || !recipeId) return;

    const selected = state.selectedIds.includes(recipeId);
    const expanded = state.expandedIds.has(recipeId);
    const favorite = isFavorite(recipeId);

    card.classList.toggle("selected", selected);
    card.classList.toggle("expanded", expanded);

    const details = card.querySelector(".recipe-details");
    setRecipeDetailsOpen(details, expanded, { animate: false });

    const toggle = card.querySelector('[data-action="expand"]');
    if (toggle) {
      toggle.classList.toggle("open", expanded);
      toggle.setAttribute("aria-expanded", String(expanded));
      const label = toggle.querySelector("span");
      if (label) label.textContent = expanded ? "Скрыть детали" : "Ингредиенты, шаги и заметки";
    }

    const fav = card.querySelector('[data-action="favorite"]');
    if (fav) {
      fav.classList.toggle("active", favorite);
      fav.setAttribute("aria-pressed", String(favorite));
      fav.setAttribute("aria-label", favorite ? "Убрать из избранного" : "Добавить в избранное");
    }
  }

  function getVisibleRecipes() {
    const recipes = getRecipes();
    const query = normalizeName(state.search);

    let list = recipes;

    if (state.activeCategory === "favorites") {
      list = list.filter(recipe => state.favoriteIds.includes(recipe.id));
    } else if (state.activeCategory !== "all") {
      list = list.filter(recipe => recipe.category === state.activeCategory);
    }

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
    let text = `${count} ${plural(count, "блюдо", "блюда", "блюд")}`;

    if (state.activeCategory === "favorites") {
      text += " в избранном";
    } else if (state.activeCategory !== "all") {
      const category = getCategories().find(item => item.id === state.activeCategory);
      if (category) text += ` в категории «${category.title}»`;
    }

    if (state.selectedOnly) text += " среди выбранных";
    if (state.search) text += ` по запросу «${state.search}»`;

    state.refs.resultsMeta.textContent = text;
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
    const image = getRecipeImage(recipe);
    const cookTime = getCookTimeLabel(recipe);

    return `
      <article class="recipe-card ${selected ? "selected" : ""} ${image ? "" : "missing-image"}" data-card-id="${escapeHTML(recipe.id)}">
        <div class="recipe-hero">
          ${image
            ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(recipe.title)}" loading="lazy" onerror="window.handleRecipeImageError(this)">`
            : `<div class="recipe-no-image"><span>Фото не добавлено</span></div>`}
          <div class="recipe-hero-overlay"></div>
          <div class="recipe-hero-meta">
            <span class="recipe-category-icon-badge recipe-category-icon-badge--${escapeHTML(recipe.category)}" aria-label="Категория: ${escapeHTML(getShortCategoryTitle(category))}">
              ${categoryIconTemplate(recipe.category)}
            </span>
            <div class="cook-time-badge" aria-label="Время приготовления">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M12 7v5l3 1.8"/>
                <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/>
                <path d="M8 2h8"/>
              </svg>
              <span>${escapeHTML(cookTime)}</span>
            </div>
          </div>
          <button class="favorite-btn ${isFavorite(recipe.id) ? "active" : ""}" type="button" data-action="favorite" data-recipe-id="${escapeHTML(recipe.id)}" aria-label="${isFavorite(recipe.id) ? "Убрать из избранного" : "Добавить в избранное"}" aria-pressed="${isFavorite(recipe.id)}">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="m12 3 2.82 5.72 6.31.92-4.56 4.44 1.08 6.28L12 17.39l-5.65 2.97 1.08-6.28-4.56-4.44 6.31-.92L12 3Z"/></svg>
          </button>
        </div>

        <div class="recipe-card-body">
          <div class="recipe-card-head">
            <div class="recipe-title-block">
              <h3>${escapeHTML(recipe.title)}</h3>
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

  function getRecipeImage(recipe) {
    const image = String(recipe.heroImage || recipe.image || "").trim();
    return image || "";
  }

  function getCookTimeLabel(recipe) {
    if (!recipe) return "~";
    if (typeof recipe.cookTime === "string") return recipe.cookTime;
    if (recipe.cookTime && typeof recipe.cookTime.label === "string") return recipe.cookTime.label;
    return "~";
  }

  function getShortCategoryTitle(category) {
    const title = category?.title || "Блюдо";
    if (normalizeName(title).includes("завтрак")) return "Завтрак";
    if (normalizeName(title).includes("обед")) return "Обед";
    if (normalizeName(title).includes("десерт")) return "Десерт";
    return title;
  }

  function isFavorite(recipeId) {
    return state.favoriteIds.includes(recipeId);
  }

  function toggleFavorite(recipeId) {
    const recipe = getRecipe(recipeId);
    if (!recipe) return;

    const wasFavoritesView = state.activeCategory === "favorites";

    if (isFavorite(recipeId)) {
      state.favoriteIds = state.favoriteIds.filter(id => id !== recipeId);
      showToast("Убрано из избранного", "neutral");
    } else {
      state.favoriteIds = [...state.favoriteIds, recipeId];
      showToast("Добавлено в избранное", "success");
    }

    saveJson(STORAGE_FAVORITES, state.favoriteIds);
    updateRecipeFavoriteUI(recipeId);
    renderCategories();

    if (wasFavoritesView) {
      renderRecipes({ animate: true });
    }
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
    setRecipeDetailsOpen(details, shouldExpand);

    const toggle = card.querySelector('[data-action="expand"]');
    if (toggle) {
      toggle.classList.toggle("open", shouldExpand);
      toggle.setAttribute("aria-expanded", String(shouldExpand));
      const label = toggle.querySelector("span");
      if (label) label.textContent = shouldExpand ? "Скрыть детали" : "Ингредиенты, шаги и заметки";
    }
  }


  function setRecipeDetailsOpen(details, open, options = {}) {
    if (!details) return;

    const animate = options.animate !== false;
    details.removeEventListener("transitionend", details._portionlyHeightEnd);

    if (!animate) {
      details.classList.add("no-anim");
      details.classList.toggle("visible", open);
      details.style.height = open ? "auto" : "0px";
      requestAnimationFrame(() => details.classList.remove("no-anim"));
      return;
    }

    details.classList.remove("no-anim");

    if (open) {
      details.classList.add("visible");
      details.style.height = "0px";
      details.offsetHeight;

      const targetHeight = details.scrollHeight;
      requestAnimationFrame(() => {
        details.style.height = `${targetHeight}px`;
      });

      details._portionlyHeightEnd = event => {
        if (event.propertyName !== "height") return;
        details.style.height = "auto";
        details.removeEventListener("transitionend", details._portionlyHeightEnd);
      };
      details.addEventListener("transitionend", details._portionlyHeightEnd);
      return;
    }

    const startHeight = details.getBoundingClientRect().height || details.scrollHeight;
    details.style.height = `${startHeight}px`;
    details.offsetHeight;

    requestAnimationFrame(() => {
      details.classList.remove("visible");
      details.style.height = "0px";
    });

    details._portionlyHeightEnd = event => {
      if (event.propertyName !== "height") return;
      details.removeEventListener("transitionend", details._portionlyHeightEnd);
    };
    details.addEventListener("transitionend", details._portionlyHeightEnd);
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
    if (nextCard) {
      syncRecipeCardState(nextCard, recipeId);
      currentCard.replaceWith(nextCard);
      renderRecipes();
    }
  }

  function updateRecipeSelectionUI(recipeId) {
    const card = state.refs.cardsGrid?.querySelector(`[data-card-id="${cssEscape(recipeId)}"]`);
    if (!card) return;

    const selected = state.selectedIds.includes(recipeId);
    card.classList.toggle("selected", selected);


  }

  function updateRecipeFavoriteUI(recipeId) {
    const card = state.refs.cardsGrid?.querySelector(`[data-card-id="${cssEscape(recipeId)}"]`);
    if (!card) return;

    const btn = card.querySelector('[data-action="favorite"]');
    if (!btn) return;

    const active = isFavorite(recipeId);
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
    btn.setAttribute("aria-label", active ? "Убрать из избранного" : "Добавить в избранное");
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
    state.basketPantryEditIds.clear();
    document.body.classList.remove("modal-open");
  }

  function renderBasketModal() {
    const selectedRecipes = state.selectedIds.map(getRecipe).filter(Boolean);
    const r = state.refs;
    const totalPortions = getSelectedTotalPortions();

    syncBasketExpandedIds(selectedRecipes);

    if (r.basketTitle) r.basketTitle.textContent = "Корзина";

    if (!selectedRecipes.length) {
      r.basketSubTitle.textContent = "Выбери блюда — и тут появится список покупок.";
      r.selectedStrip.innerHTML = `<div class="modal-empty">Ничего не выбрано.</div>`;
      r.basketSummary.innerHTML = "";
      r.totalsList.innerHTML = `<div class="modal-empty">Выбери блюда — и тут появится список продуктов.</div>`;
      return;
    }

    cleanupDishPantryMap();
    const totals = calculateTotals(selectedRecipes);

    r.basketSubTitle.textContent = `${selectedRecipes.length} ${plural(selectedRecipes.length, "блюдо", "блюда", "блюд")} · ${totalPortions} ${plural(totalPortions, "порция", "порции", "порций")} · ${formatNumber(totals.nutrition.kcal)} ккал`;
    r.basketSummary.innerHTML = basketCompactSummaryTemplate(totals);
    r.selectedStrip.innerHTML = basketDishesSectionTemplate(selectedRecipes);
    r.totalsList.innerHTML = basketFlatProductsTemplate(totals);
  }

  function syncBasketExpandedIds(selectedRecipes) {
    const validIds = new Set(selectedRecipes.map(recipe => recipe.id));
    state.basketExpandedIds.forEach(id => {
      if (!validIds.has(id)) state.basketExpandedIds.delete(id);
    });
    state.basketPantryEditIds.forEach(id => {
      if (!validIds.has(id)) state.basketPantryEditIds.delete(id);
    });
  }

  function handleBasketDishAction(event) {
    const removeButton = event.target.closest("[data-remove-id]");
    if (removeButton) {
      toggleRecipe(removeButton.dataset.removeId);
      return;
    }

    const copyButton = event.target.closest("[data-copy-recipe-id]");
    if (copyButton) {
      copyRecipeIngredientsText(copyButton.dataset.copyRecipeId, copyButton);
      return;
    }

    const editButton = event.target.closest("[data-basket-dish-edit]");
    if (editButton) {
      const recipeId = editButton.dataset.basketDishEdit;
      if (!recipeId) return;
      state.basketPantryEditIds.add(recipeId);
      renderBasketModal();
      return;
    }

    const toggleButton = event.target.closest("[data-basket-dish-toggle]");
    if (!toggleButton) return;

    const recipeId = toggleButton.dataset.basketDishToggle;
    if (!recipeId) return;

    if (state.basketExpandedIds.has(recipeId)) {
      state.basketExpandedIds.delete(recipeId);
    } else {
      state.basketExpandedIds.add(recipeId);
    }

    renderBasketModal();
  }

  function basketCompactSummaryTemplate(totals) {
    const kcal = formatNumber(totals.nutrition.kcal);
    const protein = formatNumber(totals.nutrition.protein);
    const fat = formatNumber(totals.nutrition.fat);
    const carbs = formatNumber(totals.nutrition.carbs);

    return `
      <section class="basket-total-card" aria-label="Итого по корзине">
        <header class="basket-total-card__head">
          <span class="basket-total-card__icon" aria-hidden="true">
            <svg viewBox="0 0 32 32" focusable="false">
              <path d="M6.2 14.7h19.6l-1.65 9.35a2.35 2.35 0 0 1-2.3 1.95H10.15a2.35 2.35 0 0 1-2.3-1.95L6.2 14.7Z" />
              <path d="M5.2 14.7h21.6" />
              <path d="M8.25 17.1h15.5" />
              <path d="M11 18.85v4.2" />
              <path d="M14.35 18.55v4.85" />
              <path d="M17.65 18.55v4.85" />
              <path d="M21 18.85v4.2" />
              <path d="M10.15 12.1c1.45-2.05 3.55-2.75 5.85-2.3" />
              <path d="M15.15 9.9c-.55-1.75.2-3.2 1.75-4.25 1.25 1.6 1.2 3.25-.05 4.65" />
              <path d="M18.25 11.7c2.35-1.8 4.55-1.55 6.45.2" />
              <path d="M18.55 11.65l4.4-4.4" />
              <path d="M21.8 7.6l1.95-.35" />
              <path d="M22.55 8.65l1.8.25" />
            </svg>
          </span>
          <span class="basket-total-card__copy">
            <strong>Итого по корзине</strong>
            <small>Сумма всех блюд</small>
          </span>
        </header>
        <div class="basket-total-grid">
          <div class="basket-total-cell basket-total-cell--kcal">
            <span class="basket-total-cell__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M12.45 21.25c-3.95 0-6.95-2.82-6.95-6.64 0-2.55 1.32-4.5 3.42-6.28 1.35-1.15 2.02-2.45 1.8-4.52 2.7 1.05 4.4 3.02 4.76 5.45.72-.5 1.2-1.25 1.43-2.22 1.68 1.43 2.59 3.35 2.59 5.5 0 5.02-3.3 8.71-7.05 8.71Z" />
                <path d="M12.1 18.25c-1.72 0-3.08-1.18-3.08-2.92 0-1.28.72-2.2 1.74-3.05.66-.55.98-1.14.9-2.15 1.42.62 2.28 1.75 2.42 3.12.42-.22.76-.58.98-1.08.82.82 1.25 1.88 1.25 3.05 0 1.78-1.42 3.03-3.21 3.03Z" />
              </svg>
            </span>
            <strong>${escapeHTML(kcal)}</strong>
            <small>ккал</small>
          </div>
          <div class="basket-total-cell">
            <span aria-hidden="true">Б</span>
            <strong>${escapeHTML(protein)}</strong>
            <small>г</small>
          </div>
          <div class="basket-total-cell">
            <span aria-hidden="true">Ж</span>
            <strong>${escapeHTML(fat)}</strong>
            <small>г</small>
          </div>
          <div class="basket-total-cell">
            <span aria-hidden="true">У</span>
            <strong>${escapeHTML(carbs)}</strong>
            <small>г</small>
          </div>
        </div>
      </section>
    `;
  }

  function copyIconMarkup() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M8 8.5V6.8c0-1 .8-1.8 1.8-1.8h6.4c1 0 1.8.8 1.8 1.8v8.4c0 1-.8 1.8-1.8 1.8h-1.7" />
        <rect x="5" y="8.5" width="10" height="10.5" rx="1.8" />
      </svg>
    `;
  }

  function deleteIconMarkup() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M9 6.2V5.1c0-.9.7-1.6 1.6-1.6h2.8c.9 0 1.6.7 1.6 1.6v1.1" />
        <path d="M5.8 6.2h12.4" />
        <path d="M7.2 8.4l.7 10.1c.1 1 .9 1.8 1.9 1.8h4.4c1 0 1.8-.8 1.9-1.8l.7-10.1" />
        <path d="M10.5 11.1v5.6" />
        <path d="M13.5 11.1v5.6" />
      </svg>
    `;
  }

  function chevronIconMarkup() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7.5 14.5 12 10l4.5 4.5" />
      </svg>
    `;
  }

  function basketDishesSectionTemplate(selectedRecipes) {
    const count = selectedRecipes.length;
    const portions = selectedRecipes.reduce((sum, recipe) => sum + getTargetPortions(recipe.id), 0);

    return `
      <section class="basket-dishes" aria-label="Блюда в корзине">
        <header class="basket-section-head">
          <h3>Блюда в корзине</h3>
          <span class="basket-section-count" aria-label="${count} ${plural(count, "блюдо", "блюда", "блюд")}, ${portions} ${plural(portions, "порция", "порции", "порций")}">
            <b>${count} ${plural(count, "блюдо", "блюда", "блюд")}</b>
            <i aria-hidden="true"></i>
            <b>${portions} ${plural(portions, "порция", "порции", "порций")}</b>
          </span>
        </header>
        <div class="basket-dish-list">
          ${selectedRecipes.map(basketDishTemplate).join("")}
        </div>
      </section>
    `;
  }

  function basketDishTemplate(recipe) {
    const portions = getTargetPortions(recipe.id);
    const image = getRecipeImage(recipe);
    const expanded = state.basketExpandedIds.has(recipe.id);
    const scaledIngredients = getScaledIngredients(recipe, portions);
    const allIngredientsAtHome = Boolean(scaledIngredients.length) && scaledIngredients.every(item => isDishIngredientCovered(recipe.id, item));
    const showPantryOverlay = allIngredientsAtHome && !state.basketPantryEditIds.has(recipe.id);

    return `
      <article class="basket-dish ${expanded ? "is-open" : ""}">
        <div class="basket-dish__top">
          <button class="basket-dish__toggle" type="button" data-basket-dish-toggle="${escapeHTML(recipe.id)}" aria-expanded="${expanded ? "true" : "false"}">
            ${image
              ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(recipe.title)}" onerror="window.handleRecipeImageError(this)">`
              : `<span class="basket-dish__placeholder" aria-hidden="true">—</span>`}
            <span class="basket-dish__copy">
              <strong>${escapeHTML(recipe.title)}</strong>
              <small>${portions} ${plural(portions, "порция", "порции", "порций")}</small>
            </span>
          </button>
          <div class="basket-dish__tools" aria-label="Действия с блюдом">
            <button class="basket-dish__tool basket-dish__tool--copy" type="button" data-copy-recipe-id="${escapeHTML(recipe.id)}" aria-label="Скопировать недостающее для ${escapeHTML(recipe.title)}" title="Скопировать недостающее">${copyIconMarkup()}</button>
            <button class="basket-dish__tool basket-dish__tool--remove" type="button" data-remove-id="${escapeHTML(recipe.id)}" aria-label="Убрать ${escapeHTML(recipe.title)} из корзины" title="Убрать из корзины">${deleteIconMarkup()}</button>
            <button class="basket-dish__expand" type="button" data-basket-dish-toggle="${escapeHTML(recipe.id)}" aria-expanded="${expanded ? "true" : "false"}" aria-label="${expanded ? "Скрыть" : "Показать"} ингредиенты блюда">${chevronIconMarkup()}</button>
          </div>
        </div>
        <div class="basket-dish__details ${showPantryOverlay ? "is-complete" : ""}" ${expanded ? "" : "hidden"}>
          <div class="basket-dish__details-title">Ингредиенты</div>
          <div class="basket-dish__ingredients-wrap">
            <div class="basket-dish__ingredients" aria-hidden="${showPantryOverlay ? "true" : "false"}">
              ${scaledIngredients.map(item => dishIngredientRowTemplate(recipe.id, item)).join("")}
            </div>
            ${showPantryOverlay ? `
              <div class="basket-dish__pantry-overlay" role="status" aria-live="polite">
                <div class="basket-dish__pantry-overlay-badge" aria-hidden="true">✓</div>
                <strong>Все ингредиенты есть дома</strong>
                <small>Покупать для этого блюда ничего не нужно.</small>
                <button class="basket-dish__pantry-edit" type="button" data-basket-dish-edit="${escapeHTML(recipe.id)}">Изменить</button>
              </div>
            ` : ""}
          </div>
        </div>
      </article>
    `;
  }

  function dishIngredientRowTemplate(recipeId, item) {
    const normalized = normalizeIngredientItem(item);
    const key = getDishPantryKey(recipeId, item);
    const checked = isDishIngredientPantryChecked(recipeId, item);
    const hasNumericAmount = item.amount !== null && item.amount !== undefined && Number.isFinite(Number(item.amount));
    const covered = isDishIngredientCovered(recipeId, item);
    const purchaseAmount = getDishIngredientPurchaseAmount(recipeId, item);
    const pantryAmount = getDishIngredientPantryAmount(recipeId, item);
    const amountLabel = item.amount === null || item.amount === undefined
      ? normalized.unit
      : formatAmount(item.amount, normalized.unit);
    const inputValue = hasNumericAmount
      ? formatAmountInputValue(checked ? pantryAmount : item.amount)
      : "";

    const stateClass = checked
      ? covered
        ? "pantry-active pantry-full"
        : "pantry-active pantry-partial"
      : "";

    return `
      <div class="basket-dish-ingredient ${stateClass}">
        <label class="pantry-checkbox" aria-label="Есть дома: ${escapeHTML(normalized.name)}">
          <input
            type="checkbox"
            data-dish-pantry-toggle
            data-dish-pantry-key="${escapeHTML(key)}"
            data-dish-pantry-amount-default="${escapeHTML(String(item.amount ?? ""))}"
            ${checked ? "checked" : ""}
          >
          <span aria-hidden="true"></span>
        </label>
        <span class="basket-dish-ingredient__name">
          <b>${escapeHTML(normalized.name)}</b>
        </span>
        ${checked && hasNumericAmount ? `
          <strong class="basket-dish-ingredient__amount basket-dish-ingredient__amount--editable">
            <input
              type="text"
              inputmode="decimal"
              autocomplete="off"
              enterkeyhint="done"
              data-dish-pantry-amount
              data-dish-pantry-key="${escapeHTML(key)}"
              data-dish-pantry-needed="${escapeHTML(String(item.amount))}"
              value="${escapeHTML(inputValue)}"
              style="--pantry-digits:${Math.max(String(inputValue).length, 1)}"
              aria-label="Количество дома: ${escapeHTML(normalized.name)}"
            >
            <span>${escapeHTML(normalized.unit)}</span>
          </strong>
        ` : `
          <strong class="basket-dish-ingredient__amount">${escapeHTML(amountLabel)}</strong>
        `}
      </div>
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

        const purchaseAmount = getDishIngredientPurchaseAmount(recipe.id, ingredient);
        if (purchaseAmount === null) return;

        if (ingredient.amount === null || ingredient.amount === undefined) {
          tasteMap.set(normalizeName(name), { name, unit, group: "taste" });
          return;
        }

        if (purchaseAmount <= 0) return;

        const key = `${normalizeName(name)}__${unit.toLowerCase()}`;
        if (!numericMap.has(key)) numericMap.set(key, { key, name, unit, amount: 0, sources: [], group });

        const item = numericMap.get(key);
        item.amount += Number(purchaseAmount);
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
    else if (value.includes("йогурт")) name = "Йогурт натуральный";
    else if (value === "творог 5%" || value.includes("творог 5")) name = "Творог 5%";
    else if (value === "творог") name = "Творог";
    else if (value === "масло" || value.includes("растительное масло")) name = "Растительное масло";
    else if (value.includes("мед") || value.includes("мёд")) name = "Мёд";
    else if (value === "банан" || value === "бананы") name = "Бананы";
    else if (value.includes("ягод")) name = "Ягоды";
    else if (value.includes("орех")) name = "Орехи";
    else if (value.includes("листья салата")) name = "Листья салата";
    else if (value.includes("сладкий перец")) name = "Сладкий перец";
    else if (value === "манка") name = "Манка";
    else if (value === "мука") name = "Мука";
    else if (value.includes("гранола")) name = "Гранола";
    else if (value.includes("мюсли")) name = "Мюсли";
    else if (value.includes("молоко или вода")) name = "Молоко";
    else if (value === "кабачок" || value === "кабачки") name = "Кабачки";

    return {
      name,
      unit: String(ingredient.unit || "").trim()
    };
  }

  function basketFlatProductsTemplate(totals) {
    const groups = buildIngredientGroups(totals).filter(group => group.items.length);

    if (!groups.length) {
      return `
        <div class="basket-products-empty" role="status" aria-live="polite">
          <div class="basket-products-empty__icon" aria-hidden="true">✓</div>
          <strong>Всё есть дома</strong>
          <p>Покупать ничего не нужно.</p>
        </div>
      `;
    }

    return groups.map(group => `
      <section class="ingredient-group ingredient-group--flat">
        <header class="ingredient-group__head">
          <div class="ingredient-group__title"><span aria-hidden="true"></span><strong>${escapeHTML(group.title)}</strong></div>
          <div class="ingredient-group__meta"><small>${group.items.length}</small></div>
        </header>
        <div class="ingredient-group__items">
          ${group.items.map(flatIngredientRowTemplate).join("")}
        </div>
      </section>
    `).join("");
  }

  function flatIngredientRowTemplate(item) {
    if (item.amount === null || item.amount === undefined) {
      return `
        <div class="total-item total-item--plain">
          <strong>${escapeHTML(item.name)}</strong>
          <span>${escapeHTML(item.unit)}</span>
        </div>
      `;
    }

    return `
      <div class="total-item total-item--plain">
        <strong>${escapeHTML(item.name)}</strong>
        <span>${escapeHTML(formatAmount(item.amount, item.unit))}</span>
      </div>
    `;
  }

  function getDishPantryKey(recipeId, item) {
    const normalized = normalizeIngredientItem(item);
    return `${recipeId}__${normalizeName(normalized.name)}__${String(normalized.unit || "").toLowerCase()}`;
  }

  function getDishPantryEntry(recipeId, item) {
    const key = getDishPantryKey(recipeId, item);
    const value = state.pantryMap[key];

    if (value === true) return { checked: true, amount: item.amount ?? null };
    if (value && typeof value === "object") {
      return {
        checked: value.checked === true,
        amount: Number.isFinite(Number(value.amount)) ? Number(value.amount) : null
      };
    }

    return { checked: false, amount: null };
  }

  function isDishIngredientPantryChecked(recipeId, item) {
    return getDishPantryEntry(recipeId, item).checked === true;
  }

  function getDishIngredientPantryAmount(recipeId, item) {
    const entry = getDishPantryEntry(recipeId, item);
    if (!entry.checked) return 0;

    if (item.amount === null || item.amount === undefined) return null;

    const needed = Number(item.amount);
    if (!Number.isFinite(needed)) return 0;

    const amount = Number(entry.amount);
    if (!Number.isFinite(amount)) return needed;

    return Math.max(0, Math.min(amount, needed));
  }

  function getDishIngredientPurchaseAmount(recipeId, item) {
    if (item.amount === null || item.amount === undefined) {
      return isDishIngredientPantryChecked(recipeId, item) ? null : 0;
    }

    const needed = Number(item.amount);
    if (!Number.isFinite(needed)) return isDishIngredientPantryChecked(recipeId, item) ? null : 0;

    if (!isDishIngredientPantryChecked(recipeId, item)) return needed;

    const pantryAmount = getDishIngredientPantryAmount(recipeId, item);
    return Math.max(0, roundSmart(needed - Number(pantryAmount || 0)));
  }

  function isDishIngredientCovered(recipeId, item) {
    if (!isDishIngredientPantryChecked(recipeId, item)) return false;

    if (item.amount === null || item.amount === undefined) return true;

    return getDishIngredientPurchaseAmount(recipeId, item) <= 0;
  }

  function normalizePantryMap(next) {
    const result = {};
    if (!next || typeof next !== "object") return result;

    Object.entries(next).forEach(([key, value]) => {
      if (!key) return;

      if (value === true) {
        result[key] = true;
        return;
      }

      if (value && typeof value === "object" && value.checked === true) {
        const normalized = { checked: true };
        if (Number.isFinite(Number(value.amount))) normalized.amount = Number(value.amount);
        result[key] = normalized;
      }
    });

    return result;
  }

  function cleanupDishPantryMap() {
    const selected = new Set(state.selectedIds);
    let changed = false;

    Object.keys(state.pantryMap).forEach(key => {
      const recipeId = key.split("__")[0];
      if (!selected.has(recipeId)) {
        delete state.pantryMap[key];
        changed = true;
      }
    });

    if (changed) saveJson(STORAGE_PANTRY, state.pantryMap);
  }

  function handleDishPantryChange(event) {
    const toggle = event.target.closest("[data-dish-pantry-toggle]");
    if (!toggle) return;

    const key = toggle.dataset.dishPantryKey;
    if (!key) return;

    const defaultAmount = parsePantryAmount(toggle.dataset.dishPantryAmountDefault);
    if (toggle.checked) {
      state.pantryMap[key] = Number.isFinite(defaultAmount)
        ? { checked: true, amount: defaultAmount }
        : { checked: true };
    } else {
      delete state.pantryMap[key];
    }

    const recipeId = key.split("__")[0];
    if (recipeId) state.basketPantryEditIds.delete(recipeId);

    saveJson(STORAGE_PANTRY, state.pantryMap);
    renderBasketModal();
  }

  function handleDishPantryAmountInput(event) {
    const input = event.target.closest("[data-dish-pantry-amount]");
    if (!input) return;

    syncPantryAmountInputWidth(input);

    const key = input.dataset.dishPantryKey;
    if (!key) return;

    const parsedAmount = parsePantryAmount(input.value);
    const neededAmount = parsePantryAmount(input.dataset.dishPantryNeeded);
    const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;

    state.pantryMap[key] = {
      checked: true,
      amount: Number.isFinite(neededAmount) ? Math.min(Math.max(amount, 0), neededAmount) : Math.max(amount, 0)
    };

    const recipeId = key.split("__")[0];
    if (recipeId) state.basketPantryEditIds.delete(recipeId);

    saveJson(STORAGE_PANTRY, state.pantryMap);
    renderBasketProductsOnly();
  }

  function handleDishPantryAmountFocus(event) {
    const input = event.target.closest("[data-dish-pantry-amount]");
    if (!input) return;

    syncPantryAmountInputWidth(input);

    requestAnimationFrame(() => {
      try {
        const end = input.value.length;
        input.setSelectionRange(end, end);
      } catch (_) {
        // iOS Safari may ignore selection for some input states.
      }
    });
  }

  function handleDishPantryAmountBlur(event) {
    const input = event.target.closest("[data-dish-pantry-amount]");
    if (!input) return;

    const key = input.dataset.dishPantryKey;
    if (!key) return;

    const parsedAmount = parsePantryAmount(input.value);
    const neededAmount = parsePantryAmount(input.dataset.dishPantryNeeded);
    const safeAmount = Number.isFinite(parsedAmount) ? Math.max(parsedAmount, 0) : 0;
    const clampedAmount = Number.isFinite(neededAmount) ? Math.min(safeAmount, neededAmount) : safeAmount;

    state.pantryMap[key] = { checked: true, amount: clampedAmount };
    saveJson(STORAGE_PANTRY, state.pantryMap);
    renderBasketModal();
  }

  function syncPantryAmountInputWidth(input) {
    if (!input) return;

    const length = Math.max(String(input.value || "").length, 1);
    input.style.setProperty("--pantry-digits", String(length));
  }

  function parsePantryAmount(value) {
    if (value === null || value === undefined) return NaN;

    const normalized = String(value)
      .replace(",", ".")
      .replace(/[^\d.]/g, "")
      .replace(/(\..*)\./g, "$1");

    if (!normalized) return NaN;
    return Number(normalized);
  }

  function formatAmountInputValue(value) {
    if (!Number.isFinite(Number(value))) return "";
    return formatNumber(value);
  }

  function renderBasketProductsOnly() {
    const selectedRecipes = state.selectedIds.map(getRecipe).filter(Boolean);
    const totals = calculateTotals(selectedRecipes);
    if (state.refs.totalsList) state.refs.totalsList.innerHTML = basketFlatProductsTemplate(totals);
    renderBasketTrigger();
  }

  function ingredientGroupsTemplate(totals) {
    return basketFlatProductsTemplate(totals, 0, 0);
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
    { id: "taste", title: "По вкусу", icon: "▫" },
    { id: "other", title: "Прочее", icon: "▫" }
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

  function copyRecipeIngredientsText(recipeId, button) {
    const recipe = getRecipe(recipeId);
    if (!recipe) return;

    const targetPortions = getTargetPortions(recipe.id);
    const nutrition = getScaledNutrition(recipe, targetPortions);
    const lines = [
      "Portionly — недостающие ингредиенты блюда",
      "",
      recipe.title,
      `${targetPortions} ${plural(targetPortions, "порция", "порции", "порций")}`,
      `КБЖУ: ${formatNumber(nutrition.kcal)} ккал / Б ${formatNumber(nutrition.protein)} / Ж ${formatNumber(nutrition.fat)} / У ${formatNumber(nutrition.carbs)}`,
      "",
      "Нужно купить:"
    ];

    getScaledIngredients(recipe, targetPortions)
      .map(item => {
        const normalized = normalizeIngredientItem(item);
        const purchaseAmount = getDishIngredientPurchaseAmount(recipe.id, item);

        if (purchaseAmount === null) return null;
        if (item.amount !== null && item.amount !== undefined && purchaseAmount <= 0) return null;

        const amount = item.amount === null || item.amount === undefined
          ? normalized.unit
          : formatAmount(purchaseAmount, normalized.unit);

        return `- ${normalized.name}: ${amount}`;
      })
      .filter(Boolean)
      .forEach(line => lines.push(line));

    if (lines[lines.length - 1] === "Нужно купить:") lines.push("- Ничего докупать не нужно");

    copyTextToClipboard(lines.join("\n"), () => showDishCopySuccess(button));
  }

  function showDishCopySuccess(button) {
    if (button) {
      button.classList.add("is-copied");
      button.disabled = true;
      setTimeout(() => {
        button.classList.remove("is-copied");
        button.disabled = false;
      }, 1200);
    }
    showToast("Недостающее скопировано", "success");
  }

  function copyBasketText() {
    const selectedRecipes = state.selectedIds.map(getRecipe).filter(Boolean);
    if (!selectedRecipes.length) return;

    const totals = calculateTotals(selectedRecipes);
    const lines = ["Portionly — список покупок", "", "Выбранные блюда:"];

    selectedRecipes.forEach(recipe => {
      lines.push(`- ${recipe.title}: ${getTargetPortions(recipe.id)} ${plural(getTargetPortions(recipe.id), "порция", "порции", "порций")}`);
    });

    lines.push("", "Список покупок:");

    let purchaseItemsCount = 0;

    buildIngredientGroups(totals).forEach(group => {
      if (!group.items.length) return;

      lines.push("", `${group.title}:`);
      group.items.forEach(item => {
        purchaseItemsCount += 1;
        lines.push(`- ${item.name}: ${item.amount === null ? item.unit : formatAmount(item.amount, item.unit)}`);
      });
    });

    if (!purchaseItemsCount) lines.push("- Ничего докупать не нужно");

    lines.push("", `КБЖУ итого: ${formatNumber(totals.nutrition.kcal)} ккал / Б ${formatNumber(totals.nutrition.protein)} / Ж ${formatNumber(totals.nutrition.fat)} / У ${formatNumber(totals.nutrition.carbs)}`);

    const text = lines.join("\n");
    copyTextToClipboard(text, showCopySuccess);
  }

  function showCopySuccess() {
    if (state.refs.copyBtn) {
      state.refs.copyBtn.classList.add("is-copied");
      state.refs.copyBtn.disabled = true;
      setTimeout(() => {
        state.refs.copyBtn.classList.remove("is-copied");
        state.refs.copyBtn.disabled = false;
      }, 1200);
    }
    showToast("Список скопирован", "success");
  }

  function copyTextToClipboard(text, onSuccess) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(() => fallbackCopy(text, onSuccess));
    } else {
      fallbackCopy(text, onSuccess);
    }
  }

  function fallbackCopy(text, onSuccess) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    onSuccess();
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
