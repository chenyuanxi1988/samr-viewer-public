/**
 * SAMR Public Viewer — Frontend Logic
 * ====================================
 * 反垄断数据库 | 海华永泰 陈元熹律师团队
 * Pure vanilla JS. Loads public_data.json + stats.json,
 * renders a responsive case list with client-side
 * search, filter, sorting, province chips, and pagination.
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
    let statsData = null;

    // --- DOM refs ---
    const $statTotal = document.getElementById("stat-total");
    const $statUpdated = document.getElementById("stat-updated");
    const $statJyaj = document.getElementById("stat-jyaj");
    const $statXzcf = document.getElementById("stat-xzcf");
    const $statFtj = document.getElementById("stat-ftj");
    const $chartBars = document.getElementById("chart-bars");
    const $provinceChips = document.getElementById("province-chips");
    const $toggleChartBtn = document.getElementById("toggle-chart-btn");
    const $chartBtnText = document.getElementById("chart-btn-text");
    const $chartDrawer = document.getElementById("province-chart-drawer");
    const $searchInput = document.getElementById("search-input");
    const $clearBtn = document.getElementById("clear-btn");
    const $filterProvince = document.getElementById("filter-province");
    const $filterCategory = document.getElementById("filter-category");
    const $filterSort = document.getElementById("filter-sort");
    const $resetFilterBtn = document.getElementById("reset-filter-btn");
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
            statsData = await statsRes.json();

            renderStats(statsData);
            populateFilters(statsData);
            renderProvinceChips(statsData);
            applyFilters();

            if ($loading) $loading.style.display = "none";
        } catch (err) {
            if ($loading) {
                $loading.innerHTML =
                    '<p style="color: var(--accent-red);">数据加载失败，请刷新重试</p>';
            }
            console.error("Data load error:", err);
        }
    }

    // =============================
    //  Stats & Charts Rendering
    // =============================

    function renderStats(stats) {
        // Total + date
        animateNumber($statTotal, stats.total);
        if ($statUpdated) $statUpdated.textContent = stats.last_updated || "—";

        // Category breakdown
        const cats = stats.by_category || {};
        animateNumber($statJyaj, cats["简易案件公示"] || 0);
        animateNumber($statXzcf, cats["行政处罚案件"] || 0);
        animateNumber($statFtj, cats["附条件批准/禁止"] || 0);

        // Province bar chart (if drawer is expanded)
        if ($chartBars && stats.by_province) {
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
                        const fillEl = row.querySelector(".chart-bar-fill");
                        if (fillEl) fillEl.style.width = pct + "%";
                    }, 50 + i * 35);
                });
                i++;
            }
        }
    }

    function renderProvinceChips(stats) {
        if (!$provinceChips || !stats.by_province) return;

        $provinceChips.innerHTML = "";

        // "全部" Chip
        const allChip = document.createElement("button");
        allChip.className = "province-chip active";
        allChip.type = "button";
        allChip.dataset.province = "";
        allChip.innerHTML = `全部 <span class="chip-count">(${stats.total || 0})</span>`;
        allChip.addEventListener("click", () => selectProvinceChip(""));
        $provinceChips.appendChild(allChip);

        // Province Chips
        for (const [province, count] of Object.entries(stats.by_province)) {
            const chip = document.createElement("button");
            chip.className = "province-chip";
            chip.type = "button";
            chip.dataset.province = province;
            chip.innerHTML = `${province} <span class="chip-count">(${count})</span>`;
            chip.addEventListener("click", () => selectProvinceChip(province));
            $provinceChips.appendChild(chip);
        }
    }

    function selectProvinceChip(province) {
        if ($filterProvince) {
            $filterProvince.value = province;
        }
        updateProvinceChipsActive(province);
        applyFilters();
    }

    function updateProvinceChipsActive(province) {
        if (!$provinceChips) return;
        const chips = $provinceChips.querySelectorAll(".province-chip");
        chips.forEach((c) => {
            if (c.dataset.province === province) {
                c.classList.add("active");
            } else {
                c.classList.remove("active");
            }
        });
    }

    function animateNumber(el, target) {
        if (!el) return;
        const duration = 600;
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
    //  Filters & Sorting
    // =============================

    function populateFilters(stats) {
        if ($filterProvince && stats.by_province) {
            for (const province of Object.keys(stats.by_province)) {
                const opt = document.createElement("option");
                opt.value = province;
                opt.textContent = province;
                $filterProvince.appendChild(opt);
            }
        }

        if ($filterCategory) {
            for (const [code, name] of Object.entries(CATEGORY_MAP)) {
                const opt = document.createElement("option");
                opt.value = code;
                opt.textContent = name;
                $filterCategory.appendChild(opt);
            }
        }
    }

    function applyFilters() {
        const query = $searchInput ? $searchInput.value.trim().toLowerCase() : "";
        const province = $filterProvince ? $filterProvince.value : "";
        const category = $filterCategory ? $filterCategory.value : "";
        const sortBy = $filterSort ? $filterSort.value : "date_desc";

        // Filter
        filteredCases = allCases.filter((c) => {
            if (query && !c.title.toLowerCase().includes(query)) return false;
            if (province && c.province !== province) return false;
            if (category && c.category !== category) return false;
            return true;
        });

        // Sort
        filteredCases.sort((a, b) => {
            if (sortBy === "date_asc") {
                return (a.date || "").localeCompare(b.date || "");
            } else if (sortBy === "title_asc") {
                return (a.title || "").localeCompare(b.title || "", "zh-CN");
            } else {
                // default date_desc
                return (b.date || "").localeCompare(a.date || "");
            }
        });

        currentPage = 1;
        renderResults();
    }

    function resetAllFilters() {
        if ($searchInput) {
            $searchInput.value = "";
            if ($clearBtn) $clearBtn.classList.remove("visible");
        }
        if ($filterProvince) $filterProvince.value = "";
        if ($filterCategory) $filterCategory.value = "";
        if ($filterSort) $filterSort.value = "date_desc";
        updateProvinceChipsActive("");
        applyFilters();
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

    function highlightMatch(text, query) {
        const escaped = escapeHtml(text);
        if (!query) return escaped;
        const qEscaped = escapeRegex(query);
        const regex = new RegExp(`(${qEscaped})`, "gi");
        return escaped.replace(regex, "<mark>$1</mark>");
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function renderResults() {
        const total = filteredCases.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (currentPage > totalPages) currentPage = totalPages;

        const startIdx = (currentPage - 1) * PAGE_SIZE;
        const pageCases = filteredCases.slice(startIdx, startIdx + PAGE_SIZE);

        // Result count
        const query = $searchInput ? $searchInput.value.trim() : "";
        if ($resultCount) {
            if (query || ($filterProvince && $filterProvince.value) || ($filterCategory && $filterCategory.value)) {
                $resultCount.textContent = `匹配 ${total.toLocaleString()} 篇案件数据`;
            } else {
                $resultCount.textContent = `共收录 ${total.toLocaleString()} 篇案件`;
            }
        }

        // Clear list
        if (!$caseList) return;
        $caseList.innerHTML = "";

        if (pageCases.length === 0) {
            $caseList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <div class="empty-text">未检索到匹配案件，请尝试缩减关键词或重置筛选</div>
                </div>
            `;
            if ($pagination) $pagination.innerHTML = "";
            return;
        }

        // Render case cards (2-column grid on desktop)
        const fragment = document.createDocumentFragment();
        pageCases.forEach((c) => {
            const card = document.createElement("a");
            card.className = "case-card";
            card.href = c.url;
            card.target = "_blank";
            card.rel = "noopener noreferrer";

            const categoryLabel = CATEGORY_MAP[c.category] || c.category;
            const dateStr = c.date || "—";
            const highlightedTitle = highlightMatch(c.title, query);

            card.innerHTML = `
                <div class="case-title">${highlightedTitle}</div>
                <div class="case-meta">
                    <span class="case-tag tag-date">📅 ${dateStr}</span>
                    <span class="case-tag tag-province">🏛️ ${escapeHtml(c.province)}</span>
                    <span class="case-tag tag-category">⚖️ ${categoryLabel}</span>
                    <span class="case-link-hint">查看官网原文 ↗</span>
                </div>
            `;
            fragment.appendChild(card);
        });
        $caseList.appendChild(fragment);

        // Pagination
        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        if (!$pagination) return;
        $pagination.innerHTML = "";
        if (totalPages <= 1) return;

        // Prev button
        addPageBtn("◀ 上一页", currentPage > 1, () => goPage(currentPage - 1));

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
        addPageBtn("下一页 ▶", currentPage < totalPages, () => goPage(currentPage + 1));
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
        // Scroll to search section nicely
        const searchEl = document.querySelector(".search-section");
        if (searchEl) {
            searchEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
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
        if (!str) return "";
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    // =============================
    //  Event Listeners
    // =============================

    if ($searchInput) {
        $searchInput.addEventListener("input", debounce(() => {
            if ($clearBtn) $clearBtn.classList.toggle("visible", $searchInput.value.length > 0);
            applyFilters();
        }, 200));
    }

    if ($clearBtn) {
        $clearBtn.addEventListener("click", () => {
            if ($searchInput) $searchInput.value = "";
            $clearBtn.classList.remove("visible");
            applyFilters();
        });
    }

    if ($filterProvince) {
        $filterProvince.addEventListener("change", () => {
            updateProvinceChipsActive($filterProvince.value);
            applyFilters();
        });
    }

    if ($filterCategory) {
        $filterCategory.addEventListener("change", applyFilters);
    }

    if ($filterSort) {
        $filterSort.addEventListener("change", applyFilters);
    }

    if ($resetFilterBtn) {
        $resetFilterBtn.addEventListener("click", resetAllFilters);
    }

    // Toggle chart drawer button
    if ($toggleChartBtn && $chartDrawer) {
        $toggleChartBtn.addEventListener("click", () => {
            const isHidden = $chartDrawer.style.display === "none";
            $chartDrawer.style.display = isHidden ? "block" : "none";
            if ($chartBtnText) {
                $chartBtnText.textContent = isHidden ? "收起图表 ▴" : "图表 ▾";
            }
        });
    }

    // =============================
    //  Init
    // =============================

    loadData();
})();
