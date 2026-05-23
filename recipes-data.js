window.CATEGORIES = [
  { id: "all", title: "Все блюда", icon: "🍽️" },
  { id: "breakfast", title: "Завтраки", icon: "☕" },
  { id: "main", title: "Обеды", icon: "🍲" },
  { id: "dinner", title: "Ужины", icon: "🌙" },
  { id: "dessert", title: "Десерты", icon: "🍓" }
];

window.RECIPES = [
  {
    id: "omelet-cheese-tomato-toast",
    title: "Омлет с сыром, помидором и зеленью + тост",
    category: "breakfast",
    image: "assets/omelet-cheese-tomato-toast.jpg",
    heroImage: "assets/omelet-cheese-tomato-toast.jpg",
    portions: 2,
    meta: "на 2 порции",
    cookTime: "15–20 мин",
    nutrition: { kcal: 390, protein: 24, fat: 21, carbs: 24 },
    ingredients: [
      { name: "Яйца", amount: 4, unit: "шт" },
      { name: "Молоко", amount: 50, unit: "мл" },
      { name: "Сыр", amount: 50, unit: "г" },
      { name: "Помидоры", amount: 150, unit: "г" },
      { name: "Зелень", amount: 10, unit: "г" },
      { name: "Растительное масло", amount: 5, unit: "г" },
      { name: "Хлеб для тостов", amount: 80, unit: "г" }
    ],
    steps: ["Взбить яйца с молоком, солью и перцем.", "Помидоры нарезать и слегка прогреть на сковороде.", "Влить яйца, добавить сыр и зелень.", "Готовить 5–7 минут и подать с тостами."],
    notes: []
  },
  {
    id: "cottage-cheese-banana-berries-honey",
    title: "Творог с бананом, ягодами, орехами и мёдом",
    category: "breakfast",
    image: "assets/cottage-cheese-banana-berries-honey.jpg",
    heroImage: "assets/cottage-cheese-banana-berries-honey.jpg",
    portions: 2,
    meta: "на 2 порции",
    cookTime: "5–7 мин",
    nutrition: { kcal: 405, protein: 33, fat: 16, carbs: 33 },
    ingredients: [
      { name: "Творог 5%", amount: 350, unit: "г" },
      { name: "Бананы", amount: 120, unit: "г" },
      { name: "Ягоды", amount: 120, unit: "г" },
      { name: "Орехи", amount: 25, unit: "г" },
      { name: "Мёд", amount: 15, unit: "г" },
      { name: "Йогурт натуральный", amount: 40, unit: "г" }
    ],
    steps: ["Разложить творог по двум мискам.", "Добавить банан и ягоды.", "Посыпать орехами.", "Полить мёдом и при желании добавить йогурт."],
    notes: []
  },
  {
    id: "egg-cheese-tomato-salad-sandwich",
    title: "Сэндвич с яйцом, сыром, помидором и салатом",
    category: "breakfast",
    image: "assets/egg-cheese-tomato-salad-sandwich.jpg",
    heroImage: "assets/egg-cheese-tomato-salad-sandwich.jpg",
    portions: 2,
    meta: "на 2 порции",
    cookTime: "15–20 мин",
    nutrition: { kcal: 350, protein: 18, fat: 17, carbs: 28 },
    ingredients: [
      { name: "Хлеб для тостов", amount: 100, unit: "г" },
      { name: "Яйца", amount: 2, unit: "шт" },
      { name: "Сыр", amount: 50, unit: "г" },
      { name: "Помидоры", amount: 120, unit: "г" },
      { name: "Листья салата", amount: 20, unit: "г" },
      { name: "Творожный сыр", amount: 30, unit: "г" }
    ],
    steps: ["Яйца отварить или пожарить.", "Хлеб подсушить.", "Намазать творожный сыр.", "Выложить салат, яйцо, сыр и помидор.", "Накрыть вторым ломтиком и разрезать пополам."],
    notes: []
  },
  {
    id: "oatmeal-fruits-nuts",
    title: "Овсянка с фруктами и орехами",
    category: "breakfast",
    image: "assets/oatmeal-fruits-nuts.jpg",
    heroImage: "assets/oatmeal-fruits-nuts.jpg",
    portions: 2,
    meta: "на 2 порции",
    cookTime: "10–15 мин",
    nutrition: { kcal: 465, protein: 15, fat: 16, carbs: 66 },
    ingredients: [
      { name: "Овсяные хлопья", amount: 100, unit: "г" },
      { name: "Молоко", amount: 400, unit: "мл" },
      { name: "Бананы", amount: 120, unit: "г" },
      { name: "Ягоды", amount: 100, unit: "г" },
      { name: "Орехи", amount: 25, unit: "г" },
      { name: "Мёд", amount: 15, unit: "г" }
    ],
    steps: ["Довести молоко до кипения.", "Добавить овсяные хлопья и варить 5–7 минут.", "Разложить по тарелкам.", "Сверху добавить банан, ягоды, орехи и мёд."],
    notes: ["Молоко можно заменить водой."]
  },
  {
    id: "oat-pancakes-berries",
    title: "Овсяные оладьи с ягодами",
    category: "breakfast",
    image: "assets/oat-pancakes-berries.jpg",
    heroImage: "assets/oat-pancakes-berries.jpg",
    portions: 1,
    meta: "на 1 порцию",
    servingNote: "≈ 4–5 шт",
    cookTime: "30–40 мин",
    nutrition: { kcal: 518, protein: 27, fat: 23, carbs: 48 },
    ingredients: [
      { name: "Овсяные хлопья", amount: 55, unit: "г" },
      { name: "Яйца", amount: 1, unit: "шт" },
      { name: "Творог 5%", amount: 55, unit: "г" },
      { name: "Малина", amount: 55, unit: "г" },
      { name: "Голубика", amount: 55, unit: "г" },
      { name: "Подсластитель", amount: null, unit: "по вкусу" },
      { name: "Разрыхлитель", amount: 5, unit: "г" },
      { name: "Сметана 10%", amount: 110, unit: "г" }
    ],
    steps: ["Обдать ягоды кипятком и обсушить.", "Смешать овсяные хлопья, яйцо, творог, ягоды, сахарозаменитель и разрыхлитель.", "Пробить массу блендером до однородности.", "Дать тесту постоять 10–20 минут.", "Выпекать оладьи на слегка смазанной сковороде на среднем огне с двух сторон.", "Подавать со сметаной."],
    notes: []
  },
  {
    id: "lavash-roll-egg-cheese-vegetables",
    title: "Лаваш-ролл с яйцом, сыром и овощами",
    category: "breakfast",
    image: "assets/lavash-roll-egg-cheese-vegetables.jpg",
    heroImage: "assets/lavash-roll-egg-cheese-vegetables.jpg",
    portions: 2,
    meta: "на 2 порции",
    cookTime: "15–20 мин",
    nutrition: { kcal: 403, protein: 24, fat: 17, carbs: 33 },
    ingredients: [
      { name: "Лаваш", amount: 100, unit: "г" },
      { name: "Яйца", amount: 3, unit: "шт" },
      { name: "Сыр", amount: 60, unit: "г" },
      { name: "Огурцы", amount: 120, unit: "г" },
      { name: "Помидоры", amount: 120, unit: "г" },
      { name: "Листья салата", amount: 20, unit: "г" },
      { name: "Йогурт натуральный", amount: 30, unit: "г" }
    ],
    steps: ["Яйца приготовить как скрэмбл.", "Овощи нарезать.", "Лаваш смазать йогуртом, добавить салат, яйца, сыр и овощи.", "Завернуть рулетом и слегка прогреть."],
    notes: []
  },
  {
    id: "toast-cottage-cheese-egg-cucumber",
    title: "Тосты с творожным сыром, яйцом и огурцом",
    category: "breakfast",
    image: "assets/toast-cream-cheese-egg-cucumber.jpg",
    heroImage: "",
    portions: 2,
    meta: "на 2 порции",
    servingNote: "2 шт",
    cookTime: "10–12 мин",
    nutrition: { kcal: 332, protein: 14, fat: 17, carbs: 29 },
    ingredients: [
      { name: "Хлеб для тостов", amount: 100, unit: "г" },
      { name: "Творожный сыр", amount: 90, unit: "г" },
      { name: "Яйца", amount: 2, unit: "шт" },
      { name: "Огурцы", amount: 120, unit: "г" },
      { name: "Зелень", amount: 10, unit: "г" }
    ],
    steps: ["Подсушить хлеб.", "Намазать творожный сыр.", "Добавить яйцо и огурец.", "Посыпать зеленью и подать."],
    notes: []
  },
  {
    id: "mini-cottage-cheese-casserole",
    title: "Мини-творожная запеканка",
    category: "breakfast",
    image: "assets/mini-cottage-cheese-casserole.jpg",
    heroImage: "assets/mini-cottage-cheese-casserole.jpg",
    portions: 2,
    meta: "на 2 порции",
    cookTime: "40–45 мин",
    nutrition: { kcal: 313, protein: 30, fat: 11, carbs: 25 },
    ingredients: [
      { name: "Творог", amount: 300, unit: "г" },
      { name: "Яйца", amount: 1, unit: "шт" },
      { name: "Манка", amount: 20, unit: "г" },
      { name: "Сахар", amount: 20, unit: "г" },
      { name: "Йогурт натуральный", amount: 30, unit: "г" },
      { name: "Ягоды", amount: 50, unit: "г" }
    ],
    steps: ["Смешать творог, яйцо, сахар и йогурт.", "Добавить манку и оставить на 10 минут.", "Выложить в форму и запекать 25–30 минут при 180°C."],
    notes: ["Манку можно заменить мукой."]
  },
  {
    id: "yogurt-bowl",
    title: "Йогуртовый боул",
    category: "breakfast",
    image: "assets/yogurt-bowl.jpg",
    heroImage: "",
    portions: 2,
    meta: "на 2 порции",
    cookTime: "5–7 мин",
    nutrition: { kcal: 398, protein: 14, fat: 16, carbs: 55 },
    ingredients: [
      { name: "Йогурт натуральный", amount: 350, unit: "г" },
      { name: "Бананы", amount: 120, unit: "г" },
      { name: "Гранола", amount: 70, unit: "г" },
      { name: "Орехи", amount: 20, unit: "г" },
      { name: "Мёд", amount: 10, unit: "г" },
      { name: "Ягоды", amount: 50, unit: "г" }
    ],
    steps: ["Разложить йогурт по мискам.", "Добавить банан.", "Посыпать гранолой, орехами и ягодами.", "Полить мёдом."],
    notes: ["Гранолу можно заменить мюсли."]
  },
  {
    id: "scramble-bread-vegetables",
    title: "Скрэмбл + хлеб + овощи",
    category: "breakfast",
    image: "assets/scramble-bread-vegetables.jpg",
    heroImage: "",
    portions: 2,
    meta: "на 2 порции",
    cookTime: "10–12 мин",
    nutrition: { kcal: 287, protein: 19, fat: 12, carbs: 25 },
    ingredients: [
      { name: "Яйца", amount: 4, unit: "шт" },
      { name: "Молоко", amount: 30, unit: "мл" },
      { name: "Хлеб для тостов", amount: 80, unit: "г" },
      { name: "Огурцы", amount: 120, unit: "г" },
      { name: "Помидоры", amount: 150, unit: "г" }
    ],
    steps: ["Взбить яйца с молоком.", "Готовить на слабом огне, постоянно помешивая.", "Подать с хлебом и свежими овощами."],
    notes: []
  },
  {
    id: "lentil-soup-puree",
    title: "Чечевичный суп-пюре",
    category: "main",
    image: "assets/lentil-soup-puree.jpg",
    heroImage: "assets/lentil-soup-puree.jpg",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "30–40 мин",
    nutrition: { kcal: 340, protein: 18.6, fat: 6.6, carbs: 46.1 },
    ingredients: [
      { name: "Чечевица красная", amount: 75, unit: "г" },
      { name: "Лук красный", amount: 35, unit: "г" },
      { name: "Морковь", amount: 35, unit: "г" },
      { name: "Помидоры", amount: 65, unit: "г" },
      { name: "Чеснок", amount: 1, unit: "зубч." },
      { name: "Кинза", amount: 11, unit: "г" },
      { name: "Лавровый лист", amount: 1, unit: "шт" },
      { name: "Оливковое масло", amount: 5, unit: "г" },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" },
      { name: "Хмели-сунели", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Нарезать лук, морковь, помидоры и чеснок.",
      "Разогреть масло, слегка обжарить лук и морковь, затем добавить чеснок и помидоры.",
      "Добавить красную чечевицу, лавровый лист, соль, перец и хмели-сунели, влить 440 мл воды.",
      "Варить на среднем огне 15–20 минут, пока чечевица и овощи не станут мягкими.",
      "Удалить лавровый лист, пробить суп блендером до кремовой консистенции и подать с кинзой."
    ],
    notes: ["По времени ориентир — около 30–40 минут с учётом подготовки и варки."]
  },
  {
    id: "chicken-meatballs-potato-salad",
    title: "Куриные тефтели с картошкой дольками и салатом",
    category: "main",
    image: "assets/chicken-meatballs-potato-salad.jpg",
    heroImage: "assets/chicken-meatballs-potato-salad.jpg",
    portions: 6,
    meta: "на 2 человек на 2–3 дня",
    cookTime: "50–60 мин",
    nutrition: { kcal: 495, protein: 31, fat: 18, carbs: 51 },
    ingredients: [
      { name: "Куриный фарш", amount: 800, unit: "г" },
      { name: "Яйца", amount: 1, unit: "шт" },
      { name: "Лук", amount: 100, unit: "г" },
      { name: "Чеснок", amount: 2, unit: "зубч." },
      { name: "Панировочные сухари", amount: 30, unit: "г" },
      { name: "Паприка", amount: 1, unit: "ч. л." },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" },
      { name: "Картофель", amount: 1200, unit: "г" },
      { name: "Растительное масло", amount: 35, unit: "г" },
      { name: "Огурцы", amount: 240, unit: "г" },
      { name: "Помидоры", amount: 500, unit: "г" },
      { name: "Листья салата", amount: 200, unit: "г" },
      { name: "Йогурт натуральный", amount: 100, unit: "г" }
    ],
    steps: ["Смешать фарш с яйцом, луком, чесноком и специями.", "Сформировать тефтели.", "Картофель нарезать дольками и смешать с маслом.", "Запечь тефтели и картошку при 200°C 35–45 минут.", "Подать со свежим салатом и йогуртовой заправкой."],
    notes: ["Выход: 6 порций.", "Салат лучше готовить свежим.", "Удобно разложить по контейнерам."]
  },
  {
    id: "pilaf-light-chicken-bulgur",
    title: "Плов-лайт с курицей и булгуром",
    category: "main",
    image: "assets/chicken-bulgur-light-plov.jpg",
    heroImage: "",
    portions: 6,
    meta: "на 2 человек на 2–3 дня",
    cookTime: "35–45 мин",
    nutrition: { kcal: 461, protein: 39, fat: 11, carbs: 51 },
    ingredients: [
      { name: "Куриное филе", amount: 800, unit: "г" },
      { name: "Булгур", amount: 350, unit: "г" },
      { name: "Морковь", amount: 300, unit: "г" },
      { name: "Лук", amount: 200, unit: "г" },
      { name: "Чеснок", amount: 3, unit: "зубч." },
      { name: "Растительное масло", amount: 35, unit: "г" },
      { name: "Специи для плова", amount: 10, unit: "г" },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" }
    ],
    steps: ["Курицу нарезать и обжарить до лёгкой корочки.", "Добавить лук и морковь.", "Добавить чеснок и специи.", "Всыпать булгур и залить 750 мл воды.", "Готовить под крышкой 20 минут и дать настояться."],
    notes: ["Выход: 6 порций.", "Булгур делает блюдо легче классического плова.", "Вкусно с овощным салатом."]
  },
  {
    id: "chicken-lavash-vegetables-yogurt-sauce",
    title: "Курица в лаваше с овощами и йогуртовым соусом",
    category: "main",
    image: "assets/chicken-lavash-vegetables-yogurt.jpg",
    heroImage: "",
    portions: 6,
    meta: "на 2 человек на 2–3 дня",
    cookTime: "25–30 мин",
    nutrition: { kcal: 411, protein: 39, fat: 9, carbs: 38 },
    ingredients: [
      { name: "Лаваш", amount: 300, unit: "г" },
      { name: "Куриное филе", amount: 800, unit: "г" },
      { name: "Огурцы", amount: 350, unit: "г" },
      { name: "Помидоры", amount: 500, unit: "г" },
      { name: "Листья салата", amount: 200, unit: "г" },
      { name: "Растительное масло", amount: 15, unit: "г" },
      { name: "Йогурт натуральный", amount: 300, unit: "г" },
      { name: "Чеснок", amount: 3, unit: "зубч." },
      { name: "Зелень", amount: 20, unit: "г" },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" }
    ],
    steps: ["Курицу нарезать, приправить и обжарить.", "Смешать йогурт, чеснок и зелень для соуса.", "Овощи нарезать.", "На лаваш выложить салат, курицу, овощи и соус.", "Завернуть и при желании слегка подрумянить."],
    notes: ["Выход: 6 порций.", "Лаваш лучше собирать перед подачей.", "Удобно брать с собой."]
  },
  {
    id: "fish-potato-cauliflower-puree",
    title: "Рыба с пюре из картофеля и цветной капусты",
    category: "main",
    image: "assets/fish-potato-cauliflower-puree.jpg",
    heroImage: "assets/fish-potato-cauliflower-puree.jpg",
    portions: 5,
    meta: "на 2 человек на 2 дня",
    cookTime: "40–50 мин",
    nutrition: { kcal: 424, protein: 44, fat: 10, carbs: 37 },
    ingredients: [
      { name: "Филе рыбы", amount: 800, unit: "г" },
      { name: "Лимонный сок", amount: 20, unit: "мл" },
      { name: "Растительное масло", amount: 20, unit: "г" },
      { name: "Картофель", amount: 800, unit: "г" },
      { name: "Цветная капуста", amount: 550, unit: "г" },
      { name: "Молоко", amount: 175, unit: "мл" },
      { name: "Сливочное масло", amount: 35, unit: "г" },
      { name: "Огурцы", amount: 150, unit: "г" },
      { name: "Помидоры", amount: 150, unit: "г" },
      { name: "Зелень", amount: 10, unit: "г" },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" }
    ],
    steps: ["Картофель и цветную капусту отварить до мягкости.", "Добавить молоко и сливочное масло, сделать пюре.", "Рыбу посолить, поперчить и сбрызнуть лимонным соком.", "Запечь при 190–200°C 15–25 минут.", "Подать с пюре и свежими овощами."],
    notes: ["Выход: 5 порций.", "Пюре получается нежным и лёгким.", "Рыбу можно заменить курицей."]
  },
  {
    id: "beef-vegetables-buckwheat",
    title: "Тушёная говядина с овощами и гречкой",
    category: "main",
    image: "assets/beef-vegetables-buckwheat.jpg",
    heroImage: "assets/beef-vegetables-buckwheat.jpg",
    portions: 6,
    meta: "на 2 человек на 2–3 дня",
    cookTime: "80–100 мин",
    nutrition: { kcal: 503, protein: 34, fat: 23, carbs: 41 },
    ingredients: [
      { name: "Говядина", amount: 800, unit: "г" },
      { name: "Лук", amount: 200, unit: "г" },
      { name: "Морковь", amount: 200, unit: "г" },
      { name: "Сладкий перец", amount: 250, unit: "г" },
      { name: "Кабачки", amount: 300, unit: "г" },
      { name: "Помидоры", amount: 400, unit: "г" },
      { name: "Растительное масло", amount: 30, unit: "г" },
      { name: "Гречка", amount: 300, unit: "г" },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" }
    ],
    steps: ["Говядину нарезать и обжарить до румяности.", "Добавить лук и морковь.", "Добавить перец, кабачок и томаты.", "Тушить под крышкой 60–90 минут.", "Отдельно сварить гречку и подать вместе."],
    notes: ["Выход: 6 порций.", "Отлично подходит для разогрева.", "Можно менять овощи по сезону."]
  },
  {
    id: "cottage-cheese-strawberry-vatrushki",
    title: "Творожные ватрушки с клубникой",
    category: "dessert",
    image: "assets/cottage-cheese-strawberry-vatrushki.jpg",
    heroImage: "assets/cottage-cheese-strawberry-vatrushki.jpg",
    portions: 1,
    meta: "на 1 порцию",
    servingNote: "4 шт",
    cookTime: "35–45 мин",
    nutrition: { kcal: 625, protein: 55, fat: 18, carbs: 62 },
    ingredients: [
      { name: "Творог", amount: 250, unit: "г" },
      { name: "Яйца", amount: 1, unit: "шт" },
      { name: "Мука", amount: 60, unit: "г" },
      { name: "Разрыхлитель", amount: 2.5, unit: "г" },
      { name: "Подсластитель", amount: null, unit: "по вкусу" },
      { name: "Клубника", amount: 150, unit: "г" }
    ],
    steps: [
      "Смешать 200 г творога с яйцом, разрыхлителем и подсластителем.",
      "Добавить муку и замесить мягкую массу.",
      "Оставшиеся 50 г творога смешать с подсластителем для начинки.",
      "Сформировать 4 шарика, выложить на пергамент и стаканом сделать углубления.",
      "В углубления добавить творожную начинку, сверху выложить клубнику.",
      "Выпекать при 200°C около 30 минут."
    ],
    notes: ["Выход: 4 ватрушки.", "КБЖУ указаны примерно на весь рецепт."]
  },
  {
    id: "chicken-broccoli-soup",
    title: "Суп с филе куриной грудки и брокколи",
    category: "main",
    image: "assets/chicken-broccoli-soup.jpg",
    heroImage: "assets/chicken-broccoli-soup.jpg",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "50–60 мин",
    nutrition: { kcal: 297, protein: 33.2, fat: 2.5, carbs: 36.0 },
    ingredients: [
      { name: "Куриное филе", amount: 110, unit: "г" },
      { name: "Брокколи", amount: 130, unit: "г" },
      { name: "Картофель", amount: 130, unit: "г" },
      { name: "Лук", amount: 50, unit: "г" },
      { name: "Морковь", amount: 50, unit: "г" },
      { name: "Чеснок", amount: 2, unit: "г" }
    ],
    steps: [
      "В кастрюлю выложить курицу, лук и чеснок, залить водой, довести до кипения и варить на среднем огне около 40 минут, периодически снимая пену.",
      "Брокколи разобрать на соцветия, морковь натереть или нарезать соломкой, картофель нарезать средними кубиками.",
      "Добавить в кастрюлю брокколи, картофель и морковь, снова довести до кипения и варить ещё 15–20 минут.",
      "В конце посолить и поперчить по вкусу."
    ],
    notes: ["Ориентир по времени взят по типичному приготовлению куриного супа с брокколи: около 50–60 минут с учётом варки курицы и овощей."]
  },
  {
    id: "viennese-waffles",
    title: "Венские вафли",
    category: "dessert",
    image: "assets/viennese-waffles.jpg",
    heroImage: "assets/viennese-waffles.jpg",
    portions: 1,
    meta: "на 1 порцию",
    servingNote: "2 шт",
    cookTime: "20–30 мин",
    nutrition: { kcal: 520, protein: 21.7, fat: 16.2, carbs: 71.6 },
    ingredients: [
      { name: "Кефир 2,5%", amount: 165, unit: "г" },
      { name: "Мука цельнозерновая", amount: 85, unit: "г" },
      { name: "Яйца", amount: 1, unit: "шт" },
      { name: "Голубика", amount: 120, unit: "г" },
      { name: "Кокосовое масло", amount: 5, unit: "г" },
      { name: "Разрыхлитель", amount: 5, unit: "г" },
      { name: "Подсластитель", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "В миске соединить кефир, яйцо и подсластитель, перемешать венчиком до однородности.",
      "Всыпать просеянную муку с разрыхлителем и ещё раз перемешать до консистенции густой сметаны; при необходимости скорректировать густоту теста.",
      "Выпекать вафли в разогретой вафельнице, слегка смазанной кокосовым маслом, до золотистости.",
      "Подавать с голубикой."
    ],
    notes: ["Ориентир по времени для домашних венских вафель — примерно 20–30 минут с учётом замеса теста и выпекания."]
  },
  {
    id: "cottage-cheese-berry-dessert",
    title: "Творожный десерт с ягодами",
    category: "dessert",
    image: "assets/cottage-cheese-berry-dessert.jpg",
    heroImage: "assets/cottage-cheese-berry-dessert.jpg",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "10–15 мин",
    nutrition: { kcal: 509, protein: 46.4, fat: 14.3, carbs: 46.6 },
    ingredients: [
      { name: "Творог 5%", amount: 220, unit: "г" },
      { name: "Йогурт натуральный", amount: 85, unit: "г" },
      { name: "Клубника", amount: 220, unit: "г" },
      { name: "Подсластитель", amount: null, unit: "по вкусу" },
      { name: "Кукурузные хлопья без сахара", amount: 30, unit: "г" }
    ],
    steps: [
      "Если ягоды замороженные, предварительно разморозить их и слить лишнюю воду, затем произвольно нарезать.",
      "Творог смешать с йогуртом и добавить подсластитель по вкусу.",
      "Выложить в стакан или креманку часть творожной смеси, затем слой хлопьев и слой ягод.",
      "Повторить слои и завершить творожной смесью."
    ],
    notes: ["Такой десерт обычно собирается очень быстро — около 10–15 минут."]
  },
  {
    id: "chicken-cabbage-salad",
    title: "Салат из курицы и капусты",
    category: "main",
    image: "assets/chicken-cabbage-salad.jpg",
    heroImage: "assets/chicken-cabbage-salad.jpg",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "30–40 мин",
    nutrition: { kcal: 275, protein: 37.9, fat: 8.5, carbs: 7.0 },
    ingredients: [
      { name: "Куриное филе", amount: 130, unit: "г" },
      { name: "Капуста пекинская", amount: 85, unit: "г" },
      { name: "Помидоры", amount: 85, unit: "г" },
      { name: "Сыр лёгкий 15%", amount: 20, unit: "г" },
      { name: "Зелёный лук", amount: 20, unit: "г" },
      { name: "Укроп", amount: null, unit: "по вкусу" },
      { name: "Сметана 10%", amount: 35, unit: "г" },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Куриное филе отварить в кипящей подсоленной воде, затем остудить и нарезать мелким кубиком.",
      "Пекинскую капусту нашинковать, помидоры нарезать средним кубиком, сыр натереть на средней тёрке, зелёный лук и укроп порубить.",
      "Смешать в миске курицу, капусту, помидоры, сыр и зелень.",
      "Посолить, поперчить и заправить сметаной."
    ],
    notes: ["Ориентир по времени — около 30–40 минут, основное время уходит на варку курицы."]
  },
  {
    id: "egg-vegetable-salad",
    title: "Салат с яйцом и овощами",
    category: "main",
    image: "assets/egg-vegetable-salad.jpg",
    heroImage: "assets/egg-vegetable-salad.jpg",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "15–20 мин",
    nutrition: { kcal: 265, protein: 10.3, fat: 21.7, carbs: 5.3 },
    ingredients: [
      { name: "Яйца", amount: 2, unit: "шт" },
      { name: "Огурцы", amount: 70, unit: "г" },
      { name: "Редис", amount: 60, unit: "г" },
      { name: "Листья салата", amount: 35, unit: "г" },
      { name: "Петрушка", amount: null, unit: "по вкусу" },
      { name: "Укроп", amount: null, unit: "по вкусу" },
      { name: "Оливковое масло", amount: 17, unit: "г" }
    ],
    steps: [
      "Поставить вариться яйца.",
      "Огурец и редис нарезать тонкими ломтиками, салат порвать или нарезать, зелень порубить.",
      "Выложить всё в салатник, посолить, поперчить и заправить оливковым маслом, затем перемешать.",
      "Яйцо нарезать произвольно и выложить сверху на салат."
    ],
    notes: ["Лёгкий салат, который обычно готовится за 15–20 минут вместе с варкой яиц."]
  }
,
  {
    id: "hot-sandwiches",
    title: "Горячие бутерброды",
    category: "breakfast",
    image: "assets/hot-sandwiches.jpg",
    heroImage: "assets/hot-sandwiches.jpg",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "20 мин",
    nutrition: { kcal: 408, protein: 31.2, fat: 11.9, carbs: 39.2 },
    ingredients: [
      { name: "Цельнозерновой хлеб", amount: 100, unit: "г" },
      { name: "Куриное филе", amount: 75, unit: "г" },
      { name: "Сыр лёгкий 15%", amount: 35, unit: "г" },
      { name: "Сметана 10%", amount: 20, unit: "г" },
      { name: "Дижонская горчица", amount: null, unit: "по вкусу" },
      { name: "Петрушка", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Куриное филе отварить и нарезать мелким кубиком.",
      "Смешать курицу, сыр, сметану, горчицу и зелень.",
      "Выложить начинку на хлеб и слегка прижать.",
      "Запекать 10–15 минут при 180°C до золотистой корочки."
    ],
    notes: []
  },
  {
    id: "funchoza-chicken-vegetables",
    title: "Фунчоза с курицей и овощами",
    category: "main",
    image: "assets/funchoza-chicken-vegetables.jpg",
    heroImage: "assets/funchoza-chicken-vegetables.jpg",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "30 мин",
    nutrition: { kcal: 495, protein: 36.8, fat: 9.9, carbs: 60.1 },
    ingredients: [
      { name: "Фунчоза", amount: 50, unit: "г" },
      { name: "Куриное филе", amount: 130, unit: "г" },
      { name: "Сладкий перец", amount: 130, unit: "г" },
      { name: "Огурцы", amount: 130, unit: "г" },
      { name: "Морковь", amount: 55, unit: "г" },
      { name: "Лук", amount: 35, unit: "г" },
      { name: "Зелёный лук", amount: 11, unit: "г" },
      { name: "Кунжут", amount: 5, unit: "г" }
    ],
    steps: [
      "Куриное филе и овощи нарезать соломкой.",
      "Обжарить лук, морковь, курицу и болгарский перец 15 минут.",
      "Фунчозу залить кипятком на 5 минут и слить воду.",
      "Добавить огурец, зелёный лук и фунчозу в сковороду.",
      "Приправить, прогреть 1–2 минуты и посыпать кунжутом."
    ],
    notes: []
  }
,
  {
    id: "lavash-cottage-cheese-banana",
    title: "Лаваш с творогом",
    category: "breakfast",
    image: "assets/lavash-cottage-cheese-banana.jpg",
    heroImage: "assets/lavash-cottage-cheese-banana.jpg",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "25–30 мин",
    nutrition: { kcal: 411, protein: 29.2, fat: 12.2, carbs: 44.6 },
    ingredients: [
      { name: "Лаваш", amount: 55, unit: "г" },
      { name: "Творог 5%", amount: 85, unit: "г" },
      { name: "Бананы", amount: 55, unit: "г" },
      { name: "Яйца", amount: 1, unit: "шт" }
    ],
    steps: [
      "Творог измельчить блендером и смешать с нарезанным бананом.",
      "Лаваш нарезать на полоски, выложить начинку из творога и банана и завернуть рулетики.",
      "Яйцо взбить и смазать им рулетики из лаваша.",
      "Запекать при 180°C до хрустящей корочки."
    ],
    notes: []
  },
  {
    id: "banana-pancakes",
    title: "Банановые панкейки",
    category: "breakfast",
    image: "assets/banana-pancakes.jpg",
    heroImage: "assets/banana-pancakes.jpg",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "20–25 мин",
    nutrition: { kcal: 361, protein: 14.1, fat: 13.7, carbs: 43.2 },
    ingredients: [
      { name: "Бананы", amount: 55, unit: "г" },
      { name: "Яйца", amount: 1, unit: "шт" },
      { name: "Мука цельнозерновая", amount: 45, unit: "г" },
      { name: "Разрыхлитель", amount: 5, unit: "г" },
      { name: "Кокосовое молоко нежирное", amount: 85, unit: "г" },
      { name: "Кокосовое масло", amount: 5, unit: "г" },
      { name: "Подсластитель", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Размять банан вилкой, добавить яйцо, подсластитель, молоко и перемешать. При желании смешать в блендере.",
      "Добавить муку и разрыхлитель, перемешать до однородного теста.",
      "Выпекать на заранее разогретой и смазанной маслом сковороде с двух сторон до готовности на среднем огне."
    ],
    notes: []
  },
  {
    id: "vietnamese-rice-seafood",
    title: "Вьетнамский рис с морепродуктами",
    category: "main",
    image: "assets/vietnamese-rice-seafood.jpg",
    heroImage: "assets/vietnamese-rice-seafood.jpg",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "35 мин",
    nutrition: { kcal: 466, protein: 29.9, fat: 13.4, carbs: 34.7 },
    ingredients: [
      { name: "Бурый рис", amount: 20, unit: "г" },
      { name: "Коктейль морепродуктов", amount: 110, unit: "г" },
      { name: "Креветки", amount: 85, unit: "г" },
      { name: "Стручковая фасоль", amount: 85, unit: "г" },
      { name: "Сладкий перец", amount: 75, unit: "г" },
      { name: "Лук", amount: 35, unit: "г" },
      { name: "Морковь", amount: 35, unit: "г" },
      { name: "Зелёный лук", amount: 20, unit: "г" },
      { name: "Чеснок", amount: null, unit: "по вкусу" },
      { name: "Соевый соус", amount: 20, unit: "г" },
      { name: "Лимонный сок", amount: 11, unit: "г" },
      { name: "Масло виноградной косточки", amount: 5, unit: "г" },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" },
      { name: "Куркума", amount: null, unit: "по вкусу" },
      { name: "Перец чили", amount: null, unit: "по вкусу" },
      { name: "Петрушка", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Рис промыть, отварить в кипящей воде до полуготовности и откинуть на сито.",
      "Лук, сладкий перец и морковь нарезать тонкой соломкой. Зелень, чеснок и зелёный лук измельчить.",
      "Стручковую фасоль положить в кипящую подсоленную воду, отварить около 3 минут при сильном кипении и откинуть на сито.",
      "В глубокой сковороде обжарить на масле лук до мягкости. Добавить морковь и сладкий перец, жарить 5–7 минут.",
      "Добавить рис и стручковую фасоль. Влить соевый соус, добавить специи по вкусу и жарить на среднем огне около 5 минут, помешивая.",
      "Добавить морской коктейль, креветки, чеснок, зелёный лук и зелень. Жарить ещё 3–4 минуты на сильном огне.",
      "Досолить блюдо по вкусу, добавить лимонный сок, снять с огня и сразу подать."
    ],
    notes: []
  },
  {
    id: "udon-chicken-vegetables",
    title: "Удон с овощами и курицей",
    category: "main",
    image: "assets/udon-chicken-vegetables.jpg",
    heroImage: "assets/udon-chicken-vegetables.jpg",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "25 мин",
    nutrition: { kcal: 515, protein: 39.6, fat: 17.4, carbs: 47.2 },
    ingredients: [
      { name: "Лапша удон", amount: 35, unit: "г" },
      { name: "Куриное филе", amount: 115, unit: "г" },
      { name: "Морковь", amount: 60, unit: "г" },
      { name: "Сладкий перец", amount: 60, unit: "г" },
      { name: "Лук", amount: 35, unit: "г" },
      { name: "Сельдерей", amount: 35, unit: "г" },
      { name: "Стручковая фасоль", amount: 60, unit: "г" },
      { name: "Чеснок", amount: 6, unit: "г" },
      { name: "Соевый соус", amount: 35, unit: "г" },
      { name: "Имбирь", amount: 6, unit: "г" },
      { name: "Масло виноградной косточки", amount: 8, unit: "г" },
      { name: "Кунжут", amount: 12, unit: "г" },
      { name: "Перец", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Поставить воду для лапши. Когда вода закипит, подсолить её, отварить удон до готовности по инструкции на упаковке и слить воду.",
      "Пока варится лапша, подготовить остальные ингредиенты: лук мелко нарезать, овощи нарезать палочками, чеснок и имбирь натереть на мелкой тёрке.",
      "Разогреть сковороду, смазать маслом, быстро обжарить лук с морковью, затем добавить остальные овощи.",
      "Влить соевый соус и быстро обжарить на сильном огне почти до полной готовности. Выложить овощи в миску.",
      "Куриное филе нарезать, слегка посолить и быстро обжарить на той же сковороде до золотистости.",
      "Добавить в сковороду готовые овощи и отваренную лапшу. Обжарить всё вместе ещё 3–5 минут.",
      "Готовое блюдо посыпать кунжутом."
    ],
    notes: []
  },
  {
    id: "oat-pancake-tuna-cream-cheese",
    title: "Овсяноблин с тунцом и творожным сыром",
    category: "breakfast",
    image: "",
    heroImage: "",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "15–20 мин",
    nutrition: { kcal: 410, protein: 33, fat: 16, carbs: 31 },
    ingredients: [
      { name: "Овсяные хлопья", amount: 40, unit: "г" },
      { name: "Яйца", amount: 1, unit: "шт" },
      { name: "Тунец", amount: 90, unit: "г" },
      { name: "Творожный сыр", amount: 35, unit: "г" },
      { name: "Огурцы", amount: 80, unit: "г" },
      { name: "Зелень", amount: 5, unit: "г" },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Овсяные хлопья измельчить в муку или оставить мелкими, смешать с яйцом, солью и перцем.",
      "Вылить массу на антипригарную сковороду и приготовить блин с двух сторон.",
      "Смазать овсяноблин творожным сыром.",
      "Выложить тунец и нарезанный огурец, добавить зелень и свернуть пополам."
    ],
    notes: []
  },
  {
    id: "baked-syrniki-no-sugar",
    title: "Запечённые сырники без сахара",
    category: "breakfast",
    image: "",
    heroImage: "",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "30–35 мин",
    nutrition: { kcal: 360, protein: 29, fat: 12, carbs: 28 },
    ingredients: [
      { name: "Творог 5%", amount: 200, unit: "г" },
      { name: "Рисовая мука", amount: 35, unit: "г" },
      { name: "Яйца", amount: 1, unit: "шт" },
      { name: "Подсластитель", amount: null, unit: "по вкусу" },
      { name: "Йогурт натуральный", amount: 50, unit: "г" },
      { name: "Ванилин", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Смешать творог, яйцо, рисовую муку и подсластитель до плотной массы.",
      "Сформировать сырники влажными руками и выложить на пергамент.",
      "Запекать при 180°C около 20–25 минут до лёгкой румяности.",
      "Подать с натуральным йогуртом."
    ],
    notes: []
  },
  {
    id: "yogurt-bowl-banana-peanut-butter",
    title: "Йогуртовый боул с бананом и арахисовой пастой",
    category: "breakfast",
    image: "assets/yogurt-bowl-banana-peanut-butter.jpg",
    heroImage: "assets/yogurt-bowl-banana-peanut-butter.jpg",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "5–7 мин",
    nutrition: { kcal: 390, protein: 27, fat: 13, carbs: 38 },
    ingredients: [
      { name: "Йогурт натуральный", amount: 220, unit: "г" },
      { name: "Бананы", amount: 100, unit: "г" },
      { name: "Гранола", amount: 30, unit: "г" },
      { name: "Арахисовая паста", amount: 15, unit: "г" },
      { name: "Ягоды", amount: 80, unit: "г" }
    ],
    steps: [
      "Выложить натуральный йогурт в миску.",
      "Банан нарезать кружочками, ягоды промыть и обсушить.",
      "Добавить банан, ягоды и гранолу.",
      "Сверху распределить арахисовую пасту."
    ],
    notes: []
  },
  {
    id: "avocado-turkey-egg-toast",
    title: "Тост с авокадо, индейкой и яйцом",
    category: "breakfast",
    image: "",
    heroImage: "",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "15–20 мин",
    nutrition: { kcal: 450, protein: 32, fat: 19, carbs: 35 },
    ingredients: [
      { name: "Цельнозерновой хлеб", amount: 70, unit: "г" },
      { name: "Авокадо", amount: 70, unit: "г" },
      { name: "Филе индейки", amount: 100, unit: "г" },
      { name: "Яйца", amount: 1, unit: "шт" },
      { name: "Помидоры", amount: 80, unit: "г" },
      { name: "Лимонный сок", amount: 5, unit: "г" },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Филе индейки посолить, поперчить и обжарить или запечь до готовности.",
      "Яйцо отварить, приготовить пашот или пожарить на антипригарной сковороде.",
      "Авокадо размять с лимонным соком, солью и перцем.",
      "Хлеб подсушить, смазать авокадо, сверху выложить индейку, яйцо и помидоры."
    ],
    notes: []
  },
  {
    id: "light-chicken-teriyaki-rice",
    title: "Рис с курицей терияки лайт",
    category: "main",
    image: "",
    heroImage: "",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "30–35 мин",
    nutrition: { kcal: 520, protein: 42, fat: 11, carbs: 60 },
    ingredients: [
      { name: "Куриное филе", amount: 160, unit: "г" },
      { name: "Бурый рис", amount: 70, unit: "г" },
      { name: "Соевый соус", amount: 25, unit: "г" },
      { name: "Мёд", amount: 8, unit: "г" },
      { name: "Сладкий перец", amount: 80, unit: "г" },
      { name: "Брокколи", amount: 100, unit: "г" },
      { name: "Чеснок", amount: 4, unit: "г" },
      { name: "Кунжут", amount: 5, unit: "г" }
    ],
    steps: [
      "Рис отварить до готовности.",
      "Куриное филе нарезать кусочками и быстро обжарить на антипригарной сковороде.",
      "Добавить сладкий перец, брокколи и чеснок, готовить ещё 5–7 минут.",
      "Смешать соевый соус с мёдом, влить к курице и прогреть до лёгкого загустения.",
      "Подать курицу с рисом и посыпать кунжутом."
    ],
    notes: []
  },
  {
    id: "lazy-burrito-bowl",
    title: "Ленивый буррито-боул",
    category: "main",
    image: "",
    heroImage: "",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "30–35 мин",
    nutrition: { kcal: 560, protein: 41, fat: 17, carbs: 58 },
    ingredients: [
      { name: "Фарш индейки", amount: 150, unit: "г" },
      { name: "Бурый рис", amount: 70, unit: "г" },
      { name: "Фасоль", amount: 80, unit: "г" },
      { name: "Кукуруза", amount: 60, unit: "г" },
      { name: "Помидоры", amount: 120, unit: "г" },
      { name: "Йогурт натуральный", amount: 60, unit: "г" },
      { name: "Паприка", amount: null, unit: "по вкусу" },
      { name: "Чеснок", amount: 4, unit: "г" },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Рис отварить до готовности.",
      "Фарш индейки обжарить с чесноком, паприкой, солью и перцем до готовности.",
      "Помидоры нарезать, фасоль и кукурузу промыть при необходимости.",
      "В миску выложить рис, фарш, фасоль, кукурузу и томаты.",
      "Добавить натуральный йогурт как лёгкий соус."
    ],
    notes: []
  },
  {
    id: "chicken-cutlets-idaho-potatoes",
    title: "Куриные котлеты + картофель айдахо в духовке",
    category: "main",
    image: "",
    heroImage: "",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "45–50 мин",
    nutrition: { kcal: 530, protein: 40, fat: 14, carbs: 55 },
    ingredients: [
      { name: "Куриный фарш", amount: 170, unit: "г" },
      { name: "Картофель", amount: 250, unit: "г" },
      { name: "Яйца", amount: 1, unit: "шт" },
      { name: "Паприка", amount: null, unit: "по вкусу" },
      { name: "Чеснок", amount: 5, unit: "г" },
      { name: "Йогурт натуральный", amount: 60, unit: "г" },
      { name: "Оливковое масло", amount: 7, unit: "г" },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Картофель нарезать дольками, смешать с маслом, паприкой, солью и чесноком.",
      "Выложить картофель на противень и отправить в духовку при 200°C.",
      "Куриный фарш смешать с яйцом, солью и перцем, сформировать котлеты.",
      "Через 15 минут добавить котлеты на противень и запекать всё вместе до готовности.",
      "Подать с натуральным йогуртом как соусом."
    ],
    notes: []
  },
  {
    id: "buckwheat-beef-mushrooms",
    title: "Гречка с говядиной и грибами",
    category: "main",
    image: "",
    heroImage: "",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "70–80 мин",
    nutrition: { kcal: 540, protein: 39, fat: 16, carbs: 48 },
    ingredients: [
      { name: "Гречка", amount: 70, unit: "г" },
      { name: "Говядина", amount: 160, unit: "г" },
      { name: "Шампиньоны", amount: 120, unit: "г" },
      { name: "Лук", amount: 60, unit: "г" },
      { name: "Сметана 10%", amount: 40, unit: "г" },
      { name: "Чеснок", amount: 4, unit: "г" },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Говядину нарезать небольшими кусочками и обжарить до лёгкой корочки.",
      "Добавить лук, чеснок и шампиньоны, готовить 5–7 минут.",
      "Всыпать промытую гречку, добавить воду, соль и перец.",
      "Тушить под крышкой до мягкости говядины и готовности гречки.",
      "В конце добавить сметану и прогреть ещё 2–3 минуты."
    ],
    notes: []
  },
  {
    id: "salmon-vegetables-yogurt-sauce",
    title: "Лосось + овощи + йогуртовый соус",
    category: "dinner",
    image: "",
    heroImage: "",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "25–30 мин",
    nutrition: { kcal: 470, protein: 36, fat: 22, carbs: 28 },
    ingredients: [
      { name: "Лосось", amount: 160, unit: "г" },
      { name: "Брокколи", amount: 150, unit: "г" },
      { name: "Морковь", amount: 100, unit: "г" },
      { name: "Йогурт натуральный", amount: 60, unit: "г" },
      { name: "Лимонный сок", amount: 10, unit: "г" },
      { name: "Чеснок", amount: 3, unit: "г" },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Лосось посолить, поперчить и сбрызнуть лимонным соком.",
      "Брокколи и морковь нарезать, выложить рядом с рыбой.",
      "Запекать при 190–200°C около 15–20 минут до готовности рыбы.",
      "Для соуса смешать натуральный йогурт, лимонный сок и чеснок.",
      "Подать лосось с овощами и йогуртовым соусом."
    ],
    notes: []
  },
  {
    id: "warm-chicken-quinoa-salad",
    title: "Тёплый салат с курицей и киноа",
    category: "dinner",
    image: "",
    heroImage: "",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "35–40 мин",
    nutrition: { kcal: 440, protein: 37, fat: 14, carbs: 36 },
    ingredients: [
      { name: "Киноа", amount: 60, unit: "г" },
      { name: "Куриное филе", amount: 140, unit: "г" },
      { name: "Помидоры", amount: 120, unit: "г" },
      { name: "Шпинат", amount: 50, unit: "г" },
      { name: "Фета light", amount: 35, unit: "г" },
      { name: "Оливковое масло", amount: 5, unit: "г" },
      { name: "Лимонный сок", amount: 8, unit: "г" },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Киноа промыть и отварить до готовности.",
      "Куриное филе посолить, поперчить и обжарить или запечь до готовности.",
      "Помидоры нарезать, шпинат слегка прогреть на сковороде.",
      "Смешать тёплую киноа, курицу, томаты и шпинат.",
      "Добавить фету, лимонный сок и немного оливкового масла."
    ],
    notes: []
  },
  {
    id: "zucchini-boats-turkey-mince",
    title: "Кабачковые лодочки с фаршем",
    category: "dinner",
    image: "",
    heroImage: "",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "40–45 мин",
    nutrition: { kcal: 390, protein: 35, fat: 15, carbs: 22 },
    ingredients: [
      { name: "Кабачки", amount: 250, unit: "г" },
      { name: "Фарш индейки", amount: 150, unit: "г" },
      { name: "Сыр лёгкий 15%", amount: 35, unit: "г" },
      { name: "Томатный соус", amount: 70, unit: "г" },
      { name: "Лук", amount: 40, unit: "г" },
      { name: "Чеснок", amount: 4, unit: "г" },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Кабачки разрезать вдоль и убрать часть мякоти.",
      "Фарш индейки обжарить с луком, чесноком, солью и перцем.",
      "Добавить томатный соус и немного мякоти кабачка, прогреть начинку.",
      "Наполнить кабачковые лодочки фаршем, посыпать лёгким сыром.",
      "Запекать при 180°C до мягкости кабачков и готовности начинки."
    ],
    notes: []
  },
  {
    id: "pp-shawarma-lavash",
    title: "Шаурма ПП в лаваше",
    category: "dinner",
    image: "",
    heroImage: "",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "25–30 мин",
    nutrition: { kcal: 480, protein: 40, fat: 14, carbs: 42 },
    ingredients: [
      { name: "Лаваш", amount: 70, unit: "г" },
      { name: "Куриное филе", amount: 150, unit: "г" },
      { name: "Капуста пекинская", amount: 90, unit: "г" },
      { name: "Огурцы", amount: 80, unit: "г" },
      { name: "Йогурт натуральный", amount: 60, unit: "г" },
      { name: "Чеснок", amount: 3, unit: "г" },
      { name: "Лимонный сок", amount: 8, unit: "г" },
      { name: "Паприка", amount: null, unit: "по вкусу" },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Куриное филе нарезать, приправить паприкой, солью и перцем, затем обжарить до готовности.",
      "Капусту и огурцы нарезать тонкой соломкой.",
      "Смешать натуральный йогурт, чеснок и лимонный сок.",
      "Лаваш смазать соусом, выложить курицу и овощи.",
      "Свернуть шаурму и прогреть на сухой сковороде с двух сторон."
    ],
    notes: []
  },
  {
    id: "omelet-roll-cream-cheese-vegetables",
    title: "Омлет-ролл с творожным сыром и овощами",
    category: "dinner",
    image: "",
    heroImage: "",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "15–20 мин",
    nutrition: { kcal: 350, protein: 31, fat: 18, carbs: 14 },
    ingredients: [
      { name: "Яйца", amount: 2, unit: "шт" },
      { name: "Творожный сыр", amount: 45, unit: "г" },
      { name: "Помидоры", amount: 80, unit: "г" },
      { name: "Шпинат", amount: 40, unit: "г" },
      { name: "Зелень", amount: 8, unit: "г" },
      { name: "Соль", amount: null, unit: "по вкусу" },
      { name: "Перец", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Яйца взбить с солью и перцем.",
      "Приготовить тонкий омлет на антипригарной сковороде.",
      "Смазать омлет творожным сыром.",
      "Добавить помидоры, шпинат и зелень.",
      "Свернуть роллом и нарезать на куски."
    ],
    notes: []
  },
  {
    id: "pp-chocolate-cheesecake",
    title: "Шоколадный чизкейк ПП",
    category: "dessert",
    image: "",
    heroImage: "",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "35–40 мин",
    nutrition: { kcal: 290, protein: 22, fat: 11, carbs: 24 },
    ingredients: [
      { name: "Творог", amount: 180, unit: "г" },
      { name: "Какао", amount: 12, unit: "г" },
      { name: "Яйца", amount: 1, unit: "шт" },
      { name: "Протеин", amount: 20, unit: "г" },
      { name: "Подсластитель", amount: null, unit: "по вкусу" },
      { name: "Йогурт натуральный", amount: 30, unit: "г" }
    ],
    steps: [
      "Творог, яйцо, какао, протеин и подсластитель пробить блендером до гладкой массы.",
      "При необходимости добавить немного натурального йогурта для более нежной текстуры.",
      "Выложить массу в небольшую форму.",
      "Запекать при 180°C около 25–30 минут.",
      "Дать чизкейку немного остыть перед подачей."
    ],
    notes: []
  },
  {
    id: "light-tiramisu-cup",
    title: "Тирамису в стакане лайт",
    category: "dessert",
    image: "",
    heroImage: "",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "15–20 мин",
    nutrition: { kcal: 260, protein: 18, fat: 8, carbs: 26 },
    ingredients: [
      { name: "Йогурт натуральный", amount: 120, unit: "г" },
      { name: "Творог", amount: 100, unit: "г" },
      { name: "Кофе", amount: 40, unit: "мл" },
      { name: "Печенье без сахара", amount: 30, unit: "г" },
      { name: "Какао", amount: 5, unit: "г" },
      { name: "Подсластитель", amount: null, unit: "по вкусу" }
    ],
    steps: [
      "Творог, натуральный йогурт и подсластитель смешать до кремовой текстуры.",
      "Печенье без сахара быстро пропитать крепким кофе.",
      "В стакан слоями выложить крем и печенье.",
      "Сверху посыпать какао.",
      "По возможности убрать в холодильник на 20–30 минут для более плотной текстуры."
    ],
    notes: []
  },
  {
    id: "berry-yogurt-mousse",
    title: "Ягодный мусс",
    category: "dessert",
    image: "",
    heroImage: "",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "20–25 мин",
    nutrition: { kcal: 210, protein: 17, fat: 5, carbs: 21 },
    ingredients: [
      { name: "Ягоды", amount: 180, unit: "г" },
      { name: "Йогурт натуральный", amount: 150, unit: "г" },
      { name: "Желатин", amount: 8, unit: "г" },
      { name: "Подсластитель", amount: null, unit: "по вкусу" },
      { name: "Вода", amount: 40, unit: "мл" }
    ],
    steps: [
      "Желатин залить водой и оставить набухать по инструкции.",
      "Ягоды пробить блендером с натуральным йогуртом и подсластителем.",
      "Желатин аккуратно прогреть до растворения, не доводя до кипения.",
      "Вмешать желатин в ягодную массу.",
      "Разлить по формам и убрать в холодильник до стабилизации."
    ],
    notes: []
  },
  {
    id: "pp-brownie",
    title: "ПП-брауни",
    category: "dessert",
    image: "",
    heroImage: "",
    portions: 1,
    meta: "на 1 порцию",
    cookTime: "35–40 мин",
    nutrition: { kcal: 300, protein: 19, fat: 12, carbs: 27 },
    ingredients: [
      { name: "Бананы", amount: 100, unit: "г" },
      { name: "Какао", amount: 15, unit: "г" },
      { name: "Яйца", amount: 1, unit: "шт" },
      { name: "Овсяная мука", amount: 45, unit: "г" },
      { name: "Тёмный шоколад", amount: 12, unit: "г" },
      { name: "Разрыхлитель", amount: 3, unit: "г" }
    ],
    steps: [
      "Банан размять или пробить блендером с яйцом.",
      "Добавить какао, овсяную муку и разрыхлитель, перемешать.",
      "Тёмный шоколад мелко нарубить и вмешать в тесто.",
      "Выложить массу в небольшую форму.",
      "Выпекать при 180°C около 25–30 минут."
    ],
    notes: []
  }

];
