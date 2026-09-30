/* =========================================================
   GRAND X — OMBOR
   Полный JS
   Supabase + категории + товары + множественный выбор
   ========================================================= */

const SUPABASE_URL = "https://szgtlkykyfacjliisigf.supabase.co";
const SUPABASE_KEY = "sb_publishable_yFGFSQb4K_gR-3KTqckJlQ_rF__5tfI";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);


/* =========================================================
   STATE
   ========================================================= */

let products = [];
let categories = [];

let selectedCategory = "all";
let searchText = "";

let selectedProductIds = new Set();
let multiSelectMode = false;

let longPressTimer = null;
let longPressProductId = null;
let pointerStartX = 0;
let pointerStartY = 0;
let longPressTriggered = false;


/* =========================================================
   HELPERS
   ========================================================= */

function normalizeCategory(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .trim()
        .toLowerCase();
}


function getCategoryLabel(value) {
    const category = normalizeCategory(value);

    const labels = {
        rezinka: "REZINKALAR",
        rezinkalar: "REZINKALAR",

        mexanizm: "MEXANIZM",
        mexanizmlar: "MEXANIZM",

        profil: "PROFIL",
        profillar: "PROFIL",

        rels: "RELS",
        relslar: "RELS",

        petla: "PETLA",
        petlalar: "PETLA"
    };

    return labels[category] || (
        category
            ? String(value).trim().toUpperCase()
            : "KATEGORIYASIZ"
    );
}


function normalizeProduct(product) {
    return {
        ...product,

        quantity: Number(product.quantity) || 0,

        low_limit:
            product.low_limit === null ||
            product.low_limit === undefined
                ? 5
                : Number(product.low_limit) || 0,

        category:
            product.category === null ||
            product.category === undefined ||
            product.category === ""
                ? null
                : String(product.category).trim()
    };
}


function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function showMessage(message, type = "info") {
    console.log(`[${type}]`, message);

    /*
      Если у тебя уже есть система уведомлений,
      пытаемся использовать её.
    */

    if (typeof showNotification === "function") {
        try {
            showNotification(message, type);
            return;
        } catch (e) {}
    }

    if (typeof notify === "function") {
        try {
            notify(message, type);
            return;
        } catch (e) {}
    }

    /*
      Простой fallback
    */

    const old = document.querySelector(".js-temp-notification");

    if (old) old.remove();

    const box = document.createElement("div");

    box.className = "js-temp-notification";

    box.textContent = message;

    box.style.cssText = `
        position:fixed;
        right:20px;
        bottom:20px;
        z-index:99999;
        background:#111;
        color:#fff;
        border:2px solid #e00000;
        padding:14px 18px;
        border-radius:12px;
        font-size:14px;
        font-weight:700;
        box-shadow:0 10px 30px rgba(0,0,0,.35);
        max-width:360px;
    `;

    document.body.appendChild(box);

    setTimeout(() => {
        box.remove();
    }, 3500);
}


/* =========================================================
   CATEGORY LOADING
   ========================================================= */

async function loadCategories() {

    const { data, error } = await db
        .from("categories")
        .select("id, name, created_at")
        .order("created_at", {
            ascending: true
        });

    if (error) {
        console.error("CATEGORY LOAD ERROR:", error);

        showMessage(
            "Kategoriyalarni yuklashda xatolik: " + error.message,
            "error"
        );

        categories = [];

        renderCategoryButtons();
        renderCategorySelects();

        return false;
    }

    categories = (data || []).filter(category =>
        category &&
        category.id !== undefined &&
        category.name
    );

    /*
      Agar tanlangan kategoriya o'chirilgan bo'lsa
    */

    if (
        selectedCategory !== "all" &&
        !categories.some(
            c =>
                normalizeCategory(c.name) ===
                normalizeCategory(selectedCategory)
        )
    ) {
        selectedCategory = "all";
    }

    renderCategoryButtons();
    renderCategorySelects();

    return true;
}


/* =========================================================
   CATEGORY BUTTONS
   ========================================================= */

