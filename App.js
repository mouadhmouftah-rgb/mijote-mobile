import React, { useState, useEffect } from "react";
import {
  StatusBar,
  SafeAreaView,
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ============================================================================
//  API LAYER  ·  TheMealDB.com
// ============================================================================
const API = "https://www.themealdb.com/api/json/v1/1";

const api = {
  categories: () => fetch(`${API}/categories.php`).then((r) => r.json()),
  byCategory: (cat) =>
    fetch(`${API}/filter.php?c=${encodeURIComponent(cat)}`).then((r) => r.json()),
  search: (q) =>
    fetch(`${API}/search.php?s=${encodeURIComponent(q)}`).then((r) => r.json()),
  byId: (id) => fetch(`${API}/lookup.php?i=${id}`).then((r) => r.json()),
};

// ============================================================================
//  THEME
// ============================================================================
const T = {
  bg: "#fffaf3",
  bgSoft: "#fff5ec",
  bgChip: "#fff0e0",
  surface: "#ffffff",
  surfaceMuted: "#f0e6d6",
  border: "#e8dcc7",
  borderSoft: "#f0e6d6",
  primary: "#c84c2a",
  primarySoft: "rgba(200,76,42,0.10)",
  ink: "#2a1a0e",
  inkSoft: "#3d2a1a",
  muted: "#5a4530",
  hint: "#8a7560",
  placeholder: "#a89580",
};

// ============================================================================
//  HELPERS
// ============================================================================
function extractIngredients(meal) {
  const list = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (name && name.trim()) {
      list.push({ name: name.trim(), measure: (measure || "").trim() });
    }
  }
  return list;
}

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - 40 - 12) / 2; // 2 columns, 20px padding, 12px gap

