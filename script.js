const STORAGE_KEY = "meal-cards:selected-v1";
let activeCategory = "all";
let selectedIds = loadSelected();
let openedRecipeId = null;

const categoryTabs = document.getElementById("categoryTabs");
const cardsGrid = document.getElementById("cardsGrid");
const recipesCount = document.getElementById("recipesCount");
const selectedCountTop = document.getElementById("selectedCountTop");
const basketFab = document.getElementById("basketFab");
const basketBadge = document.getElementById("basketBadge");
const basketModal = document.getElementById("basketModal");
const recipeModal = document.getElementById("recipeModal");

document.addEventListener("DOMContentLoaded", () => {
  recipesCount.textContent = RECIPES.length;
  renderCategories();
  renderRecipes();
  updateSelectionUI();

  document.getElementById("clearAllBtn").addEventListener("click", clearSelection);
  basketFab.addEventListener("click", openBasketModal);
  document.getElementById("copyBtn").addEventListener("click", copyBasketText);

  document.querySelectorAll("[data-close-modal]").forEach(button => {
    button.addEventListener("click", closeModals);
  });

  [basketModal, recipeModal].forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) closeModals();
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModals();
  });
});

function loadSelected() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveSelected() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));
}

function renderCategories() {
  categoryTabs.innerHTML = CATEGORIES.map(category => {
    const count = category.id === "all" ? RECIPES.length : RECIPES.filter(recipe => recipe.category === category.id).length;
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function renderRecipes() {
  const visibleRecipes = activeCategory === "all" ? RECIPES : RECIPES.filter(recipe => recipe.category === activeCategory);

  if (!visibleRecipes.length) {
    cardsGrid.innerHTML = `<div class="empty-state">В этой категории пока пусто.</div>`;
    return;
  }

  cardsGrid.innerHTML = visibleRecipes.map(recipe => recipeCardTemplate(recipe)).join("");

  cardsGrid.querySelectorAll("[data-toggle]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      toggleRecipe(button.dataset.toggle);
    });
  });

  cardsGrid.querySelectorAll("[data-open-recipe]").forEach(button => {
    button.addEventListener("click", () => openRecipeModal(button.dataset.openRecipe));
  });
}

function recipeCardTemplate(recipe) {
  const category = CATEGORIES.find(item => item.id === recipe.category);
  const selected = selectedIds.includes(recipe.id);

  return `
    <article class="recipe-card ${selected ? "selected" : ""}">
      <button class="recipe-image-button" type="button" data-open-recipe="${recipe.id}" aria-label="Открыть ${escapeHTML(recipe.title)}">
        <img src="${recipe.image}" alt="${escapeHTML(recipe.title)}" loading="lazy">
      </button>
      <button class="round-check ${selected ? "checked" : ""}" type="button" data-toggle="${recipe.id}" aria-label="Выбрать ${escapeHTML(recipe.title)}">
        <span>${selected ? "✓" : ""}</span>
      </button>
      <div class="recipe-card-body">
        <span class="recipe-category">${category?.icon || "🍽️"} ${category?.title || ""}</span>
        <h3>${escapeHTML(recipe.title)}</h3>
        <p>${escapeHTML(recipe.meta || "")}</p>
        <div class="nutrition-row">
          <span>${recipe.nutrition.kcal} ккал</span>
          <span>Б ${recipe.nutrition.protein}</span>
          <span>Ж ${recipe.nutrition.fat}</span>
          <span>У ${recipe.nutrition.carbs}</span>
        </div>
      </div>
    </article>
  `;
}

function toggleRecipe(recipeId) {
  if (selectedIds.includes(recipeId)) {
    selectedIds = selectedIds.filter(id => id !== recipeId);
  } else {
    selectedIds = [...selectedIds, recipeId];
  }

  saveSelected();
  renderRecipes();
  updateSelectionUI();

  if (isModalOpen(basketModal)) renderBasketModal();
  if (isModalOpen(recipeModal) && openedRecipeId === recipeId) renderRecipeModalButton(recipeId);
}

function clearSelection() {
  selectedIds = [];
  saveSelected();
  renderRecipes();
  updateSelectionUI();
  if (isModalOpen(basketModal)) renderBasketModal();
}

function updateSelectionUI() {
  selectedCountTop.textContent = selectedIds.length;
  basketBadge.textContent = selectedIds.length;
  basketFab.classList.toggle("visible", selectedIds.length > 0);
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

  if (!selectedRecipes.length) {
    selectedStrip.innerHTML = `<div class="modal-empty">Ничего не выбрано.</div>`;
    totalsList.innerHTML = `<div class="modal-empty">Выбери блюда круглым чекбоксом — и тут появится список продуктов.</div>`;
    recipeSummaryList.innerHTML = "";
    return;
  }

  selectedStrip.innerHTML = selectedRecipes.map(recipe => `
    <button class="selected-chip" type="button" data-remove="${recipe.id}">
      ${escapeHTML(recipe.title)} <span>×</span>
    </button>
  `).join("");

  selectedStrip.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", () => {
      selectedIds = selectedIds.filter(id => id !== button.dataset.remove);
      saveSelected();
      renderRecipes();
      updateSelectionUI();
      renderBasketModal();
    });
  });

  const totals = calculateTotals(selectedRecipes);

  totalsList.innerHTML = totals.numeric.map(item => `
    <div class="total-item">
      <div>
        <strong>${escapeHTML(item.name)}</strong>
        <small>${item.sources.length} ${plural(item.sources.length, "блюдо", "блюда", "блюд")}</small>
      </div>
      <span>${formatAmount(item.amount, item.unit)}</span>
    </div>
  `).join("");

  if (totals.taste.length) {
    totalsList.innerHTML += `
      <div class="taste-block">
        <strong>По вкусу / без точной граммовки:</strong>
        <p>${totals.taste.map(item => escapeHTML(item.name)).join(", ")}</p>
      </div>
    `;
  }

  recipeSummaryList.innerHTML = selectedRecipes.map(recipe => `
    <article class="recipe-summary">
      <img src="${recipe.image}" alt="${escapeHTML(recipe.title)}">
      <div>
        <h4>${escapeHTML(recipe.title)}</h4>
        <p>${escapeHTML(recipe.meta)} • ${recipe.portions} ${plural(recipe.portions, "порция", "порции", "порций")}</p>
        <p>${recipe.nutrition.kcal} ккал • Б ${recipe.nutrition.protein} • Ж ${recipe.nutrition.fat} • У ${recipe.nutrition.carbs}</p>
      </div>
    </article>
  `).join("");
}

