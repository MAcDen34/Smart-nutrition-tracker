// js/meals.js — Nutrition API + meal CRUD

let analyzedMeal = null;

// ── Fetch nutrition from Edamam ──
async function analyzeFood() {
  const input = document.getElementById("foodInput");
  const food  = input?.value.trim();
  if (!food) return showToast("Enter a food or meal to analyze", "error");

  const btn = document.getElementById("analyzeBtn");
  const resultBox = document.getElementById("nutritionResult");

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Analyzing...';
  if (resultBox) resultBox.innerHTML = "";

  try {
    const url = `https://api.edamam.com/api/nutrition-data?app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}&nutrition-type=cooking&ingr=${encodeURIComponent(food)}`;
    const res  = await fetch(url);
    const data = await res.json();

    if (!data.calories && data.calories !== 0) {
      showToast("Could not analyze that food. Try being more specific.", "error");
      btn.disabled = false;
      btn.innerHTML = "Analyze";
      return;
    }

    const nutrients = data.totalNutrients;

    analyzedMeal = {
      food_name: food,
      calories:  Math.round(data.calories || 0),
      protein:   Math.round(nutrients?.PROCNT?.quantity || 0),
      carbs:     Math.round(nutrients?.CHOCDF?.quantity || 0),
      fats:      Math.round(nutrients?.FAT?.quantity    || 0),
      fiber:     Math.round(nutrients?.FIBTG?.quantity  || 0),
      sugar:     Math.round(nutrients?.SUGAR?.quantity  || 0),
    };

    renderNutritionResult(analyzedMeal);
    document.getElementById("saveBtn").disabled = false;

  } catch (err) {
    showToast("Network error. Check your connection.", "error");
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Analyze";
  }
}

function renderNutritionResult(meal) {
  const box = document.getElementById("nutritionResult");
  if (!box) return;

  box.innerHTML = `
    <div class="card fade-up" style="margin-top:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
        <h3 style="font-family:'Syne',sans-serif; font-size:1.05rem;">${escHtml(meal.food_name)}</h3>
        <span class="badge badge-accent">${meal.calories} kcal</span>
      </div>
      <div class="nutrient-pills">
        <div class="nutrient-pill"><span class="n-val" style="color:#7c6cfc">${meal.protein}g</span><span class="n-label">Protein</span></div>
        <div class="nutrient-pill"><span class="n-val" style="color:#fcb86c">${meal.carbs}g</span><span class="n-label">Carbs</span></div>
        <div class="nutrient-pill"><span class="n-val" style="color:#fc6c8f">${meal.fats}g</span><span class="n-label">Fat</span></div>
        <div class="nutrient-pill"><span class="n-val" style="color:#6cfcb8">${meal.fiber}g</span><span class="n-label">Fiber</span></div>
        <div class="nutrient-pill"><span class="n-val" style="color:#fc6c6c">${meal.sugar}g</span><span class="n-label">Sugar</span></div>
      </div>
    </div>`;
}

// ── Save meal to Supabase ──
async function saveMeal() {
  if (!analyzedMeal) return showToast("Analyze a food first", "error");

  const user = await getCurrentUser();
  if (!user) return (window.location.href = "index.html");

  const btn = document.getElementById("saveBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  const today = new Date().toISOString().split("T")[0];

  const { error } = await _supabase.from("meals").insert([{
    user_id:   user.id,
    food_name: analyzedMeal.food_name,
    calories:  analyzedMeal.calories,
    protein:   analyzedMeal.protein,
    carbs:     analyzedMeal.carbs,
    fats:      analyzedMeal.fats,
    fiber:     analyzedMeal.fiber,
    sugar:     analyzedMeal.sugar,
    date:      today
  }]);

  btn.disabled = false;
  btn.innerHTML = "Save Meal";

  if (error) return showToast(error.message, "error");

  showToast("Meal saved successfully!", "success");
  analyzedMeal = null;
  document.getElementById("foodInput").value = "";
  document.getElementById("nutritionResult").innerHTML = "";
  btn.disabled = true;
}

// ── Load meals from Supabase ──
async function loadMeals(filterDate = null, searchQuery = null) {
  const user = await requireAuth();
  if (!user) return;

  let query = _supabase
    .from("meals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (filterDate) query = query.eq("date", filterDate);
  if (searchQuery) query = query.ilike("food_name", `%${searchQuery}%`);

  const { data, error } = await query;

  if (error) { showToast("Failed to load meals", "error"); return []; }

  return data || [];
}

// ── Load today's summary for dashboard ──
async function loadTodaySummary() {
  const user = await getCurrentUser();
  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];

  const { data } = await _supabase
    .from("meals")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today);

  if (!data || data.length === 0) return { calories: 0, protein: 0, carbs: 0, fats: 0, count: 0 };

  return data.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0),
    protein:  acc.protein  + (m.protein  || 0),
    carbs:    acc.carbs    + (m.carbs    || 0),
    fats:     acc.fats     + (m.fats     || 0),
    count:    acc.count    + 1,
  }), { calories: 0, protein: 0, carbs: 0, fats: 0, count: 0 });
}

// ── Delete a meal ──
async function deleteMeal(id) {
  const { error } = await _supabase.from("meals").delete().eq("id", id);
  if (error) { showToast("Could not delete meal", "error"); return false; }
  showToast("Meal deleted", "success");
  return true;
}

// ── Render history table ──
function renderMealTable(meals, containerId = "mealsBody") {
  const tbody = document.getElementById(containerId);
  if (!tbody) return;

  if (meals.length === 0) {
    tbody.closest("table")?.parentElement.classList.add("hidden");
    document.getElementById("emptyMeals")?.classList.remove("hidden");
    return;
  }

  tbody.closest("table")?.parentElement.classList.remove("hidden");
  document.getElementById("emptyMeals")?.classList.add("hidden");

  tbody.innerHTML = meals.map(m => `
    <tr>
      <td style="font-weight:500">${escHtml(m.food_name)}</td>
      <td><span class="badge badge-accent">${m.calories}</span></td>
      <td>${m.protein}g</td>
      <td>${m.carbs}g</td>
      <td>${m.fats}g</td>
      <td style="color:var(--text-muted)">${formatDate(m.date)}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="confirmDelete('${m.id}')" title="Delete">✕</button>
      </td>
    </tr>`).join("");
}

async function confirmDelete(id) {
  if (!confirm("Delete this meal?")) return;
  const ok = await deleteMeal(id);
  if (ok) initHistory();
}

// ── Utilities ──
function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