// ============================================================================
//  MAIN APP
// ============================================================================
export default function App() {
  const [screen, setScreen] = useState("home");
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [meals, setMeals] = useState([]);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    api.categories().then((d) => {
      const cats = d.categories || [];
      setCategories(cats);
      if (cats.length > 0) setActiveCat(cats[0].strCategory);
    });
  }, []);

  useEffect(() => {
    if (!activeCat) return;
    setLoadingMeals(true);
    api
      .byCategory(activeCat)
      .then((d) => setMeals(d.meals || []))
      .catch(() => setMeals([]))
      .finally(() => setLoadingMeals(false));
  }, [activeCat]);

  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    setDetail(null);
    api
      .byId(selectedId)
      .then((d) => setDetail(d.meals?.[0] || null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  useEffect(() => {
    if (!showSearch) return;
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      api
        .search(q)
        .then((d) => setSearchResults(d.meals || []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [query, showSearch]);

  const openMeal = (id) => {
    setSelectedId(id);
    setScreen("detail");
  };

  const goBack = () => {
    setScreen("home");
    setSelectedId(null);
    setDetail(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
      {screen === "detail" ? (
        <DetailScreen loading={detailLoading} detail={detail} onBack={goBack} />
      ) : (
        <View style={{ flex: 1 }}>
          <Header
            showSearch={showSearch}
            query={query}
            setQuery={setQuery}
            onToggleSearch={() => {
              setShowSearch((s) => !s);
              setQuery("");
            }}
          />
          {showSearch ? (
            <SearchScreen
              query={query}
              results={searchResults}
              searching={searching}
              onOpen={openMeal}
            />
          ) : (
            <HomeScreen
              categories={categories}
              activeCat={activeCat}
              setActiveCat={setActiveCat}
              meals={meals}
              loading={loadingMeals}
              onOpen={openMeal}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================================================
//  HEADER
// ============================================================================
function Header({ showSearch, query, setQuery, onToggleSearch }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.headerBrand}>
          <View style={styles.logo}>
            <Ionicons name="restaurant" size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.brandName}>Mijoté</Text>
            <Text style={styles.brandTag}>RECETTES DU MONDE</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={onToggleSearch} activeOpacity={0.7}>
          <Ionicons
            name={showSearch ? "close" : "search"}
            size={18}
            color={T.primary}
          />
        </TouchableOpacity>
      </View>

      {showSearch && (
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={T.placeholder} style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cherchez un plat… (ex: arrabiata, tagine)"
            placeholderTextColor={T.placeholder}
            style={styles.searchInput}
            autoFocus
          />
        </View>
      )}
    </View>
  );
}

// ============================================================================
//  HOME SCREEN
// ============================================================================
function HomeScreen({ categories, activeCat, setActiveCat, meals, loading, onOpen }) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.sectionHead}>
        <Text style={styles.h2}>Catégories</Text>
        <Text style={styles.hint}>{categories.length} disponibles</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {categories.map((c) => {
          const active = c.strCategory === activeCat;
          return (
            <TouchableOpacity
              key={c.idCategory}
              onPress={() => setActiveCat(c.strCategory)}
              activeOpacity={0.7}
              style={styles.catBtn}
            >
              <View
                style={[
                  styles.catImgWrap,
                  active ? styles.catImgWrapActive : styles.catImgWrapIdle,
                ]}
              >
                <Image
                  source={{ uri: c.strCategoryThumb }}
                  style={styles.catImg}
                  resizeMode="contain"
                />
              </View>
              <Text
                style={[
                  styles.catLabel,
                  { color: active ? T.primary : T.muted },
                ]}
              >
                {c.strCategory}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.sectionHead, { marginTop: 24 }]}>
        <Text style={styles.h3}>
          Plats <Text style={{ color: T.primary }}>{activeCat}</Text>
        </Text>
        {!loading && <Text style={styles.hint}>{meals.length} plats</Text>}
      </View>

      <View style={styles.grid}>
        {loading ? (
          <ActivityIndicator size="large" color={T.primary} style={{ marginTop: 40 }} />
        ) : (
          meals.map((m) => (
            <MealCard key={m.idMeal} meal={m} onPress={() => onOpen(m.idMeal)} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ============================================================================
//  SEARCH SCREEN
// ============================================================================
function SearchScreen({ query, results, searching, onOpen }) {
  const hasQuery = query.trim().length > 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      {!hasQuery ? (
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <View style={styles.searchEmptyIcon}>
            <Ionicons name="search" size={24} color={T.primary} />
          </View>
          <Text style={styles.h3}>Que mijote-t-on aujourd'hui ?</Text>
          <Text style={[styles.hint, { textAlign: "center", marginTop: 6, maxWidth: 260 }]}>
            Tapez le nom d'un plat pour explorer la base TheMealDB.
          </Text>
          <View style={styles.suggestRow}>
            {["Arrabiata", "Tagine", "Sushi", "Curry"].map((s) => (
              <View key={s} style={styles.suggestPill}>
                <Text style={styles.suggestText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : searching ? (
        <ActivityIndicator size="large" color={T.primary} style={{ marginTop: 60 }} />
      ) : results.length === 0 ? (
        <Text style={[styles.hint, { textAlign: "center", marginTop: 40 }]}>
          Aucun résultat pour "{query}"
        </Text>
      ) : (
        <>
          <Text style={[styles.hint, { marginBottom: 12 }]}>
            {results.length} résultat{results.length > 1 ? "s" : ""} pour "{query}"
          </Text>
          <View style={[styles.grid, { paddingHorizontal: 0 }]}>
            {results.map((m) => (
              <MealCard key={m.idMeal} meal={m} onPress={() => onOpen(m.idMeal)} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ============================================================================
//  MEAL CARD
// ============================================================================
function MealCard({ meal, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, { width: CARD_W }]}
    >
      <Image
        source={{ uri: meal.strMealThumb }}
        style={[styles.cardImg, { width: CARD_W, height: CARD_W }]}
      />
      <Text style={styles.cardTitle} numberOfLines={2}>
        {meal.strMeal}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
//  DETAIL SCREEN
// ============================================================================
function DetailScreen({ loading, detail, onBack }) {
  if (loading || !detail) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        <View style={styles.detailHeader}>
          <BackButton onPress={onBack} />
        </View>
        <ActivityIndicator size="large" color={T.primary} style={{ marginTop: 80 }} />
      </View>
    );
  }

  const ingredients = extractIngredients(detail);
  const steps = (detail.strInstructions || "")
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const tags = (detail.strTags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.detailHeader}>
        <BackButton onPress={onBack} />
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <View style={styles.heroImageWrap}>
          <Image source={{ uri: detail.strMealThumb }} style={styles.heroImage} />
          {detail.strArea && (
            <View style={styles.areaBadge}>
              <Ionicons name="location" size={11} color={T.primary} />
              <Text style={styles.areaText}> {detail.strArea}</Text>
            </View>
          )}
        </View>

        <Text style={styles.h1}>{detail.strMeal}</Text>

        <View style={styles.tagRow}>
          {detail.strCategory && (
            <View style={styles.catBadge}>
              <Ionicons name="pricetag" size={11} color={T.primary} />
              <Text style={styles.catBadgeText}> {detail.strCategory}</Text>
            </View>
          )}
          {tags.slice(0, 3).map((t) => (
            <View key={t} style={styles.tagPill}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.h2}>Ingrédients</Text>
        <View style={styles.ingredientsCard}>
          {ingredients.map((ing, i) => (
            <View
              key={i}
              style={[
                styles.ingredientRow,
                i !== ingredients.length - 1 && styles.ingredientRowBorder,
              ]}
            >
              <View style={styles.ingredientLeft}>
                <View style={styles.dot} />
                <Text style={styles.ingredientName}>{ing.name}</Text>
              </View>
              <Text style={styles.ingredientMeasure}>{ing.measure}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.h2}>Préparation</Text>
        {steps.map((s, i) => (
          <View key={i} style={styles.stepCard}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{s}</Text>
          </View>
        ))}
      </View>

      {detail.strYoutube && (
        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => Linking.openURL(detail.strYoutube)}
            style={styles.ytButton}
            activeOpacity={0.85}
          >
            <Ionicons name="play-circle" size={22} color="#fff" />
            <Text style={styles.ytButtonText}>Voir la vidéo YouTube</Text>
          </TouchableOpacity>
        </View>
      )}

      {detail.strSource && (
        <TouchableOpacity
          onPress={() => Linking.openURL(detail.strSource)}
          style={{ alignItems: "center", marginTop: 20 }}
        >
          <Text style={styles.sourceLink}>Source de la recette</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function BackButton({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.backBtn} activeOpacity={0.7}>
      <Ionicons name="chevron-back" size={16} color={T.ink} />
      <Text style={styles.backText}>Retour</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
//  STYLES
// ============================================================================
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: T.bg,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  scroll: { flex: 1, backgroundColor: T.bg },

  // Header
  header: {
    backgroundColor: T.bg,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBrand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 20,
    fontWeight: "700",
    color: T.ink,
    letterSpacing: -0.3,
  },
  brandTag: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: T.hint,
    marginTop: 2,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.bgChip,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: T.ink,
  },

  // Sections
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  h1: {
    fontSize: 26,
    fontWeight: "700",
    color: T.ink,
    marginTop: 20,
    lineHeight: 32,
  },
  h2: { fontSize: 20, fontWeight: "700", color: T.ink },
  h3: { fontSize: 17, fontWeight: "700", color: T.ink },
  hint: { fontSize: 12, color: T.hint },

  // Categories
  catRow: { paddingHorizontal: 20, gap: 12 },
  catBtn: { alignItems: "center" },
  catImgWrap: {
    width: 88,
    height: 88,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  catImgWrapActive: {
    backgroundColor: T.primary,
    borderWidth: 2,
    borderColor: T.primary,
    transform: [{ scale: 1.02 }],
  },
  catImgWrapIdle: {
    borderWidth: 1,
    borderColor: T.border,
  },
  catImg: { width: "100%", height: "100%", padding: 4 },
  catLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 6,
  },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {},
  cardImg: {
    borderRadius: 16,
    backgroundColor: T.surfaceMuted,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: T.ink,
    marginTop: 8,
    lineHeight: 18,
  },

  // Search empty
  searchEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: T.bgChip,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  suggestRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  suggestPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 999,
  },
  suggestText: { fontSize: 12, color: T.muted },

  // Detail
  detailHeader: { padding: 20, paddingBottom: 12 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    gap: 4,
  },
  backText: { fontSize: 14, fontWeight: "500", color: T.ink },

  heroImageWrap: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: T.surfaceMuted,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    aspectRatio: 4 / 3,
  },
  areaBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 999,
  },
  areaText: { fontSize: 12, fontWeight: "500", color: T.ink },

  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: T.primarySoft,
    borderRadius: 999,
  },
  catBadgeText: { fontSize: 12, fontWeight: "500", color: T.primary },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: T.surfaceMuted,
    borderRadius: 999,
  },
  tagText: { fontSize: 12, color: T.muted },

  section: { paddingHorizontal: 20, marginTop: 28 },
  ingredientsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    marginTop: 12,
    overflow: "hidden",
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ingredientRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: T.borderSoft,
  },
  ingredientLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.primary,
    marginRight: 10,
  },
  ingredientName: { fontSize: 14, color: T.ink, flex: 1 },
  ingredientMeasure: { fontSize: 12, color: T.hint, fontWeight: "500" },

  stepCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    marginTop: 10,
    gap: 12,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  stepText: { flex: 1, fontSize: 14, color: T.inkSoft, lineHeight: 22 },

  ytButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.primary,
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  ytButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  sourceLink: {
    fontSize: 12,
    color: T.hint,
    textDecorationLine: "underline",
  },
});