function renderCategoryButtons() {

    const container = document.getElementById("categoryButtons");

    if (!container) {
        console.warn("#categoryButtons topilmadi");
        return;
    }

    container.innerHTML = "";

    /*
      BARCHASI
    */

    const allButton = document.createElement("button");

    allButton.type = "button";

    allButton.className =
        "category-button" +
        (
            selectedCategory === "all" && !multiSelectMode
                ? " active"
                : ""
        );

    allButton.textContent = "BARCHASI";

    allButton.onclick = () => {

        if (multiSelectMode) {

            showMessage(
                "Avval kategoriya tanlang yoki tanlashni bekor qiling.",
                "info"
            );

            return;
        }

        selectCategory("all");
    };

    container.appendChild(allButton);


    /*
      KATEGORIYALAR
    */

    categories.forEach(category => {

        const item = document.createElement("div");

        item.className = "category-item";

        item.dataset.category = category.name;


        const button = document.createElement("button");

        button.type = "button";

        button.className =
            "category-button" +
            (
                normalizeCategory(selectedCategory) ===
                normalizeCategory(category.name)
                    ? " active"
                    : ""
            );

        button.textContent =
            getCategoryLabel(category.name);


        button.onclick = async (event) => {

            event.stopPropagation();

            /*
              Agar multi-select rejimi yoqilgan bo'lsa,
              kategoriya tugmasi = barcha tanlangan
              mahsulotlarni shu kategoriyaga o'tkazish.
            */

            if (multiSelectMode) {

                await moveSelectedProductsToCategory(
                    category.name
                );

                return;
            }

            selectCategory(category.name);
        };


        /*
          DELETE
        */

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";

        deleteButton.className = "category-delete";

        deleteButton.textContent = "×";

        deleteButton.title = "Kategoriyani o'chirish";


        deleteButton.onclick = async (event) => {

            event.preventDefault();
            event.stopPropagation();

            await deleteCategory(
                category.id,
                category.name
            );
        };


        item.appendChild(button);
        item.appendChild(deleteButton);

        container.appendChild(item);
    });
}


/* =========================================================
   CATEGORY SELECTS
   ========================================================= */

function renderCategorySelects() {

    const selects = [
        document.getElementById("productCategory"),
        document.getElementById("editProductCategory")
    ];

    selects.forEach(select => {

        if (!select) return;

        const currentValue = select.value;

        select.innerHTML = "";

        const emptyOption = document.createElement("option");

        emptyOption.value = "";

        emptyOption.textContent = "Kategoriyasiz";

        select.appendChild(emptyOption);


        categories.forEach(category => {

            const option = document.createElement("option");

            option.value = category.name;

            option.textContent =
                getCategoryLabel(category.name);

            select.appendChild(option);
        });


        if (
            [...select.options].some(
                option => option.value === currentValue
            )
        ) {
            select.value = currentValue;
        }
    });
}


/* =========================================================
   ADD CATEGORY
   ========================================================= */

async function addCategory() {

    const input = document.getElementById("newCategory");

    if (!input) {
        showMessage("newCategory topilmadi.", "error");
        return;
    }

    const name = input.value.trim();

    if (!name) {

        showMessage(
            "Kategoriya nomini kiriting.",
            "error"
        );

        input.focus();

        return;
    }


    const exists = categories.some(
        category =>
            normalizeCategory(category.name) ===
            normalizeCategory(name)
    );

    if (exists) {

        showMessage(
            "Bu kategoriya allaqachon mavjud.",
            "error"
        );

        return;
    }


    const { data, error } = await db
        .from("categories")
        .insert({
            name: name
        })
        .select("id, name, created_at")
        .single();


    if (error) {

        console.error("ADD CATEGORY ERROR:", error);

        showMessage(
            "Kategoriya qo'shilmadi: " + error.message,
            "error"
        );

        return;
    }


    if (data) {
        categories.push(data);
    }

    input.value = "";

    renderCategoryButtons();
    renderCategorySelects();

    showMessage(
        "Kategoriya qo'shildi.",
        "success"
    );
}


/* =========================================================
   DELETE CATEGORY
   ========================================================= */