function calculateTotals(selectedRecipes) {
  const map = new Map();
  const taste = new Map();

  selectedRecipes.forEach(recipe => {
    recipe.ingredients.forEach(ingredient => {
      const name = ingredient.name.trim();
      const unit = ingredient.unit.trim();

      if (ingredient.amount === null || ingredient.amount === undefined) {
        taste.set(normalizeName(name), { name, unit });
        return;
      }

      const key = `${normalizeName(name)}__${unit.toLowerCase()}`;
      if (!map.has(key)) map.set(key, { name, unit, amount: 0, sources: [] });
      const item = map.get(key);
      item.amount += Number(ingredient.amount);
      item.sources.push(recipe.title);
    });
  });

  return {
    numeric: Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "ru")),
    taste: Array.from(taste.values()).sort((a, b) => a.name.localeCompare(b.name, "ru"))
  };
}

function copyBasketText() {
  const selectedRecipes = selectedIds.map(getRecipe).filter(Boolean);
  const totals = calculateTotals(selectedRecipes);
  if (!selectedRecipes.length) return;

  const lines = ["Список продуктов:", ...totals.numeric.map(item => `- ${item.name}: ${formatAmount(item.amount, item.unit)}`)];
  if (totals.taste.length) {
    lines.push("", "По вкусу:");
    totals.taste.forEach(item => lines.push(`- ${item.name}`));
  }

  navigator.clipboard?.writeText(lines.join("\n"));
  const button = document.getElementById("copyBtn");
  button.textContent = "Скопировано";
  setTimeout(() => button.textContent = "Скопировать", 1200);
}

function openRecipeModal(recipeId) {
  openedRecipeId = recipeId;
  const recipe = getRecipe(recipeId);
  if (!recipe) return;
  const category = CATEGORIES.find(item => item.id === recipe.category);

  document.getElementById("recipeModalCategory").textContent = category ? `${category.icon} ${category.title}` : "Блюдо";
  document.getElementById("recipeModalTitle").textContent = recipe.title;

  const image = document.getElementById("recipeModalImage");
  image.src = recipe.image;
  image.alt = recipe.title;

  document.getElementById("recipeModalIngredients").innerHTML = recipe.ingredients.map(item => `
    <div class="mini-ingredient"><span>${escapeHTML(item.name)}</span><strong>${item.amount === null ? escapeHTML(item.unit) : formatAmount(item.amount, item.unit)}</strong></div>
  `).join("");

  document.getElementById("recipeModalSteps").innerHTML = recipe.steps.map(step => `<li>${escapeHTML(step)}</li>`).join("");
  const notes = recipe.notes?.length ? recipe.notes : ["Отдельных заметок нет."];
  document.getElementById("recipeModalNotes").innerHTML = notes.map(note => `<li>${escapeHTML(note)}</li>`).join("");

  renderRecipeModalButton(recipeId);
  recipeModal.classList.add("visible");
  recipeModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function renderRecipeModalButton(recipeId) {
  const button = document.getElementById("recipeModalToggle");
  const selected = selectedIds.includes(recipeId);
  button.textContent = selected ? "Убрать из выбора" : "Добавить в выбор";
  button.onclick = () => toggleRecipe(recipeId);
}

function closeModals() {
  [basketModal, recipeModal].forEach(modal => {
    modal.classList.remove("visible");
    modal.setAttribute("aria-hidden", "true");
  });
  document.body.classList.remove("modal-open");
  openedRecipeId = null;
}

function isModalOpen(modal) {
  return modal.classList.contains("visible");
}

function getRecipe(id) {
  return RECIPES.find(recipe => recipe.id === id);
}

function normalizeName(name) {
  const aliases = {
    "яйцо": "яйца",
    "яйца": "яйца",
    "помидор": "помидоры",
    "помидоры": "помидоры",
    "томат": "помидоры",
    "томаты": "помидоры",
    "огурец": "огурцы",
    "огурцы": "огурцы"
  };
  const normalized = name.toLowerCase().trim();
  return aliases[normalized] || normalized;
}

function formatAmount(amount, unit) {
  if (unit === "г" && amount >= 1000) return `${formatNumber(amount / 1000)} кг`;
  return `${formatNumber(amount)} ${unit}`;
}

function formatNumber(value) {
  return Number(value).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

function plural(number, one, few, many) {
  const mod10 = number % 10;
  const mod100 = number % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
