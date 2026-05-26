/* Portionly — static app logic, Figma-style dashboard + recipe dropdown cards + cart planning v105 */
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

  const CATEGORY_TILE_MEDIA = {
    all: { image: "assets/category-tiles/all-dishes-v091.webp", position: "center 46%" },
    favorites: { image: "assets/category-tiles/favorites-v091.webp", position: "center 48%" },
    breakfast: { image: "assets/category-tiles/breakfast-v091.webp", position: "center 45%" },
    main: { image: "assets/category-tiles/lunch-v091.webp", position: "center 45%" },
    dinner: { image: "assets/category-tiles/dinner-v091.webp", position: "center 45%" },
    dessert: { image: "assets/category-tiles/dessert-v091.webp", position: "center 45%" }
  };

  const RECIPE_VARIANT_GROUPS = [
    { rootId: "yogurt-bowl", recipeIds: ["yogurt-bowl", "yogurt-bowl-banana-peanut-butter"] },
    { rootId: "pp-strawberry-ice-cream", recipeIds: ["pp-strawberry-ice-cream", "banana-peanut-butter-ice-cream", "pp-chocolate-ice-cream"] },
    { rootId: "funchoza-chicken-vegetables", recipeIds: ["funchoza-chicken-vegetables", "udon-chicken-vegetables"] },
    { rootId: "chicken-meatballs-potato-salad", recipeIds: ["chicken-meatballs-potato-salad", "chicken-cutlets-idaho-potatoes"] }
  ];

  const state = {
    activeCategory: "all",
    dashboardOpen: true,
    selectedIds: [],
    notesMap: {},
    recipeSettings: {},
    search: "",
    searchOpen: false,
    selectedOnly: false,
    smartFilter: null,
    categoryPageFilter: "all",
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
    cardGesture: null,
    recipeVariantIndexes: {},
    recipeCardHeightTimer: null,
    activeRecipeId: null,
    refs: {}
  };

  function getCategories() {
    return Array.isArray(window.CATEGORIES) ? window.CATEGORIES : [];
  }

  function getRecipes() {
    return Array.isArray(window.RECIPES) ? window.RECIPES : [];
  }

  function getRecipeGroupByRecipeId(recipeId) {
    return RECIPE_VARIANT_GROUPS.find(group => group.recipeIds.includes(recipeId));
  }

  function getRecipeCardRootId(recipeId) {
    const group = getRecipeGroupByRecipeId(recipeId);
    return group?.rootId || recipeId;
  }

  function getRecipeCardEntries() {
    const hiddenVariantIds = new Set(RECIPE_VARIANT_GROUPS.flatMap(group => group.recipeIds.filter(id => id !== group.rootId)));
    return getRecipes().filter(recipe => !hiddenVariantIds.has(recipe.id));
  }

  function getRecipeCardRecipes(recipeId) {
    const rootId = getRecipeCardRootId(recipeId);
    const group = RECIPE_VARIANT_GROUPS.find(item => item.rootId === rootId);
    if (!group) {
      const recipe = getRecipe(recipeId);
      return recipe ? [recipe] : [];
    }

    return group.recipeIds.map(getRecipe).filter(Boolean);
  }

  function compactRecipeVariants(recipes) {
    const result = [];
    const usedRootIds = new Set();

    recipes.forEach(recipe => {
      const rootId = getRecipeCardRootId(recipe.id);
      if (usedRootIds.has(rootId)) return;

      const rootRecipe = getRecipe(rootId) || recipe;
      result.push(rootRecipe);
      usedRootIds.add(rootId);
    });

    return result;
  }

  function getRecipeCardElement(recipeId) {
    const rootId = getRecipeCardRootId(recipeId);
    return state.refs.cardsGrid?.querySelector(`[data-card-id="${cssEscape(rootId)}"]`) || null;
  }

  function getRecipePageRoot(recipeId, card = null) {
    const parent = card || getRecipeCardElement(recipeId);
    if (!parent) return null;

    const selector = `[data-page-recipe-id="${cssEscape(recipeId)}"]`;
    if (parent.matches?.(selector)) return parent;

    const page = parent.querySelector(selector);
    if (page) return page;

    if (parent.classList?.contains("recipe-card--variants")) return null;
    return parent;
  }

  function getRecipeVariantIndex(rootId, card = null) {
    const recipes = getRecipeCardRecipes(rootId);
    const maxIndex = Math.max(0, recipes.length - 1);
    const savedIndex = Number(state.recipeVariantIndexes[rootId]);
    const cardIndex = Number(card?.dataset?.variantIndex);
    const index = Number.isFinite(savedIndex) ? savedIndex : (Number.isFinite(cardIndex) ? cardIndex : 0);
    return clamp(index, 0, maxIndex);
  }

  function getActiveVariantRecipe(rootId, card = null) {
    const recipes = getRecipeCardRecipes(rootId);
    return recipes[getRecipeVariantIndex(rootId, card)] || recipes[0] || getRecipe(rootId) || null;
  }

  function showRecipeVariantStep(rootId, step) {
    const rootRecipe = getRecipe(rootId);
    const card = getRecipeCardElement(rootId);
    const recipes = getRecipeCardRecipes(rootId);
    if (!rootRecipe || !card || recipes.length < 2) return;

    const current = getRecipeVariantIndex(rootId, card);
    const next = clamp(current + step, 0, recipes.length - 1);
    if (next === current) return;

    state.recipeVariantIndexes[rootId] = next;
    card.dataset.swipeIntent = "true";
    replaceRecipeCard(rootId, step);

    window.setTimeout(() => {
      const nextCard = getRecipeCardElement(rootId);
      if (nextCard) nextCard.dataset.swipeIntent = "false";
    }, 260);
  }

  function init() {
    cacheDom();

    if (!hasRequiredDom()) {
      console.error("Portionly: missing required DOM nodes");
      return;
    }

    if (!getCategories().length || !getRecipes().length) {
      renderFatalError("Не загружены данные рецептов. Проверь файлы в папке recipes и порядок подключения скриптов.");
      return;
    }

    state.selectedIds = filterExistingRecipeIds(loadJson(STORAGE_SELECTED, []));
    state.notesMap = loadJson(STORAGE_NOTES, {});
    state.recipeSettings = normalizeRecipeSettingsMap(loadJson(STORAGE_RECIPE_SETTINGS, {}));
    state.favoriteIds = filterExistingRecipeIds(loadJson(STORAGE_FAVORITES, []));
    state.pantryMap = normalizePantryMap(loadJson(STORAGE_PANTRY, {}));

    bindStaticEvents();
    renderAll();
    preloadRecipeImages();
  }

  function cacheDom() {
    state.refs = {
      topbar: document.getElementById("topbar"),
      appBackBtn: document.getElementById("appBackBtn"),
      aboutToggleBtn: document.getElementById("aboutToggleBtn"),
      aboutCloseBtn: document.getElementById("aboutCloseBtn"),
      aboutPanel: document.getElementById("aboutPanel"),
      filterShell: document.getElementById("filterShell"),
      categoryTabs: document.getElementById("categoryTabs"),
      cardsGrid: document.getElementById("cardsGrid"),
      recipeScreen: document.getElementById("recipeScreen"),
      basketModal: document.getElementById("basketModal"),
      selectionDock: document.getElementById("selectionDock"),
      selectionDockCount: document.getElementById("selectionDockCount"),
      toastEl: document.getElementById("toast"),
      searchToggleBtn: document.getElementById("searchToggleBtn"),
      searchCloseBtn: document.getElementById("searchCloseBtn"),
      dashboardFilterBtn: document.getElementById("dashboardFilterBtn"),
      recipeListHead: document.getElementById("recipeListHead"),
      recipeListTitle: document.getElementById("recipeListTitle"),
      recipeListSubtitle: document.getElementById("recipeListSubtitle"),
      backToMenuBtn: document.getElementById("backToMenuBtn"),
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

    r.appBackBtn?.addEventListener("click", showDashboard);
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
    r.dashboardFilterBtn?.addEventListener("click", () => showToast("Фильтры скоро добавим", "neutral"));
    r.backToMenuBtn?.addEventListener("click", showDashboard);
    r.categoryTabs?.addEventListener("scroll", updateCategoryEdgeMasks, { passive: true });
    window.addEventListener("resize", () => {
      scheduleCategoryEdgeMaskUpdate();
      scheduleRecipeCardHeightSync();
    });

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
    r.recipeScreen?.addEventListener("click", handleRecipeScreenClick);
    r.cardsGrid?.addEventListener("scroll", handleRecipeCardPagesScroll, true);
    r.cardsGrid?.addEventListener("pointerdown", handleRecipeCardPointerDown, { passive: true });
    r.cardsGrid?.addEventListener("pointermove", handleRecipeCardPointerMove, { passive: true });
    r.cardsGrid?.addEventListener("pointerup", handleRecipeCardPointerEnd, { passive: true });
    r.cardsGrid?.addEventListener("pointercancel", handleRecipeCardPointerEnd, { passive: true });
    r.cardsGrid?.addEventListener("load", event => {
      if (event.target?.matches?.(".recipe-hero img")) scheduleRecipeCardHeightSync();
    }, true);
    r.selectedStrip?.addEventListener("click", handleBasketDishAction);
    r.selectedStrip?.addEventListener("change", handleDishPantryChange);
    r.selectedStrip?.addEventListener("input", handleDishPantryAmountInput);
    r.selectedStrip?.addEventListener("focusin", handleDishPantryAmountFocus);
    r.selectedStrip?.addEventListener("focusout", handleDishPantryAmountBlur);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        if (state.activeRecipeId) closeRecipeScreen();
        else if (state.searchOpen) closeSearch();
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

  function renderTopbarState() {
    const topbar = state.refs.topbar;
    const backBtn = state.refs.appBackBtn;
    const aboutBtn = state.refs.aboutToggleBtn;
    const hasQuery = Boolean(state.search.trim());
    const listMode = !state.dashboardOpen || hasQuery;

    topbar?.classList.toggle("topbar--list", listMode);
    if (backBtn) backBtn.hidden = !listMode;
    if (aboutBtn) aboutBtn.hidden = listMode;
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

  function showDashboard() {
    closeRecipeScreen({ silent: true });
    state.dashboardOpen = true;
    state.activeCategory = "all";
    state.selectedOnly = false;
    state.smartFilter = null;
    state.categoryPageFilter = "all";
    state.search = "";
    state.searchOpen = false;
    if (state.refs.searchInput) state.refs.searchInput.value = "";
    renderCategories();
    renderSearchState();
    renderRecipes({ animate: true });
    requestAnimationFrame(() => {
      state.refs.filterShell?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    });
  }

  function renderSearchState() {
    const shell = state.refs.filterShell;
    const panel = state.refs.searchPanel;
    const clearBtn = state.refs.searchCloseBtn;
    const filterBtn = state.refs.dashboardFilterBtn;
    if (!shell || !panel) return;

    const hasQuery = Boolean(state.search.trim());

    shell.classList.add("search-open");
    shell.classList.toggle("dashboard-open", state.dashboardOpen && !hasQuery);
    shell.classList.toggle("list-open", !state.dashboardOpen || hasQuery);
    shell.classList.toggle("has-query", hasQuery);

    panel.setAttribute("aria-hidden", "false");
    if (clearBtn) clearBtn.hidden = !hasQuery;
    if (filterBtn) filterBtn.hidden = hasQuery || !state.dashboardOpen;

    if (state.refs.categoryTabs) {
      state.refs.categoryTabs.hidden = !state.dashboardOpen || hasQuery;
    }

    renderTopbarState();
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
    const categoryFilter = event.target.closest("[data-category-filter]");

    if (categoryFilter) {
      event.preventDefault();
      state.categoryPageFilter = categoryFilter.dataset.categoryFilter || "all";
      renderRecipes({ animate: true });
      return;
    }

    const action = event.target.closest("[data-action]");

    if (action) {
      event.preventDefault();
      event.stopPropagation();
      const recipeId = action.dataset.recipeId;
      const actionName = action.dataset.action;

      if (actionName === "open-detail") openRecipeScreen(recipeId);
      if (actionName === "expand") toggleExpanded(recipeId);
      if (actionName === "favorite") toggleFavorite(recipeId);
      if (actionName === "recipe-step") updateRecipeSetting(recipeId, action.dataset.key, Number(action.dataset.delta || 0));
      if (actionName === "note-open") openNoteEditor(recipeId);
      if (actionName === "note-cancel") cancelNoteEditor(recipeId);
      if (actionName === "note-save") saveNote(recipeId);
      if (actionName === "note-remove") removeNote(recipeId);
      if (actionName === "variant-next") showRecipeVariantStep(action.dataset.rootId, 1);
      if (actionName === "variant-prev") showRecipeVariantStep(action.dataset.rootId, -1);
      if (actionName === "category-menu") showToast("Подбор меню добавим следующим этапом", "neutral");
      return;
    }

    if (event.target.closest("button, textarea, input, select, a")) return;
    if (event.target.closest(".recipe-details")) return;

    const card = event.target.closest("[data-card-id]");
    if (!card) return;

    if (card.dataset.swipeIntent === "true") {
      event.preventDefault();
      return;
    }

    if (event.target.closest("[data-recipe-info-page]")) return;

    event.preventDefault();
    const page = event.target.closest("[data-page-recipe-id]");
    const recipeId = page?.dataset.pageRecipeId || card.dataset.cardId;

    if (card.closest(".category-overview")) {
      openRecipeScreen(recipeId);
      return;
    }

    toggleRecipe(recipeId);
  }

  function handleRecipeCardPointerDown(event) {
    const card = event.target.closest(".recipe-card--variants[data-card-id]");
    if (!card) return;
    if (event.target.closest("button, textarea, input, select, a, .recipe-details")) return;

    const recipes = getRecipeCardRecipes(card.dataset.cardId);
    if (recipes.length < 2) return;

    state.cardGesture = {
      card,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false
    };
    card.dataset.swipeIntent = "false";
  }

  function handleRecipeCardPointerMove(event) {
    const gesture = state.cardGesture;
    if (!gesture) return;

    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX > 18 && absX > absY * 1.15) {
      gesture.moved = true;
      gesture.card.dataset.swipeIntent = "true";
    }
  }

  function handleRecipeCardPointerEnd() {
    const gesture = state.cardGesture;
    state.cardGesture = null;
    if (!gesture?.card) return;

    const dx = gesture.lastX - gesture.startX;
    const dy = gesture.lastY - gesture.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (gesture.moved && absX > 54 && absX > absY * 1.18) {
      showRecipeVariantStep(gesture.card.dataset.cardId, dx < 0 ? 1 : -1);
      return;
    }

    window.setTimeout(() => {
      if (gesture.card) gesture.card.dataset.swipeIntent = "false";
    }, 220);
  }

  function handleRecipeCardPagesScroll() {
    // Legacy native-scroll carousel handler is intentionally empty: variant cards
    // now render only the active recipe and switch through arrows / horizontal gesture.
  }

  function scheduleRecipeCardHeightSync() {
    window.clearTimeout(state.recipeCardHeightTimer);
    state.recipeCardHeightTimer = window.setTimeout(syncAllRecipeCardSizes, 80);
  }

  function syncAllRecipeCardSizes() {
    state.refs.cardsGrid?.querySelectorAll(".recipe-card--variants[data-card-id]").forEach(card => {
      syncRecipeCardPager(card);
    });
  }

  function syncRecipeCardPager(target) {
    const card = target?.classList?.contains("recipe-card--variants")
      ? target
      : target?.closest?.(".recipe-card--variants[data-card-id]");
    if (!card || card.hidden || card.classList.contains("is-hidden")) return;

    const recipes = getRecipeCardRecipes(card.dataset.cardId);
    const page = getRecipeVariantIndex(card.dataset.cardId, card);
    const pageCount = recipes.length;

    card.dataset.variantIndex = String(page);
    card.classList.toggle("is-first-variant", page <= 0);
    card.classList.toggle("is-last-variant", page >= pageCount - 1);

    card.querySelectorAll(".recipe-card-dots").forEach(dots => {
      dots.querySelectorAll("[data-recipe-dot]").forEach((dot, index) => {
        dot.classList.toggle("active", index === page);
      });
    });
  }

  function syncRecipeCardSize() {
    // Active-variant cards participate in normal document flow, so no fixed height is needed.
  }

  function syncRecipeCardSizeAround(node) {
    const card = node?.closest?.(".recipe-card--variants[data-card-id]");
    if (card) syncRecipeCardPager(card);
  }

  function pulseRecipeCardSizeSync(node) {
    const card = node?.closest?.(".recipe-card--variants[data-card-id]");
    if (!card) return;
    syncRecipeCardPager(card);
    requestAnimationFrame(() => syncRecipeCardPager(card));
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
      state.dashboardOpen = true;
      state.activeCategory = "all";
    }

    const categoryItems = categories.map(category => {
      const categoryRecipes = category.id === "all"
        ? recipes
        : recipes.filter(recipe => recipe.category === category.id);
      const count = compactRecipeVariants(categoryRecipes).length;

      return { ...category, count, disabled: false };
    });

    const allIndex = categoryItems.findIndex(category => category.id === "all");
    const favoriteItem = {
      id: "favorites",
      title: "Избранное",
      count: favoriteCount,
      disabled: favoriteCount === 0
    };

    if (allIndex >= 0) categoryItems.splice(allIndex + 1, 0, favoriteItem);
    else categoryItems.unshift(favoriteItem);

    const byId = id => categoryItems.find(category => category.id === id) || null;
    const selectedRecipes = state.selectedIds.map(getRecipe).filter(Boolean);
    const productCount = selectedRecipes.length ? getShoppingProductCount(selectedRecipes) : 0;

    const tile = (category, options = {}) => {
      if (!category) return "";
      const media = getCategoryTileMedia(category.id);
      const style = media
        ? ` style="--tile-image: url('${escapeHTML(media.image)}'); --tile-image-position: ${escapeHTML(media.position || "center")};"`
        : "";
      const countLabel = `${category.count} ${plural(category.count, "блюдо", "блюда", "блюд")}`;
      const classes = [
        "dashboard-card",
        options.size ? `dashboard-card--${options.size}` : "",
        media ? "dashboard-card--with-image" : "",
        category.disabled ? "is-disabled" : ""
      ].filter(Boolean).join(" ");
      const icon = options.icon ? dashboardIconTemplate(options.icon) : "";

      return `
        <button class="${classes}" type="button" data-category="${escapeHTML(category.id)}" ${category.disabled ? 'disabled aria-disabled="true"' : ""}${style}>
          ${icon ? `<span class="dashboard-card__icon" aria-hidden="true">${icon}</span>` : ""}
          <span class="dashboard-card__copy">
            <strong>${escapeHTML(category.title)}</strong>
            <span>${escapeHTML(countLabel)}</span>
          </span>
        </button>`;
    };

    const mealTile = category => tile(category, { size: "meal" });

    state.refs.categoryTabs.innerHTML = `
      <div class="dashboard-menu">
        <div class="dashboard-hero-card dashboard-hero-card--locked" aria-label="Блок в работе" style="--tile-image: url('assets/category-tiles/lunch-v091.webp'); --tile-image-position: center 45%;">
          <span class="dashboard-hero-card__work">В работе</span>
        </div>

        <section class="dashboard-section" aria-label="Быстрый доступ">
          <h2>Быстрый доступ</h2>
          <div class="dashboard-quick-grid">
            ${tile(byId("all"), { size: "quick" })}
            ${tile(byId("favorites"), { size: "quick" })}
          </div>
        </section>

        <section class="dashboard-section" aria-label="Приёмы пищи">
          <h2>Приёмы пищи</h2>
          <div class="dashboard-meal-grid">
            ${mealTile(byId("breakfast"))}
            ${mealTile(byId("main"))}
            ${mealTile(byId("dinner"))}
            ${mealTile(byId("dessert"))}
          </div>
        </section>

        <section class="dashboard-section" aria-label="Планирование и покупки">
          <h2>Планирование и покупки</h2>
          <div class="dashboard-planning-list">
            <button class="dashboard-planning-row" type="button" data-dashboard-action="basket" style="--row-image: url('assets/dashboard-planning/shopping-v095.webp'); --row-image-position: left center;">
              <span class="dashboard-planning-row__copy">
                <strong>Список покупок</strong>
                <small>${productCount} ${plural(productCount, "продукт", "продукта", "продуктов")}</small>
              </span>
              <span class="dashboard-planning-row__arrow" aria-hidden="true">›</span>
            </button>
            <button class="dashboard-planning-row" type="button" data-smart-filter="quick" style="--row-image: url('assets/dashboard-planning/quick-v095.webp'); --row-image-position: left center;">
              <span class="dashboard-planning-row__copy">
                <strong>Быстрые блюда</strong>
                <small>до 20 минут</small>
              </span>
              <span class="dashboard-planning-row__arrow" aria-hidden="true">›</span>
            </button>
            <button class="dashboard-planning-row" type="button" data-smart-filter="lowcal" style="--row-image: url('assets/dashboard-planning/lowcal-v095.webp'); --row-image-position: left center;">
              <span class="dashboard-planning-row__copy">
                <strong>Низкокалорийные</strong>
                <small>до 350 ккал</small>
              </span>
              <span class="dashboard-planning-row__arrow" aria-hidden="true">›</span>
            </button>
          </div>
        </section>
      </div>`;

    state.refs.categoryTabs.querySelectorAll("[data-category]").forEach(button => {
      button.addEventListener("click", () => {
        if (button.disabled) return;
        state.dashboardOpen = false;
        state.activeCategory = button.dataset.category;
        state.selectedOnly = false;
        state.smartFilter = null;
        state.categoryPageFilter = "all";
        state.search = "";
        state.searchOpen = false;
        if (state.refs.searchInput) state.refs.searchInput.value = "";
        renderCategories();
        renderSearchState();
        renderRecipes({ animate: true });
        requestAnimationFrame(() => {
          state.refs.topbar?.scrollIntoView?.({ behavior: "smooth", block: "start" });
        });
      });
    });

    state.refs.categoryTabs.querySelectorAll("[data-dashboard-action]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.dashboardAction;
        if (action === "basket") {
          openBasketModal();
          return;
        }
      });
    });

    state.refs.categoryTabs.querySelectorAll("[data-smart-filter]").forEach(button => {
      button.addEventListener("click", () => openSmartFilter(button.dataset.smartFilter));
    });

    renderSearchState();
    scheduleCategoryEdgeMaskUpdate();
  }

  function getShoppingProductCount(selectedRecipes) {
    const totals = calculateTotals(selectedRecipes);
    return totals.numeric.length + totals.taste.length;
  }

  function openSmartFilter(filterName) {
    state.dashboardOpen = false;
    state.activeCategory = "all";
    state.selectedOnly = false;
    state.smartFilter = filterName || null;
    state.categoryPageFilter = "all";
    state.search = "";
    state.searchOpen = false;
    if (state.refs.searchInput) state.refs.searchInput.value = "";
    renderCategories();
    renderSearchState();
    renderRecipes({ animate: true });
    requestAnimationFrame(() => state.refs.topbar?.scrollIntoView?.({ behavior: "smooth", block: "start" }));
  }

  function dashboardIconTemplate(icon) {
    const name = String(icon || "");
    const icons = {
      grid: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><rect x="4.8" y="4.8" width="5.4" height="5.4" rx="1.35"/><rect x="13.8" y="4.8" width="5.4" height="5.4" rx="1.35"/><rect x="4.8" y="13.8" width="5.4" height="5.4" rx="1.35"/><rect x="13.8" y="13.8" width="5.4" height="5.4" rx="1.35"/></svg>`,
      heart: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 19.2S5.1 15.3 4 9.9C3.5 7.1 5.2 5 7.8 5c1.6 0 3 .8 4.2 2.3C13.2 5.8 14.6 5 16.2 5c2.6 0 4.3 2.1 3.8 4.9-1.1 5.4-8 9.3-8 9.3Z"/></svg>`,
      breakfast: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M7.2 10.2h8.1v3.5a3.5 3.5 0 0 1-3.5 3.5H10.7a3.5 3.5 0 0 1-3.5-3.5v-3.5Z"/><path d="M15.3 11h1.1a1.95 1.95 0 0 1 0 3.9h-1.1"/><path d="M6 18.6h11.1"/><path d="M8.5 6.2c-.6.5-.6 1.1 0 1.6"/><path d="M11.3 5.8c-.65.6-.65 1.35 0 1.9"/><path d="M14.1 6.2c-.6.5-.6 1.1 0 1.6"/></svg>`,
      lunch: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M5.2 11.6h13.6c-.45 4.25-3.05 6.45-6.8 6.45s-6.35-2.2-6.8-6.45Z"/><path d="M7.7 18.05h8.6"/><path d="M8.3 8.7c.95-.8 2-.95 3.15-.38 1.25.62 2.6.45 4.05-.5"/><path d="M8 6.35c.8-.55 1.55-.62 2.25-.2"/></svg>`,
      dinner: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M18.7 15.4A7 7 0 0 1 8.6 5.3a7.4 7.4 0 1 0 10.1 10.1Z"/><path d="M17.2 4.9l.45 1.15 1.2.43-1.2.43-.45 1.15-.43-1.15-1.2-.43 1.2-.43.43-1.15Z"/></svg>`,
      dessert: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M7.2 10h9.6l-.9 8.8H8.1L7.2 10Z"/><path d="M8.8 10c.45-2.35 1.45-3.55 3.2-3.55s2.75 1.2 3.2 3.55"/><path d="M6.2 10h11.6"/><path d="M10.1 14.1h3.8"/></svg>`,
      bag: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M6.1 8.7h11.8l-.9 10.2H7L6.1 8.7Z"/><path d="M9.3 8.7a2.7 2.7 0 0 1 5.4 0"/></svg>`,
      clock: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 20.2a8.2 8.2 0 1 0 0-16.4 8.2 8.2 0 0 0 0 16.4Z"/><path d="M12 7.7V12l2.8 1.8"/></svg>`,
      leaf: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M19.4 4.6C11.4 4.8 6.7 8.3 5.8 16c7.7 1 11.5-3.3 13.6-11.4Z"/><path d="M5.5 19c2.75-4.45 5.95-7.3 9.7-8.65"/></svg>`
    };
    return icons[name] || icons.grid;
  }

  function getCategoryTileMedia(categoryId) {
    return CATEGORY_TILE_MEDIA[String(categoryId || "")] || null;
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

    if (id === "dinner") {
      return `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M6.1 13.2h11.8c-.4 3.6-2.7 5.7-5.9 5.7s-5.5-2.1-5.9-5.7Z"/>
          <path d="M8 18.9h8"/>
          <path d="M8.2 10.6c.7-.8 1.7-1.2 2.9-.8 1.2.4 2.5.3 3.6-.7"/>
          <path d="M7.7 7.8c.6-.6 1.3-.8 2.1-.4"/>
          <path d="M16.7 4.2c-.3 1.9.3 3.6 1.8 4.9-2.2.2-4.1-.5-5.6-2.1 1.1-.5 2.1-1.4 3.8-2.8Z"/>
        </svg>`;
    }

    if (id === "snack") {
      return `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M6.4 9.1h11.2l-1.2 9.1H7.6L6.4 9.1Z"/>
          <path d="M5.5 9.1h13"/>
          <path d="M8.2 9.1c.2-2 1.6-3.3 3.8-3.3s3.6 1.3 3.8 3.3"/>
          <path d="M9.3 12.1h.01M12 13.3h.01M14.7 12.1h.01M10.5 15.4h.01M13.5 15.4h.01"/>
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
    const hasQuery = Boolean(state.search.trim());
    const showRecipeList = !state.dashboardOpen || hasQuery;

    renderSearchState();

    if (!showRecipeList) {
      if (state.refs.cardsGrid) {
        state.refs.cardsGrid.hidden = true;
        state.refs.cardsGrid.classList.remove("cards-grid--category-overview");
      }
      updateRecipeListHeader(0, false);
      state.recipeViewReady = true;
      return;
    }

    if (isCategoryOverviewMode()) {
      renderCategoryOverview();
      state.recipeViewReady = true;
      return;
    }

    if (state.refs.cardsGrid) state.refs.cardsGrid.classList.remove("cards-grid--category-overview");
    ensureRecipeCardsRendered();
    if (state.refs.cardsGrid) state.refs.cardsGrid.hidden = false;

    const shouldAnimate = Boolean(options.animate) && state.recipeViewReady;
    const applyRecipeVisibility = () => {
      const visibleRecipes = getVisibleRecipes();
      const visibleIds = new Set(visibleRecipes.map(recipe => recipe.id));
      updateResultsMeta(visibleRecipes.length);
      updateRecipeListHeader(visibleRecipes.length, true);
      orderRecipeCards(visibleRecipes);

      state.refs.cardsGrid.querySelectorAll(".recipe-card[data-card-id]").forEach(card => {
        const recipeId = card.dataset.cardId;
        const visible = visibleIds.has(recipeId);
        card.hidden = !visible;
        card.classList.toggle("is-hidden", !visible);
        if (visible) syncRecipeCardState(card, recipeId);
      });

      const empty = state.refs.cardsGrid.querySelector("[data-empty-state]");
      if (empty) {
        empty.hidden = visibleRecipes.length > 0;
        empty.textContent = hasQuery
          ? "Ничего не найдено. Попробуй другой запрос."
          : "В этом разделе пока нет блюд.";
      }
      scheduleRecipeCardHeightSync();
    };

    if (shouldAnimate) {
      runCardsListTransition(applyRecipeVisibility);
    } else {
      applyRecipeVisibility();
    }

    state.recipeViewReady = true;
  }


  function isCategoryOverviewMode() {
    return !state.dashboardOpen
      && !state.search.trim()
      && !state.smartFilter
      && !state.selectedOnly
      && Boolean(getCategoryOverviewConfig(state.activeCategory));
  }

  function getCategoryOverviewConfig(categoryId) {
    const configs = {
      breakfast: {
        title: "Завтраки",
        pickTitle: "Утренний выбор",
        pickSubtitle: "Популярный завтрак на сегодня",
        moreTitle: "Ещё на завтрак",
        menuTitle: "Собери завтрак на день",
        menuSubtitle: "Подберём завтраки под твои цели",
        filters: [
          { id: "all", label: "Все" },
          { id: "quick", label: "До 15 мин" },
          { id: "light", label: "Лёгкие" },
          { id: "protein", label: "Белковые" }
        ]
      },
      main: {
        title: "Обеды",
        pickTitle: "Обеденный выбор",
        pickSubtitle: "Популярный обед на сегодня",
        moreTitle: "Ещё для обеда",
        menuTitle: "Собери обед на день",
        menuSubtitle: "Подберём обеды под твои цели",
        filters: [
          { id: "all", label: "Все" },
          { id: "quick", label: "До 30 мин" },
          { id: "light", label: "Лёгкие" },
          { id: "chicken", label: "С курицей" }
        ]
      },
      dinner: {
        title: "Ужины",
        pickTitle: "Вечерний выбор",
        pickSubtitle: "Популярный ужин на сегодня",
        moreTitle: "Ещё для ужина",
        menuTitle: "Собери меню на день",
        menuSubtitle: "Подберём ужины под твои цели",
        filters: [
          { id: "all", label: "Все" },
          { id: "quick", label: "До 30 мин" },
          { id: "light", label: "Лёгкие" },
          { id: "chicken", label: "С курицей" }
        ]
      },
      dessert: {
        title: "Десерты",
        pickTitle: "Сладкий выбор",
        pickSubtitle: "Популярный десерт на сегодня",
        moreTitle: "Ещё на десерт",
        menuTitle: "Собери сладкую подборку",
        menuSubtitle: "Подберём десерты под твои цели",
        filters: [
          { id: "all", label: "Все" },
          { id: "quick", label: "До 20 мин" },
          { id: "light", label: "Лёгкие" },
          { id: "curd", label: "С творогом" }
        ]
      }
    };

    return configs[String(categoryId || "")] || null;
  }

  function renderCategoryOverview() {
    const grid = state.refs.cardsGrid;
    const config = getCategoryOverviewConfig(state.activeCategory);
    if (!grid || !config) return;

    state.cardsRendered = false;
    grid.hidden = false;
    grid.classList.add("cards-grid--category-overview");
    updateRecipeListHeader(0, false);

    const recipes = getCategoryOverviewRecipes(state.activeCategory);
    const filteredRecipes = getCategoryOverviewFilteredRecipes(recipes, state.categoryPageFilter, state.activeCategory);
    const featured = filteredRecipes[0] || recipes[0] || null;
    const otherRecipes = filteredRecipes.filter(recipe => recipe.id !== featured?.id);

    grid.innerHTML = categoryOverviewTemplate(config, recipes.length, featured, otherRecipes);
    syncCategoryOverviewState(grid);
  }

  function getCategoryOverviewRecipes(categoryId) {
    return compactRecipeVariants(sortRecipesByCookTime(
      getRecipes().filter(recipe => recipe.category === categoryId)
    ));
  }

  function getCategoryOverviewFilteredRecipes(recipes, filterId, categoryId) {
    const id = String(filterId || "all");
    if (id === "all") return recipes;

    return recipes.filter(recipe => matchesCategoryOverviewFilter(recipe, id, categoryId));
  }

  function matchesCategoryOverviewFilter(recipe, filterId, categoryId) {
    const time = getCookTimeSortRange(recipe);
    const kcal = Number(recipe?.nutrition?.kcal || 0);
    const haystack = normalizeName([
      recipe.title,
      recipe.meta,
      ...recipe.ingredients.map(item => item.name)
    ].join(" "));

    if (filterId === "quick") {
      if (categoryId === "breakfast") return time.max <= 15;
      if (categoryId === "dessert") return time.max <= 20;
      return time.max <= 30;
    }

    if (filterId === "light") {
      if (categoryId === "dessert") return kcal <= 300;
      if (categoryId === "breakfast") return kcal <= 400;
      return kcal <= 500;
    }

    if (filterId === "chicken") return haystack.includes("куриц") || haystack.includes("курин") || haystack.includes("индей");
    if (filterId === "protein") return Number(recipe?.nutrition?.protein || 0) >= 25;
    if (filterId === "curd") return haystack.includes("творог") || haystack.includes("творож");

    return true;
  }

  function syncCategoryOverviewState(root) {
    root.querySelectorAll("[data-card-id]").forEach(card => {
      const recipeId = card.dataset.cardId;
      const selected = state.selectedIds.includes(recipeId);
      const expanded = state.expandedIds.has(recipeId);
      card.classList.toggle("selected", selected);
      card.classList.toggle("expanded", expanded);

      const details = card.querySelector(".recipe-details");
      if (details) setRecipeDetailsOpen(details, expanded, { animate: false });
    });
  }

  function categoryOverviewTemplate(config, totalCount, featured, otherRecipes) {
    const filters = config.filters || [{ id: "all", label: "Все" }];
    const activeFilter = filters.some(item => item.id === state.categoryPageFilter) ? state.categoryPageFilter : "all";
    if (activeFilter !== state.categoryPageFilter) state.categoryPageFilter = activeFilter;

    return `
      <div class="category-overview" data-category-overview="${escapeHTML(state.activeCategory)}">
        <section class="category-page-head" aria-label="Раздел ${escapeHTML(config.title)}">
          <div>
            <h2>${escapeHTML(config.title)}</h2>
            <p>${totalCount} ${plural(totalCount, "блюдо", "блюда", "блюд")} · от быстрого к долгому</p>
          </div>
        </section>

        <div class="category-chip-row" aria-label="Фильтры раздела">
          ${filters.map(filter => `
            <button class="category-chip ${filter.id === activeFilter ? "active" : ""}" type="button" data-category-filter="${escapeHTML(filter.id)}">
              ${escapeHTML(filter.label)}
            </button>
          `).join("")}
        </div>

        ${featured ? categoryFeaturedRecipeTemplate(featured, config) : `<div class="empty-state">В этом разделе пока нет блюд.</div>`}

        ${otherRecipes.length ? `
          <section class="category-more-section" aria-label="${escapeHTML(config.moreTitle)}">
            <h3>${escapeHTML(config.moreTitle)}</h3>
            <div class="category-mini-grid">
              ${otherRecipes.map(categoryMiniRecipeTemplate).join("")}
            </div>
          </section>
        ` : ""}

        <button class="category-menu-cta" type="button" data-action="category-menu">
          <span>
            <strong>${escapeHTML(config.menuTitle)}</strong>
            <small>${escapeHTML(config.menuSubtitle)}</small>
          </span>
          <b aria-hidden="true">›</b>
        </button>
      </div>`;
  }

  function categoryFeaturedRecipeTemplate(recipe, config) {
    const image = getRecipeImage(recipe);
    const cookTime = getCookTimeLabel(recipe);

    return `
      <section class="category-feature-section" aria-label="${escapeHTML(config.pickTitle)}">
        <div class="category-feature-label">
          <strong>${escapeHTML(config.pickTitle)}</strong>
          <span>${escapeHTML(config.pickSubtitle)}</span>
        </div>

        <article class="category-feature-card ${state.selectedIds.includes(recipe.id) ? "selected" : ""}" data-card-id="${escapeHTML(recipe.id)}" data-page-recipe-id="${escapeHTML(recipe.id)}">
          <div class="category-feature-card__image">
            ${image
              ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(recipe.title)}" loading="eager" decoding="async" onerror="window.handleRecipeImageError(this)">`
              : `<div class="recipe-no-image"><span>Фото не добавлено</span></div>`}
            <div class="category-feature-card__shade"></div>
            <div class="category-feature-card__time">${cookTimeBadgeTemplate(cookTime)}</div>
            <button class="favorite-btn ${isFavorite(recipe.id) ? "active" : ""}" type="button" data-action="favorite" data-recipe-id="${escapeHTML(recipe.id)}" aria-label="${isFavorite(recipe.id) ? "Убрать из избранного" : "Добавить в избранное"}" aria-pressed="${isFavorite(recipe.id)}">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="m12 3 2.82 5.72 6.31.92-4.56 4.44 1.08 6.28L12 17.39l-5.65 2.97 1.08-6.28-4.56-4.44 6.31-.92L12 3Z"/></svg>
            </button>
          </div>

          <div class="category-feature-card__body">
            <h3>${escapeHTML(recipe.title)}</h3>
            <p>${categoryRecipeDescription(recipe)}</p>
            <div class="category-feature-card__meta">${categoryRecipeNutritionLine(recipe)}</div>
            <button class="category-feature-card__open" type="button" data-action="open-detail" data-recipe-id="${escapeHTML(recipe.id)}">
              <span>Смотреть рецепт</span>
              <b aria-hidden="true">›</b>
            </button>
          </div>
        </article>
      </section>`;
  }

  function categoryMiniRecipeTemplate(recipe) {
    const image = getRecipeImage(recipe);
    const cookTime = getCookTimeLabel(recipe);

    return `
      <article class="category-mini-card ${state.selectedIds.includes(recipe.id) ? "selected" : ""}" data-card-id="${escapeHTML(recipe.id)}" data-page-recipe-id="${escapeHTML(recipe.id)}" data-action="open-detail" data-recipe-id="${escapeHTML(recipe.id)}" role="button" tabindex="0">
        <div class="category-mini-card__image">
          ${image
            ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(recipe.title)}" loading="lazy" decoding="async" onerror="window.handleRecipeImageError(this)">`
            : `<div class="recipe-no-image"><span>Фото не добавлено</span></div>`}
          <div class="category-mini-card__shade"></div>
          <div class="category-mini-card__time">${cookTimeBadgeTemplate(cookTime)}</div>
          <button class="favorite-btn ${isFavorite(recipe.id) ? "active" : ""}" type="button" data-action="favorite" data-recipe-id="${escapeHTML(recipe.id)}" aria-label="${isFavorite(recipe.id) ? "Убрать из избранного" : "Добавить в избранное"}" aria-pressed="${isFavorite(recipe.id)}">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="m12 3 2.82 5.72 6.31.92-4.56 4.44 1.08 6.28L12 17.39l-5.65 2.97 1.08-6.28-4.56-4.44 6.31-.92L12 3Z"/></svg>
          </button>
        </div>
        <div class="category-mini-card__body">
          <h4>${escapeHTML(recipe.title)}</h4>
          <p>${categoryRecipeNutritionLine(recipe)}</p>
        </div>
      </article>`;
  }

  function cookTimeBadgeTemplate(cookTime) {
    return `
      <span class="cook-time-badge" aria-label="Время приготовления">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M12 7v5l3 1.8"/>
          <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/>
          <path d="M8 2h8"/>
        </svg>
        <span>${escapeHTML(cookTime)}</span>
      </span>`;
  }

  function categoryRecipeNutritionLine(recipe) {
    const n = recipe.nutrition || {};
    return `${formatNumber(n.kcal)} ккал · Б ${formatNumber(n.protein)} г · Ж ${formatNumber(n.fat)} г · У ${formatNumber(n.carbs)} г`;
  }

  function categoryRecipeDescription(recipe) {
    const category = getShortCategoryTitle(getCategories().find(item => item.id === recipe.category)).toLowerCase();
    return `Лёгкий и вкусный ${category} для любого дня`;
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

    state.refs.cardsGrid.innerHTML = `${getRecipeCardEntries().map(recipeCardTemplate).join("")}<div class="empty-state" data-empty-state hidden>Ничего не найдено. Попробуй другой запрос или отключи фильтр «Только выбранные».</div>`;
    state.cardsRendered = true;
    scheduleRecipeCardHeightSync();
  }

  function orderRecipeCards(visibleRecipes) {
    const grid = state.refs.cardsGrid;
    if (!grid) return;

    const cardsById = new Map(
      Array.from(grid.querySelectorAll(".recipe-card[data-card-id]")).map(card => [card.dataset.cardId, card])
    );
    const fragment = document.createDocumentFragment();

    visibleRecipes.forEach(recipe => {
      const card = cardsById.get(recipe.id);
      if (card) fragment.appendChild(card);
    });

    const empty = grid.querySelector("[data-empty-state]");
    if (empty) fragment.appendChild(empty);

    grid.appendChild(fragment);
  }

  function syncRecipeCardState(card, recipeId) {
    if (!card || !recipeId) return;

    const rootId = getRecipeCardRootId(recipeId);
    const recipes = getRecipeCardRecipes(rootId);
    const activeRecipe = getActiveVariantRecipe(rootId, card) || getRecipe(recipeId);
    const hasSelected = recipes.some(recipe => state.selectedIds.includes(recipe.id));
    const hasExpanded = activeRecipe ? state.expandedIds.has(activeRecipe.id) : false;

    card.classList.toggle("selected", hasSelected);
    card.classList.toggle("expanded", hasExpanded);

    if (activeRecipe) syncRecipeCardPageState(card, activeRecipe.id);
    syncRecipeCardPager(card);
  }

  function syncRecipeCardPageState(card, recipeId) {
    const pageRoot = getRecipePageRoot(recipeId, card);
    if (!pageRoot) return;

    const selected = state.selectedIds.includes(recipeId);
    const expanded = state.expandedIds.has(recipeId);
    const favorite = isFavorite(recipeId);

    pageRoot.classList.toggle("selected", selected);
    pageRoot.classList.toggle("expanded", expanded);

    const details = pageRoot.querySelector(".recipe-details");
    setRecipeDetailsOpen(details, expanded, { animate: false });

    const toggle = pageRoot.querySelector('[data-action="expand"]');
    if (toggle) {
      toggle.classList.toggle("open", expanded);
      toggle.setAttribute("aria-expanded", String(expanded));
      const label = toggle.querySelector("span");
      if (label) label.textContent = expanded ? "Скрыть рецепт" : "Открыть рецепт";
    }

    const fav = pageRoot.querySelector(`[data-action="favorite"][data-recipe-id="${cssEscape(recipeId)}"]`);
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

    if (!state.dashboardOpen) {
      if (state.activeCategory === "favorites") {
        list = list.filter(recipe => state.favoriteIds.includes(recipe.id));
      } else if (state.activeCategory !== "all") {
        list = list.filter(recipe => recipe.category === state.activeCategory);
      }
    }

    if (state.selectedOnly) {
      list = list.filter(recipe => state.selectedIds.includes(recipe.id));
    }

    if (state.smartFilter === "quick") {
      list = list.filter(recipe => getCookTimeSortRange(recipe).max <= 20);
    }

    if (state.smartFilter === "lowcal") {
      list = list.filter(recipe => Number(recipe.nutrition?.kcal || 0) <= 350);
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

    return compactRecipeVariants(sortRecipesByCookTime(list));
  }

  function sortRecipesByCookTime(recipes) {
    return [...recipes]
      .map((recipe, index) => ({
        recipe,
        index,
        time: getCookTimeSortRange(recipe)
      }))
      .sort((a, b) => {
        if (a.time.max !== b.time.max) return a.time.max - b.time.max;
        if (a.time.min !== b.time.min) return a.time.min - b.time.min;
        return a.index - b.index;
      })
      .map(item => item.recipe);
  }

  function getCookTimeSortRange(recipe) {
    const text = String(recipe?.cookTime || "");
    const values = (text.match(/\d+(?:[.,]\d+)?/g) || [])
      .map(value => Number(value.replace(",", ".")))
      .filter(Number.isFinite);

    if (!values.length) {
      return { min: Number.POSITIVE_INFINITY, max: Number.POSITIVE_INFINITY };
    }

    return {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  function updateRecipeListHeader(count, visible) {
    const head = state.refs.recipeListHead;
    if (!head) return;

    head.hidden = !visible;
    if (!visible) return;

    const titleEl = state.refs.recipeListTitle;
    const subtitleEl = state.refs.recipeListSubtitle;
    const query = state.search.trim();

    let title = "Все блюда";
    let subtitle = `${count} ${plural(count, "блюдо", "блюда", "блюд")}`;

    if (query) {
      title = "Поиск";
      subtitle = `${count} ${plural(count, "блюдо", "блюда", "блюд")} по запросу «${query}»`;
      if (!state.dashboardOpen && state.activeCategory !== "all") {
        const category = state.activeCategory === "favorites"
          ? { title: "Избранное" }
          : getCategories().find(item => item.id === state.activeCategory);
        if (category) subtitle += ` в разделе «${category.title}»`;
      }
    } else if (state.smartFilter === "quick") {
      title = "Быстрые блюда";
      subtitle = `${count} ${plural(count, "блюдо", "блюда", "блюд")} до 20 минут`;
    } else if (state.smartFilter === "lowcal") {
      title = "Низкокалорийные";
      subtitle = `${count} ${plural(count, "блюдо", "блюда", "блюд")} до 350 ккал`;
    } else if (state.activeCategory === "favorites") {
      title = "Избранное";
      subtitle = `${count} ${plural(count, "блюдо", "блюда", "блюд")}`;
    } else if (state.activeCategory !== "all") {
      const category = getCategories().find(item => item.id === state.activeCategory);
      if (category) title = category.title;
      subtitle = `${count} ${plural(count, "блюдо", "блюда", "блюд")} · от быстрого к долгому`;
    } else {
      subtitle = `${count} ${plural(count, "блюдо", "блюда", "блюд")} · от быстрого к долгому`;
    }

    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;
  }

  function updateResultsMeta(count) {
    if (!state.refs.resultsMeta) return;

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

  function recipeServingLabel(recipe) {
    return `Расчёт на 1 порцию${recipe.servingNote ? ` · ${recipe.servingNote}` : ""}`;
  }

  function detailsIconMarkup() {
    return `
      <svg class="expand-toggle__icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M6.6 4.8h10.8a1.8 1.8 0 0 1 1.8 1.8v10.8a1.8 1.8 0 0 1-1.8 1.8H6.6a1.8 1.8 0 0 1-1.8-1.8V6.6a1.8 1.8 0 0 1 1.8-1.8Z"/>
        <path d="M8.2 8.2h7.6M8.2 12h7.6M8.2 15.8h5.1"/>
      </svg>`;
  }

  function recipeCardTemplate(recipe) {
    const rootId = getRecipeCardRootId(recipe.id);
    const rootRecipe = getRecipe(rootId) || recipe;
    const variantRecipes = getRecipeCardRecipes(rootRecipe.id);

    if (variantRecipes.length > 1 && rootRecipe.id === recipe.id) {
      return recipeVariantCardTemplate(rootRecipe, variantRecipes);
    }

    const selected = state.selectedIds.includes(recipe.id);
    const image = getRecipeImage(recipe);

    return `
      <article class="recipe-card ${selected ? "selected" : ""} ${image ? "" : "missing-image"}" data-card-id="${escapeHTML(recipe.id)}">
        ${recipeCardContentTemplate(recipe)}
      </article>`;
  }

  function recipeVariantCardTemplate(rootRecipe, variantRecipes) {
    const activeIndex = getRecipeVariantIndex(rootRecipe.id);
    const activeRecipe = variantRecipes[activeIndex] || variantRecipes[0] || rootRecipe;
    const selected = variantRecipes.some(recipe => state.selectedIds.includes(recipe.id));
    const expanded = state.expandedIds.has(activeRecipe.id);
    const image = getRecipeImage(activeRecipe);
    const variantIds = variantRecipes.map(recipe => recipe.id).join(" ");
    const firstClass = activeIndex <= 0 ? "is-first-variant" : "";
    const lastClass = activeIndex >= variantRecipes.length - 1 ? "is-last-variant" : "";

    return `
      <article class="recipe-card recipe-card--variants ${firstClass} ${lastClass} ${selected ? "selected" : ""} ${expanded ? "expanded" : ""} ${image ? "" : "missing-image"}" data-card-id="${escapeHTML(rootRecipe.id)}" data-page-recipe-id="${escapeHTML(activeRecipe.id)}" data-variant-ids="${escapeHTML(variantIds)}" data-variant-index="${activeIndex}">
        ${recipeCardContentTemplate(activeRecipe, { rootId: rootRecipe.id, count: variantRecipes.length, index: activeIndex })}
        <button class="recipe-variant-arrow recipe-variant-arrow--prev" type="button" data-action="variant-prev" data-root-id="${escapeHTML(rootRecipe.id)}" aria-label="Показать предыдущую вариацию рецепта">‹</button>
        <button class="recipe-variant-arrow recipe-variant-arrow--next" type="button" data-action="variant-next" data-root-id="${escapeHTML(rootRecipe.id)}" aria-label="Показать следующую вариацию рецепта">›</button>
      </article>`;
  }

  function recipeVariantDotsTemplate(context) {
    if (!context || context.count < 2) return "";
    return `
      <div class="recipe-card-dots" aria-hidden="true">
        ${Array.from({ length: context.count }, (_, index) => `<span data-recipe-dot class="${index === context.index ? "active" : ""}"></span>`).join("")}
      </div>`;
  }

  function recipeCardContentTemplate(recipe, variantContext = null) {
    const category = getCategories().find(item => item.id === recipe.category);
    const image = getRecipeImage(recipe);
    const cookTime = getCookTimeLabel(recipe);
    const servingLabel = recipeServingLabel(recipe);
    const expanded = state.expandedIds.has(recipe.id);

    const categoryTitle = getShortCategoryTitle(category);
    const showCategoryEyebrow = state.activeCategory === "all" && !state.dashboardOpen;
    const categoryMarker = "";
    const categoryEyebrow = showCategoryEyebrow
      ? `<span class="recipe-category-eyebrow">${escapeHTML(categoryTitle)}</span>`
      : "";

    return `
        <div class="recipe-hero">
          ${image
            ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(recipe.title)}" loading="lazy" decoding="async" onerror="window.handleRecipeImageError(this)">`
            : `<div class="recipe-no-image"><span>Фото не добавлено</span></div>`}
          <div class="recipe-hero-overlay"></div>
          <div class="recipe-hero-meta">
            ${categoryMarker}
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
              ${categoryEyebrow}
              <h3>${escapeHTML(recipe.title)}</h3>
            </div>
          </div>

          <div class="nutrition-block nutrition-block--base">
            <div class="nutrition-head">
              <span>${escapeHTML(servingLabel)}</span>
            </div>
            <div class="nutrition-row">
              <span>${formatNumber(recipe.nutrition.kcal)} ккал</span>
              <span>Б ${formatNumber(recipe.nutrition.protein)}</span>
              <span>Ж ${formatNumber(recipe.nutrition.fat)}</span>
              <span>У ${formatNumber(recipe.nutrition.carbs)}</span>
            </div>
          </div>

          <button class="expand-toggle ${expanded ? "open" : ""}" type="button" data-action="expand" data-recipe-id="${escapeHTML(recipe.id)}" aria-expanded="${expanded ? "true" : "false"}" aria-controls="recipe-details-${escapeHTML(recipe.id)}">
            ${detailsIconMarkup()}
            <span>${expanded ? "Скрыть рецепт" : "Открыть рецепт"}</span>
            <b aria-hidden="true">⌄</b>
          </button>

          ${recipeVariantDotsTemplate(variantContext)}
          ${recipeDetailsTemplate(recipe)}
        </div>`;
  }


  function handleRecipeScreenClick(event) {
    const closeBtn = event.target.closest("[data-recipe-screen-close]");
    if (closeBtn) {
      event.preventDefault();
      closeRecipeScreen();
      return;
    }

    const action = event.target.closest("[data-action]");
    if (!action) return;

    const recipeId = action.dataset.recipeId || state.activeRecipeId;
    const actionName = action.dataset.action;

    if (actionName === "favorite") {
      event.preventDefault();
      toggleFavorite(recipeId);
      return;
    }

    if (actionName === "recipe-step") {
      event.preventDefault();
      updateRecipeSetting(recipeId, action.dataset.key, Number(action.dataset.delta || 0));
      return;
    }

    if (actionName === "start-cooking") {
      event.preventDefault();
      openRecipeCookingScreen(recipeId);
      return;
    }

    if (actionName === "method-back") {
      event.preventDefault();
      openRecipeScreen(recipeId);
      return;
    }

    if (actionName === "jump-method") {
      event.preventDefault();
      openRecipeCookingScreen(recipeId);
      return;
    }

    if (actionName === "page-note") {
      event.preventDefault();
      showToast("Заметки уже доступны в карточках. На странице рецепта добавим следующим этапом.", "neutral");
      return;
    }
  }

  function openRecipeScreen(recipeId) {
    const recipe = getRecipe(recipeId);
    const screen = state.refs.recipeScreen;
    if (!recipe || !screen) return;

    state.activeRecipeId = recipe.id;
    screen.innerHTML = recipeScreenTemplate(recipe);
    screen.hidden = false;
    screen.setAttribute("aria-hidden", "false");
    document.body.classList.add("recipe-screen-open");

    requestAnimationFrame(() => {
      screen.classList.add("visible");
      screen.scrollTo({ top: 0, behavior: "auto" });
    });
  }

  function openRecipeCookingScreen(recipeId) {
    const recipe = getRecipe(recipeId);
    const screen = state.refs.recipeScreen;
    if (!recipe || !screen) return;

    state.activeRecipeId = recipe.id;
    screen.innerHTML = recipeCookingScreenTemplate(recipe);
    screen.hidden = false;
    screen.setAttribute("aria-hidden", "false");
    document.body.classList.add("recipe-screen-open");

    requestAnimationFrame(() => {
      screen.classList.add("visible");
      screen.scrollTo({ top: 0, behavior: "auto" });
    });
  }

  function recipeCookingScreenTemplate(recipe) {
    const steps = Array.isArray(recipe.steps) ? recipe.steps : [];

    return `
      <article class="recipe-screen__panel recipe-cooking-screen" role="dialog" aria-modal="true" aria-label="Способ приготовления: ${escapeHTML(recipe.title)}">
        <header class="recipe-cooking-head">
          <button class="recipe-screen__round recipe-cooking-back" type="button" data-action="method-back" data-recipe-id="${escapeHTML(recipe.id)}" aria-label="Назад к рецепту">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M15.2 5.4 8.6 12l6.6 6.6"/></svg>
          </button>
          <div class="recipe-cooking-title">
            <h2>Способ приготовления</h2>
          </div>
          <strong class="recipe-cooking-count">${steps.length} ${plural(steps.length, "шаг", "шага", "шагов")}</strong>
        </header>

        <div class="recipe-screen-steps recipe-cooking-steps">
          ${recipeScreenStepsTemplate(recipe, steps)}
        </div>

        <button class="recipe-screen-note recipe-cooking-note" type="button" data-action="page-note" data-recipe-id="${escapeHTML(recipe.id)}">
          <span>
            <strong>Заметки</strong>
            <small>Добавить свою заметку</small>
          </span>
          <b aria-hidden="true">›</b>
        </button>
      </article>`;
  }

  function closeRecipeScreen(options = {}) {
    const screen = state.refs.recipeScreen;
    if (!screen || !state.activeRecipeId) return;

    state.activeRecipeId = null;
    screen.classList.remove("visible");
    screen.setAttribute("aria-hidden", "true");
    document.body.classList.remove("recipe-screen-open");

    if (options.silent) {
      screen.hidden = true;
      screen.innerHTML = "";
      return;
    }

    window.setTimeout(() => {
      if (state.activeRecipeId) return;
      screen.hidden = true;
      screen.innerHTML = "";
    }, 180);
  }

  function recipeScreenTemplate(recipe) {
    const image = getRecipeImage(recipe);
    const cookTime = getCookTimeLabel(recipe);
    const targetPortions = getTargetPortions(recipe.id);
    const scaledIngredients = getScaledIngredients(recipe, targetPortions);
    const portionsLabel = `${targetPortions} ${plural(targetPortions, "порция", "порции", "порций")}`;

    return `
      <article class="recipe-screen__panel" role="dialog" aria-modal="true" aria-label="${escapeHTML(recipe.title)}">
        <div class="recipe-screen__hero">
          ${image
            ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(recipe.title)}" decoding="async" onerror="window.handleRecipeImageError(this)">`
            : `<div class="recipe-no-image"><span>Фото не добавлено</span></div>`}
          <div class="recipe-screen__hero-shade"></div>
          <button class="recipe-screen__round recipe-screen__back" type="button" data-recipe-screen-close aria-label="Назад">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M15.2 5.4 8.6 12l6.6 6.6"/></svg>
          </button>
          <button class="recipe-screen__round recipe-screen__favorite ${isFavorite(recipe.id) ? "active" : ""}" type="button" data-action="favorite" data-recipe-id="${escapeHTML(recipe.id)}" aria-label="${isFavorite(recipe.id) ? "Убрать из избранного" : "Добавить в избранное"}" aria-pressed="${isFavorite(recipe.id)}">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="m12 3 2.82 5.72 6.31.92-4.56 4.44 1.08 6.28L12 17.39l-5.65 2.97 1.08-6.28-4.56-4.44 6.31-.92L12 3Z"/></svg>
          </button>
          <div class="recipe-screen__time">${cookTimeBadgeTemplate(cookTime)}</div>
        </div>

        <div class="recipe-screen__body">
          <div class="recipe-screen__title-block">
            <h2>${escapeHTML(recipe.title)}</h2>
            <p>${categoryRecipeDescription(recipe)}</p>
          </div>

          <div class="recipe-screen__nutrition" aria-label="КБЖУ">
            ${recipeScreenNutritionItem("ккал", recipe.nutrition?.kcal)}
            ${recipeScreenNutritionItem("белки", recipe.nutrition?.protein, "г")}
            ${recipeScreenNutritionItem("жиры", recipe.nutrition?.fat, "г")}
            ${recipeScreenNutritionItem("углеводы", recipe.nutrition?.carbs, "г")}
          </div>

          <section class="recipe-screen-card recipe-screen-card--plan" aria-label="Расчёт блюда">
            <div class="recipe-screen-card__head">
              <div>
                <h3>Расчёт блюда</h3>
                <p>Дни и люди в одной строке</p>
              </div>
              <strong data-plan-total>${escapeHTML(portionsLabel)}</strong>
            </div>
            <div class="recipe-plan-compact-row" aria-label="Расчёт количества порций">
              ${recipeCompactStepperTemplate(recipe.id, "days", "calendar", "Дней", getRecipePlan(recipe.id).days, MIN_SETTING, MAX_DAYS)}
              ${recipeCompactStepperTemplate(recipe.id, "people", "people", "Людей", getRecipePlan(recipe.id).people, MIN_SETTING, MAX_PEOPLE)}
            </div>
          </section>

          <section class="recipe-screen-card recipe-screen-card--ingredients" aria-label="Ингредиенты">
            <div class="recipe-screen-card__head">
              <h3>Ингредиенты</h3>
              <strong data-ingredients-portions-label>на ${targetPortions} ${plural(targetPortions, "порцию", "порции", "порций")}</strong>
            </div>
            <div class="recipe-screen-ingredients" data-ingredients-grid>
              ${recipeScreenIngredientRowsTemplate(scaledIngredients)}
            </div>
          </section>

          <button class="recipe-screen-start" type="button" data-action="start-cooking" data-recipe-id="${escapeHTML(recipe.id)}">
            <span aria-hidden="true">${chefIconMarkup()}</span>
            <strong>Начать готовить</strong>
          </button>

          <button class="recipe-screen-note" type="button" data-action="page-note" data-recipe-id="${escapeHTML(recipe.id)}">
            <span>
              <strong>Заметки</strong>
              <small>Добавить свою заметку</small>
            </span>
            <b aria-hidden="true">›</b>
          </button>
        </div>
      </article>`;
  }

  function recipeScreenNutritionItem(label, value, unit = "") {
    return `
      <div>
        <strong>${formatNumber(value || 0)}${unit ? ` ${escapeHTML(unit)}` : ""}</strong>
        <span>${escapeHTML(label)}</span>
      </div>`;
  }

  function recipeScreenIngredientRowsTemplate(items) {
    return items.map(item => `
      <div class="recipe-screen-ingredient">
        <span>${escapeHTML(item.name)}</span>
        <strong>${item.amount === null ? escapeHTML(item.unit) : formatAmount(item.amount, item.unit)}</strong>
      </div>`).join("");
  }

  function recipeScreenStepsTemplate(recipe, steps) {
    if (!steps.length) return `<div class="recipe-screen-step recipe-screen-step--empty">Способ приготовления пока не добавлен.</div>`;

    return steps.map((step, index) => {
      const image = getRecipeStepImage(recipe, index);
      return `
        <article class="recipe-screen-step">
          <span class="recipe-screen-step__number">${index + 1}</span>
          <p>${escapeHTML(step)}</p>
          <div class="recipe-screen-step__media ${image ? "has-image" : "is-placeholder"}" aria-label="Фото шага ${index + 1}">
            ${image
              ? `<img src="${escapeHTML(image)}" alt="Шаг ${index + 1}: ${escapeHTML(recipe.title)}" loading="lazy" decoding="async" onerror="window.handleRecipeImageError(this)">`
              : `<span>Фото шага</span>`}
          </div>
        </article>`;
    }).join("");
  }

  function getRecipeStepImage(recipe, index) {
    const sources = recipe?.stepImages || recipe?.methodImages || recipe?.processImages || [];
    if (!Array.isArray(sources)) return "";
    return String(sources[index] || "").trim();
  }

  function chefIconMarkup() {
    return `
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M6.4 12.9A4 4 0 0 1 7.7 5.2a5.1 5.1 0 0 1 8.6 0 4 4 0 0 1 1.3 7.7"/>
        <path d="M6.8 12.5h10.4v6.2a2 2 0 0 1-2 2H8.8a2 2 0 0 1-2-2v-6.2Z"/>
        <path d="M8.6 16.4h6.8"/>
      </svg>`;
  }

  function updateRecipeScreenDynamic(recipeId) {
    if (!recipeId || state.activeRecipeId !== recipeId) return;

    const screen = state.refs.recipeScreen;
    const recipe = getRecipe(recipeId);
    if (!screen || !recipe) return;

    const targetPortions = getTargetPortions(recipeId);
    const portionsText = `${targetPortions} ${plural(targetPortions, "порция", "порции", "порций")}`;
    const scaledIngredients = getScaledIngredients(recipe, targetPortions);

    const planTotal = screen.querySelector("[data-plan-total]");
    if (planTotal) planTotal.textContent = portionsText;

    const ingredientsPortionsLabel = screen.querySelector("[data-ingredients-portions-label]");
    if (ingredientsPortionsLabel) ingredientsPortionsLabel.textContent = `на ${targetPortions} ${plural(targetPortions, "порцию", "порции", "порций")}`;

    const ingredientsGrid = screen.querySelector("[data-ingredients-grid]");
    if (ingredientsGrid) ingredientsGrid.innerHTML = recipeScreenIngredientRowsTemplate(scaledIngredients);

    const plan = getRecipePlan(recipeId);
    updateStepperDynamic(screen, "people", plan.people, MIN_SETTING, MAX_PEOPLE);
    updateStepperDynamic(screen, "days", plan.days, MIN_SETTING, MAX_DAYS);
  }

  function updateRecipeScreenFavoriteUI(recipeId) {
    if (!recipeId || state.activeRecipeId !== recipeId) return;

    const btn = state.refs.recipeScreen?.querySelector(`[data-action="favorite"][data-recipe-id="${cssEscape(recipeId)}"]`);
    if (!btn) return;

    const active = isFavorite(recipeId);
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
    btn.setAttribute("aria-label", active ? "Убрать из избранного" : "Добавить в избранное");
  }

  function updateRecipeScreenSelectionUI(recipeId) {
    if (!recipeId || state.activeRecipeId !== recipeId) return;

    const btn = state.refs.recipeScreen?.querySelector(`[data-action="start-cooking"][data-recipe-id="${cssEscape(recipeId)}"]`);
    if (!btn) return;

    btn.classList.remove("selected");
    const label = btn.querySelector("strong");
    if (label) label.textContent = "Начать готовить";
  }


  function recipeDetailsTemplate(recipe) {
    const plan = getRecipePlan(recipe.id);
    const targetPortions = getTargetPortions(recipe.id);
    const scaledIngredients = getScaledIngredients(recipe, targetPortions);
    const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
    const note = String(state.notesMap[recipe.id] || "").trim();
    const editingNote = state.editingNoteIds.has(recipe.id);
    const portionsLabel = `${targetPortions} ${plural(targetPortions, "порция", "порции", "порций")}`;

    return `
      <div class="recipe-details" id="recipe-details-${escapeHTML(recipe.id)}">
        <section class="recipe-plan-card recipe-plan-card--compact" aria-label="Расчёт блюда">
          <div class="recipe-plan-head">
            <div>
              <h4>Расчёт блюда</h4>
              <small>дни и люди в одной строке</small>
            </div>
            <strong data-plan-total>${escapeHTML(portionsLabel)}</strong>
          </div>
          <div class="recipe-plan-compact-row" aria-label="Расчёт количества порций">
            ${recipeCompactStepperTemplate(recipe.id, "days", "calendar", "Дней", plan.days, MIN_SETTING, MAX_DAYS)}
            ${recipeCompactStepperTemplate(recipe.id, "people", "people", "Людей", plan.people, MIN_SETTING, MAX_PEOPLE)}
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
            <h4>Способ приготовления</h4>
            <small>${steps.length} ${plural(steps.length, "шаг", "шага", "шагов")}</small>
          </div>
          <ol class="steps-list">
            ${steps.map(step => `<li>${escapeHTML(step)}</li>`).join("")}
          </ol>
        </section>

        <section class="recipe-note-shell ${editingNote ? "is-open" : ""} ${note ? "has-note" : ""}">
          <button class="recipe-note-toggle" type="button" data-action="${editingNote ? "note-cancel" : "note-open"}" data-recipe-id="${escapeHTML(recipe.id)}" aria-expanded="${editingNote ? "true" : "false"}">
            <span>Заметки</span>
            <small>${note ? "Есть сохранённая заметка" : "Добавить свою заметку"}</small>
            <b aria-hidden="true">⌄</b>
          </button>
          <div class="recipe-note-dropdown">
            <div class="note-editor">
              <textarea data-note-input="${escapeHTML(recipe.id)}" placeholder="Например: меньше соли, заменить йогурт, готовить на 5 минут дольше...">${escapeHTML(note)}</textarea>
              <div class="note-actions">
                <button class="tiny-btn" type="button" data-action="note-save" data-recipe-id="${escapeHTML(recipe.id)}">Сохранить</button>
                <button class="tiny-btn ghost" type="button" data-action="note-cancel" data-recipe-id="${escapeHTML(recipe.id)}">Свернуть</button>
                ${note ? `<button class="tiny-btn ghost" type="button" data-action="note-remove" data-recipe-id="${escapeHTML(recipe.id)}">Удалить</button>` : ""}
              </div>
            </div>
          </div>
        </section>
      </div>`;
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
    const normalizedTitle = normalizeName(title);
    if (normalizedTitle.includes("завтрак")) return "Завтрак";
    if (normalizedTitle.includes("обед")) return "Обед";
    if (normalizedTitle.includes("ужин")) return "Ужин";
    if (normalizedTitle.includes("десерт")) return "Десерт";
    if (normalizedTitle.includes("закуск")) return "Закуска";
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
    updateRecipeScreenFavoriteUI(recipeId);
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

    const card = getRecipeCardElement(recipeId);
    const pageRoot = getRecipePageRoot(recipeId, card);
    const wasExpanded = state.expandedIds.has(recipeId);
    const shouldExpand = !wasExpanded;
    const hadOpenEditor = state.editingNoteIds.has(recipeId);

    if (shouldExpand) {
      state.expandedIds.add(recipeId);
    } else {
      state.expandedIds.delete(recipeId);
      state.editingNoteIds.delete(recipeId);
    }

    if (!card || !pageRoot) return;

    if (!shouldExpand && hadOpenEditor) {
      replaceRecipeCard(recipeId);
      return;
    }

    pageRoot.classList.toggle("expanded", shouldExpand);
    card.classList.toggle("expanded", shouldExpand);

    const details = pageRoot.querySelector(".recipe-details");
    setRecipeDetailsOpen(details, shouldExpand);

    const toggle = pageRoot.querySelector(`[data-action="expand"][data-recipe-id="${cssEscape(recipeId)}"]`);
    if (toggle) {
      toggle.classList.toggle("open", shouldExpand);
      toggle.setAttribute("aria-expanded", String(shouldExpand));
      const label = toggle.querySelector("span");
      if (label) label.textContent = shouldExpand ? "Скрыть рецепт" : "Открыть рецепт";
    }

    scheduleRecipeCardHeightSync();
  }


  function setRecipeDetailsOpen(details, open, options = {}) {
    if (!details) return;

    const animate = options.animate !== false;
    details.removeEventListener("transitionend", details._portionlyHeightEnd);

    if (!animate) {
      details.classList.add("no-anim");
      details.classList.toggle("visible", open);
      details.style.height = open ? "auto" : "0px";
      requestAnimationFrame(() => {
        details.classList.remove("no-anim");
        syncRecipeCardSizeAround(details);
        scheduleRecipeCardHeightSync();
      });
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
        pulseRecipeCardSizeSync(details);
      });

      details._portionlyHeightEnd = event => {
        if (event.propertyName !== "height") return;
        details.style.height = "auto";
        syncRecipeCardSizeAround(details);
        scheduleRecipeCardHeightSync();
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
      pulseRecipeCardSizeSync(details);
    });

    details._portionlyHeightEnd = event => {
      if (event.propertyName !== "height") return;
      syncRecipeCardSizeAround(details);
      scheduleRecipeCardHeightSync();
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
    updateRecipeScreenDynamic(recipeId);
    updateSelectionUI();
    updateRecipeScreenSelectionUI(recipeId);
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
    updateRecipeScreenSelectionUI(recipeId);
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
    if (state.activeRecipeId) updateRecipeScreenSelectionUI(state.activeRecipeId);
    if (isModalOpen()) renderBasketModal();
    showToast("Выбор очищен", "neutral");
  }

  function replaceRecipeCard(recipeId, direction = 0) {
    const rootId = getRecipeCardRootId(recipeId);
    const recipe = getRecipe(rootId);
    const currentCard = getRecipeCardElement(recipeId);
    if (!recipe || !currentCard) return;

    state.recipeVariantIndexes[rootId] = getRecipeVariantIndex(rootId, currentCard);

    const wrapper = document.createElement("div");
    wrapper.innerHTML = recipeCardTemplate(recipe).trim();
    const nextCard = wrapper.firstElementChild;
    if (!nextCard) return;

    if (direction !== 0) {
      nextCard.classList.add(direction > 0 ? "recipe-card--variant-enter-next" : "recipe-card--variant-enter-prev");
    }

    syncRecipeCardState(nextCard, rootId);
    currentCard.replaceWith(nextCard);
    renderRecipes();

    if (direction !== 0) {
      window.setTimeout(() => {
        nextCard.classList.remove("recipe-card--variant-enter-next", "recipe-card--variant-enter-prev");
      }, 280);
    }
  }

  function updateRecipeSelectionUI(recipeId) {
    const card = getRecipeCardElement(recipeId);
    if (!card) return;

    const recipes = getRecipeCardRecipes(recipeId);
    const hasSelected = recipes.some(recipe => state.selectedIds.includes(recipe.id));
    card.classList.toggle("selected", hasSelected);

    const pageRoot = getRecipePageRoot(recipeId, card);
    pageRoot?.classList.toggle("selected", state.selectedIds.includes(recipeId));
  }

  function updateRecipeFavoriteUI(recipeId) {
    const card = getRecipeCardElement(recipeId);
    const pageRoot = getRecipePageRoot(recipeId, card);
    if (!pageRoot) return;

    const btn = pageRoot.querySelector(`[data-action="favorite"][data-recipe-id="${cssEscape(recipeId)}"]`);
    if (!btn) return;

    const active = isFavorite(recipeId);
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
    btn.setAttribute("aria-label", active ? "Убрать из избранного" : "Добавить в избранное");
  }

  function updateRecipeCardDynamic(recipeId) {
    const recipe = getRecipe(recipeId);
    const card = getRecipeCardElement(recipeId);
    const pageRoot = getRecipePageRoot(recipeId, card);
    if (!recipe || !pageRoot) return;

    const plan = getRecipePlan(recipeId);
    const targetPortions = getTargetPortions(recipeId);
    const scaledIngredients = getScaledIngredients(recipe, targetPortions);
    const portionsText = `${targetPortions} ${plural(targetPortions, "порция", "порции", "порций")}`;

    const planTotal = pageRoot.querySelector("[data-plan-total]");
    if (planTotal) planTotal.textContent = portionsText;

    const ingredientsPortionsLabel = pageRoot.querySelector("[data-ingredients-portions-label]");
    if (ingredientsPortionsLabel) ingredientsPortionsLabel.textContent = `на ${targetPortions} ${plural(targetPortions, "порцию", "порции", "порций")}`;

    const ingredientsGrid = pageRoot.querySelector("[data-ingredients-grid]");
    if (ingredientsGrid) ingredientsGrid.innerHTML = ingredientRowsTemplate(scaledIngredients);

    updateStepperDynamic(pageRoot, "people", plan.people, MIN_SETTING, MAX_PEOPLE);
    updateStepperDynamic(pageRoot, "days", plan.days, MIN_SETTING, MAX_DAYS);
    scheduleRecipeCardHeightSync();
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
    const action = event.target.closest("[data-action]");
    if (action) {
      const actionName = action.dataset.action;
      if (actionName === "recipe-step") {
        event.preventDefault();
        updateRecipeSetting(action.dataset.recipeId, action.dataset.key, Number(action.dataset.delta || 0));
        return;
      }
    }

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
    const plan = getRecipePlan(recipe.id);
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
          <section class="basket-dish__plan" aria-label="Расчёт блюда">
            <div class="recipe-plan-head">
              <div>
                <h4>Расчёт блюда</h4>
                <small>порции и дни для корзины</small>
              </div>
              <strong data-plan-total>${portions} ${plural(portions, "порция", "порции", "порций")}</strong>
            </div>
            <div class="recipe-plan-compact-row" aria-label="Расчёт количества порций">
              ${recipeCompactStepperTemplate(recipe.id, "people", "people", "Людей", plan.people, MIN_SETTING, MAX_PEOPLE)}
              ${recipeCompactStepperTemplate(recipe.id, "days", "calendar", "Дней", plan.days, MIN_SETTING, MAX_DAYS)}
            </div>
          </section>
          <div class="basket-dish__details-title">Ингредиенты</div>
          <div class="basket-dish__ingredients-wrap">
            <div class="basket-dish__ingredients" aria-hidden="${showPantryOverlay ? "true" : "false"}">
              ${scaledIngredients.map(item => dishIngredientRowTemplate(recipe.id, item)).join("")}
            </div>
            ${showPantryOverlay ? `
              <div class="basket-dish__pantry-overlay" role="status" aria-live="polite">
                <div class="basket-dish__pantry-overlay-badge" aria-hidden="true">✓</div>
                <strong>Все ингредиенты есть</strong>
                <small>Покупать для этого блюда ничего не нужно.</small>
                <div class="basket-dish__pantry-actions">
                  <button class="basket-dish__pantry-edit" type="button" data-basket-dish-edit="${escapeHTML(recipe.id)}">Изменить</button>
                  <button class="basket-dish__pantry-remove" type="button" data-remove-id="${escapeHTML(recipe.id)}">Удалить</button>
                </div>
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

    if (value.includes("йогурт")) name = "Йогурт натуральный";
    else if (value.includes("сахарозамен") || value.includes("фитпарад") || value.includes("подсласт")) name = "Подсластитель";
    else if (value.includes("яйц") || value.includes("яич") || value === "яйцо" || value === "яйца") name = "Яйца";
    else if (value.includes("помид") || value.includes("томат")) name = "Помидоры";
    else if (value.includes("огур")) name = "Огурцы";
    else if (value === "творог 5%" || value.includes("творог 5")) name = "Творог 5%";
    else if (value === "творог") name = "Творог";
    else if (value.includes("молоко или вода")) name = "Молоко";
    else if (value === "масло" || value.includes("растительное масло")) name = "Растительное масло";
    else if (value.includes("мед") || value.includes("мёд")) name = "Мёд";
    else if (value === "банан" || value === "бананы") name = "Бананы";
    else if (value.includes("ягод")) name = "Ягоды";
    else if (value.includes("орех")) name = "Орехи";
    else if (value.includes("листья салата")) name = "Листья салата";
    else if (value.includes("сладкий перец") || value.includes("болгарский перец")) name = "Сладкий перец";
    else if (value === "манка") name = "Манка";
    else if (value === "мука") name = "Мука";
    else if (value.includes("гранола")) name = "Гранола";
    else if (value.includes("мюсли")) name = "Мюсли";
    else if (value === "кабачок" || value === "кабачки") name = "Кабачки";
    else if (value.includes("репчатый лук") || value === "лук репчатый") name = "Лук";
    else if (value.includes("перец молотый")) name = "Перец";
    else if (value.includes("куриное филе") || value.includes("куриная грудка") || value.includes("куриную грудку") || value.includes("филе/грудка")) name = "Куриное филе";
    else if (value.includes("зелёный лук") || value.includes("зеленый лук")) name = "Зелёный лук";

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
          <strong>Все ингредиенты есть</strong>
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
    { id: "grains_bread", title: "Крупы, лапша и хлеб", icon: "🌾" },
    { id: "fruit_sweet", title: "Фрукты, ягоды, орехи и мёд", icon: "🍯" },
    { id: "oils_spices", title: "Масла, специи, соусы и добавки", icon: "🧂" },
    { id: "taste", title: "По вкусу", icon: "▫" },
    { id: "other", title: "Прочее", icon: "▫" }
  ];

  function getIngredientGroup(name) {
    const value = normalizeName(name);

    if (includesAny(value, ["яй", "яич", "молоко", "молоко/вода", "сыр", "творог", "йогурт", "кефир", "сметан"])) return "dairy_eggs";
    if (includesAny(value, ["курин", "говядин", "рыб", "филе рыбы", "морепродукт", "кревет", "морской коктейль"])) return "meat_fish";
    if (includesAny(value, ["хлеб", "лаваш", "овся", "булгур", "греч", "рис", "манка", "мука", "сухари", "мюсли", "гранола", "чечев", "хлоп", "лапша", "макарон", "спагет", "фунчоза", "удон"])) return "grains_bread";
    if (includesAny(value, ["банан", "ягод", "малина", "голубик", "клубник", "мед", "мёд", "сахар", "орех"])) return "fruit_sweet";
    if (includesAny(value, ["огур", "помид", "томат", "зелень", "зелёный лук", "зеленый лук", "салат", "карто", "капуст", "морков", "лук", "кабач", "сладкий перец", "болгар", "чеснок", "овощ", "кинз", "брок", "редис", "петруш", "укроп", "сельдер", "стручковая фасоль", "фасоль"])) return "vegetables";
    if (includesAny(value, ["масло", "специ", "соль", "перец", "паприка", "лимон", "заправ", "соус", "лавров", "хмели", "горчиц", "кунжут", "разрыхл", "подсласт", "сахарозамен", "фитпарад"])) return "oils_spices";

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


  function preloadRecipeImages() {
    const recipeUrls = getRecipes().map(getRecipeImage).filter(Boolean);
    const tileUrls = Object.values(CATEGORY_TILE_MEDIA).map(item => item?.image).filter(Boolean);
    const urls = Array.from(new Set([...tileUrls, ...recipeUrls]));
    if (!urls.length) return;

    urls.slice(0, 10).forEach(url => warmImage(url));

    const rest = urls.slice(10);
    if (!rest.length) return;

    const loadRest = () => rest.forEach(url => warmImage(url));
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(loadRest, { timeout: 1800 });
    } else {
      window.setTimeout(loadRest, 600);
    }
  }

  function warmImage(url) {
    if (!url) return;
    const img = new Image();
    img.decoding = "async";
    img.src = url;
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
    const card = img.closest(".recipe-card, .recipe-summary, .recipe-screen");
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