async function deleteCategory(id, categoryName) {

    const label = getCategoryLabel(categoryName);

    const confirmed = confirm(
        `"${label}" kategoriyasini o'chirishni xohlaysizmi?\n\n` +
        `Bu kategoriyadagi mahsulotlar "Kategoriyasiz" bo'ladi.`
    );

    if (!confirmed) return;


    /*
      Avval shu kategoriyadagi mahsulotlarni topamiz.
      Bu exact string muammosini ham hal qiladi.
    */

    const matchingProducts = products.filter(product =>
        normalizeCategory(product.category) ===
        normalizeCategory(categoryName)
    );


    /*
      Mahsulotlarni kategoriyasiz qilish
    */

    if (matchingProducts.length > 0) {

        const ids = matchingProducts.map(
            product => product.id
        );


        const { error: productError } = await db
            .from("products")
            .update({
                category: null
            })
            .in("id", ids);


        if (productError) {

            console.error(
                "DELETE CATEGORY / PRODUCTS ERROR:",
                productError
            );

            showMessage(
                "Mahsulotlar kategoriyasini tozalab bo'lmadi: " +
                productError.message,
                "error"
            );

            return;
        }


        /*
          Local state
        */

        products = products.map(product => {

            if (ids.includes(product.id)) {

                return {
                    ...product,
                    category: null
                };
            }

            return product;
        });


        /*
          Tanlanganlar ichidan ham olib tashlaymiz
        */

        ids.forEach(id => {
            selectedProductIds.delete(id);
        });
    }


    /*
      Kategoriyani o'chirish
    */

    const { error } = await db
        .from("categories")
        .delete()
        .eq("id", id);


    if (error) {

        console.error("DELETE CATEGORY ERROR:", error);

        showMessage(
            "Kategoriyani o'chirib bo'lmadi: " +
            error.message,
            "error"
        );

        /*
          Ma'lumot qayta yuklansin
        */

        await loadCategories();
        await loadProducts();

        return;
    }


    /*
      Local categories
    */

    categories = categories.filter(
        category => Number(category.id) !== Number(id)
    );


    if (
        normalizeCategory(selectedCategory) ===
        normalizeCategory(categoryName)
    ) {
        selectedCategory = "all";
    }


    renderCategoryButtons();
    renderCategorySelects();
    renderProducts();

    showMessage(
        `"${label}" kategoriyasi o'chirildi.`,
        "success"
    );
}


/* =========================================================
   SELECT CATEGORY / FILTER
   ========================================================= */

function selectCategory(category) {

    if (multiSelectMode) return;

    selectedCategory = category || "all";

    renderCategoryButtons();
    renderProducts();
}


/* =========================================================
   LOAD PRODUCTS
   ========================================================= */

async function loadProducts() {

    const { data, error } = await db
        .from("products")
        .select(
            "id, created_at, name, quantity, low_limit, image, category"
        )
        .order("id", {
            ascending: true
        });


    if (error) {

        console.error("PRODUCT LOAD ERROR:", error);

        showMessage(
            "Mahsulotlarni yuklashda xatolik: " +
            error.message,
            "error"
        );

        return false;
    }


    products = (data || []).map(normalizeProduct);


    /*
      O'chirilgan mahsulotlarni selection'dan olib tashlash
    */

    const existingIds = new Set(
        products.map(product => product.id)
    );

    selectedProductIds.forEach(id => {

        if (!existingIds.has(id)) {
            selectedProductIds.delete(id);
        }
    });


    updateStats();
    renderProducts();

    return true;
}


/* =========================================================
   RENDER PRODUCTS
   ========================================================= */

