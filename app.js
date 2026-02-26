/**
 * SAMR Public Viewer — Frontend Logic
 * ====================================
 * Pure vanilla JS. Loads public_data.json + stats.json,
 * renders a mobile-optimized case list with client-side
 * search, filter, and pagination.
 */

(function () {
    "use strict";

    // --- Config ---
    const DATA_URL = "data/public_data.json";
    const STATS_URL = "data/stats.json";
    const PAGE_SIZE = 20;

    // Category display mapping
    const CATEGORY_MAP = {
        jyaj: "简易案件",
        xzcf: "行政处罚",
        ftj: "附条件/禁止",
    };

    // --- State ---
    let allCases = [];
    let filteredCases = [];
    let currentPage = 1;

    // --- DOM refs ---
    const $statTotal = document.getElementById("stat-total");
    const $statUpdated = document.getElementById("stat-updated");
    const $statJyaj = document.getElementById("stat-jyaj");
    const $statXzcf = document.getElementById("stat-xzcf");
    const $statFtj = document.getElementById("stat-ftj");
    const $chartBars = document.getElementById("chart-bars");
    const $searchInput = document.getElementById("search-input");
    const $clearBtn = document.getElementById("clear-btn");
    const $filterProvince = document.getElementById("filter-province");
    const $filterCategory = document.getElementById("filter-category");
    const $resultCount = document.getElementById("result-count");
    const $caseList = document.getElementById("case-list");
    const $loading = document.getElementById("loading");
    const $pagination = document.getElementById("pagination");

    // =============================
    //  Data Loading
    // =============================

    async function loadData() {
        try {
            const [casesRes, statsRes] = await Promise.all([
                fetch(DATA_URL),
                fetch(STATS_URL),
            ]);

            if (!casesRes.ok || !statsRes.ok) throw new Error("Failed to fetch data");

            allCases = await casesRes.json();
            const stats = await statsRes.json();

            renderStats(stats);
            populateFilters(stats);
            applyFilters();

            $loading.style.display = "none";
        } catch (err) {
            $loading.innerHTML =
                '<p style="color: var(--accent-red);">加载失败，请刷新重试</p>';
            console.error("Data load error:", err);
        }
    }

    // =============================
    //  Stats Rendering
    // =============================

    function renderStats(stats) {
        // Total + date
        animateNumber($statTotal, stats.total);
        $statUpdated.textContent = stats.last_updated || "—";

        // Category breakdown
        const cats = stats.by_category || {};
        animateNumber($statJyaj, cats["简易案件公示"] || 0);
        animateNumber($statXzcf, cats["行政处罚案件"] || 0);
        animateNumber($statFtj, cats["附条件批准/禁止"] || 0);

        // Province bar chart
        const maxCount = Math.max(...Object.values(stats.by_province));
        $chartBars.innerHTML = "";
        let i = 0;
        for (const [province, count] of Object.entries(stats.by_province)) {
            const pct = Math.max((count / maxCount) * 100, 8);
            const row = document.createElement("div");
            row.className = "chart-bar-row";
            row.innerHTML = `
                <span class="chart-bar-label">${province}</span>
                <div class="chart-bar-track">
                    <div class="chart-bar-fill bar-color-${i % 6}"
                         style="width: 0%"
                         data-count="${count}"></div>
                </div>
            `;
            $chartBars.appendChild(row);

            // Animate bar width
            requestAnimationFrame(() => {
                setTimeout(() => {
                    row.querySelector(".chart-bar-fill").style.width = pct + "%";
                }, 100 + i * 80);
            });
            i++;
        }
    }

    function animateNumber(el, target) {
        const duration = 800;
        const start = performance.now();
        const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target).toLocaleString();
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    // =============================
    //  Filters
    // =============================

    function populateFilters(stats) {
        // Province filter
        for (const province of Object.keys(stats.by_province)) {
            const opt = document.createElement("option");
            opt.value = province;
            opt.textContent = province;
            $filterProvince.appendChild(opt);
        }

        // Category filter
        for (const [code, name] of Object.entries(CATEGORY_MAP)) {
            const opt = document.createElement("option");
            opt.value = code;
            opt.textContent = name;
            $filterCategory.appendChild(opt);
        }
    }

    function applyFilters() {
        const query = $searchInput.value.trim().toLowerCase();
        const province = $filterProvince.value;
        const category = $filterCategory.value;

        filteredCases = allCases.filter((c) => {
            if (query && !c.title.toLowerCase().includes(query)) return false;
            if (province && c.province !== province) return false;
            if (category && c.category !== category) return false;
            return true;
        });

        currentPage = 1;
        renderResults();
    }

    // Debounce helper
    function debounce(fn, ms) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    }

    // =============================
    //  Results Rendering
    // =============================

    function renderResults() {
        const total = filteredCases.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (currentPage > totalPages) currentPage = totalPages;

        const startIdx = (currentPage - 1) * PAGE_SIZE;
        const pageCases = filteredCases.slice(startIdx, startIdx + PAGE_SIZE);

        // Result count
        const query = $searchInput.value.trim();
        if (query || $filterProvince.value || $filterCategory.value) {
            $resultCount.textContent = `找到 ${total} 个结果`;
        } else {
            $resultCount.textContent = "";
        }

        // Clear list
        $caseList.innerHTML = "";

        if (pageCases.length === 0) {
            $caseList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <div class="empty-text">暂无匹配案件</div>
                </div>
            `;
            $pagination.innerHTML = "";
            return;
        }

        // Render case cards
        const fragment = document.createDocumentFragment();
        pageCases.forEach((c) => {
            const card = document.createElement("a");
            card.className = "case-card";
            card.href = c.url;
            card.target = "_blank";
            card.rel = "noopener noreferrer";

            const categoryLabel = CATEGORY_MAP[c.category] || c.category;
            const dateStr = c.date || "—";

            card.innerHTML = `
                <div class="case-title">${escapeHtml(c.title)}</div>
                <div class="case-meta">
                    <span class="case-tag tag-date">${dateStr}</span>
                    <span class="case-tag tag-province">${escapeHtml(c.province)}</span>
                    <span class="case-tag tag-category">${categoryLabel}</span>
                    <span class="case-link-hint">查看原文 ›</span>
                </div>
            `;
            fragment.appendChild(card);
        });
        $caseList.appendChild(fragment);

        // Pagination
        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        $pagination.innerHTML = "";
        if (totalPages <= 1) return;

        // Prev button
        addPageBtn("‹", currentPage > 1, () => goPage(currentPage - 1));

        // Page numbers with smart truncation
        const pages = getPaginationRange(currentPage, totalPages);
        pages.forEach((p) => {
            if (p === "...") {
                const dots = document.createElement("span");
                dots.className = "page-info";
                dots.textContent = "…";
                $pagination.appendChild(dots);
            } else {
                addPageBtn(p, true, () => goPage(p), p === currentPage);
            }
        });

        // Next button
        addPageBtn("›", currentPage < totalPages, () => goPage(currentPage + 1));
    }

    function addPageBtn(label, enabled, onClick, active = false) {
        const btn = document.createElement("button");
        btn.className = "page-btn" + (active ? " active" : "");
        btn.textContent = label;
        btn.disabled = !enabled;
        if (enabled) btn.addEventListener("click", onClick);
        $pagination.appendChild(btn);
    }

    function goPage(page) {
        currentPage = page;
        renderResults();
        // Scroll to top of case list
        $caseList.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function getPaginationRange(current, total) {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

        const pages = [];
        pages.push(1);
        if (current > 3) pages.push("...");
        for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
            pages.push(i);
        }
        if (current < total - 2) pages.push("...");
        pages.push(total);
        return pages;
    }

    // =============================
    //  Utilities
    // =============================

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    // =============================
    //  Event Listeners
    // =============================

    $searchInput.addEventListener("input", debounce(() => {
        $clearBtn.classList.toggle("visible", $searchInput.value.length > 0);
        applyFilters();
    }, 200));

    $clearBtn.addEventListener("click", () => {
        $searchInput.value = "";
        $clearBtn.classList.remove("visible");
        applyFilters();
    });

    $filterProvince.addEventListener("change", applyFilters);
    $filterCategory.addEventListener("change", applyFilters);

    // =============================
    //  Init
    // =============================

    loadData();
})();
