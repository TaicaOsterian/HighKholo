(function() {
    "use strict";

    let lexText, searchInput, searchBtn;

    const $ = (id) => document.getElementById(id);

    const DB = {
        classes: {},
        sortedByHkh: [],
        words: []
    };

    function buildWordHTML(word) {
        let html = `<p><i>${word.eng || ""}</i> &mdash; ${DB.classes[word.c] || ""}: <b>${word.hkh || ""}</b>`;
        if (word.xka) { html += ` &vert; <span class="kataText">${word.xka}</span>`; }
        if (word.n) { html += ` &ndash; <span class="smalltext"><i>${word.n}</i></span>`; }
        html += "</p>";
        return html;
    }

    function buildSearchResultHTML(word) {
        let html = `<p><b>${word.hkh || ""}</b> `;
        if (word.xka) { html += `&vert; <span class="kataText">${word.xka}</span> `; }
        html += `&mdash; ${DB.classes[word.c] || ""}`;
        if (word.eng) { html += `: <i>${word.eng}</i>`; }
        if (word.n) { html += ` &ndash; <span class="smalltext"><i>${word.n}</i></span>`; }
        html += "</p>";
        return html;
    }

    function renderHTML(htmlString) {
        lexText.innerHTML = htmlString;
    }

    window.rdb = function(mode) {
        if (!lexText) { return; }

        if (mode === "*S") {
            lexText.innerHTML = $("slave").innerHTML;
            return;
        }
        if (mode === "*P") {
            lexText.innerHTML = $("phrases").innerHTML;
            return;
        }
        showWordsStartingWith(mode);
    };

    window.sdb = function() {
        if (!lexText) { return; }
        performSearch();
    };

    function showWordsStartingWith(prefix) {
        if (!DB.words.length) { return; }

        const lowerPrefix = prefix.toLowerCase();

        const matches = DB.words.filter((word) =>
            word.eng && word.eng.toLowerCase().startsWith(lowerPrefix)
        );

        if (matches.length === 0) {
            lexText.innerHTML = "<p><em>No entries found.</em></p>";
            return;
        }

        matches.sort(function (a, b) {
            const engA = a.eng.toLowerCase();
            const engB = b.eng.toLowerCase();
            if (engA < engB) { return -1; }
            if (engA > engB) { return 1; }
            const hkhA = a.hkh.toLowerCase();
            const hkhB = b.hkh.toLowerCase();
            return (
                hkhA < hkhB ? -1 : (
                hkhA > hkhB ? 1 : 0));
        });

        const html = matches.map(buildWordHTML).join("");
        renderHTML(html);
    }

    function performSearch() {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
            lexText.innerHTML = "";
            return;
        }

        if (!DB.words.length) {
            return;
        }

        const primaryResults = [];
        const secondaryResults = [];

        for (let i = 0; i < DB.words.length; i++) {
            const word = DB.words[i];
            
            const eng = (word.eng || "").toLowerCase();
            const hkh = (word.hkh || "").toLowerCase();
            const xka = (word.xka || "").toLowerCase();
            const n = (word.n || "").toLowerCase();

            if (eng === query || hkh === query || xka === query || n === query) {
                primaryResults.push(word);
            } 
            else if (eng.includes(query) || hkh.includes(query) || xka.includes(query) || n.includes(query)) {
                secondaryResults.push(word);
            }
        }

        if (primaryResults.length === 0 && secondaryResults.length === 0) {
            lexText.innerHTML = "<p><em>No matches found.</em></p>";
            return;
        }

        const alphaSort = function (a, b) {
            const hkhA = (a.hkh || "").toLowerCase();
            const hkhB = (b.hkh || "").toLowerCase();
            if (hkhA < hkhB) { return -1; }
            if (hkhA > hkhB) { return 1; }
            const engA = (a.eng || "").toLowerCase();
            const engB = (b.eng || "").toLowerCase();
            return engA < engB ? -1 : (engA > engB ? 1 : 0);
        };

        primaryResults.sort(alphaSort);
        secondaryResults.sort(alphaSort);

        const results = [...primaryResults, ...secondaryResults];

        const html = results.map(buildSearchResultHTML).join("");
        renderHTML(html);
    }

    async function loadData() {
        try {
            const resp = await fetch("hk_dict.json");
            if (!resp.ok) { throw new Error(`HTTP ${resp.status}`); }
            const data = await resp.json();

            DB.classes = data.classes || {};
            DB.words = data.words || [];

            DB.sortedByHkh = [...DB.words].sort(function (a, b) {
                const hkhA = a.hkh.toLowerCase();
                const hkhB = b.hkh.toLowerCase();
                if (hkhA < hkhB) { return -1; }
                if (hkhA > hkhB) { return 1; }
                const engA = (a.eng || "").toLowerCase();
                const engB = (b.eng || "").toLowerCase();
                return (engA < engB ? -1 : (engA > engB ? 1 : 0));
            });
        } catch (err) {
            console.error("Failed to load dictionary:", err);
            if (lexText) {
                lexText.innerHTML = `<p style="color:#ff7777;">Error loading dictionary. Please refresh.</p>`;
            }
        }
    }

    async function loadCommitDate() {
        try {
            const resp = await fetch("https://api.github.com/repos/taicaosterian/HighKholo/commits?page=1&per_page=1");
            if (!resp.ok) { throw new Error(`HTTP ${resp.status}`); }
            const data = await resp.json();
            if (data && data[0]) {
                const date = new Date(data[0].commit.committer.date);
                const stamp = $("gitStamp");
                if (stamp) { stamp.textContent = date.toLocaleString(); }
            }
        } catch (err) {
            console.warn("Could not fetch commit date:", err);
        }
    }

    function setupEvents() {
        searchInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                e.preventDefault();
                searchBtn.click();
            }
        });

        let debounceTimer;
        searchInput.addEventListener("input", function(e) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout((function() {
                if (e.target.value.trim()) {
                    performSearch();
                } else {
                    lexText.innerHTML = "";
                }
            }), 300);
        });
    }

    window.addEventListener("load", function() {
        lexText = $("lexText");
        searchInput = $("khsearch");
        searchBtn = $("khsubmit");

        loadCommitDate();
        loadData();
        setupEvents();
    });
}());