function renderProducts() {

    const table = document.getElementById("productsTable");

    if (!table) {
        console.warn("#productsTable topilmadi");
        return;
    }


    let filtered = [...products];


    /*
      CATEGORY FILTER
    */

    if (selectedCategory !== "all") {

        filtered = filtered.filter(product =>

            normalizeCategory(product.category) ===
            normalizeCategory(selectedCategory)

        );
    }


    /*
      SEARCH
    */

    if (searchText) {

        const search = searchText.toLowerCase();

        filtered = filtered.filter(product => {

            const name =
                String(product.name || "").toLowerCase();

            const category =
                String(product.category || "").toLowerCase();

            return (
                name.includes(search) ||
                category.includes(search)
            );
        });
    }


    table.innerHTML = "";


    if (filtered.length === 0) {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td colspan="6"
                style="
                    text-align:center;
                    padding:35px;
                    opacity:.65;
                ">
                Mahsulot topilmadi
            </td>
        `;

        table.appendChild(row);

        updateBulkUI();

        return;
    }


    filtered.forEach(product => {

        const row = document.createElement("tr");

        row.className = "product-row";

        row.dataset.id = product.id;


        if (selectedProductIds.has(product.id)) {
            row.classList.add("selected");
        }


        const quantity = Number(product.quantity) || 0;

        const lowLimit =
            Number(product.low_limit) || 0;


        let statusText = "YETARLI";
        let statusClass = "status-ok";


        if (quantity <= 0) {

            statusText = "TUGAGAN";
            statusClass = "status-empty";

        } else if (quantity <= lowLimit) {

            statusText = "KAM QOLDI";
            statusClass = "status-low";
        }


        const categoryText =
            product.category
                ? getCategoryLabel(product.category)
                : "KATEGORIYASIZ";


        const imageHTML = product.image
            ? `
                <img
                    src="${escapeHTML(product.image)}"
                    alt=""
                    style="
                        width:46px;
                        height:46px;
                        object-fit:cover;
                        border-radius:10px;
                        margin-right:10px;
                        vertical-align:middle;
                    "
                >
            `
            : "";


        row.innerHTML = `

            <td>

                <div
                    style="
                        display:flex;
                        align-items:center;
                        gap:4px;
                    "
                >

                    ${
                        selectedProductIds.has(product.id)
                            ? `
                                <span
                                    style="
                                        color:#e00000;
                                        font-weight:900;
                                        font-size:20px;
                                        min-width:22px;
                                    "
                                >
                                    ✓
                                </span>
                            `
                            : `
                                <span
                                    style="
                                        width:22px;
                                        display:inline-block;
                                    "
                                ></span>
                            `
                    }

                    ${imageHTML}

                    <strong>
                        ${escapeHTML(product.name)}
                    </strong>

                </div>

            </td>


            <td>

                <span class="category-badge">
                    ${escapeHTML(categoryText)}
                </span>

            </td>


            <td>

                <div
                    style="
                        display:flex;
                        align-items:center;
                        gap:6px;
                    "
                >

                    <button
                        type="button"
                        class="quantity-minus"
                        onclick="event.stopPropagation(); updateQuantity(${product.id}, -1)"
                    >
                        −
                    </button>

                    <input
                        type="number"
                        class="quantity-input"
                        value="${quantity}"
                        min="0"
                        onchange="setQuantity(${product.id}, this.value)"
                        onclick="event.stopPropagation()"
                    >

                    <button
                        type="button"
                        class="quantity-plus"
                        onclick="event.stopPropagation(); updateQuantity(${product.id}, 1)"
                    >
                        +
                    </button>

                </div>

            </td>


            <td>

                <input
                    type="number"
                    min="0"
                    value="${lowLimit}"
                    class="low-limit-input"
                    onchange="setLowLimit(${product.id}, this.value)"
                    onclick="event.stopPropagation()"
                >

            </td>


            <td>

                <span class="${statusClass}">
                    ${statusText}
                </span>

            </td>


            <td>

                <div
                    style="
                        display:flex;
                        gap:6px;
                    "
                >

                    <button
                        type="button"
                        onclick="event.stopPropagation(); openEdit(${product.id})"
                    >
                        Tahrirlash
                    </button>

                    <button
                        type="button"
                        onclick="event.stopPropagation(); deleteProduct(${product.id})"
                    >
                        O'chirish
                    </button>

                </div>

            </td>
        `;


        /*
          ROW POINTER EVENTS
        */

        attachProductRowEvents(row, product.id);


        table.appendChild(row);
    });


    updateBulkUI();
}


/* =========================================================
   PRODUCT ROW — 2 SECOND LONG PRESS
   ========================================================= */

function attachProductRowEvents(row, productId) {

    row.addEventListener(
        "pointerdown",
        event => {

            /*
              Tugma/input/select ustiga bosilsa
              selection boshlanmaydi.
            */

            if (
                event.target.closest("button") ||
                event.target.closest("input") ||
                event.target.closest("select") ||
                event.target.closest("textarea")
            ) {
                return;
            }


            pointerStartX = event.clientX;
            pointerStartY = event.clientY;

            longPressProductId = productId;

            longPressTriggered = false;


            clearTimeout(longPressTimer);


            /*
              MULTI SELECT MODE allaqachon yoqilgan bo'lsa,
              oddiy bosish = select/unselect.
            */

            if (multiSelectMode) {

                longPressTimer = setTimeout(() => {

                    longPressTriggered = true;

                }, 400);

                return;
            }


            /*
              2 SEKUND
            */

            longPressTimer = setTimeout(() => {

                longPressTriggered = true;

                enterMultiSelect(productId);

            }, 2000);
        },
        {
            passive: true
        }
    );


    row.addEventListener(
        "pointermove",
        event => {

            if (!longPressProductId) return;


            const dx =
                Math.abs(event.clientX - pointerStartX);

            const dy =
                Math.abs(event.clientY - pointerStartY);


            /*
              Juda ko'p harakat qilsa long press bekor.
            */

            if (dx > 15 || dy > 15) {

                clearTimeout(longPressTimer);

                longPressTimer = null;

                longPressProductId = null;
            }
        },
        {
            passive: true
        }
    );


    row.addEventListener(
        "pointerup",
        event => {

            clearTimeout(longPressTimer);

            const id = longPressProductId;

            longPressTimer = null;

            longPressProductId = null;


            if (!id) return;


            /*
              Multi select mode
            */

            if (multiSelectMode) {

                if (!longPressTriggered) {

                    toggleProductSelection(id);

                }

                longPressTriggered = false;

                return;
            }
        }
    );


    row.addEventListener(
        "pointercancel",
        () => {

            clearTimeout(longPressTimer);

            longPressTimer = null;
            longPressProductId = null;
            longPressTriggered = false;
        }
    );
}


/* =========================================================
   MULTI SELECT
   ========================================================= */

function enterMultiSelect(productId) {

    multiSelectMode = true;

    selectedProductIds.clear();

    selectedProductIds.add(productId);

    renderCategoryButtons();
    renderProducts();
    updateBulkUI();

    showMessage(
        "Tanlash rejimi yoqildi. Boshqa mahsulotlarni bosing.",
        "info"
    );
}


function toggleProductSelection(productId) {

    if (selectedProductIds.has(productId)) {

        selectedProductIds.delete(productId);

    } else {

        selectedProductIds.add(productId);
    }


    if (selectedProductIds.size === 0) {

        exitMultiSelect();

        return;
    }


    renderProducts();
    updateBulkUI();
}


/* =========================================================
   EXIT MULTI SELECT
   ========================================================= */

function exitMultiSelect() {

    multiSelectMode = false;

    selectedProductIds.clear();

    renderCategoryButtons();
    renderProducts();
    updateBulkUI();
}


/* =========================================================
   SELECT ALL VISIBLE
   ========================================================= */

function selectAllVisibleProducts() {

    let visibleProducts = [...products];


    if (selectedCategory !== "all") {

        visibleProducts = visibleProducts.filter(product =>

            normalizeCategory(product.category) ===
            normalizeCategory(selectedCategory)

        );
    }


    if (searchText) {

        const search = searchText.toLowerCase();

        visibleProducts = visibleProducts.filter(product => {

            const name =
                String(product.name || "").toLowerCase();

            const category =
                String(product.category || "").toLowerCase();

            return (
                name.includes(search) ||
                category.includes(search)
            );
        });
    }


    visibleProducts.forEach(product => {

        selectedProductIds.add(product.id);

    });


    if (selectedProductIds.size > 0) {

        multiSelectMode = true;
    }


    renderProducts();
    updateBulkUI();
}


/* =========================================================
   BULK UI
   ========================================================= */

function updateBulkUI() {

    let box = document.getElementById("bulkActions");


    /*
      Agar HTML'da bulkActions yo'q bo'lsa,
      JS o'zi yaratadi.
    */

    if (!box) {

        const table = document.getElementById("productsTable");

        if (!table) return;


        box = document.createElement("div");

        box.id = "bulkActions";

        box.style.cssText = `
            margin:12px 0;
            padding:14px;
            border:2px solid #e00000;
            border-radius:14px;
            background:#111;
            color:#fff;
            display:none;
            align-items:center;
            gap:10px;
            flex-wrap:wrap;
            box-shadow:0 8px 25px rgba(0,0,0,.25);
        `;


        const parent =
            table.closest(".table-wrapper") ||
            table.parentElement;


        if (parent) {
            parent.insertBefore(box, table);
        }
    }


    if (
        !multiSelectMode ||
        selectedProductIds.size === 0
    ) {

        box.style.display = "none";

        box.innerHTML = "";

        return;
    }


    box.style.display = "flex";


    const count =
        selectedProductIds.size;


    const categoryOptions = categories
        .map(category => `
            <option value="${escapeHTML(category.name)}">
                ${escapeHTML(getCategoryLabel(category.name))}
            </option>
        `)
        .join("");


    box.innerHTML = `

        <strong style="font-size:15px;">
            ${count} ta tanlangan
        </strong>


        <button
            type="button"
            onclick="selectAllVisibleProducts()"
            style="
                padding:8px 12px;
                border-radius:8px;
                cursor:pointer;
            "
        >
            Barchasini tanlash
        </button>


        <select
            id="bulkCategorySelect"
            style="
                padding:8px 10px;
                border-radius:8px;
                min-width:170px;
            "
        >

            <option value="">
                Kategoriyani tanlang
            </option>

            ${categoryOptions}

        </select>


        <button
            type="button"
            onclick="applyBulkCategory()"
            style="
                padding:8px 14px;
                border-radius:8px;
                cursor:pointer;
                font-weight:800;
            "
        >
            KATEGORIYAGA O'TKAZISH
        </button>


        <button
            type="button"
            onclick="exitMultiSelect()"
            style="
                padding:8px 12px;
                border-radius:8px;
                cursor:pointer;
            "
        >
            BEKOR QILISH
        </button>
    `;
}


/* =========================================================
   BULK CATEGORY
   ========================================================= */

async function applyBulkCategory() {

    const select =
        document.getElementById("bulkCategorySelect");

    if (!select) return;


    const categoryName = select.value;


    if (!categoryName) {

        showMessage(
            "Kategoriyani tanlang.",
            "error"
        );

        return;
    }


    await moveSelectedProductsToCategory(
        categoryName
    );
}


/* =========================================================
   MOVE MANY PRODUCTS TO CATEGORY
   ========================================================= */

async function moveSelectedProductsToCategory(categoryName) {

    const ids = [...selectedProductIds];


    if (ids.length === 0) {

        showMessage(
            "Hech qanday mahsulot tanlanmagan.",
            "error"
        );

        return;
    }


    const label =
        getCategoryLabel(categoryName);


    const { error } = await db
        .from("products")
        .update({
            category: categoryName
        })
        .in("id", ids);


    if (error) {

        console.error(
            "MOVE PRODUCTS ERROR:",
            error
        );

        showMessage(
            "Mahsulotlarni kategoriyaga o'tkazib bo'lmadi: " +
            error.message,
            "error"
        );

        return;
    }


    /*
      Local state update
    */

    products = products.map(product => {

        if (ids.includes(product.id)) {

            return {
                ...product,
                category: categoryName
            };
        }

        return product;
    });


    selectedProductIds.clear();

    multiSelectMode = false;


    renderCategoryButtons();
    renderProducts();
    updateBulkUI();


    showMessage(
        `${ids.length} ta mahsulot "${label}" kategoriyasiga o'tkazildi.`,
        "success"
    );
}


/* =========================================================
   UPDATE QUANTITY
   ========================================================= */

async function updateQuantity(productId, amount) {

    const product =
        products.find(p => p.id === productId);

    if (!product) return;


    const newQuantity =
        Math.max(
            0,
            Number(product.quantity) + Number(amount)
        );


    await setQuantity(
        productId,
        newQuantity
    );
}


/* =========================================================
   SET QUANTITY
   ========================================================= */

async function setQuantity(productId, value) {

    let quantity =
        Math.floor(Number(value));


    if (!Number.isFinite(quantity)) {
        quantity = 0;
    }


    quantity =
        Math.max(0, quantity);


    const { error } = await db
        .from("products")
        .update({
            quantity: quantity
        })
        .eq("id", productId);


    if (error) {

        console.error(
            "SET QUANTITY ERROR:",
            error
        );

        showMessage(
            "Miqdorni saqlab bo'lmadi: " +
            error.message,
            "error"
        );

        return;
    }


    products = products.map(product => {

        if (product.id === productId) {

            return {
                ...product,
                quantity: quantity
            };
        }

        return product;
    });


    updateStats();
    renderProducts();
}


/* =========================================================
   SET LOW LIMIT
   ========================================================= */

async function setLowLimit(productId, value) {

    let lowLimit =
        Math.floor(Number(value));


    if (!Number.isFinite(lowLimit)) {
        lowLimit = 5;
    }


    lowLimit =
        Math.max(0, lowLimit);


    const { error } = await db
        .from("products")
        .update({
            low_limit: lowLimit
        })
        .eq("id", productId);


    if (error) {

        console.error(
            "SET LOW LIMIT ERROR:",
            error
        );

        showMessage(
            "Minimal miqdorni saqlab bo'lmadi: " +
            error.message,
            "error"
        );

        return;
    }


    products = products.map(product => {

        if (product.id === productId) {

            return {
                ...product,
                low_limit: lowLimit
            };
        }

        return product;
    });


    renderProducts();
}


/* =========================================================
   DELETE PRODUCT
   ========================================================= */

async function deleteProduct(productId) {

    const product =
        products.find(p => p.id === productId);

    if (!product) return;


    const confirmed = confirm(
        `"${product.name}" mahsulotini o'chirishni xohlaysizmi?`
    );


    if (!confirmed) return;


    const { error } = await db
        .from("products")
        .delete()
        .eq("id", productId);


    if (error) {

        console.error(
            "DELETE PRODUCT ERROR:",
            error
        );

        showMessage(
            "Mahsulotni o'chirib bo'lmadi: " +
            error.message,
            "error"
        );

        return;
    }


    products =
        products.filter(
            p => p.id !== productId
        );


    selectedProductIds.delete(productId);


    updateStats();
    renderProducts();
    updateBulkUI();


    showMessage(
        "Mahsulot o'chirildi.",
        "success"
    );
}


/* =========================================================
   ADD PRODUCT
   ========================================================= */

async function addProduct() {

    const nameInput =
        document.getElementById("productName");

    const quantityInput =
        document.getElementById("productQuantity");

    const lowLimitInput =
        document.getElementById("productLowLimit");

    const categoryInput =
        document.getElementById("productCategory");


    if (!nameInput) {

        showMessage(
            "productName topilmadi.",
            "error"
        );

        return;
    }


    const name =
        nameInput.value.trim();


    if (!name) {

        showMessage(
            "Mahsulot nomini kiriting.",
            "error"
        );

        nameInput.focus();

        return;
    }


    let quantity =
        Math.floor(Number(quantityInput?.value));


    if (!Number.isFinite(quantity)) {
        quantity = 0;
    }


    quantity =
        Math.max(0, quantity);


    let lowLimit =
        Math.floor(
            Number(lowLimitInput?.value)
        );


    if (!Number.isFinite(lowLimit)) {
        lowLimit = 5;
    }


    lowLimit =
        Math.max(0, lowLimit);


    const category =
        categoryInput?.value?.trim() || null;


    const { data, error } = await db
        .from("products")
        .insert({
            name: name,
            quantity: quantity,
            low_limit: lowLimit,
            image: null,
            category: category
        })
        .select(
            "id, created_at, name, quantity, low_limit, image, category"
        )
        .single();


    if (error) {

        console.error(
            "ADD PRODUCT ERROR:",
            error
        );

        showMessage(
            "Mahsulot qo'shilmadi: " +
            error.message,
            "error"
        );

        return;
    }


    products.push(
        normalizeProduct(data)
    );


    /*
      FORM tozalash
    */

    nameInput.value = "";

    if (quantityInput) {
        quantityInput.value = "";
    }

    if (lowLimitInput) {
        lowLimitInput.value = 5;
    }

    if (categoryInput) {
        categoryInput.value = "";
    }


    updateStats();
    renderProducts();


    showMessage(
        "Mahsulot qo'shildi.",
        "success"
    );
}


/* =========================================================
   EDIT PRODUCT
   ========================================================= */

function openEdit(productId) {

    const product =
        products.find(
            p => p.id === productId
        );

    if (!product) return;


    /*
      Turli nomdagi modal/input ID'larini
      qo'llab-quvvatlash.
    */

    const modal =
        document.getElementById("editModal");

    const nameInput =
        document.getElementById("editProductName");

    const quantityInput =
        document.getElementById("editProductQuantity");

    const lowLimitInput =
        document.getElementById("editProductLowLimit");

    const categoryInput =
        document.getElementById("editProductCategory");


    if (nameInput) {
        nameInput.value =
            product.name || "";
    }


    if (quantityInput) {
        quantityInput.value =
            product.quantity ?? 0;
    }


    if (lowLimitInput) {
        lowLimitInput.value =
            product.low_limit ?? 5;
    }


    if (categoryInput) {

        renderCategorySelects();

        categoryInput.value =
            product.category || "";
    }


    if (modal) {

        modal.dataset.productId =
            productId;

        modal.classList.add("open");

        modal.style.display = "";
    }
}


/* =========================================================
   SAVE EDIT
   ========================================================= */

async function saveEdit() {

    const modal =
        document.getElementById("editModal");

    if (!modal) return;


    const productId =
        Number(modal.dataset.productId);


    if (!productId) {

        showMessage(
            "Mahsulot ID topilmadi.",
            "error"
        );

        return;
    }


    const name =
        document.getElementById("editProductName")
            ?.value
            ?.trim();


    let quantity =
        Math.floor(
            Number(
                document.getElementById(
                    "editProductQuantity"
                )?.value
            )
        );


    let lowLimit =
        Math.floor(
            Number(
                document.getElementById(
                    "editProductLowLimit"
                )?.value
            )
        );


    const category =
        document.getElementById(
            "editProductCategory"
        )?.value?.trim() || null;


    if (!name) {

        showMessage(
            "Mahsulot nomi bo'sh bo'lishi mumkin emas.",
            "error"
        );

        return;
    }


    if (!Number.isFinite(quantity)) {
        quantity = 0;
    }

    if (!Number.isFinite(lowLimit)) {
        lowLimit = 5;
    }


    quantity = Math.max(0, quantity);

    lowLimit = Math.max(0, lowLimit);


    const { error } = await db
        .from("products")
        .update({
            name: name,
            quantity: quantity,
            low_limit: lowLimit,
            category: category
        })
        .eq("id", productId);


    if (error) {

        console.error(
            "EDIT PRODUCT ERROR:",
            error
        );

        showMessage(
            "Mahsulotni saqlab bo'lmadi: " +
            error.message,
            "error"
        );

        return;
    }


    products = products.map(product => {

        if (product.id === productId) {

            return {
                ...product,
                name: name,
                quantity: quantity,
                low_limit: lowLimit,
                category: category
            };
        }

        return product;
    });


    closeEdit();

    updateStats();
    renderProducts();


    showMessage(
        "Mahsulot o'zgartirildi.",
        "success"
    );
}


/* =========================================================
   CLOSE EDIT
   ========================================================= */

function closeEdit() {

    const modal =
        document.getElementById("editModal");

    if (!modal) return;

    modal.classList.remove("open");

    modal.style.display = "none";
}


/* =========================================================
   STATS
   ========================================================= */

function updateStats() {

    const totalProducts =
        products.length;


    const totalQuantity =
        products.reduce(
            (sum, product) =>
                sum + (Number(product.quantity) || 0),
            0
        );


    const lowStock =
        products.filter(product => {

            const quantity =
                Number(product.quantity) || 0;

            const lowLimit =
                Number(product.low_limit) || 0;

            return (
                quantity > 0 &&
                quantity <= lowLimit
            );

        }).length;


    const emptyStock =
        products.filter(product =>
            (Number(product.quantity) || 0) <= 0
        ).length;


    /*
      Bir nechta ID variantlarini qo'llab-quvvatlaymiz.
    */

    const selectors = {

        products: [
            "totalProducts",
            "statProducts",
            "productsCount"
        ],

        quantity: [
            "totalQuantity",
            "statQuantity",
            "quantityCount"
        ],

        low: [
            "lowStock",
            "statLow",
            "lowCount"
        ],

        empty: [
            "emptyStock",
            "statEmpty",
            "emptyCount"
        ]
    };


    function setFirst(ids, value) {

        for (const id of ids) {

            const el =
                document.getElementById(id);

            if (el) {

                el.textContent =
                    value;

                return;
            }
        }
    }


    setFirst(
        selectors.products,
        totalProducts
    );

    setFirst(
        selectors.quantity,
        totalQuantity
    );

    setFirst(
        selectors.low,
        lowStock
    );

    setFirst(
        selectors.empty,
        emptyStock
    );
}


/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {

    const inputs = [
        document.getElementById("searchInput"),
        document.getElementById("search"),
        document.querySelector(
            'input[type="search"]'
        )
    ];


    const input =
        inputs.find(Boolean);


    if (!input) return;


    input.addEventListener(
        "input",
        () => {

            searchText =
                input.value.trim().toLowerCase();

            renderProducts();
        }
    );
}


/* =========================================================
   MODAL EVENTS
   ========================================================= */

function setupModalEvents() {

    const modal =
        document.getElementById("editModal");


    if (!modal) return;


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {
                closeEdit();
            }
        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {

                if (multiSelectMode) {

                    exitMultiSelect();

                } else {

                    closeEdit();
                }
            }
        }
    );
}


/* =========================================================
   GLOBAL CLICK HELPERS
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        /*
          Если пользователь кликает на обычную
          категорию — ничего дополнительно.
        */

    }
);


/* =========================================================
   AUTO REFRESH
   ========================================================= */

let refreshRunning = false;


async function refreshProducts() {

    if (refreshRunning) return;

    /*
      Не обновляем таблицу во время selection,
      чтобы пользователь не потерял визуальное состояние.
    */

    if (multiSelectMode) return;


    refreshRunning = true;

    try {

        await loadProducts();

    } catch (error) {

        console.error(
            "AUTO REFRESH ERROR:",
            error
        );

    } finally {

        refreshRunning = false;
    }
}


/*
  Каждые 5 секунд обновляем товары.
*/

setInterval(
    refreshProducts,
    5000
);


/*
  Каждые 15 секунд обновляем категории.
*/

setInterval(
    async () => {

        if (multiSelectMode) return;

        try {

            await loadCategories();

        } catch (error) {

            console.error(
                "CATEGORY AUTO REFRESH ERROR:",
                error
            );
        }

    },
    15000
);


/* =========================================================
   START APP
   ========================================================= */

async function startApp() {

    console.log(
        "GRAND X — starting..."
    );


    /*
      Сначала категории
    */

    await loadCategories();


    /*
      Потом товары
    */

    await loadProducts();


    /*
      Остальное
    */

    setupSearch();
    setupModalEvents();


    updateStats();
    renderCategoryButtons();
    renderCategorySelects();
    renderProducts();


    console.log(
        "GRAND X — ready."
    );
}


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        startApp
    );

} else {

    startApp();
}
